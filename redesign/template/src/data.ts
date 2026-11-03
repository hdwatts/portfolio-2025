// Typed access to the managed portfolio.json. Do not hardcode any text: render
// strings from `data`, and use `label(key)` for headings, buttons and UI copy.
import raw from "../portfolio.json";
import type { Portfolio, LabelKey } from "./portfolio";

export const data = raw as unknown as Portfolio;

/** Returns an approved UI label. `variant` picks among the approved alternatives. */
export function label(key: LabelKey, variant = 0): string {
	const options = data.labels[key];
	return options[Math.min(variant, options.length - 1)];
}
