#!/usr/bin/env node
// Gemini CLI BeforeTool hook: keeps the agent inside designs/<date>/.
// This is the first line of defence; the pipeline also verifies the git diff
// afterwards and rejects the run if anything outside the sandbox changed.
import fs from "node:fs";
import path from "node:path";

const arg = (name) => process.argv[process.argv.indexOf(`--${name}`) + 1];
const SANDBOX = path.resolve(arg("sandbox"));
const MEDIA = path.resolve(arg("media"));
const LOG = arg("log");

const MANAGED = new Set(["portfolio.json", "src/portfolio.d.ts", "GEMINI.md"].map((f) => path.join(SANDBOX, f)));
const READ_TOOLS = new Set(["read_file", "list_directory", "glob", "grep_search", "read_many_files"]);
const WRITE_TOOLS = new Set(["write_file", "replace"]);

let input = {};
try {
	input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
} catch {}
const tool = input.tool_name ?? "";
const args = input.tool_input ?? {};

const inside = (p, root) => {
	const rel = path.relative(root, p);
	return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
};
const resolve = (p) => {
	const abs = path.resolve(SANDBOX, String(p));
	try {
		return fs.realpathSync(abs); // defeat symlink escapes for existing paths
	} catch {
		return abs;
	}
};

function deny(reason) {
	fs.appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), event: "tool-denied", tool, args, reason }) + "\n");
	process.stdout.write(JSON.stringify({ decision: "deny", reason }));
	process.exit(0);
}

function checkShell(cmd) {
	const c = String(cmd);
	if (/^\s*npm run (check|snap)\s*$/.test(c)) return; // sanctioned helpers
	const banned = [
		[/(^|[\s;&|(=:'"])\.\.(\/|\s|$|['"])/, "parent-directory paths ('..') are not allowed"],
		[/(^|[\s;&|(=])~(\/|\s|$)/, "home-directory paths are not allowed"],
		[/\$HOME|\$\{HOME\}|\$GITHUB_|\$RUNNER_|\$GEMINI|\$\{GEMINI/, "reading environment secrets/paths is not allowed"],
		[/\b(printenv|env|set|export)\b\s*($|[;&|])/, "dumping the environment is not allowed"],
		[/(^|[\s;&|(])(git|gh|sudo|su|ssh|scp|curl|wget|nc|ncat|docker|chmod\s+[0-7]*s)\b/, "this command is not allowed in the sandbox"],
		[/\bnpm\s+(i|install|add)\b[^;&|]*\s(-g|--global|--force|--prefix|--location)/, "global/forced npm installs are not allowed"],
		[/\bnpm\s+(i|install|add)\b[^;&|]*(git\+|github:|https?:|file:)/, "installing packages from URLs/git/files is not allowed"],
		[/\b(npx|pnpm|yarn|bun)\b/, "use npm and the project's scripts only"],
		[/\bln\b/, "symlinks are not allowed"],
	];
	for (const [re, why] of banned) if (re.test(c)) deny(`Command rejected: ${why}. Stay inside ${SANDBOX}.`);
	// Absolute paths must point inside the sandbox (or harmless devices/tmp).
	for (const m of c.matchAll(/(?:^|[\s=:'"(<>])(\/[^\s'";|&)<>]*)/g)) {
		const p = m[1];
		if (p === "/" ) deny("Command rejected: the filesystem root is outside the sandbox.");
		if (/^\/(dev\/null|tmp\/)/.test(p) || inside(path.resolve(p), SANDBOX)) continue;
		// URL-ish paths used as arguments (e.g. grep "/media/x") are fine if they don't exist on disk.
		if (!fs.existsSync(p)) continue;
		deny(`Command rejected: ${p} is outside the sandbox ${SANDBOX}.`);
	}
}

if (tool === "run_shell_command") {
	if (args.dir_path && !inside(resolve(args.dir_path), SANDBOX)) deny("dir_path must be inside the sandbox.");
	checkShell(args.command);
} else if (READ_TOOLS.has(tool) || WRITE_TOOLS.has(tool)) {
	const targets = [args.file_path, args.dir_path, args.path].filter(Boolean).map(resolve);
	for (const t of targets) {
		const okRead = inside(t, SANDBOX) || (READ_TOOLS.has(tool) && inside(t, MEDIA));
		if (!okRead) deny(`${t} is outside the sandbox ${SANDBOX}.`);
		if (WRITE_TOOLS.has(tool) && !inside(t, SANDBOX)) deny(`Writes must stay inside ${SANDBOX}.`);
		if (WRITE_TOOLS.has(tool) && MANAGED.has(t)) deny(`${path.relative(SANDBOX, t)} is managed by the pipeline and must not be edited. Read data from it instead.`);
	}
	if (tool === "read_many_files") {
		for (const pat of [].concat(args.include ?? [])) {
			if (String(pat).includes("..") || path.isAbsolute(String(pat))) deny("read_many_files patterns must be relative and inside the sandbox.");
		}
	}
}
process.stdout.write(JSON.stringify({ decision: "allow" }));
