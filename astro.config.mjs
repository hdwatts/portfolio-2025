// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";
import react from '@astrojs/react';
import vercelStatic from '@astrojs/vercel';
import pdf from 'astro-pdf'
import mdx from '@astrojs/mdx';

import sitemap from '@astrojs/sitemap';
import { pagefindCopier } from './src/lib/pageFindCopier';

export default defineConfig({
  site: 'https://hdwatts.com',
  integrations: [react()/*, pdf({
pages: {
'/hidden__/resume': { path: 'resume.pdf' }
}
})*/, mdx(), sitemap(
  {
    filter: (page) => !page.includes('hidden__'),
  }
)],//, pagefindCopier()],
  output: 'static',
  adapter: vercelStatic({
    webAnalytics: { enabled: true }
  }),
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        external: '/pagefind/pagefind.js?url'
      }
    }
  }
});