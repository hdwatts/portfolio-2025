// Decides whether a design's dependencies need human approval. Pure JSON
// reading, safe to run in the publish job.
import fs from "node:fs";
import path from "node:path";
import { TEMPLATE_DIR, designDir, readJson, loadConfig } from "./paths.mjs";

const deps = (pkg) => ({ ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}), ...(pkg.optionalDependencies ?? {}), ...(pkg.peerDependencies ?? {}) });

/** Map of "node_modules/<name>" -> lock entry, excluding the root project entry. */
function lockEntries(file) {
	const lock = readJson(file);
	return new Map(Object.entries(lock.packages ?? {}).filter(([k]) => k !== ""));
}

export function packageReview(date) {
	const tpl = deps(readJson(path.join(TEMPLATE_DIR, "package.json")));
	const pkg = readJson(path.join(designDir(date), "package.json"));
	const cur = deps(pkg);
	const pre = loadConfig().preapprovedPackages.names ?? [];
	const isPre = (n) => n in tpl || pre.some((p) => (p.endsWith("*") ? n.startsWith(p.slice(0, -1)) : p === n));
	const lockAdded = [];
	const added = Object.keys(cur).filter((n) => !isPre(n)).map((n) => `${n}@${cur[n]}`);
	const unusual = Object.entries(cur).filter(([, v]) => /^(git|https?:|file:|link:|github:|npm:)|\//.test(v)).map(([n, v]) => `${n}@${v}`);
	if (pkg.overrides || pkg.resolutions) unusual.push("package.json overrides/resolutions");

	// The lockfile is what actually gets installed, so it is checked too: every
	// package must come from the npm registry, and anything not in the template's
	// lockfile (new transitive deps, or a known name with a different tarball)
	// needs review.
	const lockPath = path.join(designDir(date), "package-lock.json");
	if (!fs.existsSync(lockPath)) unusual.push("missing package-lock.json");
	else {
		const tplLock = lockEntries(path.join(TEMPLATE_DIR, "package-lock.json"));
		const lock = lockEntries(lockPath);
		for (const [key, e] of lock) {
			if (e.resolved && !e.resolved.startsWith("https://registry.npmjs.org/")) unusual.push(`${key} resolves to ${e.resolved}`);
			else if (e.link) unusual.push(`${key} is a link`);
			// Bundled deps ship inside their parent's tarball, which the parent's integrity hash covers.
			if (!e.link && !e.inBundle && (!e.resolved || !e.integrity)) unusual.push(`${key} has no resolved URL or integrity hash`);
			const t = tplLock.get(key);
			if (!t) lockAdded.push(`${key}@${e.version}`);
			else if (t.version !== e.version) unusual.push(`${key} changed version ${t.version} → ${e.version}`);
			else if (t.integrity !== e.integrity || t.resolved !== e.resolved) unusual.push(`${key}@${e.version} tarball differs from template`);
		}
	}
	const lockOnly = lockAdded.filter((x) => !added.some((a) => x.startsWith(a.split("@")[0] + "@")));
	return { added, lockAdded: lockOnly, unusual, needsReview: added.length > 0 || unusual.length > 0 || lockOnly.length > 0 };
}

// CLI: node redesign/lib/packages.mjs <date>  -> prints true/false
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
	console.log(packageReview(process.argv[2]).needsReview);
}
