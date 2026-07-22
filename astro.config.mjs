// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Preload the kitbash CE registration chunk as soon as <head> is parsed.
 * Script stays in its normal Astro position (top of <body>); we only inject
 * modulepreload so the download races the rest of the HTML on long posts.
 *
 * @returns {import('astro').AstroIntegration}
 */
function kitbashModulePreload() {
  return {
    name: 'kitbash-module-preload',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const root = fileURLToPath(dir);
        /** @type {string[]} */
        const htmlFiles = [];

        async function walk(dirPath) {
          const entries = await fs.readdir(dirPath, { withFileTypes: true });
          for (const entry of entries) {
            const full = path.join(dirPath, entry.name);
            if (entry.isDirectory()) await walk(full);
            else if (entry.name.endsWith('.html')) htmlFiles.push(full);
          }
        }

        await walk(root);

        const scriptRe =
          /<script type="module" src="(\/_astro\/SiteLayout\.astro_astro_type_script_index_0_lang\.[^"]+\.js)"><\/script>/;

        for (const file of htmlFiles) {
          let html = await fs.readFile(file, 'utf8');
          const match = html.match(scriptRe);
          if (!match) continue;
          if (html.includes(`rel="modulepreload" href="${match[1]}"`)) continue;

          const inject = `<link rel="modulepreload" href="${match[1]}" />`;
          html = html.replace('</head>', `${inject}</head>`);
          await fs.writeFile(file, html);
        }
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: 'https://thedotfile.com',
  integrations: [mdx(), sitemap(), kitbashModulePreload()],

  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
