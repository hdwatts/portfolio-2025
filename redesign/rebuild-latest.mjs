#!/usr/bin/env node
// Re-publishes the latest design against the current data/portfolio.json
// (run after you edit your data). Older designs stay frozen with the data
// they were built with. Exits non-zero, changing nothing, if checks fail.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { listDesigns, publishDir, designDir, designBase, writeJson } from "./lib/paths.mjs";
import { buildDesign } from "./lib/build-design.mjs";
import { checkDesign, formatReport } from "./lib/check.mjs";

const latest = listDesigns().filter((d) => d.url && !d.legacy).at(-1);
if (!latest) {
	console.log("No published designs; nothing to rebuild.");
	process.exit(0);
}
const { date } = latest;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `rebuild-${date}-`));
buildDesign(date, { outDir: tmp, base: designBase(date) });
const result = await checkDesign({ date, buildDir: tmp, snapDir: tmp });
console.log(formatReport(result));
fs.rmSync(path.join(designDir(date), "node_modules"), { recursive: true, force: true });
if (!result.ok) {
	// Leave the published build untouched; the publish job's re-verification will report it.
	process.exit(0);
}
for (const [name, file] of Object.entries(result.screenshots)) fs.renameSync(file, path.join(tmp, `_screenshot-${name}.jpg`));
fs.rmSync(publishDir(date), { recursive: true, force: true });
fs.cpSync(tmp, publishDir(date), { recursive: true });
writeJson(path.join(designDir(date), "design.json"), { ...latest, warnings: result.warnings, dataUpdatedAt: new Date().toISOString() });
console.log(`Rebuilt ${designBase(date)} with current data.`);
