#!/usr/bin/env node
// `npm run check` / `npm run snap` inside a design folder. Builds the design
// exactly as the pipeline will, then runs every publishing check.
import path from "node:path";
import { buildDesign } from "./build-design.mjs";
import { checkDesign, formatReport } from "./check.mjs";
import { DATE_RE } from "./paths.mjs";

const dir = process.cwd();
const date = path.basename(dir);
if (!DATE_RE.test(date)) {
	console.error(`Run this from a designs/<YYYY-MM-DD>/ folder (got ${dir}).`);
	process.exit(2);
}
const snap = process.argv.includes("--snap");
try {
	buildDesign(date, { outDir: path.join(dir, "dist") });
} catch (e) {
	console.log(`❌ Build failed:\n${e.stdout ?? ""}${e.stderr ?? ""}${e.message}`);
	process.exit(1);
}
const result = await checkDesign({ date, buildDir: path.join(dir, "dist"), snapDir: snap ? path.join(dir, ".snap") : undefined });
console.log(formatReport(result));
if (snap) console.log(`\nScreenshots: ${Object.values(result.screenshots).map((f) => path.relative(dir, f)).join(", ")}`);
process.exit(result.ok ? 0 : 1);
