import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { DATA_FILE, TYPES_FILE, designDir, designBase } from "./paths.mjs";

/** Overwrite the pipeline-managed files inside a design (the agent must not own these). */
export function syncManagedFiles(date) {
	const dir = designDir(date);
	fs.copyFileSync(DATA_FILE, path.join(dir, "portfolio.json"));
	fs.mkdirSync(path.join(dir, "src"), { recursive: true });
	fs.copyFileSync(TYPES_FILE, path.join(dir, "src", "portfolio.d.ts"));
}

// Agent-authored code (vite.config.ts, plugins) runs during builds, so it gets
// an allowlisted environment: no API keys, tokens, or CI credentials.
const npmEnv = () => ({
	PATH: process.env.PATH,
	HOME: process.env.HOME,
	TMPDIR: process.env.TMPDIR ?? os.tmpdir(),
	LANG: process.env.LANG ?? "C.UTF-8",
	CI: "true",
	// No NODE_ENV here: "production" would make npm skip devDependencies (vite, tailwind).
	...(process.env.npm_config_cache ? { npm_config_cache: process.env.npm_config_cache } : {}),
	npm_config_ignore_scripts: "true",
	npm_config_audit: "false",
	npm_config_fund: "false",
});

export function installDeps(date, { quiet = false } = {}) {
	const dir = designDir(date);
	const lock = fs.existsSync(path.join(dir, "package-lock.json"));
	execFileSync("npm", [lock ? "ci" : "install", "--ignore-scripts", "--no-audit", "--no-fund"], {
		cwd: dir,
		stdio: quiet ? "pipe" : "inherit",
		env: npmEnv(),
	});
}

/**
 * Build a design with Vite. `base` and `outDir` are forced from the command line
 * so they win over whatever the agent put in vite.config.ts.
 */
export function buildDesign(date, { outDir, base = designBase(date), quiet = false } = {}) {
	const dir = designDir(date);
	syncManagedFiles(date);
	if (!fs.existsSync(path.join(dir, "node_modules"))) installDeps(date, { quiet });
	const vite = path.join(dir, "node_modules", ".bin", "vite");
	fs.rmSync(outDir, { recursive: true, force: true });
	execFileSync(vite, ["build", "--base", base, "--outDir", outDir, "--emptyOutDir", "--logLevel", quiet ? "error" : "warn"], {
		cwd: dir,
		stdio: quiet ? "pipe" : "inherit",
		env: npmEnv(),
	});
	if (!fs.existsSync(path.join(outDir, "index.html"))) throw new Error(`Build produced no index.html in ${outDir}`);
	return outDir;
}
