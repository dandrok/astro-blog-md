# ~/.file

A personal site that behaves like a Unix home directory: a working shell over a
virtual filesystem, the articles underneath it, and one plain reading view.

Live at [thedotfile.com](https://thedotfile.com/).

## What it is

One page (`/`) plus one page per article (`/<slug>/`). Nothing else.

- **The shell** — a real (small) shell in the browser: `ls`, `cd`, `cat`, `grep`,
  `vim`, pipelines, redirection, globs, history, tab completion, `man`, themes.
  The filesystem is generated at build time from the content collection, and
  writes are kept in a localStorage overlay (`reset -y` drops them).
- **The article list** — every post, server-rendered, revealed six at a time
  behind `load more`.
- **The article view** — 940px page, prose at `--measure`, no cards, no shadows.
- **Themes** — `matrix`, `amber`, `mono`, `light`, `nord`, all of them colouring
  the terminal and the page from one palette (`theme set theme=nord`).
- **Easter eggs** — `sl`, `sudo`, `cowsay`, `matrix`, `fortune`, and `doom`
  (a DDA raycaster drawn in the terminal).

## Structure

```
src/
├── pages/
│   ├── index.astro          the site: shell + article list
│   ├── [...slug].astro      one article
│   └── rss.xml.js
├── layouts/
│   ├── ShellLayout.astro    head + header + frame + footer
│   └── ArticleLayout.astro
├── components/
│   ├── site/                SiteHead, SiteHeader, SiteFooter, ThemeStyles
│   └── features/
│       ├── terminal/        TerminalWindow
│       └── writing/         ArticleList, ArticleRow
├── lib/
│   ├── read.ts              the post model (slugs, dedupe, reading time)
│   └── terminal/            shell core
│       ├── fs.ts            virtual filesystem + overlay
│       ├── args.ts          tokenizer, pipelines, flags
│       ├── shell.ts         env, cwd, exec, history, completion
│       ├── commands/        one object per command, grouped by area
│       ├── theme.ts         palettes (terminal + page)
│       ├── doom.ts          the raycaster
│       └── format.ts        ANSI helpers, markdown-to-terminal
├── styles/
│   ├── site.css             tokens + header/footer/frame
│   ├── shell.css            the terminal window
│   ├── writing.css          the article list
│   └── article.css          article + prose
└── content/blog/            the posts (Markdown)
```

Rules the code follows: one palette table drives terminal and page; one post
model feeds the shell and the list; `--page` / `--measure` are the only widths;
components never import each other's CSS.

## Development

```bash
npm install
npm run dev        # localhost:4321
npm run build
npm run test       # shell core, in node, no browser needed
npm run lint
npm run type-check
```

The shell is DOM-free by design (`src/lib/terminal`), so its behaviour is tested
in node; the page is verified with real keyboard events against the built HTML.
