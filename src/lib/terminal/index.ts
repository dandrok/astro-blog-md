/** Command registry + the seeded filesystem for the terminal site. */

import { FileSystem, type SeedEntry } from './fs';
import { slugify } from './slug';
import { Shell, type Command, type Env } from './shell';
import { filesystemCommands } from './commands/filesystem';
import { textCommands } from './commands/text';
import { sessionCommands } from './commands/session';
import { siteCommands } from './commands/site';
import { eggCommands } from './commands/eggs';

export type PostSeed = {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  body: string;
};

export const allCommands: Command[] = [
  ...filesystemCommands,
  ...textCommands,
  ...sessionCommands,
  ...siteCommands,
  ...eggCommands,
].sort((a, b) => a.name.localeCompare(b.name));

const README = `# ~/.file

A personal site that behaves like a Unix home directory.

  ls              what is here
  cd writing      the articles
  cat <file>      read one (markdown is rendered)
  vim <file>      edit it — :w writes to localStorage
  grep -ri vite   search the whole tree
  help            every command

Everything runs in this tab: a virtual filesystem built from the real
content collection, a small shell, and CodeMirror with vim keybindings.
`;

const ABOUT = `# about

Frontend engineer, ~6 years of TypeScript, React and Node.

Based in Poland. Currently freelancing — available immediately, no notice
period, open to B2B and remote work.

  github   github.com/dandrok
  mail     contact@thedotfile.com
`;

const CONFIG = `theme=matrix
font=mono
scanlines=off
cursor=bar
prompt={user}@{host}:{path}$ 
`;

export function buildSeed(posts: PostSeed[]): SeedEntry[] {
  const seed: SeedEntry[] = [
    { path: '/home/dandrok/README.md', content: README, mtime: Date.parse('2026-01-01') },
    { path: '/home/dandrok/about.md', content: ABOUT, mtime: Date.parse('2026-01-01') },
    { path: '/home/dandrok/.config/site.conf', content: CONFIG, mtime: Date.parse('2026-01-01') },
    { path: '/home/dandrok/.config/keys.md', content: KEYS, mtime: Date.parse('2026-01-01') },
    { path: '/etc/motd', content: 'welcome to ~/.file — type `help`\n', mode: 0o444, mtime: Date.parse('2026-01-01') },
    { path: '/usr/share/doc/site.md', content: DOCS, mode: 0o444, mtime: Date.parse('2026-01-01') },
  ];

  for (const post of posts) {
    const mtime = Date.parse(post.date) || Date.parse('2026-01-01');
    seed.push({
      path: `/home/dandrok/writing/${slugify(post.slug)}.md`,
      content: post.body || `# ${post.title}\n\n${post.description}\n`,
      mode: 0o444,
      mtime,
    });
  }
  return seed;
}

const KEYS = `# keys

  tab          complete a command or path
  up / down    history
  ctrl-l       clear
  ctrl-c       cancel the line
  ctrl-d       leave

In vim: modes, motions, operators, registers, macros. :w saves.
`;

const DOCS = `# how this works

The filesystem is generated at build time from the Astro content
collection, so every article is a file under ~/writing.

Writes (:w, touch, mkdir, redirection) go into a localStorage overlay
and survive a reload. "reset -y" drops the overlay.
`;

export function createShell(opts: {
  posts: PostSeed[];
  storage?: Storage | null;
  env?: Env;
  cwd?: string;
  extraSeed?: SeedEntry[];
}): Shell {
  const seed = [...buildSeed(opts.posts), ...(opts.extraSeed ?? [])];
  const fs = new FileSystem(seed, opts.storage ?? null);
  return new Shell({ fs, commands: allCommands, storage: opts.storage ?? null, env: opts.env, cwd: opts.cwd });
}

export { FileSystem, Shell };
export { slugify } from './slug';
export type { Command, CmdResult, Ctx, Effect, Env } from './shell';
export type { Node, SeedEntry } from './fs';
