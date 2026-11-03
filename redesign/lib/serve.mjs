// Serves a design to Playwright without opening a port: every request to the
// fake origin is intercepted and fulfilled from disk, mimicking production:
//   /v/<date>/*  -> the design build      /media/*, /resume.pdf -> public/
//   /history     -> stub page             /                     -> the design
// Requests to other origins (e.g. Google Fonts) pass through to the network.
import fs from "node:fs";
import path from "node:path";
import { PUBLIC_DIR } from "./paths.mjs";

export const ORIGIN = "http://design.test";

const TYPES = {
	".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
	".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
	".webp": "image/webp", ".avif": "image/avif", ".gif": "image/gif", ".mp4": "video/mp4", ".webm": "video/webm",
	".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf", ".pdf": "application/pdf", ".ico": "image/x-icon",
	".txt": "text/plain", ".xml": "application/xml", ".wasm": "application/wasm",
};

export function resolveRequest(urlPath, { date, buildDir }) {
	const base = `/v/${date}/`;
	let url = decodeURIComponent(urlPath);
	if (url === "/history" || url === "/history/") return { stub: true };
	let root = PUBLIC_DIR;
	if (url === "/" || url === "/index.html") ((root = buildDir), (url = "/index.html"));
	else if (url.startsWith(base)) ((root = buildDir), (url = "/" + url.slice(base.length)));
	let file = path.join(root, url);
	if (!file.startsWith(root)) return null;
	if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
	return fs.existsSync(file) ? { file, type: TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream" } : null;
}

/** Install routing on a Playwright BrowserContext. Returns the design's URL. */
export async function routeDesign(context, opts) {
	await context.route(`${ORIGIN}/**`, async (route) => {
		const { pathname } = new URL(route.request().url());
		const hit = resolveRequest(pathname, opts);
		if (!hit) return route.fulfill({ status: 404, body: "not found" });
		if (hit.stub) return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>history</title>" });
		return route.fulfill({ status: 200, contentType: hit.type, body: fs.readFileSync(hit.file) });
	});
	return `${ORIGIN}/v/${opts.date}/`;
}
