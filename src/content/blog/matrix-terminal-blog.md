---
title: 'Building a Terminal-Inspired Blog with Astro'
description: 'A simple look at how this Astro blog uses Markdown content, reusable layouts, and terminal-inspired styling without overcomplicating the setup.'
pubDate: 2025-11-08
tags: ['astro', 'css', 'design']
---

## Overview

This blog started from a simple idea: I wanted a personal site that felt a bit like an old green-screen terminal, but I did not want the codebase itself to become complicated.

At this point, the project is intentionally straightforward. It is an **Astro** blog with:

- Markdown and MDX posts,
- a shared site layout,
- reusable blog components,
- and a custom terminal-inspired visual style.

That combination gives me the look I want without turning the whole site into an experimental app.

## What the Project Looks Like Now

The current structure is small and easy to follow:

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
└── styles/global.css
```

There are a few important ideas behind that structure:

- `src/content/blog/` holds the actual posts.
- `src/pages/[...page].astro` renders the homepage with pagination.
- `src/pages/blog/[...slug].astro` renders individual posts.
- `src/layouts/SiteLayout.astro` wraps the whole site.
- `src/layouts/BlogPost.astro` handles the article page layout.
- `src/styles/global.css` contains the visual theme, including the terminal look and the CRT-style details.

## Why Astro Works Well Here

Astro is a good fit for this kind of site because most of the blog is just content and layout.

I do not need a heavy frontend framework for basic pages. I mostly need:

- fast static pages,
- clean routing,
- content collections,
- and a nice authoring experience for Markdown.

That keeps the site simple to maintain, which matters more to me than adding clever features I will have to clean up later.

## How Content Is Managed

Posts live in `src/content/blog/`, and Astro’s content collections make sure the frontmatter stays consistent.

Each post uses simple metadata like:

- `title`
- `description`
- `pubDate`
- optional `updatedDate`
- optional `heroImage`

That gives enough structure for the blog without making writing feel rigid.

## Layouts and Reusable Parts

The site uses two main layouts:

### `SiteLayout.astro`

This is the shared shell for the whole site. It includes:

- the base metadata setup,
- the footer,
- and the scroll-to-top button.

### `BlogPost.astro`

This layout is used for article pages. It adds:

- the post header,
- the published date,
- the optional hero image,
- and the table of contents on larger screens.

That split keeps the shared layout simple while giving blog posts a bit more structure.

## The Terminal Look

The visual theme is still one of the main ideas behind the project.

I wanted the site to feel like a terminal, but still be comfortable to read. So instead of building an actual shell interface, the current version focuses on presentation:

- green-on-dark colors,
- mono typography,
- terminal-like headings and labels,
- scanline and flicker effects,
- and simple navigation that fits the style.

That approach turned out to be better than trying to force everything into a fake command line.

## What I Tried to Keep Simple

There are a few places where it is easy to overdo a project like this. I tried not to.

For example:

- the blog is file-based instead of database-driven,
- the content is mostly plain Markdown,
- the layouts are small and focused,
- and the styling is centralized in one global stylesheet instead of being spread everywhere.

That makes the repo much easier to understand when I come back to it later.

## Current Tech Stack

Right now the stack is pretty small:

- **Astro**
- **Markdown / MDX**
- **Tailwind CSS**
- **Vite**
- **Astro Content Collections**

That is enough for this blog. It does not need much more.

## Final Thoughts

The nice thing about this version of the project is that it feels much closer to the original goal: a personal blog with a strong visual identity, but without unnecessary moving parts.

The site still has the terminal flavor, but the codebase is simpler, cleaner, and easier to maintain. For me, that is the better tradeoff.
