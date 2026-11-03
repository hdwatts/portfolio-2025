// Validates a built design and optionally captures screenshots.
//
// Text provenance: every piece of text on the page (text nodes, alt/aria/title/
// placeholder attributes, <title>, CSS ::before/::after content) must appear
// verbatim in data/portfolio.json (case-, whitespace- and quote-style-
// insensitive). Adjacent inline fragments are checked together, so a design
// cannot assemble new words out of individually valid letters.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { routeDesign } from "./serve.mjs";
import { headEnd, injectCsp, DESIGN_CSP } from "./csp.mjs";
import { loadConfig, loadData } from "./paths.mjs";

export function normalize(s) {
	return String(s)
		.normalize("NFKC")
		.replace(/[‘’‛′]/g, "'")
		.replace(/[“”‟″]/g, '"')
		.replace(/[‐-―−]/g, "-")
		.replace(/…/g, "...")
		.replace(/[\s ​]+/g, " ")
		.trim()
		.toLowerCase();
}

/** Every string leaf in the data, normalized. */
export function allowedStrings(data) {
	const out = [];
	const walk = (v) => {
		if (typeof v === "string") out.push(normalize(v));
		else if (typeof v === "number") out.push(String(v));
		else if (Array.isArray(v)) v.forEach(walk);
		else if (v && typeof v === "object") Object.values(v).forEach(walk);
	};
	walk(data);
	return out.filter(Boolean);
}

/** Decorative text with no words in it: symbols, punctuation, and short numbers such as section indices. */
const isDecorative = (t) => /^[\p{P}\p{S}\p{Z}\p{M}]*$/u.test(t.replace(/\d{1,2}/g, "")) && !/\d{3,}/.test(t);

export function makeMatcher(data) {
	const hay = "\n" + allowedStrings(data).join("\n") + "\n";
	const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return {
		/** Text is a verbatim (normalized) substring of some data string. */
		substring: (t) => isDecorative(t) || hay.includes(t),
		/** Text appears in the data on word boundaries (stricter; used for lone fragments). */
		word: (t) => isDecorative(t) || new RegExp(`(^|[^\\p{L}\\p{N}])${esc(t)}($|[^\\p{L}\\p{N}])`, "u").test(hay),
		/** Text is made of allowed pieces separated only by decorative separators. */
		pieces: (t, matcher) =>
			t
				.split(/\s+[\p{P}\p{S}]+\s+|\s{2,}/u)
				.map((p) => p.trim())
				.filter(Boolean)
				.every((p) => matcher.substring(p)),
	};
}

/** Runs inside the page. Returns text runs, attribute texts, CSS content, links. */
function extractPageText() {
	const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
	const isInline = (el) => {
		const d = getComputedStyle(el).display;
		return d.startsWith("inline") || d === "contents" || d === "ruby" || d === "ruby-text";
	};
	const blockOf = (node) => {
		let el = node.parentElement;
		while (el && el !== document.body && isInline(el)) el = el.parentElement;
		return el;
	};
	const describe = (el) => {
		if (!el) return "?";
		const parts = [];
		for (let e = el; e && e !== document.body && parts.length < 4; e = e.parentElement) {
			parts.unshift(e.tagName.toLowerCase() + (e.id ? `#${e.id}` : "") + (typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\s+/).slice(0, 2).join(".") : ""));
		}
		return parts.join(" > ");
	};

	const runs = new Map();
	const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
		acceptNode: (n) => {
			for (let e = n.parentElement; e; e = e.parentElement) if (SKIP.has(e.tagName)) return NodeFilter.FILTER_REJECT;
			return n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
		},
	});
	for (let n; (n = walker.nextNode()); ) {
		const block = blockOf(n);
		if (!runs.has(block)) runs.set(block, { where: describe(block), parts: [] });
		runs.get(block).parts.push(n.nodeValue);
	}

	const attrs = [];
	const ATTRS = ["alt", "title", "aria-label", "aria-description", "aria-roledescription", "placeholder", "aria-valuetext"];
	for (const el of document.querySelectorAll("*")) {
		for (const a of ATTRS) if (el.hasAttribute(a) && el.getAttribute(a).trim()) attrs.push({ where: `${describe(el)} [${a}]`, text: el.getAttribute(a) });
		if ((el.tagName === "INPUT" && ["button", "submit", "reset"].includes(el.type)) && el.value) attrs.push({ where: `${describe(el)} [value]`, text: el.value });
		for (const pseudo of ["::before", "::after", "::marker"]) {
			const c = getComputedStyle(el, pseudo).content;
			if (c && c !== "none" && c !== "normal" && /^["']/.test(c)) {
				const text = c.replace(/^["']|["']$/g, "").replace(/\\([0-9a-f]{1,6})\s?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
				if (text.trim()) attrs.push({ where: `${describe(el)} ${pseudo}`, text });
			}
		}
	}
	attrs.push({ where: "<title>", text: document.title });

	const links = [...document.querySelectorAll("a[href]")].map((a) => ({ href: a.getAttribute("href"), where: describe(a) }));
	return {
		runs: [...runs.values()],
		attrs,
		links,
		canvases: document.querySelectorAll("canvas").length,
		overflowX: document.documentElement.scrollWidth - window.innerWidth,
	};
}

async function settle(page) {
	// Scroll through the page so scroll-triggered content renders, then return to the top.
	await page.evaluate(async () => {
		const step = Math.max(200, window.innerHeight * 0.6);
		for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
			window.scrollTo(0, y);
			await new Promise((r) => setTimeout(r, 120));
		}
		window.scrollTo(0, document.documentElement.scrollHeight);
		await new Promise((r) => setTimeout(r, 400));
	});
}

const toTop = (page) => page.evaluate(() => window.scrollTo(0, 0));

/**
 * @param {{date: string, buildDir: string, snapDir?: string}} opts
 * @returns {Promise<{ok: boolean, errors: string[], warnings: string[], screenshots: Record<string,string>}>}
 */
export async function checkDesign({ date, buildDir, snapDir }) {
	const config = loadConfig();
	const data = loadData();
	const match = makeMatcher(data);
	const errors = [];
	const warnings = [];
	const screenshots = {};

	const allowedHrefs = new Set(allowedStrings(data).filter((s) => /^(https?:|\/|mailto:|tel:)/.test(s)));
	allowedHrefs.add("/history");
	allowedHrefs.add("/");
	const normHref = (h) => normalize(h).replace(/\/$/, "");
	const allowedNorm = new Set([...allowedHrefs].map(normHref));

	// Static checks on the HTML shell, since a CSP can't prevent these.
	const shell = fs.readFileSync(path.join(buildDir, "index.html"), "utf8");
	if (/http-equiv\s*=\s*["']?refresh/i.test(shell)) errors.push("index.html must not use <meta http-equiv=\"refresh\">.");
	if (/http-equiv\s*=\s*["']?content-security-policy/i.test(shell)) errors.push("index.html must not set its own Content-Security-Policy.");
	if (headEnd(shell) < 0) errors.push('index.html must start with exactly <!doctype html><html lang="en"><head> (bare <head>, no comments or other content before it).');
	if (/<base\b/i.test(shell)) errors.push("index.html must not use <base>.");
	for (const m of shell.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
		if (!/\bsrc\s*=/.test(m[1]) && m[2].trim() && !/type\s*=\s*["']?application\/(ld\+)?json/i.test(m[1]))
			errors.push("index.html contains an inline <script>; all scripts must be bundled files (CSP: script-src 'self').");
	}

	const browser = await chromium.launch();
	try {
		// Confirm with a real HTML parser that the production CSP injection puts the
		// policy first in <head>, independent of the regex used to place it.
		const injected = injectCsp(shell, DESIGN_CSP);
		if (injected !== null) {
			const probe = await browser.newPage({ javaScriptEnabled: false });
			await probe.route("**/*", (r) => r.abort());
			await probe.setContent(injected, { waitUntil: "domcontentloaded" });
			const ok = await probe.evaluate(() => {
				const first = document.head.firstElementChild;
				return !!first && first.tagName === "META" && (first.getAttribute("http-equiv") ?? "").toLowerCase() === "content-security-policy";
			});
			await probe.close();
			if (!ok) errors.push("After CSP injection, the policy is not the first element of <head> when parsed by a browser. Simplify the top of index.html to <!doctype html><html lang=\"en\"><head>.");
		}
		for (const [name, viewport] of Object.entries(config.screenshots)) {
			const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: "no-preference" });
			const { url: designUrl, blocked } = await routeDesign(context, { date, buildDir });
			const page = await context.newPage();
			const consoleErrors = [];
			page.on("pageerror", (e) => consoleErrors.push(`Uncaught: ${e.message}`));
			page.on("console", (m) => m.type() === "error" && consoleErrors.push(`console.error: ${m.text()}`));
			page.on("requestfailed", (r) => consoleErrors.push(`Request failed: ${r.url()} (${r.failure()?.errorText})`));
			page.on("response", (r) => r.status() >= 400 && consoleErrors.push(`HTTP ${r.status()}: ${r.url()}`));

			await page.goto(designUrl, { waitUntil: "networkidle", timeout: 45_000 }).catch((e) => errors.push(`[${name}] page failed to load: ${e.message}`));
			await page.waitForTimeout(1500);
			await settle(page);
			const found = await page.evaluate(extractPageText);

			if (name === "desktop") {
				// --- Text provenance ---
				const violations = [];
				for (const run of found.runs) {
					const whole = normalize(run.parts.join(""));
					if (!whole || match.substring(whole) || match.pieces(whole, match)) continue;
					const bad = run.parts.map(normalize).filter((p) => p && !match.word(p) && !(p.length > 3 && match.substring(p)));
					if (bad.length) violations.push(`${run.where}: "${bad.join('" , "').slice(0, 160)}"`);
					else if (run.parts.every((p) => normalize(p).length <= 2))
						violations.push(`${run.where}: text assembled from fragments "${whole.slice(0, 80)}" is not in the data`);
				}
				for (const a of found.attrs) {
					const t = normalize(a.text);
					if (t && !match.substring(t)) violations.push(`${a.where}: "${t.slice(0, 160)}"`);
				}
				if (violations.length)
					errors.push(
						`Text not found in portfolio.json (${violations.length}). Render only data strings and data.labels:\n` +
							[...new Set(violations)].slice(0, 40).map((v) => `  - ${v}`).join("\n"),
					);
				if (found.canvases) warnings.push(`Page uses ${found.canvases} <canvas> element(s); ensure no text is drawn into them.`);

				// --- Links ---
				const badLinks = found.links.filter(({ href }) => !href.startsWith("#") && !allowedNorm.has(normHref(href)));
				if (badLinks.length) errors.push(`Links whose href is not in the data (${badLinks.length}):\n` + badLinks.slice(0, 20).map((l) => `  - ${l.href} at ${l.where}`).join("\n"));

				// --- Required content ---
				const hrefs = new Set(found.links.map((l) => normHref(l.href)));
				const missing = [
					...data.person.links.map((l) => l.url),
					...data.projects.map((p) => p.url),
					...data.projects.flatMap((p) => Object.values(p.stores ?? {}).map((s) => s.url)),
					"/history",
				].filter((u) => !hrefs.has(normHref(u)));
				if (missing.length) errors.push(`Required links missing from the page:\n` + missing.map((u) => `  - ${u}`).join("\n"));
				const allText = normalize(found.runs.map((r) => r.parts.join(" ")).join(" "));
				if (!allText.includes(normalize(data.person.name))) errors.push(`The page must show the name "${data.person.name}".`);
				for (const p of data.projects) if (!allText.includes(normalize(p.name))) errors.push(`Project "${p.name}" is not shown.`);
				if (data.colophon) {
					if (!allText.includes(normalize(data.colophon.tagline))) errors.push(`The colophon tagline "${data.colophon.tagline}" is not shown (see data.colophon).`);
					const missingColophon = data.colophon.links.map((l) => l.url).filter((u) => !hrefs.has(normHref(u)));
					if (missingColophon.length) errors.push(`Colophon links missing: ${missingColophon.join(", ")}`);
				}

				// --- Accessibility (static pass with motion reduced so animations don't skew contrast) ---
				await page.emulateMedia({ reducedMotion: "reduce" });
				await page.waitForTimeout(600);
				const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
				for (const v of axe.violations) {
					const msg = `axe ${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s), e.g. ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`;
					(config.a11y.failOn.includes(v.id) ? errors : warnings).push(msg);
				}
				await page.emulateMedia({ reducedMotion: "no-preference" });
			}

			if (blocked.length) errors.push(`[${name}] requests to other origins are not allowed (only Google Fonts):\n` + [...new Set(blocked)].slice(0, 10).map((u) => `  - ${u}`).join("\n"));
			if (!page.url().startsWith(designUrl)) errors.push(`[${name}] the page navigated away to ${page.url()}; designs must not redirect.`);
			if (found.overflowX > 1) errors.push(`[${name}] page scrolls horizontally by ${found.overflowX}px at ${viewport.width}px wide.`);
			if (consoleErrors.length) errors.push(`[${name}] browser errors:\n` + [...new Set(consoleErrors)].slice(0, 15).map((e) => `  - ${e}`).join("\n"));

			if (snapDir) {
				await toTop(page);
				await page.waitForTimeout(2500); // let intro animations finish
				fs.mkdirSync(snapDir, { recursive: true });
				const file = path.join(snapDir, `${name}.jpg`);
				await page.screenshot({ path: file, type: "jpeg", quality: 78 });
				screenshots[name] = file;
			}
			await context.close();
		}
	} finally {
		await browser.close();
	}
	return { ok: errors.length === 0, errors, warnings, screenshots };
}

export function formatReport({ ok, errors, warnings }) {
	const lines = [ok ? "✅ All checks passed." : `❌ ${errors.length} check(s) failed:`];
	errors.forEach((e, i) => lines.push(`\n${i + 1}. ${e}`));
	if (warnings.length) lines.push(`\n⚠️  Warnings (do not block publishing):`, ...warnings.map((w) => `  - ${w}`));
	return lines.join("\n");
}
