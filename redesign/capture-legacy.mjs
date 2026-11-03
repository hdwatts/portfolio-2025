#!/usr/bin/env node
// Adds a screenshot-only "legacy" entry to the history/timeline.
//   node redesign/capture-legacy.mjs <url> <YYYY-MM-DD> ["note"]
// e.g. node redesign/capture-legacy.mjs https://hdwatts.com 2025-02-08 "The original hand-built portfolio."
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { DATE_RE, designDir, publishDir, writeJson, loadConfig } from "./lib/paths.mjs";

const [url, date, note = "The original hand-built portfolio."] = process.argv.slice(2);
if (!url || !DATE_RE.test(date ?? "")) {
	console.error('Usage: node redesign/capture-legacy.mjs <url> <YYYY-MM-DD> ["note"]');
	process.exit(2);
}
const { screenshots: sizes } = loadConfig();
fs.mkdirSync(publishDir(date), { recursive: true });
const browser = await chromium.launch();
const shots = {};
try {
	for (const [name, viewport] of Object.entries(sizes)) {
		const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
		await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
		await page.waitForTimeout(3000);
		await page.screenshot({ path: path.join(publishDir(date), `_screenshot-${name}.jpg`), type: "jpeg", quality: 78 });
		shots[name] = `/v/${date}/_screenshot-${name}.jpg`;
		await page.close();
	}
} finally {
	await browser.close();
}
fs.mkdirSync(designDir(date), { recursive: true });
writeJson(path.join(designDir(date), "design.json"), { date, legacy: true, url: null, note, source: url, capturedAt: new Date().toISOString(), screenshots: shots });
console.log(`Captured ${url} as legacy design ${date}.`);
