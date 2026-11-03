// Computes Gemini spend from the CLI's local telemetry file. Shared by the
// in-CLI BeforeModel hook (hard stop before a call) and the outer watchdog.
import fs from "node:fs";

/** Extract top-level JSON values from a file of concatenated / pretty-printed JSON records. */
function* jsonRecords(text) {
	let depth = 0, start = -1, inStr = false, esc = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (inStr) {
			if (esc) esc = false;
			else if (c === "\\") esc = true;
			else if (c === '"') inStr = false;
			continue;
		}
		if (c === '"') inStr = true;
		else if (c === "{" || c === "[") {
			if (depth++ === 0) start = i;
		} else if (c === "}" || c === "]") {
			if (--depth === 0 && start >= 0) {
				try {
					yield JSON.parse(text.slice(start, i + 1));
				} catch {
					/* partial record still being written */
				}
				start = -1;
			}
		}
	}
}

const unwrapOtlp = (v) =>
	v && typeof v === "object" && !Array.isArray(v)
		? (v.intValue ?? v.doubleValue ?? v.stringValue ?? v.boolValue ?? v)
		: v;

/** Find every api_response-style usage object, whatever the exporter's JSON shape. */
function collectUsage(node, out) {
	if (!node || typeof node !== "object") return;
	if (Array.isArray(node)) {
		// OTLP attribute arrays: [{ key, value: { intValue } }]
		if (node.length && node.every((a) => a && typeof a === "object" && "key" in a && "value" in a)) {
			const map = Object.fromEntries(node.map((a) => [a.key, unwrapOtlp(a.value)]));
			if ("input_token_count" in map) return void out.push(map);
		}
		for (const n of node) collectUsage(n, out);
		return;
	}
	if ("input_token_count" in node && "output_token_count" in node) return void out.push(node);
	for (const v of Object.values(node)) collectUsage(v, out);
}

export function priceFor(model, pricing) {
	const key = Object.keys(pricing).find((k) => k !== "fallback" && k !== "_comment" && model?.startsWith(k));
	return pricing[key ?? "fallback"];
}

export function costOf(usage, pricing) {
	const p = priceFor(String(usage.model ?? ""), pricing);
	const n = (k) => Number(usage[k] ?? 0) || 0;
	const input = n("input_token_count") + n("tool_token_count");
	const output = n("output_token_count") + n("thoughts_token_count");
	const long = p.longContextThreshold > 0 && input > p.longContextThreshold;
	return (input * (long ? p.inputPer1MLong : p.inputPer1M) + output * (long ? p.outputPer1MLong : p.outputPer1M)) / 1e6;
}

/** @returns {{ usd: number, calls: number, inputTokens: number, outputTokens: number }} */
export function spendFromTelemetry(file, pricing) {
	const totals = { usd: 0, calls: 0, inputTokens: 0, outputTokens: 0 };
	if (!file || !fs.existsSync(file)) return totals;
	const seen = new Set();
	const usages = [];
	for (const rec of jsonRecords(fs.readFileSync(file, "utf8"))) collectUsage(rec, usages);
	for (const u of usages) {
		// The same response can appear in more than one record shape; dedupe.
		const id = [u.prompt_id, u.model, u.input_token_count, u.output_token_count, u.thoughts_token_count, u.duration_ms, u["event.timestamp"]].join("|");
		// Only dedupe when a timestamp makes the id unique; otherwise over-count (safe side).
		if (u["event.timestamp"]) {
			if (seen.has(id)) continue;
			seen.add(id);
		}
		totals.calls++;
		totals.inputTokens += Number(u.input_token_count ?? 0) + Number(u.tool_token_count ?? 0);
		totals.outputTokens += Number(u.output_token_count ?? 0) + Number(u.thoughts_token_count ?? 0);
		totals.usd += costOf(u, pricing);
	}
	return totals;
}
