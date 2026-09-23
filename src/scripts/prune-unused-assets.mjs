// Astro copies the full-size original of every content-collection image into
// _astro/ even when pages only use resized versions. Any image in _astro/ that no
// built file references is dead weight in the deployment, so remove it.
import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] ?? ".vercel/output/static";
const assetDir = path.join(root, "_astro");
const imageExt = /\.(jpe?g|png|webp|avif|gif|tiff?)$/i;
const textExt = /\.(html|js|mjs|css|xml|json|txt|webmanifest|svg)$/i;

function walk(dir) {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		return entry.isDirectory() ? walk(full) : [full];
	});
}

const referenced = walk(root)
	.filter((file) => textExt.test(file))
	.map((file) => fs.readFileSync(file, "utf8"))
	.join("\n");

let removed = 0;
let bytes = 0;
for (const name of fs.readdirSync(assetDir)) {
	if (!imageExt.test(name) || referenced.includes(name)) continue;
	const file = path.join(assetDir, name);
	bytes += fs.statSync(file).size;
	fs.unlinkSync(file);
	removed++;
}

console.log(
	`Pruned ${removed} unreferenced images from ${assetDir} (${(bytes / 1024 / 1024).toFixed(1)} MB)`,
);
