// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import vercelStatic from "@astrojs/vercel";
import sitemap from "@astrojs/sitemap";

// The home page is replaced after build by the latest weekly design
// (see redesign/finalize-site.mjs). Astro owns /history, the resume, and the
// fallback home page used before any design exists.
export default defineConfig({
	site: "https://hdwatts.com",
	integrations: [
		sitemap({
			filter: (page) => !page.includes("hidden__"),
		}),
	],
	output: "static",
	adapter: vercelStatic({
		webAnalytics: { enabled: true },
	}),
	vite: {
		plugins: [tailwindcss()],
	},
});
