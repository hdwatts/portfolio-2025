// Content Security Policies for agent-authored pages. Designs may only run
// scripts from this origin and may only reach Google Fonts; the root page
// additionally allows Google Analytics. The checker enforces DESIGN_CSP, so a
// design that breaks it fails before it can be published.
export const FONT_ORIGINS = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];

const base = {
	"default-src": ["'self'"],
	"script-src": ["'self'"],
	"style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
	"font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
	"img-src": ["'self'", "data:", "blob:"],
	"media-src": ["'self'", "blob:"],
	"connect-src": ["'self'"],
	"worker-src": ["'self'", "blob:"],
	"frame-src": ["'none'"],
	"object-src": ["'none'"],
	"base-uri": ["'self'"],
	"form-action": ["'none'"],
};

const serialize = (p) => Object.entries(p).map(([k, v]) => `${k} ${v.join(" ")}`).join("; ");

export const DESIGN_CSP = serialize(base);

// Google's documented GA4 requirements.
export const ROOT_CSP = serialize({
	...base,
	"script-src": [...base["script-src"], "https://*.googletagmanager.com"],
	"img-src": [...base["img-src"], "https://*.google-analytics.com", "https://*.googletagmanager.com"],
	"connect-src": [...base["connect-src"], "https://*.google-analytics.com", "https://*.analytics.google.com", "https://*.googletagmanager.com"],
});

export const cspMeta = (policy) => `<meta http-equiv="Content-Security-Policy" content="${policy}">`;

/**
 * Strict document prologue: optional doctype, <html ...>, then <head ...>, with
 * only whitespace between them (no comments). Returns the index just after the
 * real <head> tag, or -1. Used by both the checker and the injector so they can
 * never disagree about where <head> is.
 */
export function headEnd(html) {
	const m = html.match(/^\uFEFF?\s*(?:<!doctype html>\s*)?<html(?:\s[^<>]*)?>\s*<head(?:\s[^<>]*)?>/i);
	return m ? m[0].length : -1;
}
