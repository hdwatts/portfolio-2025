// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";
import react from '@astrojs/react';
import vercelStatic from '@astrojs/vercel';
import pdf from 'astro-pdf'
import mdx from '@astrojs/mdx';

import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://hdwatts.com',
  integrations: [react()/*, pdf({
pages: {
'/hidden__/resume': { path: 'resume.pdf' }
}
})*/, mdx(), sitemap()],
  output: 'static',
  adapter: vercelStatic({
    webAnalytics: { enabled: true }
  }),
  vite: {
    plugins: [tailwindcss()]
  }
});