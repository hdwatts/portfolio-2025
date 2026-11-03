#!/usr/bin/env node
// Re-runs the publishing checks against an already-built design in public/v/<date>/
// using this checkout's trusted tooling. Nothing is built, so no agent-authored
// Node code runs; the page's own JS runs only inside headless Chromium.
import { checkDesign, formatReport } from "./lib/check.mjs";
import { DATE_RE, publishDir } from "./lib/paths.mjs";

const date = process.argv[2];
if (!DATE_RE.test(date ?? "")) {
	console.error("Usage: node redesign/verify-published.mjs <YYYY-MM-DD>");
	process.exit(2);
}
const result = await checkDesign({ date, buildDir: publishDir(date) });
console.log(formatReport(result));
process.exit(result.ok ? 0 : 1);
