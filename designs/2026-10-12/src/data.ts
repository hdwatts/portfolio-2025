// Typed access to the managed portfolio.json. Do not hardcode any text: render
// strings from `data`, and use `label(key)` for headings, buttons and UI copy.
import { createElement, type ReactNode } from "react";
import raw from "../portfolio.json";
import type { Portfolio, LabelKey } from "./portfolio";

export const data = raw as unknown as Portfolio;

/** Returns an approved UI label. `variant` picks among the approved alternatives. */
export function label(key: LabelKey, variant = 0): string {
	const options = data.labels[key];
	return options[Math.min(variant, options.length - 1)];
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Longest phrases first so "Chronograph Private Equity" wins over shorter overlaps.
const autolinks = [...data.autolinks].sort((a, b) => b.text.length - a.text.length);
const autolinkRe = autolinks.length
	? new RegExp(`(?<![\\p{L}\\p{N}])(${autolinks.map((l) => escapeRe(l.text)).join("|")})(?![\\p{L}\\p{N}])`, "gu")
	: null;

/**
 * Renders a data string with every data.autolinks phrase turned into a link.
 * Required for headline, summary, writing, experience highlights, and colophon
 * text. Style the links however this week's design wants via `className`.
 */
export function linkify(text: string, className?: string): ReactNode[] {
	if (!autolinkRe) return [text];
	const out: ReactNode[] = [];
	let last = 0;
	for (const m of text.matchAll(autolinkRe)) {
		const link = autolinks.find((l) => l.text === m[0])!;
		if (m.index > last) out.push(text.slice(last, m.index));
		out.push(createElement("a", { key: `${m.index}-${link.url}`, href: link.url, className }, m[0]));
		last = m.index + m[0].length;
	}
	if (last < text.length) out.push(text.slice(last));
	return out;
}
