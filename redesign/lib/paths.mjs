import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const DESIGNS_DIR = path.join(ROOT, "designs");
export const PUBLIC_DIR = path.join(ROOT, "public");
export const MEDIA_DIR = path.join(PUBLIC_DIR, "media");
export const TEMPLATE_DIR = path.join(ROOT, "redesign", "template");
export const DATA_FILE = path.join(ROOT, "data", "portfolio.json");
export const TYPES_FILE = path.join(ROOT, "data", "portfolio.d.ts");

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const designDir = (date) => path.join(DESIGNS_DIR, date);
/** Frozen, published build of a design. Served at /v/<date>/. */
export const publishDir = (date) => path.join(PUBLIC_DIR, "v", date);
export const designBase = (date) => `/v/${date}/`;

export const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
export const writeJson = (file, value) =>
	fs.writeFileSync(file, JSON.stringify(value, null, "\t") + "\n");

export const loadConfig = () => readJson(path.join(ROOT, "redesign", "config.json"));
export const loadData = () => readJson(DATA_FILE);

/** All designs with a design.json, oldest first. */
export function listDesigns() {
	if (!fs.existsSync(DESIGNS_DIR)) return [];
	return fs
		.readdirSync(DESIGNS_DIR)
		.filter((d) => DATE_RE.test(d) && fs.existsSync(path.join(DESIGNS_DIR, d, "design.json")))
		.sort()
		.map((d) => readJson(path.join(DESIGNS_DIR, d, "design.json")));
}

/** Today's date in New York, as YYYY-MM-DD. */
export function todayNY() {
	return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}
