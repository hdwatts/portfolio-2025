import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";

// Shared media lives in the main site at /media/*. In dev, serve it from the
// repo's public/media so absolute URLs work. Production builds never copy it.
const sharedMedia = (): Plugin => ({
	name: "shared-media",
	configureServer(server) {
		const root = path.resolve(__dirname, "../../public");
		server.middlewares.use("/media", (req, res, next) => {
			const file = path.join(root, "media", decodeURIComponent((req.url ?? "").split("?")[0]));
			if (!file.startsWith(path.join(root, "media")) || !fs.existsSync(file)) return next();
			fs.createReadStream(file).pipe(res);
		});
	},
});

export default defineConfig({
	plugins: [react(), tailwindcss(), sharedMedia()],
	// The pipeline overrides `base` with /v/<date>/ when publishing.
	base: "./",
});
