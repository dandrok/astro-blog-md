# Terminal Blog - A Retro Terminal-Inspired Astro Blog

A dual-mode blog built with Astro that features a retro green-on-black terminal aesthetic with an interactive terminal emulator.

## ✨ Features

- **Dual-Mode Experience**: Switch between traditional blog view and interactive terminal mode
- **Retro Terminal Aesthetic**: Green-on-black matrix-style theme with CRT effects
- **Interactive Terminal**: Fully functional command-line interface with file system navigation
- **Modern Stack**: Built with Astro, React, TypeScript, and Tailwind CSS
- **Type-Safe**: Full TypeScript support with Zod validation
- **Performance Optimized**: Fast static site generation with partial hydration
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🚀 Project Structure

```text
├── public/                     # Static assets
├── src/
│   ├── components/
│   │   ├── common/            # Reusable components
│   │   └── features/
│   │       └── terminal/      # Terminal functionality
│   │           ├── Terminal.tsx
│   │           └── types/
│   │               └── terminal.ts
│   ├── content/
│   │   └── blog/              # Blog posts (Markdown/MDX)
│   ├── layouts/
│   │   ├── BlogPost.astro
│   │   └── TerminalLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   └── blog/
│   ├── styles/
│   │   └── global.css         # Terminal-themed styling
│   └── types/
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## 🎮 Terminal Commands

When in terminal mode, you can use these commands:

- `help` - Show all available commands
- `ls [-la]` - List files and directories in current location
- `cd [dir]` - Change directory (supports `..` for parent)
- `cat [file]` - Display file contents
- `clear` - Clear the terminal screen
- `exit` - Return to blog view

## 🛠️ Tech Stack

- **Framework**: Astro 5.15+ with Content Collections
- **UI**: React 19+ with TypeScript
- **Styling**: Tailwind CSS 4+ with custom terminal theme
- **Terminal**: xterm.js with fit addon
- **Validation**: Zod for type safety
- **Build**: Vite with modern tooling

## 🧞 Commands

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 🎨 Customization

### Terminal Theme
Edit `src/styles/global.css` to customize:
- Terminal colors (background, text, links)
- CRT effects intensity
- Font styling
- Animation speeds

### Virtual File System
The terminal's file system is generated from your blog content in `TerminalLayout.astro`. Modify the `virtualFileSystem` object to add custom files or directories.

### Commands
Add new terminal commands by extending the `createCommandHandlers` function in `src/components/features/terminal/Terminal.tsx`.

## 📝 Adding Blog Posts

1. Create new Markdown files in `src/content/blog/`
2. Add frontmatter with title, description, and pubDate
3. The terminal will automatically include them in the virtual file system

Example:
```markdown
---
title: "My New Post"
description: "A brief description"
pubDate: 2025-11-08
---

# My New Post

Content goes here...
```

## 🚀 Deployment

This project is ready for deployment on:

- **Netlify**: Connect your GitHub repository and enable auto-deploys
- **Vercel**: Import your repository for continuous deployment
- **GitHub Pages**: Use the provided workflow in `.github/workflows/`
- **Any static host**: Build with `npm run build` and deploy `./dist/`

## 🌟 Acknowledgments

- Built on the Astro Blog template
- Terminal powered by xterm.js
- Inspired by retro terminal aesthetics
- Following Astro + React best practices
