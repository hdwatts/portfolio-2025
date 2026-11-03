#!/usr/bin/env node
// Publish job: rewrites designs/<date>/design.json from values it can vouch
// for. design.json comes from the untrusted design job and is rendered on
// /history and in the intro, so URLs are forced, variants must exist in
// variants.json, numbers must be numbers, and package review is recomputed.
import fs from "node:fs";
import path from "node:path";
import { ROOT, DATE_RE, designDir, publishDir, readJson, writeJson } from "./lib/paths.mjs";
import { packageReview } from "./lib/packages.mjs";

const date = process.argv[2];
if (!DATE_RE.test(date ?? "")) process.exit(2);
const file = path.join(designDir(date), "design.json");
let src = {};
try {
	src = readJson(file);
} catch {}

const { categories } = readJson(path.join(ROOT, "redesign", "variants.json"));
const variants = {};
for (const [cat, options] of Object.entries(categories)) {
	const v = src.variants?.[cat];
	if (typeof v === "string" && options.includes(v)) variants[cat] = v;
}
const num = (v) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");
const shots = {};
for (const name of ["desktop", "mobile"]) {
	if (fs.existsSync(path.join(publishDir(date), `_screenshot-${name}.jpg`))) shots[name] = `/v/${date}/_screenshot-${name}.jpg`;
}
const pkgs = packageReview(date);

writeJson(file, {
	date,
	createdAt: str(src.createdAt, 40),
	model: str(src.model, 80) || null,
	geminiCliVersion: str(src.geminiCliVersion, 20) || null,
	variants,
	attempts: num(src.attempts),
	costUsd: num(src.costUsd),
	tokens: { input: num(src.tokens?.input), output: num(src.tokens?.output), calls: num(src.tokens?.calls) },
	packages: { added: pkgs.added, lockAdded: pkgs.lockAdded, unusual: pkgs.unusual },
	needsReview: pkgs.needsReview,
	screenshots: shots,
	url: `/v/${date}/`,
	warnings: Array.isArray(src.warnings) ? src.warnings.filter((w) => typeof w === "string").slice(0, 50).map((w) => w.slice(0, 500)) : [],
	agentSummary: str(src.agentSummary, 2000),
});
console.log(pkgs.needsReview);
