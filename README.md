# .file

Personal notes, projects, and write-ups presented like a Unix home directory.

This repository powers [thedotfile.com](https://thedotfile.com/), an Astro-based blog with a dotfile-inspired interface, terminal-flavored typography, and light/night theme support.

## Features

- Dotfile-style branding built around `~/.file`
- Markdown and MDX blog posts with Astro Content Collections
- Reusable layouts for homepage, blog archive, and post pages
- Terminal-inspired visual language without a real terminal emulator
- Theme toggle with `light` and `night` modes
- Default theme follows system color preference until the user picks one
- RSS feed and sitemap generation

## Project Structure

```text
src/
├── components/
│   ├── common/
│   └── features/blog/
├── content/blog/
├── layouts/
│   ├── BlogPost.astro
│   └── SiteLayout.astro
├── pages/
│   ├── [...page].astro
│   ├── about.astro
│   └── blog/
├── styles/
│   └── global.css
└── content.config.ts
```

## Tech Stack

- Astro
- Markdown / MDX
- Tailwind CSS 4
- Vite
- Astro Content Collections
- Vitest

## Development

```bash
npm install
npm run dev
```

The local dev server runs at `http://localhost:4321`.

## Available Commands

| Command | Action |
| :-- | :-- |
| `npm run dev` | Start the local Astro dev server |
| `npm run build` | Build the production site into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run test:run` | Run tests once with Vitest |
| `npm run type-check` | Run TypeScript checks |

## Writing Posts

Add new posts in `src/content/blog/` as `.md` or `.mdx` files.

Example:

```markdown
---
title: "My New Post"
description: "Short summary of the post"
pubDate: 2026-04-07
---

## Overview

Post content goes here.
```

Supported frontmatter fields:

- `title`
- `description`
- `pubDate`
- `updatedDate` (optional)
- `heroImage` (optional)

## Theme

The site supports:

- `night`
- `light`

The default theme follows the user's system preference through `prefers-color-scheme`.  
Once a user toggles the theme manually, the choice is stored in `localStorage`.

The main theme logic lives in:

- `src/layouts/SiteLayout.astro`
- `src/components/common/ThemeToggle.astro`
- `src/styles/global.css`

## Content and Layout

- `src/pages/[...page].astro` is the homepage
- `src/pages/blog/index.astro` is the archive page
- `src/pages/about.astro` is the about page
- `src/layouts/BlogPost.astro` handles blog post pages

## Notes

This project used to include a more literal terminal-mode concept. The current version is intentionally simpler: it keeps the dotfile and terminal feel, but focuses on readable static pages and maintainable content.
