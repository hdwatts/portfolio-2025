// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";
import react from '@astrojs/react';
import vercelStatic from '@astrojs/vercel';
import pdf from 'astro-pdf'
import liveCode from 'astro-live-code'
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [react()/*, pdf({
pages: {
'/hidden__/resume': { path: 'resume.pdf' }
}
})*/, mdx(), liveCode({
  layout: '/src/components/blog/LiveCodeLayout.astro'
})],
  output: 'static',
  adapter: vercelStatic({
    webAnalytics: { enabled: true }
  }),
  vite: {
    plugins: [tailwindcss()]
  }
});