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
 * Strict document prologue: optional doctype, <html ...>, then a bare <head>,
 * separated only by HTML whitespace (no comments). Returns the index just after
 * the real <head> tag, or -1. Shared by the checker and the injector so they
 * can never disagree; the checker additionally confirms the result with a real
 * browser parse (see injectCsp + check.mjs).
 */
const WS = "[\\t\\n\\f\\r ]"; // HTML whitespace exactly (JS \\s is broader)
const ATTR = `${WS}+[a-z][a-z0-9-]*(?:${WS}*=${WS}*(?:"[^"<>]*"|'[^'<>]*'|[^\\t\\n\\f\\r "'<>=\`]+))?`;
const PROLOGUE = new RegExp(`^\\uFEFF?${WS}*(?:<!doctype${WS}+html>${WS}*)?<html(?:${ATTR})*${WS}*>${WS}*<head>`, "i");

export function headEnd(html) {
	const m = html.match(PROLOGUE);
	return m ? m[0].length : -1;
}

const CSP_META_RE = /<meta\b[^>]*http-equiv[\t\n\f\r ]*=[\t\n\f\r ]*["']?content-security-policy[^>]*>/gi;

/** Strip any CSP metas and insert ours first in <head>. Returns null if the prologue is not strict. */
export function injectCsp(html, policy, extra = "") {
	const stripped = html.replace(CSP_META_RE, "");
	const at = headEnd(stripped);
	return at < 0 ? null : stripped.slice(0, at) + cspMeta(policy) + extra + stripped.slice(at);
}
