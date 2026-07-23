// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Join Astro `base` with a root-relative asset path (`/_astro/...`).
 * @param {string} base
 * @param {string} assetPath
 */
function withBase(base, assetPath) {
  const normalizedBase = (base || '/').replace(/\/$/, '');
  const pathPart = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  return `${normalizedBase}${pathPart}`;
}

/**
 * Prefer the entry that registers CEs (BaseHead), then stable locale sort.
 * @param {string[]} names
 */
function pickKitbashChunk(names) {
  /** @param {string} n */
  const score = (n) => {
    let s = 0;
    if (n.includes('BaseHead')) s += 100;
    if (n.includes('kitbash')) s += 50;
    if (n.includes('SiteLayout')) s += 10;
    return s;
  };
  return [...names].sort((a, b) => {
    const d = score(b) - score(a);
    return d !== 0 ? d : a.localeCompare(b);
  })[0];
}

/**
 * Preload the kitbash CE registration chunk as soon as <head> is parsed.
 * Finds the built module that registers kitbash CEs (name changes with
 * content hash / entry: BaseHead or SiteLayout) and injects modulepreload
 * so the download races the rest of the HTML on long posts.
 *
 * @returns {import('astro').AstroIntegration}
 */
function kitbashModulePreload() {
  /** @type {string} */
  let base = '/';
  /** @type {{ warn: (msg: string) => void } | undefined} */
  let logger;

  return {
    name: 'kitbash-module-preload',
    hooks: {
      'astro:config:setup': ({ config, logger: astroLogger }) => {
        base = config.base || '/';
        logger = astroLogger;
      },
      'astro:build:done': async ({ dir }) => {
        const root = fileURLToPath(dir);
        const astroDir = path.join(root, '_astro');
        /** @type {string[]} */
        const htmlFiles = [];

        /**
         * @param {string} dirPath
         */
        async function walk(dirPath) {
          const entries = await fs.readdir(dirPath, { withFileTypes: true });
          for (const entry of entries) {
            const full = path.join(dirPath, entry.name);
            if (entry.isDirectory()) await walk(full);
            else if (entry.name.endsWith('.html')) htmlFiles.push(full);
          }
        }

        await walk(root);

        /** @type {string[]} */
        const candidates = [];
        try {
          const assets = await fs.readdir(astroDir);
          for (const name of assets) {
            if (!name.endsWith('.js')) continue;
            const src = await fs.readFile(path.join(astroDir, name), 'utf8');
            // CE registration chunk imports / defines kitbash-toc (unique-ish).
            if (src.includes('kitbash-toc') || src.includes('KitbashToc')) {
              candidates.push(name);
            }
          }
        } catch {
          /* no _astro dir */
        }

        const chosen = pickKitbashChunk(candidates);
        if (!chosen) {
          logger?.warn(
            'kitbash-module-preload: no kitbash CE chunk found under _astro/; skipping modulepreload',
          );
          return;
        }

        const kitbashHref = withBase(base, `/_astro/${chosen}`);
        const inject = `<link rel="modulepreload" href="${kitbashHref}" />`;
        for (const file of htmlFiles) {
          let html = await fs.readFile(file, 'utf8');
          if (html.includes(`rel="modulepreload" href="${kitbashHref}"`)) continue;
          if (!html.includes('</head>')) continue;
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
