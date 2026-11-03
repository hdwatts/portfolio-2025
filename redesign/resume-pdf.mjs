#!/usr/bin/env node
// Renders /hidden__/resume from a finished `astro build` into public/resume.pdf.
//   npm run build && npm run resume:pdf [-- <builtDir>]
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { chromium } from "playwright";
import { ROOT, PUBLIC_DIR } from "./lib/paths.mjs";

const built = path.resolve(process.argv[2] ?? path.join(ROOT, "dist"));
const page = path.join(built, "hidden__", "resume", "index.html");
if (!fs.existsSync(page)) {
	console.error(`No built resume at ${page}. Run \`npm run build\` first.`);
	process.exit(1);
}
const server = http.createServer((req, res) => {
	let file = path.join(built, decodeURIComponent(req.url.split("?")[0]));
	if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
	if (!file.startsWith(built) || !fs.existsSync(file)) return res.writeHead(404).end();
	res.writeHead(200, { "content-type": file.endsWith(".css") ? "text/css" : file.endsWith(".html") ? "text/html" : "application/octet-stream" });
	fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch();
try {
	const tab = await browser.newPage();
	await tab.goto(`http://127.0.0.1:${server.address().port}/hidden__/resume/`, { waitUntil: "networkidle" });
	await tab.pdf({ path: path.join(PUBLIC_DIR, "resume.pdf"), format: "Letter", printBackground: true, preferCSSPageSize: true });
	console.log("Wrote public/resume.pdf");
} finally {
	await browser.close();
	server.close();
}
