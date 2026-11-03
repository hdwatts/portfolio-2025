#!/usr/bin/env node
// Gemini CLI BeforeModel hook: refuses any model call that could push total
// spend past the budget. Spend = prior attempts + this session's telemetry +
// a pessimistic estimate of the call about to be made.
import fs from "node:fs";
import { spendFromTelemetry, priceFor } from "../lib/budget.mjs";

const arg = (name) => process.argv[process.argv.indexOf(`--${name}`) + 1];
const config = JSON.parse(fs.readFileSync(arg("config"), "utf8"));
const telemetry = arg("telemetry");
const prior = Number(arg("prior") ?? 0);
const budget = config.budgetUsd - config.budgetSafetyMarginUsd;

let input = {};
try {
	input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
} catch {}

const spent = prior + spendFromTelemetry(telemetry, config.pricing).usd;
const model = input.llm_request?.model ?? config.model;
const p = priceFor(model, config.pricing);
// ~4 chars per token for the outgoing request, plus a 32k-token output reserve, at long-context rates.
const estInputTokens = JSON.stringify(input.llm_request ?? {}).length / 4;
const estimate = (estInputTokens * p.inputPer1MLong + 32768 * p.outputPer1MLong) / 1e6;

if (spent + estimate > budget) {
	const reason = `Budget exhausted: $${spent.toFixed(2)} spent + ~$${estimate.toFixed(2)} for next call exceeds $${budget.toFixed(2)} cap.`;
	fs.appendFileSync(arg("log"), JSON.stringify({ at: new Date().toISOString(), event: "budget-stop", spent, estimate }) + "\n");
	process.stdout.write(JSON.stringify({ decision: "deny", reason, continue: false, stopReason: reason }));
} else {
	process.stdout.write(JSON.stringify({ decision: "allow" }));
}
