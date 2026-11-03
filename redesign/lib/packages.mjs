// Decides whether a design's dependencies need human approval. Pure JSON
// reading, safe to run in the publish job.
import path from "node:path";
import { TEMPLATE_DIR, designDir, readJson, loadConfig } from "./paths.mjs";

const deps = (pkg) => ({ ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}), ...(pkg.optionalDependencies ?? {}), ...(pkg.peerDependencies ?? {}) });

export function packageReview(date) {
	const tpl = deps(readJson(path.join(TEMPLATE_DIR, "package.json")));
	const pkg = readJson(path.join(designDir(date), "package.json"));
	const cur = deps(pkg);
	const pre = loadConfig().preapprovedPackages.names ?? [];
	const isPre = (n) => n in tpl || pre.some((p) => (p.endsWith("*") ? n.startsWith(p.slice(0, -1)) : p === n));
	const added = Object.keys(cur).filter((n) => !isPre(n)).map((n) => `${n}@${cur[n]}`);
	const unusual = Object.entries(cur).filter(([, v]) => /^(git|https?:|file:|link:|github:|npm:)|\//.test(v)).map(([n, v]) => `${n}@${v}`);
	if (pkg.overrides || pkg.resolutions) unusual.push("package.json overrides/resolutions");
	return { added, unusual, needsReview: added.length > 0 || unusual.length > 0 };
}

// CLI: node redesign/lib/packages.mjs <date>  -> prints true/false
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
	console.log(packageReview(process.argv[2]).needsReview);
}
