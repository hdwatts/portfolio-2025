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
	// Never leave agent processes running behind a failure.
	if (process.env.REDESIGN_AGENT_USER) {
		for (let i = 0; i < 20; i++) {
			try {
				execFileSync("sudo", ["-n", "pkill", "-KILL", "-u", process.env.REDESIGN_AGENT_USER], { stdio: "pipe" });
			} catch {}
			try {
				execFileSync("sudo", ["-n", "pgrep", "-u", process.env.REDESIGN_AGENT_USER], { stdio: "pipe" });
			} catch {
				break;
			}
		}
	}
	try {
		fs.writeFileSync(path.join(LOG_DIR, "failure.md"), `### Weekly redesign ${date} failed\n\n${msg}\n`);
	} catch {}
	setOutput("failed", "true");
	process.exit(code);
}

function setOutput(key, value) {
	if (!process.env.GITHUB_OUTPUT) return;
	const v = String(value);
	if (v.includes("\n")) {
		// Random, unguessable delimiter so values can't terminate the heredoc early.
		const delim = `EOF_${crypto.randomBytes(16).toString("hex")}`;
		if (v.includes(delim)) throw new Error("output value contains its delimiter");
		fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}<<${delim}\n${v}\n${delim}\n`);
	}
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
// In CI the agent runs as a separate unprivileged user (REDESIGN_AGENT_USER,
// created by redesign/ci-design.sh). It owns only the sandbox and its own log
// dir, can read but not write the repo, cannot sudo, and cannot signal this
// process. Its CLI settings (hooks, telemetry, tool limits) live in a
// root-owned file, which Gemini CLI requires before it will honor them.
const AGENT_USER = process.env.REDESIGN_AGENT_USER || null;
const SETTINGS_DIR = "/etc/gemini-cli-redesign";
const AGENT_DIR = path.join(LOG_DIR, "agent"); // agent-writable: telemetry + hook log only (uploaded as logs)
// The agent's HOME (sessions, npm cache, tmp) stays OUT of the uploaded log dir, so
// nothing it plants there (e.g. symlinks to runner-only files) can reach the artifact.
const AGENT_HOME = AGENT_USER ? `/home/${AGENT_USER}` : path.join(LOG_DIR, "agent-home");
const sudo = (...args) => execFileSync("sudo", ["-n", ...args], { stdio: "pipe" });

/** Send a signal to every process owned by the agent user. */
function killAgent(sig = "SIGKILL") {
	try {
		sudo("pkill", `-${sig === "SIGKILL" ? "KILL" : "TERM"}`, "-u", AGENT_USER);
	} catch {}
}
/** Kill until `pgrep -u agent` finds nothing; fail the run if processes survive. */
function killAgentCompletely() {
	for (let i = 0; i < 20; i++) {
		killAgent("SIGKILL");
		try {
			sudo("pgrep", "-u", AGENT_USER);
		} catch {
			return; // pgrep exits non-zero when no processes match
		}
		execFileSync("sleep", ["0.5"]);
	}
	die(`Could not stop all processes owned by ${AGENT_USER}; aborting before touching its output.`);
}

let agentHomeReset = false;
function prepareAgentDir() {
	if (AGENT_USER && !agentHomeReset) {
		// Fresh HOME per date: nothing carries over from earlier dates' agents.
		sudo("rm", "-rf", AGENT_HOME);
		sudo("install", "-d", "-o", AGENT_USER, "-g", AGENT_USER, "-m", "0700", AGENT_HOME);
		agentHomeReset = true;
	}
	fs.mkdirSync(AGENT_DIR, { recursive: true });
	if (!AGENT_USER) fs.mkdirSync(AGENT_HOME, { recursive: true });
	if (AGENT_USER) {
		sudo("chown", "-R", `${AGENT_USER}:${AGENT_USER}`, AGENT_DIR, SANDBOX);
		sudo("chmod", "-R", "u+rwX,go+rX", AGENT_DIR);
	}
}

function writeSettings(attempt, telemetryFile, hookLog, priorSpend) {
	const node = AGENT_USER ? "node" : process.execPath;
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
	const draft = path.join(LOG_DIR, `system-settings-${attempt}.json`); // copy kept for the logs artifact
	writeJson(draft, settings);
	if (!AGENT_USER) return draft; // local --unsafe-local runs: the CLI will likely ignore this (see tripwire)
	const file = path.join(SETTINGS_DIR, `settings-${date}-${attempt}.json`);
	sudo("install", "-D", "-o", "root", "-g", "root", "-m", "0644", draft, file);
	sudo("chown", "root:root", SETTINGS_DIR);
	sudo("chmod", "0755", SETTINGS_DIR);
	return file;
}

function runGemini({ prompt, attempt, priorSpend, resume }) {
	const telemetryFile = path.join(AGENT_DIR, `telemetry-${attempt}.log`);
	const hookLog = path.join(AGENT_DIR, "hooks.jsonl");
	const settingsFile = writeSettings(attempt, telemetryFile, hookLog, priorSpend);
	const streamFile = path.join(LOG_DIR, `stream-${attempt}.jsonl`);
	const cliArgs = ["-p", prompt, "-m", config.model, "--approval-mode=yolo", "--output-format", "stream-json", "--skip-trust"];
	if (resume) cliArgs.push("--resume", "latest");

	// Allowlisted environment: the Gemini key (unavoidable) and nothing else sensitive.
	const env = {
		PATH: process.env.PATH,
		LANG: process.env.LANG ?? "C.UTF-8",
		HOME: AGENT_HOME,
		TMPDIR: AGENT_HOME,
		npm_config_cache: path.join(AGENT_HOME, ".npm"),
		...(process.env.PLAYWRIGHT_BROWSERS_PATH ? { PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH } : {}),
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
	const gemini = process.env.GEMINI_BIN ?? "gemini";

	return new Promise((resolve) => {
		let child;
		if (AGENT_USER) {
			// The key travels via --preserve-env (not argv); everything else is explicit.
			const assigns = Object.entries(env).map(([k, v]) => `${k}=${v}`);
			child = spawn("sudo", ["-n", "-u", AGENT_USER, "--preserve-env=GEMINI_API_KEY", "--", "/usr/bin/env", ...assigns, gemini, ...cliArgs], {
				cwd: SANDBOX,
				env: { PATH: process.env.PATH, GEMINI_API_KEY: process.env.GEMINI_API_KEY },
				stdio: ["ignore", "pipe", "pipe"],
			});
		} else {
			child = spawn(gemini, cliArgs, { cwd: SANDBOX, env: { ...env, GEMINI_API_KEY: process.env.GEMINI_API_KEY }, stdio: ["ignore", "pipe", "pipe"], detached: true });
		}
		const killAll = (sig) => {
			if (AGENT_USER) killAgent(sig);
			else {
				try {
					process.kill(-child.pid, sig);
				} catch {}
			}
		};
		const out = fs.createWriteStream(streamFile);
		let buf = "";
		let finalText = "";
		let resultStats = null;
		let killedFor = null;
		let tampered = false;
		let settingsIgnored = false;
		const stop = (why) => {
			if (killedFor) return;
			killedFor = why;
			log(`watchdog: stopping Gemini for ${why}`);
			killAll("SIGTERM");
			setTimeout(() => killAll("SIGKILL"), 10_000).unref();
		};
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
		let errText = "";
		child.stderr.on("data", (c) => {
			fs.appendFileSync(path.join(LOG_DIR, `stderr-${attempt}.log`), c);
			errText = (errText + c).slice(-8192);
			// Tripwire: without its system settings the CLI has no hooks and no budget gate.
			if (/Skipping system settings file/i.test(errText)) {
				settingsIgnored = true;
				stop("Gemini CLI ignored the locked settings file (no sandbox/budget hooks)");
			}
		});

		const deadline = Date.now() + 45 * 60_000;
		// Telemetry is append-only. If a byte we've already seen changes or the file
		// shrinks, someone rewrote it to hide spend: stop and fail the run.
		const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
		let seenLen = 0;
		let seenHash = sha(Buffer.alloc(0));
		const watchdog = setInterval(() => {
			if (fs.existsSync(telemetryFile)) {
				const data = fs.readFileSync(telemetryFile);
				if (data.length < seenLen || sha(data.subarray(0, seenLen)) !== seenHash) tampered = true;
				seenLen = data.length;
				seenHash = sha(data);
			} else if (seenLen > 0) tampered = true;
			const spent = priorSpend + spendFromTelemetry(telemetryFile, config.pricing).usd;
			if (tampered) stop("telemetry file was modified during the run");
			else if (spent >= config.budgetUsd) stop(`budget ($${spent.toFixed(2)} ≥ $${config.budgetUsd})`);
			else if (Date.now() > deadline) stop("45-minute timeout");
		}, 2000);

		child.on("close", (code) => {
			clearInterval(watchdog);
			if (AGENT_USER) killAgentCompletely();
			else killAll("SIGKILL"); // reap leftover background processes
			out.end();
			const usage = spendFromTelemetry(telemetryFile, config.pricing);
			resolve({ code, usage, finalText: finalText.trim(), resultStats, killedFor, tampered, settingsIgnored });
		});
	});
}

// ---------- build + check ----------
/** True if `needle` occurs in the file. Streams in overlapping chunks, so size never skips a file. */
function fileContains(file, needle) {
	const n = Buffer.from(needle);
	const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
	try {
		const chunk = Buffer.alloc(1 << 20);
		let carry = Buffer.alloc(0);
		for (;;) {
			const read = fs.readSync(fd, chunk, 0, chunk.length, null);
			if (read === 0) return false;
			const window = Buffer.concat([carry, chunk.subarray(0, read)]);
			if (window.includes(n)) return true;
			carry = window.subarray(Math.max(0, window.length - (n.length - 1)));
		}
	} finally {
		fs.closeSync(fd);
	}
}

/** Fail if the Gemini key appears in any regular file under dir (symlinks are refused elsewhere). */
function scanForKey(dir) {
	const key = process.env.GEMINI_API_KEY;
	if (!key) return;
	const walk = (d) => {
		for (const e of fs.readdirSync(d, { withFileTypes: true })) {
			const full = path.join(d, e.name);
			const st = fs.lstatSync(full);
			if (st.isDirectory()) walk(full);
			else if (st.isFile() && fileContains(full, key)) die(`Secret leak: the API key was found in ${path.relative(ROOT, full)}.`);
		}
	};
	walk(dir);
}

/** Copy a tree, refusing anything but regular files and directories. */
function copyRegularTree(src, dst) {
	fs.mkdirSync(dst, { recursive: true });
	for (const e of fs.readdirSync(src, { withFileTypes: true })) {
		const from = path.join(src, e.name);
		const to = path.join(dst, e.name);
		const st = fs.lstatSync(from);
		if (st.isDirectory()) copyRegularTree(from, to);
		else if (st.isFile()) fs.copyFileSync(from, to);
		else die(`Sandbox violation: build output contains a non-regular file: ${path.relative(SANDBOX, from)}`);
	}
}

async function buildAndCheck(attempt) {
	const dest = publishDir(date);
	fs.rmSync(dest, { recursive: true, force: true });
	if (!AGENT_USER) {
		// Local / dry runs: build in-process (no sudo-capable account is at stake).
		let r;
		try {
			buildDesign(date, { outDir: dest, base: designBase(date), quiet: true });
			r = await checkDesign({ date, buildDir: dest, snapDir: dest });
		} catch (e) {
			r = { ok: false, errors: [`Build failed:\n${String(e.stderr ?? "")}${String(e.stdout ?? "")}${e.message}`.slice(0, 6000)], warnings: [], screenshots: {} };
		}
		return r;
	}
	// CI: agent-authored code runs only as the agent user. Its verdict is advisory;
	// the publish job re-verifies independently.
	prepareAgentDir();
	const out = path.join(SANDBOX, ".publish");
	const json = path.join(AGENT_DIR, `check-${attempt}.json`);
	const env = [`PATH=${process.env.PATH}`, `HOME=${AGENT_HOME}`, `TMPDIR=${AGENT_HOME}`, `npm_config_cache=${path.join(AGENT_HOME, ".npm")}`, "CI=true", "LANG=C.UTF-8", ...(process.env.PLAYWRIGHT_BROWSERS_PATH ? [`PLAYWRIGHT_BROWSERS_PATH=${process.env.PLAYWRIGHT_BROWSERS_PATH}`] : [])];
	try {
		execFileSync("sudo", ["-n", "-u", AGENT_USER, "--", "/usr/bin/env", "-i", ...env, "node", path.join(ROOT, "redesign", "lib", "build-check.mjs"), "--date", date, "--out", out, "--json", json], { cwd: SANDBOX, stdio: "inherit", timeout: 15 * 60_000 });
	} catch {}
	killAgentCompletely();
	let r;
	try {
		r = JSON.parse(fs.readFileSync(json, "utf8"));
	} catch {
		return { ok: false, errors: ["Build/check produced no result."], warnings: [], screenshots: {} };
	}
	const outStat = fs.existsSync(out) ? fs.lstatSync(out) : null;
	if (outStat && !outStat.isDirectory()) die("Sandbox violation: .publish is not a real directory (symlink or special file).");
	verifySandbox(before); // symlink + key scan of everything the build step touched
	if (!outStat || !fs.existsSync(path.join(out, "index.html"))) return { ok: false, errors: r.errors?.length ? r.errors : ["Build produced no index.html."], warnings: [], screenshots: {} };
	copyRegularTree(out, dest);
	scanForKey(dest);
	const screenshots = {};
	for (const name of ["desktop", "mobile"]) if (fs.existsSync(path.join(dest, `${name}.jpg`))) screenshots[name] = path.join(dest, `${name}.jpg`);
	// The result JSON was written by the agent user: treat every string as untrusted.
	const clean = (list, max) =>
		(Array.isArray(list) ? list : [])
			.slice(0, 60)
			.map((x) => String(x).replace(/[\u0000-\u0008\u000B-\u001F\u007F\u2028\u2029]/g, " ").slice(0, max));
	return { ok: r.ok === true, errors: clean(r.errors, 6000), warnings: clean(r.warnings, 500).map((w) => w.replace(/\n/g, " ")), screenshots };
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
	// public/v/<date>/ is written by the pipeline itself (the agent user can't write it in CI).
	const published = path.relative(ROOT, publishDir(date)) + "/";
	const escaped = [...gitStatus()].filter((f) => !before.has(f) && !f.startsWith(rel) && !f.startsWith(published));
	if (escaped.length) die(`Sandbox violation: the agent changed files outside ${rel}:\n${escaped.map((f) => `- ${f}`).join("\n")}`);

	const offenders = [];
	const walk = (dir) => {
		for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
			if (e.name === "node_modules") continue;
			const full = path.join(dir, e.name);
			if (e.isSymbolicLink()) offenders.push(`symlink ${path.relative(ROOT, full)}`);
			else if (e.isDirectory()) walk(full);
			else if (process.env.GEMINI_API_KEY && e.isFile() && fileContains(full, process.env.GEMINI_API_KEY))
				offenders.push(`API key found in ${path.relative(ROOT, full)}`);
		}
	};
	walk(SANDBOX);
	if (offenders.length) die(`Sandbox violation:\n${offenders.map((o) => `- ${o}`).join("\n")}`);
}

// ---------- main ----------
if (!DRY && !AGENT_USER && !flag("unsafe-local"))
	die("Real runs need agent isolation (REDESIGN_AGENT_USER), which redesign/ci-design.sh sets up in GitHub Actions. Locally, Gemini CLI also ignores a non-root-owned settings file, so no sandbox or budget hooks would apply. Use --dry-run, or pass --unsafe-local if you accept that.");
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
		prepareAgentDir(); // every attempt: the pipeline reclaims the sandbox between attempts
		const run = await runGemini({ prompt: instruction, attempt, priorSpend: spend, resume: attempt > 1 });
		spend += run.usage.usd;
		tokens = { input: tokens.input + run.usage.inputTokens, output: tokens.output + run.usage.outputTokens, calls: tokens.calls + run.usage.calls };
		summary = run.finalText || summary;
		if (run.settingsIgnored) die(`Gemini CLI refused the locked settings file, so the sandbox and budget hooks were not active. Run aborted after $${spend.toFixed(2)}. See stderr-${attempt}.log in the logs artifact.`);
		if (run.tampered) die(`The agent's telemetry file was modified during attempt ${attempt}, so spend can't be trusted. Run aborted.`);
		log(`attempt ${attempt}: exit ${run.code}${run.killedFor ? ` (stopped: ${run.killedFor})` : ""}, $${run.usage.usd.toFixed(2)} over ${run.usage.calls} calls`);
		verifySandbox(before);
	}

	result = await buildAndCheck(attempt);
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
if (AGENT_USER) {
	killAgentCompletely();
	sudo("chown", "-R", `${process.getuid()}:${process.getgid()}`, SANDBOX);
}
verifySandbox(before); // no symlinks/secrets before the runner reads package.json or writes design.json
scanForKey(publishDir(date));
for (const junk of ["dist", ".snap", "node_modules", ".gemini", ".publish"]) fs.rmSync(path.join(SANDBOX, junk), { recursive: true, force: true });

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
fs.rmSync(path.join(SANDBOX, "design.json"), { force: true }); // replace, never write through, whatever is there
fs.writeFileSync(path.join(SANDBOX, "design.json"), JSON.stringify(design, null, "\t") + "\n", { flag: "wx" });

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
