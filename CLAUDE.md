# Terminal Blog: Dual-Mode Astro Blog with Interactive Terminal

This document outlines the architecture, best practices, and implementation details for a dual-mode blog built with Astro that features both traditional blog viewing and an interactive terminal emulator interface.

## Project Overview

**Core Concept**: A retro terminal-themed blog with dual-mode functionality:

- **Blog View**: Traditional scrollable blog interface with terminal styling
- **Terminal Mode**: Interactive command-line interface for navigating blog content

**Tech Stack**:

- Astro 5.15+ with Content Collections
- React 19+ with TypeScript
- Tailwind CSS 4+ for styling
- xterm.js for terminal emulation
- Zod for type validation

## MCP Server for Astro Documentation

**Critical:** During development, always use the **Astro MCP Server** with Claude AI to:

- Access real-time Astro documentation and best practices
- Get accurate, up-to-date guidance on Astro features and APIs
- Ensure you're following current Astro conventions and patterns
- Validate your implementation decisions against official documentation

When working with Claude, reference the MCP server for any Astro-specific questions to guarantee you're using the latest best practices and avoiding deprecated patterns.

## 1. Project Structure: Terminal Blog Architecture

The project follows a modular structure optimized for the dual-mode terminal blog experience:

```
/
├── public/                # Static assets (images, fonts, etc.)
├── src/
│   ├── components/        # Reusable components
│   │   ├── common/        # Simple, reusable components (Header, Footer, etc.)
│   │   └── features/      # Feature-specific components
│   │       └── terminal/  # Terminal functionality
│   │           ├── Terminal.tsx    # Main terminal React component
│   │           └── types/
│   │               └── terminal.ts # Terminal-specific types
│   ├── layouts/           # Page layouts
│   │   ├── TerminalLayout.astro  # Main layout with mode toggle
│   │   └── BlogPost.astro       # Individual blog post layout
│   ├── pages/             # File-based routes
│   │   ├── index.astro    # Home page
│   │   └── blog/
│   │       ├── index.astro      # Blog listing
│   │       └── [...slug].astro  # Individual posts
│   ├── styles/            # Global styles
│   │   └── global.css     # Terminal-themed styling with CRT effects
│   ├── types/             # Centralized TypeScript types
│   │   └── terminal.ts   # Terminal types (FileSystemNode, etc.)
│   ├── content/           # Content collections
│   │   └── blog/          # Blog posts (Markdown/MDX)
│   │       └── **/*.md
│   └── content.config.ts  # Content collection schemas
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

### Directory Purposes

- **`public/`**: Static assets served as-is (images, fonts, `robots.txt`)
- **`src/components/`**: Core of the modular approach
  - **`common/`**: Small, highly reusable presentational components (`Button.tsx`, `Icon.astro`, `Card.astro`)
  - **`features/`**: Feature-grouped components (e.g., `features/product-gallery/`)
- **`src/layouts/`**: Page layout templates
- **`src/pages/`**: File-based routing - files here become routes
- **`src/services/`**: Business logic and API interactions
- **`src/stores/`**: Nano Stores for global state management
- **`src/types/`**: Centralized TypeScript type definitions
- **`src/utils/`**: Pure utility functions
- **`src/content/`**: Content collections with Zod schemas

## 2. Content Collections with Zod

Astro's Content Collections provide type-safe content management using Zod schemas.

### Setup

Create `src/content/config.ts` to define your content schemas:

```typescript
// src/content/config.ts
import { z, defineCollection } from 'astro:content';

const blogCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    pubDate: z.date(),
    description: z.string(),
    author: z.string(),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  blog: blogCollection,
};
```

### Using Content Collections

```typescript
// In your pages
import { getCollection } from 'astro:content';

const blogPosts = await getCollection('blog', ({ data }) => {
  return !data.draft; // Filter out drafts
});
```

### Dynamic Routes

Create `src/pages/blog/[slug].astro` for individual posts:

```astro
---
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await post.render();
---

<article>
  <h1>{post.data.title}</h1>
  <Content />
</article>
```

## 3. TypeScript Best Practices

### Type Organization

Astro projects should follow a structured approach to TypeScript types:

#### Type Placement Strategy

1. **`src/types/`** - Centralized type definitions
   - Shared types used across multiple files
   - Domain models and entities
   - API response types
   - Common utility types

2. **Co-located types** - Types defined in component files
   - Component-specific props types
   - Local state types
   - Types used only within that file

#### Types vs Interfaces

**Prefer `type` over `interface` by default:**

```typescript
// ✅ Preferred - Use type
type ButtonProps = {
  variant: 'primary' | 'secondary';
  onClick: () => void;
  children: React.ReactNode;
};

// ❌ Avoid - Don't use interface unless extending
interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: () => void;
  children: React.ReactNode;
}
```

**Use `interface` only when:**

- Extending other interfaces (declaration merging)
- Defining public API contracts for libraries
- Working with classes (rare in modern React/Astro)

#### Type Definition Structure

```typescript
// src/types/blog.ts
export type BlogPost = {
  slug: string;
  title: string;
  pubDate: Date;
  author: Author;
  tags: string[];
  draft: boolean;
};

export type Author = {
  name: string;
  email: string;
  avatar?: string;
};

export type BlogPostPreview = Pick<BlogPost, 'slug' | 'title' | 'pubDate'>;
```

```typescript
// src/types/api.ts
export type ApiResponse<T> = {
  data: T;
  error?: string;
  status: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  totalPages: number;
  totalItems: number;
};
```

```typescript
// Component file with co-located types
// src/components/common/Button.tsx
type ButtonProps = {
  variant: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  onClick: () => void;
  children: React.ReactNode;
};

export function Button({ variant, size = 'md', onClick, children }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`btn-${variant} btn-${size}`}
    >
      {children}
    </button>
  );
}
```

### TypeScript Configuration

Ensure strict type checking in `tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@types/*": ["src/types/*"],
      "@stores/*": ["src/stores/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}
```

## 4. Terminal Architecture and Implementation

### Virtual File System

The terminal uses a virtual file system generated from Astro content collections:

```typescript
// TerminalLayout.astro generates the virtual file system
const virtualFileSystem = {
  'about.md': {
    type: 'file',
    content: 'About page content...',
  },
  posts: {
    type: 'dir',
    children: {
      'first-post.md': {
        type: 'file',
        content: 'Blog post content...',
      },
    },
  },
};
```

### Terminal Commands

Implemented commands follow a modular pattern:

```typescript
type TerminalCommand = {
  name: string;
  description: string;
  handler: (
    args: string[],
    state: TerminalState,
  ) => {
    output: string;
    newState?: Partial<TerminalState>;
  };
};
```

**Available Commands**:

- `help` - Shows available commands
- `ls [-la]` - Lists directory contents
- `cd [dir]` - Changes directory
- `cat [file]` - Displays file contents
- `clear` - Clears terminal screen
- `exit` - Returns to blog view

### Mode Toggle Implementation

The dual-mode system uses CSS classes and JavaScript:

```astro
<!-- TerminalLayout.astro -->
<button onclick="toggleMode()">[switch_mode]</button>

<script>
  function toggleMode() {
    document.body.classList.toggle('interactive-mode');
    // Show/hide terminal container
  }
</script>
```

### Terminal Styling

Terminal theme uses CSS variables for consistency:

```css
:root {
  --terminal-bg: #000000;
  --terminal-text: #00ff00;
  --terminal-link: #ffffff;
  --terminal-dim: #00cc00;
}

/* CRT effects */
body::before {
  background: linear-gradient(transparent 50%, rgba(0, 255, 0, 0.03) 50%);
}
```

## 5. State Management with Nano Stores

Astro recommends **Nano Stores** for global state management. Nano Stores are framework-agnostic, lightweight, and work seamlessly with Astro's islands architecture.

### Installation

```bash
npm install nanostores @nanostores/react
```

### Basic Store Setup

```typescript
// src/stores/cart.ts
import { atom, map } from 'nanostores';
import type { CartItem } from '@types/cart';

// Atom for simple values
export const cartOpen = atom(false);

// Map for complex objects
export const cartItems = map<Record<string, CartItem>>({});

// Actions
export function addToCart(item: CartItem) {
  cartItems.setKey(item.id, item);
}

export function removeFromCart(itemId: string) {
  const current = cartItems.get();
  const { [itemId]: removed, ...rest } = current;
  cartItems.set(rest);
}

export function toggleCart() {
  cartOpen.set(!cartOpen.get());
}
```

```typescript
// src/types/cart.ts
export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};
```

### Using Stores in React Components

```typescript
// src/components/features/cart/CartButton.tsx
import { useStore } from '@nanostores/react';
import { cartItems, cartOpen, toggleCart } from '@stores/cart';

export function CartButton() {
  const $cartItems = useStore(cartItems);
  const $cartOpen = useStore(cartOpen);

  const itemCount = Object.keys($cartItems).length;

  return (
    <button onClick={toggleCart}>
      Cart ({itemCount})
      {$cartOpen && <span>Open</span>}
    </button>
  );
}
```

### Using Stores in Astro Components

```astro
---
// src/components/features/cart/CartWidget.astro
import { CartButton } from './CartButton';
import { CartDrawer } from './CartDrawer';
---

<div class="cart-widget">
  <!-- Both components share the same store -->
  <CartButton client:load />
  <CartDrawer client:load />
</div>
```

### Advanced Store Patterns

```typescript
// src/stores/user.ts
import { atom, computed } from 'nanostores';
import type { User } from '@types/user';

export const user = atom<User | null>(null);

// Computed values derive from other stores
export const isAuthenticated = computed(user, ($user) => $user !== null);
export const userName = computed(user, ($user) => $user?.name ?? 'Guest');
```

### Persistent Stores

```typescript
// src/stores/preferences.ts
import { persistentAtom } from '@nanostores/persistent';
import type { UserPreferences } from '@types/preferences';

export const preferences = persistentAtom<UserPreferences>(
  'preferences',
  {
    theme: 'light',
    language: 'en',
  },
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  },
);
```

## 5. React and TypeScript Best Practices

### Core Principles

- **Functional Components**: Use functional components with Hooks exclusively
- **Partial Hydration**: Control interactivity with client directives:
  - `client:load` - Hydrate immediately on page load
  - `client:idle` - Hydrate when browser is idle
  - `client:visible` - Hydrate when component enters viewport
  - `client:media` - Hydrate based on media query
  - `client:only` - Skip SSR, render only on client

### Type Safety

```typescript
// Use co-located types for component props
type ButtonProps = {
  variant: 'primary' | 'secondary';
  onClick: () => void;
  children: React.ReactNode;
};

export function Button({ variant, onClick, children }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`btn-${variant}`}
    >
      {children}
    </button>
  );
}
```

### Form Validation with Zod

```typescript
// src/types/forms.ts
import { z } from 'zod';

export const contactSchema = z.object({
  email: z.string().email(),
  message: z.string().min(10),
  name: z.string().min(2),
});

export type ContactForm = z.infer<typeof contactSchema>;
```

```typescript
// Using in a React component
import { contactSchema, type ContactForm } from '@types/forms';

export function ContactForm() {
  const handleSubmit = (data: ContactForm) => {
    const result = contactSchema.safeParse(data);
    if (!result.success) {
      console.error(result.error);
      return;
    }
    // Process valid data
  };

  // ... rest of component
}
```

### Zero JavaScript by Default

Only hydrate what needs interactivity. Static content stays as HTML.

## 6. Component Size Guidelines

### Principles

- **Single Responsibility**: Each component should do one thing well
- **Keep Components Small**: Easier to test, understand, and reuse
- **Islands Architecture**: Create focused islands of interactivity
- **Extract Early**: If a component does multiple things, split it

### Refactoring Triggers

Consider splitting when a component:

- Exceeds 150-200 lines
- Manages state, fetches data, AND renders complex UI
- Has multiple unrelated concerns
- Is difficult to name concisely

### Bundle Analysis

```bash
npm install --save-dev rollup-plugin-visualizer
```

Add to `astro.config.mjs`:

```javascript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  vite: {
    plugins: [visualizer()],
  },
});
```

## 7. Tooling: ESLint, Prettier, and TypeScript

### Installation

```bash
npm install --save-dev \
  eslint eslint-plugin-astro \
  prettier prettier-plugin-astro \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  eslint-config-prettier
```

### ESLint Configuration

```javascript
// .eslintrc.cjs
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:astro/recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  overrides: [
    {
      files: ['*.astro'],
      parser: 'astro-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.astro'],
      },
    },
  ],
};
```

### Prettier Configuration

```javascript
// .prettierrc.cjs
module.exports = {
  plugins: ['prettier-plugin-astro'],
  overrides: [
    {
      files: '*.astro',
      options: {
        parser: 'astro',
      },
    },
  ],
};
```

### Package Scripts

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "lint": "eslint --ext .js,.ts,.astro .",
    "lint:fix": "eslint --ext .js,.ts,.astro . --fix",
    "format": "prettier --write .",
    "type-check": "tsc --noEmit"
  }
}
```

## 8. Testing with Vitest

### Installation

```bash
npm install --save-dev vitest @vitest/ui
```

### Configuration

```typescript
// vitest.config.ts
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

### Component Testing

```typescript
// tests/MyComponent.test.ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import MyComponent from '../src/components/MyComponent.astro';

test('MyComponent renders correctly', async () => {
  const container = await AstroContainer.create();
  const result = await container.renderToString(MyComponent, {
    props: {
      name: 'World',
    },
  });

  expect(result).toContain('Hello, World!');
});
```

### Utility Testing

```typescript
// tests/utils.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate } from '../src/utils/date';

describe('formatDate', () => {
  it('formats dates correctly', () => {
    const date = new Date('2025-11-05');
    expect(formatDate(date)).toBe('Nov 5, 2025');
  });
});
```

## 9. CI/CD Pipeline

### GitHub Actions for GitHub Pages

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v3
```

### Alternative Platforms

- **Vercel**: Use `@astrojs/vercel` adapter
- **Netlify**: Use `@astrojs/netlify` adapter
- **Cloudflare Pages**: Use `@astrojs/cloudflare` adapter

## 10. Example Blog Post

Create `src/content/blog/first-post.md`:

```markdown
---
title: 'Getting Started with Astro, React, and TypeScript'
pubDate: 2025-11-05
description: 'Learn how to build a modern blog with Astro, React, and TypeScript.'
author: 'Your Name'
tags: ['astro', 'react', 'typescript', 'web development']
draft: false
---

## Introduction

Welcome to my blog! This site demonstrates the power of combining Astro's static generation with React's interactivity and TypeScript's type safety.

## Why This Stack?

- **Astro**: Lightning-fast static sites with partial hydration
- **React**: Rich component ecosystem and familiar developer experience
- **TypeScript**: Catch errors early with static typing
- **Zod**: Runtime validation for forms and content

## Key Features

This blog includes:

- Type-safe content collections with Zod schemas
- Partial hydration for optimal performance
- Modern tooling with ESLint and Prettier
- Automated testing with Vitest

Stay tuned for more posts about web development!
```

## 11. Development Workflow Best Practices

### Using MCP During Development

When working on your Astro project:

- **Always consult the Astro MCP server** via Claude for questions about Astro APIs, patterns, and best practices
- **Verify implementation approaches** against the official docs through the MCP server
- **Check for deprecated features** before implementing new functionality
- **Ask about performance optimizations** specific to your use case
- **Validate routing patterns** and SSR/SSG strategies

### Key Questions to Ask the MCP

- "What's the current best practice for [specific feature]?"
- "Is this pattern still recommended in the latest Astro version?"
- "What's the most performant way to implement [feature]?"
- "Are there any gotchas with [specific API or integration]?"

## 12. Quick Start Checklist

- [ ] Install Astro: `npm create astro@latest`
- [ ] Add React: `npx astro add react`
- [ ] Install Zod: `npm install zod`
- [ ] Install Nano Stores: `npm install nanostores @nanostores/react`
- [ ] Create `src/types/` directory for centralized type definitions
- [ ] Create `src/stores/` directory for Nano Stores
- [ ] Verify MCP server is configured and accessible
- [ ] Configure ESLint and Prettier
- [ ] Set up Vitest for testing
- [ ] Create content collections with Zod schemas
- [ ] Configure path aliases in `tsconfig.json`
- [ ] Configure CI/CD pipeline
- [ ] Use Astro MCP server to validate your setup
- [ ] Start building!

## 13. Current Implementation Status

### ✅ Completed Features

1. **Terminal Theme & Styling**
   - Retro green-on-black color scheme
   - VT323 monospace font
   - CRT scanline effects
   - Text glow effects
   - Responsive design

2. **Dual-Mode System**
   - Mode toggle button `[switch_mode]`
   - Seamless switching between blog and terminal views
   - CSS-based mode management

3. **Terminal Emulator**
   - xterm.js integration with TypeScript support
   - Full command-line interface
   - Virtual file system navigation
   - Command history (up/down arrows)

4. **Virtual File System**
   - Generated from Astro content collections
   - `about.md` with help information
   - `posts/` directory with all blog posts
   - Type-safe file system structure

5. **Terminal Commands**
   - `help` - Shows available commands and descriptions
   - `ls [-la]` - Lists files and directories
   - `cd [dir]` - Directory navigation with `..` support
   - `cat [file]` - Display file contents
   - `clear` - Clear terminal screen
   - `exit` - Return to blog view

6. **Blog Integration**
   - All pages use TerminalLayout
   - Terminal-styled blog listing
   - Individual blog posts with terminal theme
   - Automatic content synchronization

### 🏗️ Architecture Decisions

- **xterm.js over jQuery Terminal**: Modern, TypeScript-friendly, actively maintained
- **React Component**: Leverages existing React integration
- **Content Collections**: Type-safe blog content management
- **Tailwind CSS**: Utility-first styling with custom terminal theme
- **Modular Structure**: Feature-based component organization

### 📦 Dependencies Added

```json
{
  "xterm": "^5.3.0",
  "@xterm/xterm": "^5.5.0",
  "@xterm/addon-fit": "^0.8.0"
}
```

### 🎯 Key Files

- `src/layouts/TerminalLayout.astro` - Main layout with mode toggle
- `src/components/features/terminal/Terminal.tsx` - Terminal React component
- `src/types/terminal.ts` - Terminal-specific TypeScript types
- `src/styles/global.css` - Terminal-themed global styles

## 14. Future Enhancements

### Potential Features

- File editing with `nano` command
- File search with `grep` command
- Command autocompletion with Tab
- Custom color themes
- Terminal sound effects
- File upload/download functionality
- Multi-user support with authentication

### Performance Optimizations

- Lazy loading terminal component
- Optimized bundle splitting
- Service worker for offline functionality

## Resources

- **Astro MCP Server** - Primary resource for development guidance (use with Claude)
- [Astro Documentation](https://docs.astro.build)
- [React Documentation](https://react.dev)
- [xterm.js Documentation](https://xtermjs.org/)
- [Zod Documentation](https://zod.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com)
