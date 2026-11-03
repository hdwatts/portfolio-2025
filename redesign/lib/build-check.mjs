#!/usr/bin/env node
// Builds and checks a design, writing the result as JSON. In CI this runs as
// the unprivileged agent user (it executes agent-authored code: vite.config.ts,
// plugins, page JS), never as the sudo-capable runner.
//   node redesign/lib/build-check.mjs --date D --out DIR --json FILE
import fs from "node:fs";
import { buildDesign } from "./build-design.mjs";
import { checkDesign } from "./check.mjs";
import { designBase } from "./paths.mjs";

const arg = (n) => process.argv[process.argv.indexOf(`--${n}`) + 1];
const date = arg("date");
const out = arg("out");
let result;
try {
	buildDesign(date, { outDir: out, base: designBase(date), quiet: true });
	result = await checkDesign({ date, buildDir: out, snapDir: out });
} catch (e) {
	result = { ok: false, errors: [`Build failed:\n${String(e.stderr ?? "")}${String(e.stdout ?? "")}${e.message}`.slice(0, 6000)], warnings: [], screenshots: {} };
}
fs.writeFileSync(arg("json"), JSON.stringify(result));
