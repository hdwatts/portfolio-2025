// pagefind-copier.ts
import type { AstroIntegration } from "astro";
import { promises as fs } from "node:fs";
import * as path from "node:path";

export function pagefindCopier(): AstroIntegration {
  return {
    name: "pagefind-copier",
    hooks: {
      "astro:build:done": async ({ logger }) => {
        const buildLogger = logger.fork("pagefind-copier");
        buildLogger.info("Copying pagefind files from dist to Vercel output");

        try {
          const distPath = "./dist/client";
          const vercelPath = "./.vercel/output/static";
          const pagefindSourceDir = path.join(distPath, "pagefind");
          const pagefindDestDir = path.join(vercelPath, "pagefind");

          await fs.mkdir(vercelPath, { recursive: true });
          await fs.mkdir(pagefindDestDir, { recursive: true });

          async function copyDir(src: string, dest: string) {
            const entries = await fs.readdir(src, { withFileTypes: true });
            
            for (const entry of entries) {
              const srcPath = path.join(src, entry.name);
              const destPath = path.join(dest, entry.name);
              
              if (entry.isDirectory()) {
                await fs.mkdir(destPath, { recursive: true });
                await copyDir(srcPath, destPath);
              } else {
                await fs.copyFile(srcPath, destPath);
              }
            }
          }

          try {
            await fs.access(pagefindSourceDir);
          } catch (error) {
            buildLogger.warn("No pagefind directory found in dist");
            return;
          }

          await copyDir(pagefindSourceDir, pagefindDestDir);
          buildLogger.info("Successfully copied pagefind directory to Vercel output");

        } catch (error) {
          if (error instanceof Error) {
            buildLogger.error(`Error copying pagefind files: ${error.message}`);
          } else {
            buildLogger.error("An unknown error occurred while copying pagefind files");
          }
          throw error;
        }
      },
    },
  };
}