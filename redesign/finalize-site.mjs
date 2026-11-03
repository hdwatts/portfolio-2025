#!/usr/bin/env node
// Post-build step (runs after `astro build`):
//   node redesign/finalize-site.mjs <outDir>
//
// - Replaces <outDir>/index.html with the latest published design (served at
//   / with absolute /v/<date>/ asset URLs, so it works unchanged at the root),
//   adding site-wide SEO tags, analytics and the timeline intro.
// - Marks archived /v/<date>/ pages noindex with a canonical pointing at /.
import fs from "node:fs";
import path from "node:path";
import { listDesigns, loadConfig, loadData } from "./lib/paths.mjs";
import { DESIGN_CSP, ROOT_CSP, injectCsp } from "./lib/csp.mjs";

const outDir = path.resolve(process.argv[2] ?? "dist");
const config = loadConfig();
const data = loadData();
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const designs = listDesigns();
// Strip any CSP the page carries and insert ours first inside the real <head>
// (see lib/csp.mjs). Pages that don't start with a strict prologue are refused.
function withCsp(html, policy, label, extra = "") {
	const out = injectCsp(html, policy, extra);
	if (out === null) {
		console.error(`finalize-site: ${label} does not start with <!doctype html><html><head>; refusing to publish it.`);
		process.exit(1);
	}
	return out;
}

const live = designs.filter((d) => d.url && !d.legacy && fs.existsSync(path.join(outDir, d.url, "index.html")));
const latest = live.at(-1);

for (const d of live) {
	const file = path.join(outDir, d.url, "index.html");
	let html = fs.readFileSync(file, "utf8");
	if (!html.includes('name="robots"')) {
		html = html.replace(/<\/head>/i, `<meta name="robots" content="noindex"><link rel="canonical" href="${esc(data.meta.siteUrl)}/">\n</head>`);
	}
	html = withCsp(html, DESIGN_CSP, file);
	fs.writeFileSync(file, html);
}

if (!latest) {
	console.log("finalize-site: no published designs yet; keeping the fallback home page.");
	process.exit(0);
}

const frames = designs
	.filter((d) => d.screenshots?.desktop && d.date <= latest.date)
	.slice(-config.timelineMaxFrames)
	.map((d) => ({ date: d.date, desktop: d.screenshots.desktop, mobile: d.screenshots.mobile ?? null }));

const timeline = {
	latest: latest.date,
	frames,
	labels: {
		skip: data.labels["action.skipIntro"][1] ?? data.labels["action.skipIntro"][0],
		replay: data.labels["action.replayIntro"][1] ?? data.labels["action.replayIntro"][0],
		present: data.labels["misc.present"][0],
	},
};

const ogImage = latest.screenshots?.desktop ? `${data.meta.siteUrl}${latest.screenshots.desktop}` : `${data.meta.siteUrl}${data.meta.ogImage}`;
const headStart = `
<meta name="hdw-intro" content="${esc(latest.date)}|${frames.length}">
<script src="/_intro/boot.js"></script>
<style>html.hdw-intro body{overflow:hidden}html.hdw-intro::after{content:"";position:fixed;inset:0;background:#09090b;z-index:2147483646}</style>`;

const seo = `
<meta name="description" content="${esc(data.meta.description)}">
<meta name="author" content="${esc(data.person.name)}">
<link rel="icon" href="/favicon.ico">
<link rel="canonical" href="${esc(data.meta.siteUrl)}/">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(data.meta.siteUrl)}/">
<meta property="og:title" content="${esc(data.meta.siteTitle)}">
<meta property="og:description" content="${esc(data.meta.description)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="sitemap" href="/sitemap-index.xml">
<meta name="hdw-design" content="${esc(latest.date)}">`;

const bodyEnd = `
<script type="application/json" id="hdw-timeline">${JSON.stringify(timeline).replace(/</g, "\\u003c")}</script>
<script src="/_intro/intro.js" defer></script>
<script src="/_intro/analytics.js"></script>
<script defer src="/_vercel/insights/script.js"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-PJGYL19J0K"></script>`;

let html = fs.readFileSync(path.join(outDir, latest.url, "index.html"), "utf8");
// Drop the archive-only tags added above, then add the root page's own.
html = html.replace(/<meta name="robots" content="noindex"><link rel="canonical"[^>]*>\n?/i, "");
html = html.replace(/<meta\s+name="description"[^>]*>/gi, "");
html = withCsp(html, ROOT_CSP, "home page", headStart);
html = html.replace(/<\/head>/i, `${seo}\n</head>`);
html = html.replace(/<\/body>/i, `${bodyEnd}\n</body>`);
fs.writeFileSync(path.join(outDir, "index.html"), html);
console.log(`finalize-site: home page = design ${latest.date} (${frames.length} timeline frames)`);
