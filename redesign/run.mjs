#!/usr/bin/env node
// Weekly redesign orchestrator.
//
//   node redesign/run.mjs [--date YYYY-MM-DD] [--dry-run] [--replace]
//
// 1. Rolls random creative variants and renders redesign/prompt.md.
// 2. Scaffolds designs/<date>/ from redesign/template/.
// 3. Runs Gemini CLI inside that folder with sandbox + budget hooks and an
//    outer spend watchdog. Retries once with the checker's report as feedback.
// 4. Verifies nothing outside the sandbox changed and no secrets leaked.
// 5. Builds to public/v/<date>/, runs publishing checks, takes screenshots.
// 6. Writes designs/<date>/design.json and GitHub outputs (needs_review, cost).
//
// --dry-run skips Gemini and publishes the template placeholder, to test the pipeline for free.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import {
	ROOT, TEMPLATE_DIR, MEDIA_DIR, DATE_RE, designDir, publishDir, designBase,
	readJson, writeJson, loadConfig, loadData, listDesigns, todayNY,
} from "./lib/paths.mjs";
import { installDeps, buildDesign, syncManagedFiles } from "./lib/build-design.mjs";
import { checkDesign, formatReport } from "./lib/check.mjs";
import { spendFromTelemetry } from "./lib/budget.mjs";
import { packageReview } from "./lib/packages.mjs";

// ---------- args ----------
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);
const date = opt("date", todayNY());
const DRY = flag("dry-run");
if (!DATE_RE.test(date)) die(`Invalid --date ${date}`);

const config = loadConfig();
const data = loadData();
const SANDBOX = designDir(date);
const LOG_DIR = path.join(process.env.RUNNER_TEMP ?? os.tmpdir(), `redesign-${date}`);
fs.mkdirSync(LOG_DIR, { recursive: true });
const log = (...a) => console.log(`[redesign ${date}]`, ...a);

function die(msg, code = 1) {
	console.error(`\n✖ ${msg}`);
	try {
		fs.writeFileSync(path.join(LOG_DIR, "failure.md"), `### Weekly redesign ${date} failed\n\n${msg}\n`);
	} catch {}
	setOutput("failed", "true");
	process.exit(code);
}

function setOutput(key, value) {
	if (!process.env.GITHUB_OUTPUT) return;
	const v = String(value);
	if (v.includes("\n")) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}<<__EOF__\n${v}\n__EOF__\n`);
	else fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${v}\n`);
}

// ---------- 1. variants + prompt ----------
function rollVariants() {
	const { categories, avoidRepeatWithin } = readJson(path.join(ROOT, "redesign", "variants.json"));
	const recent = listDesigns().filter((d) => d.variants).slice(-avoidRepeatWithin);
	const picks = {};
	for (const [cat, options] of Object.entries(categories)) {
		const used = new Set(recent.map((d) => d.variants[cat]));
		const pool = options.filter((o) => !used.has(o));
		const from = pool.length ? pool : options;
		picks[cat] = from[crypto.randomInt(from.length)];
	}
	return { picks, recent };
}

function renderPrompt(picks, recent) {
	const tpl = fs.readFileSync(path.join(ROOT, "redesign", "prompt.md"), "utf8");
	const recentText = recent.length
		? recent.map((d) => `- ${d.date}: ${d.variants.style}; ${d.variants.palette}; ${d.variants.layout}`).join("\n")
		: "- (none yet; this is the first design)";
	return tpl
		.replaceAll("{{name}}", data.person.name)
		.replaceAll("{{date}}", date)
		.replaceAll("{{recent}}", recentText)
		.replaceAll("{{feedback}}", "")
		.replace(/\{\{(\w+)\}\}/g, (m, k) => picks[k] ?? m);
}

// ---------- 2. scaffold ----------
function scaffold(prompt) {
	if (fs.existsSync(SANDBOX)) {
		if (!flag("replace")) die(`${path.relative(ROOT, SANDBOX)} already exists. Pass --replace to overwrite it.`);
		fs.rmSync(SANDBOX, { recursive: true, force: true });
		fs.rmSync(publishDir(date), { recursive: true, force: true });
	}
	fs.cpSync(TEMPLATE_DIR, SANDBOX, { recursive: true, filter: (src) => !/node_modules|dist|\.snap/.test(path.relative(TEMPLATE_DIR, src)) });
	fs.writeFileSync(path.join(SANDBOX, "GEMINI.md"), prompt);
	syncManagedFiles(date);
	log("installing template dependencies");
	installDeps(date, { quiet: true });
}

// ---------- 3. Gemini ----------
function writeSettings(telemetryFile, hookLog, priorSpend) {
	const node = process.execPath;
	const hook = (name, extra) => `"${node}" "${path.join(ROOT, "redesign", "hooks", name)}" ${extra} --log "${hookLog}"`;
	const settings = {
		general: { enableAutoUpdate: false },
		privacy: { usageStatisticsEnabled: false },
		security: { auth: { selectedType: "gemini-api-key" } },
		model: { name: config.model, maxSessionTurns: config.maxSessionTurns },
		tools: { exclude: ["google_web_search", "web_fetch", "save_memory"] },
		telemetry: { enabled: true, target: "local", outfile: telemetryFile, logPrompts: false },
		hooksConfig: { enabled: true, notifications: false },
		hooks: {
			BeforeTool: [{ matcher: ".*", hooks: [{ type: "command", name: "sandbox-guard", command: hook("before-tool.mjs", `--sandbox "${SANDBOX}" --media "${MEDIA_DIR}"`), timeout: 15000 }] }],
			BeforeModel: [{ hooks: [{ type: "command", name: "budget-gate", command: hook("before-model.mjs", `--config "${path.join(ROOT, "redesign", "config.json")}" --telemetry "${telemetryFile}" --prior ${priorSpend}`), timeout: 15000 }] }],
		},
	};
	// System settings have the highest precedence and live outside the sandbox, so the agent cannot rewrite them.
	const file = path.join(LOG_DIR, `system-settings-${Date.now()}.json`);
	writeJson(file, settings);
	return file;
}

function runGemini({ prompt, attempt, priorSpend, resume }) {
	const telemetryFile = path.join(LOG_DIR, `telemetry-${attempt}.log`);
	const hookLog = path.join(LOG_DIR, "hooks.jsonl");
	const settingsFile = writeSettings(telemetryFile, hookLog, priorSpend);
	const streamFile = path.join(LOG_DIR, `stream-${attempt}.jsonl`);
	const args = ["-p", prompt, "-m", config.model, "--approval-mode=yolo", "--output-format", "stream-json", "--skip-trust"];
	if (resume) args.push("--resume", "latest");

	// Allowlisted environment: the Gemini key (unavoidable) and nothing else sensitive.
	const pass = ["PATH", "HOME", "TMPDIR", "LANG", "TERM", "GEMINI_API_KEY", "npm_config_cache", "PLAYWRIGHT_BROWSERS_PATH"];
	const env = {
		...Object.fromEntries(pass.filter((k) => process.env[k]).map((k) => [k, process.env[k]])),
		GEMINI_CLI_SYSTEM_SETTINGS_PATH: settingsFile,
		GEMINI_TELEMETRY_ENABLED: "true",
		GEMINI_TELEMETRY_TARGET: "local",
		GEMINI_TELEMETRY_OUTFILE: telemetryFile,
		GEMINI_TELEMETRY_LOG_PROMPTS: "false",
		npm_config_ignore_scripts: "true",
		npm_config_audit: "false",
		npm_config_fund: "false",
		CI: "true",
	};

	return new Promise((resolve) => {
		const bin = process.env.GEMINI_BIN ?? "gemini";
		// Own process group, so anything the agent backgrounds dies with it.
		const child = spawn(bin, args, { cwd: SANDBOX, env, stdio: ["ignore", "pipe", "pipe"], detached: true });
		const killGroup = (sig) => {
			try {
				process.kill(-child.pid, sig);
			} catch {}
		};
		const out = fs.createWriteStream(streamFile);
		let buf = "";
		let finalText = "";
		let resultStats = null;
		let killedFor = null;
		let tampered = false;
		child.stdout.on("data", (chunk) => {
			out.write(chunk);
			buf += chunk;
			let i;
			while ((i = buf.indexOf("\n")) >= 0) {
				const line = buf.slice(0, i);
				buf = buf.slice(i + 1);
				try {
					const ev = JSON.parse(line);
					if (ev.type === "message" && ev.role === "assistant") finalText = ev.delta ? finalText + (ev.content ?? "") : (ev.content ?? finalText);
					if (ev.type === "tool_use") ((finalText = ""), log(`tool: ${ev.tool_name ?? "?"}`));
					if (ev.type === "result") resultStats = ev.stats ?? ev;
				} catch {}
			}
		});
		child.stderr.on("data", (c) => fs.appendFileSync(path.join(LOG_DIR, `stderr-${attempt}.log`), c));

		const deadline = Date.now() + 45 * 60_000;
		// Telemetry is append-only. If a byte we've already seen changes or the file
		// shrinks, someone rewrote it to hide spend: stop and fail the run.
		let seenLen = 0;
		let seenHash = "";
		const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
		const watchdog = setInterval(() => {
			if (fs.existsSync(telemetryFile)) {
				const buf = fs.readFileSync(telemetryFile);
				if (buf.length < seenLen || sha(buf.subarray(0, seenLen)) !== seenHash) tampered = true;
				seenLen = buf.length;
				seenHash = sha(buf);
			} else if (seenLen > 0) tampered = true;
			const spent = priorSpend + spendFromTelemetry(telemetryFile, config.pricing).usd;
			if (tampered) killedFor = "telemetry file was modified during the run";
			else if (spent >= config.budgetUsd) killedFor = `budget ($${spent.toFixed(2)} ≥ $${config.budgetUsd})`;
			else if (Date.now() > deadline) killedFor = "45-minute timeout";
			if (killedFor) {
				log(`watchdog: stopping Gemini for ${killedFor}`);
				killGroup("SIGTERM");
				setTimeout(() => killGroup("SIGKILL"), 10_000).unref();
				clearInterval(watchdog);
			}
		}, 2000);

		child.on("close", (code) => {
			clearInterval(watchdog);
			killGroup("SIGKILL"); // reap leftover background processes
			out.end();
			const usage = spendFromTelemetry(telemetryFile, config.pricing);
			resolve({ code, usage, finalText: finalText.trim(), resultStats, killedFor, tampered });
		});
	});
}

// ---------- 4. sandbox + secret guard ----------
const gitStatus = () =>
	new Set(
		execFileSync("git", ["status", "--porcelain=v1", "-uall", "--no-renames"], { cwd: ROOT, encoding: "utf8" })
			.split("\n")
			.filter(Boolean)
			.map((l) => l.slice(3)),
	);

function verifySandbox(before) {
	const rel = path.relative(ROOT, SANDBOX) + "/";
	const escaped = [...gitStatus()].filter((f) => !before.has(f) && !f.startsWith(rel));
	if (escaped.length) die(`Sandbox violation: the agent changed files outside ${rel}:\n${escaped.map((f) => `- ${f}`).join("\n")}`);

	const offenders = [];
	const walk = (dir) => {
		for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
			if (e.name === "node_modules") continue;
			const full = path.join(dir, e.name);
			if (e.isSymbolicLink()) offenders.push(`symlink ${path.relative(ROOT, full)}`);
			else if (e.isDirectory()) walk(full);
			else if (process.env.GEMINI_API_KEY && fs.statSync(full).size < 5e6 && fs.readFileSync(full, "utf8").includes(process.env.GEMINI_API_KEY))
				offenders.push(`API key found in ${path.relative(ROOT, full)}`);
		}
	};
	walk(SANDBOX);
	if (offenders.length) die(`Sandbox violation:\n${offenders.map((o) => `- ${o}`).join("\n")}`);
}

// ---------- main ----------
const { picks, recent } = rollVariants();
const prompt = renderPrompt(picks, recent);
log("variants:", picks);
scaffold(prompt);

const before = gitStatus();
let spend = 0;
let tokens = { input: 0, output: 0, calls: 0 };
let summary = "";
let result = null;
let attempts = 0;

for (let attempt = 1; attempt <= (DRY ? 1 : config.attempts); attempt++) {
	attempts = attempt;
	if (!DRY) {
		if (!process.env.GEMINI_API_KEY) die("GEMINI_API_KEY is not set.");
		if (spend >= config.budgetUsd - config.budgetSafetyMarginUsd) {
			log("no budget left for another attempt");
			break;
		}
		const instruction =
			attempt === 1
				? "Follow the instructions in GEMINI.md and build this week's portfolio design now."
				: `The publishing checks failed. Fix every problem below, re-run \`npm run check\` until it passes, then stop.\n\n${formatReport(result)}`;
		log(`attempt ${attempt}: running Gemini (${config.model}), spent so far $${spend.toFixed(2)}`);
		const run = await runGemini({ prompt: instruction, attempt, priorSpend: spend, resume: attempt > 1 });
		spend += run.usage.usd;
		tokens = { input: tokens.input + run.usage.inputTokens, output: tokens.output + run.usage.outputTokens, calls: tokens.calls + run.usage.calls };
		summary = run.finalText || summary;
		if (run.tampered) die(`The agent's telemetry file was modified during attempt ${attempt}, so spend can't be trusted. Run aborted.`);
		log(`attempt ${attempt}: exit ${run.code}${run.killedFor ? ` (stopped: ${run.killedFor})` : ""}, $${run.usage.usd.toFixed(2)} over ${run.usage.calls} calls`);
		verifySandbox(before);
	}

	try {
		buildDesign(date, { outDir: publishDir(date), base: designBase(date), quiet: true });
	} catch (e) {
		result = { ok: false, errors: [`Build failed:\n${String(e.stderr ?? "")}${String(e.stdout ?? "")}${e.message}`.slice(0, 6000)], warnings: [] };
		log(formatReport(result));
		continue;
	}
	result = await checkDesign({ date, buildDir: publishDir(date), snapDir: publishDir(date) });
	log(formatReport(result));
	if (result.ok) break;
}

setOutput("cost", spend.toFixed(2));
if (!result?.ok) {
	fs.rmSync(publishDir(date), { recursive: true, force: true });
	die(`Design did not pass checks after ${attempts} attempt(s) ($${spend.toFixed(2)} spent).\n\n${result ? formatReport(result) : "No result."}\n\nLogs: workflow artifact \`redesign-logs-${date}\`.`);
}

// Rename screenshots into a stable public location and tidy the sandbox.
const shots = {};
for (const [name, file] of Object.entries(result.screenshots)) {
	const dest = path.join(publishDir(date), `_screenshot-${name}.jpg`);
	fs.renameSync(file, dest);
	shots[name] = `${designBase(date)}_screenshot-${name}.jpg`;
}
for (const junk of ["dist", ".snap", "node_modules", ".gemini"]) fs.rmSync(path.join(SANDBOX, junk), { recursive: true, force: true });

const pkgs = packageReview(date);
const design = {
	date,
	createdAt: new Date().toISOString(),
	dryRun: DRY || undefined,
	model: DRY ? null : config.model,
	geminiCliVersion: DRY ? null : config.geminiCliVersion,
	variants: picks,
	attempts,
	costUsd: Number(spend.toFixed(4)),
	tokens,
	packages: { added: pkgs.added, lockAdded: pkgs.lockAdded, unusual: pkgs.unusual },
	needsReview: pkgs.needsReview,
	screenshots: shots,
	url: designBase(date),
	warnings: result.warnings,
	agentSummary: summary.slice(0, 2000),
};
writeJson(path.join(SANDBOX, "design.json"), design);

const summaryMd = [
	`**Variants**`, ...Object.entries(picks).map(([k, v]) => `- ${k}: ${v}`),
	"", `**Cost:** $${spend.toFixed(2)} (${tokens.calls} model calls, ${attempts} attempt(s))`,
	pkgs.added.length ? `**New packages:** ${pkgs.added.join(", ")}` : "**New packages:** none",
	pkgs.unusual.length ? `**Unusual package specs:** ${pkgs.unusual.join(", ")}` : "",
	pkgs.lockAdded.length ? `**New packages in lockfile only:** ${pkgs.lockAdded.slice(0, 30).join(", ")}${pkgs.lockAdded.length > 30 ? ", …" : ""}` : "",
	result.warnings.length ? `\n**Warnings**\n${result.warnings.map((w) => `- ${w}`).join("\n")}` : "",
].filter((l) => l !== "").join("\n");
writeJson(path.join(LOG_DIR, "result.json"), { date, needsReview: pkgs.needsReview, costUsd: spend, dryRun: DRY });
fs.writeFileSync(path.join(LOG_DIR, "summary.md"), summaryMd + "\n");
setOutput("needs_review", pkgs.needsReview);
setOutput("date", date);
setOutput("summary", summaryMd);
log(`✅ published ${designBase(date)} ($${spend.toFixed(2)})${pkgs.needsReview ? " — NEEDS REVIEW (new packages)" : ""}`);
