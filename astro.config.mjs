// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";
import react from '@astrojs/react';
import pdf from 'astro-pdf'

// https://astro.build/config
export default defineConfig({
  integrations: [react(), pdf({
    pages: {
      '/hidden__/resume': { path: 'resume.pdf' }
    }
  })],
  vite: {
    plugins: [tailwindcss()]
  }
});