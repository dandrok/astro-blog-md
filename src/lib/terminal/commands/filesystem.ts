/** Filesystem commands: ls cd pwd tree stat find du mkdir touch rm cp mv. */

import { basename, dirname, normalize, type Node } from '../fs';
import { fg, formatDate, humanSize, permissionString, style, table } from '../format';
import type { Command, Ctx } from '../shell';

const sortEntries = (
  entries: { name: string; node: Node }[],
  opts: { byTime: boolean; reverse: boolean; all: boolean },
) => {
  let list = opts.all ? entries : entries.filter((entry) => !entry.name.startsWith('.'));
  list = [...list].sort((a, b) =>
    opts.byTime ? b.node.mtime - a.node.mtime : a.name.localeCompare(b.name),
  );
  if (opts.reverse) list.reverse();
  return list;
};

const LS_FLAGS = {
  a: 'bool',
  '1': 'bool',
  l: 'bool',
  t: 'bool',
  r: 'bool',
  h: 'bool',
  icons: 'bool',
} as const;

/**
 * Nerd-font glyphs, used by --icons. They only render on a patched font, so
 * the default listing is icon-free.
 */
const ICONS: Record<string, string> = {
  dir: '\uf07b',
  default: '\uf15b',
  md: '\uf48a',
  mdx: '\uf48a',
  txt: '\uf15c',
  json: '\ue60b',
  js: '\ue74e',
  mjs: '\ue74e',
  cjs: '\ue74e',
  ts: '\ue628',
  tsx: '\ue7ba',
  jsx: '\ue7ba',
  css: '\ue749',
  html: '\ue736',
  pdf: '\uf1c1',
  png: '\uf1c5',
  jpg: '\uf1c5',
  jpeg: '\uf1c5',
  webp: '\uf1c5',
  gif: '\uf1c5',
  svg: '\uf1c5',
  db: '\uf1c0',
  lock: '\uf023',
  sh: '\uf489',
  zsh: '\uf489',
  conf: '\ue615',
};

function iconFor(name: string, isDir: boolean): string {
  if (isDir) return ICONS.dir;
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  return ICONS[ext] ?? ICONS.default;
}

/** `18 Oct 08:49` — the eza/lsd date shape. */
function shortDate(mtime: number): string {
  const date = new Date(mtime);
  const month = date.toLocaleString('en-GB', { month: 'short' });
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getDate())} ${month} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const ls: Command = {
  name: 'ls',
  summary: 'List directory contents (eza-style: mode, size, owner, date).',
  usage: 'ls [-a] [-1] [-t] [-r] [--icons] [path...]',
  flags: LS_FLAGS,
  man: [
    'The default view is the long one, like `eza -l`: permissions, size,',
    'owner, modification time, name. Directories sort first.',
    '',
    '  -a       include dotfiles',
    '  -1       names only, one per line',
    '  -l       long view (the default; kept for muscle memory)',
    '  -t       sort by modification time, newest first',
    '  -r       reverse the sort',
    '  -h       accepted, sizes are human-readable anyway',
    '  --icons  nerd-font glyphs (needs a patched font; off by default)',
  ],
  run(ctx: Ctx) {
    const { flags, operands } = ctx.shell.parse(ctx.argv, LS_FLAGS);
    const showIcons = flags.has('icons');
    const targets = operands.length ? operands : ['.'];
    const chunks: string[] = [];

    for (const target of targets) {
      const path = normalize(target, ctx.cwd);
      const node = ctx.fs.get(path);
      if (!node) return { err: `ls: cannot access '${target}': No such file or directory`, code: 2 };

      if (node.type === 'file') {
        chunks.push(flags.has('1') ? fg.bright(basename(path)) : table([ezaRow(basename(path), node, ctx, showIcons)], 2));
        continue;
      }

      let entries = ctx.fs.list(path);
      if (!flags.has('a')) entries = entries.filter((entry) => !entry.name.startsWith('.'));
      entries = [...entries].sort((a, b) => {
        // directories first, then whatever sort was asked for
        if (a.node.type !== b.node.type) return a.node.type === 'dir' ? -1 : 1;
        return flags.has('t') ? b.node.mtime - a.node.mtime : a.name.localeCompare(b.name);
      });
      if (flags.has('r')) entries.reverse();

      if (targets.length > 1) chunks.push(fg.dim(`${path}:`));

      if (flags.has('1')) {
        chunks.push(entries.map((entry) => (entry.node.type === 'dir' ? fg.green(`${entry.name}/`) : fg.bright(entry.name))).join('\n'));
      } else {
        chunks.push(table(entries.map((entry) => ezaRow(entry.name, entry.node, ctx, showIcons)), 2));
      }
    }
    return { out: chunks.join('\n') + '\n' };
  },
};

function ezaRow(name: string, node: Node, ctx: Ctx, showIcons: boolean): string[] {
  const isDir = node.type === 'dir';
  const mode = permissionString(node.mode, isDir).replace(/^-(?=r|-)/, '.');
  const size = isDir ? '-' : humanSize(node.content.length);
  const icon = showIcons ? iconFor(name, isDir) + ' ' : '';
  const label = isDir ? fg.green(`${name}/`) : fg.bright(name);
  return [
    fg.dim(mode),
    fg.dim(size),
    fg.dim(ctx.env.USER ?? 'user'),
    fg.muted(shortDate(node.mtime)),
    icon + label,
  ];
}

export const cd: Command = {
  name: 'cd',
  summary: 'Change the working directory.',
  usage: 'cd [path]',
  man: ['Without an argument, goes to $HOME. `cd -` returns to the previous directory.', '', '  cd ~/writing', '  cd ..'],
  run({ argv, fs, cwd, env }: Ctx) {
    const target = argv[0] ?? '~';
    if (target === '-') {
      const previous = env.OLDPWD;
      if (!previous) return { err: 'cd: OLDPWD not set', code: 1 };
      const node = fs.get(previous);
      if (!node || node.type !== 'dir') return { err: `cd: ${previous}: no such directory`, code: 1 };
      // bash prints the directory it moved to
      return { out: `${previous}\n`, cwd: previous };
    }
    const path = normalize(target.replace(/^~/, env.HOME ?? '/home/dandrok'), cwd);
    const node = fs.get(path);
    if (!node) return { err: `cd: no such file or directory: ${target}`, code: 1 };
    if (node.type !== 'dir') return { err: `cd: not a directory: ${target}`, code: 1 };
    return { out: '', cwd: path };
  },
};

export const pwd: Command = {
  name: 'pwd',
  summary: 'Print the working directory.',
  usage: 'pwd',
  run({ cwd }: Ctx) {
    return { out: `${cwd}\n` };
  },
};

export const tree: Command = {
  name: 'tree',
  summary: 'Print a directory tree.',
  usage: 'tree [-L depth] [-a] [path]',
  flags: { L: 'value', a: 'bool' },
  man: ['  -L <n>  limit depth', '  -a      include dotfiles'],
  run({ argv, fs, cwd }: Ctx) {
    let depth = Infinity;
    let all = false;
    const operands: string[] = [];
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === '-L') depth = Number(argv[++i] ?? 3);
      else if (argv[i].startsWith('-L')) depth = Number(argv[i].slice(2) || 3);
      else if (argv[i] === '-a') all = true;
      else operands.push(argv[i]);
    }
    const root = normalize(operands[0] ?? '.', cwd);
    if (!fs.get(root)) return { err: `tree: ${operands[0] ?? '.'}: No such file or directory`, code: 1 };

    const lines = [fg.bright(root)];
    let dirs = 0;
    let files = 0;
    const walk = (path: string, prefix: string, level: number) => {
      if (level > depth) return;
      const entries = sortEntries(fs.list(path), { byTime: false, reverse: false, all });
      entries.forEach((entry, index) => {
        const last = index === entries.length - 1;
        const branch = last ? '└── ' : '├── ';
        if (entry.node.type === 'dir') {
          dirs++;
          lines.push(`${fg.dim(prefix + branch)}${fg.green(`${entry.name}/`)}`);
          walk(`${path}/${entry.name}`, prefix + (last ? '    ' : '│   '), level + 1);
        } else {
          files++;
          lines.push(`${fg.dim(prefix + branch)}${fg.bright(entry.name)}`);
        }
      });
    };
    walk(root, '', 1);
    lines.push('', fg.dim(`${dirs} directories, ${files} files`));
    return { out: lines.join('\n') + '\n' };
  },
};

export const stat: Command = {
  name: 'stat',
  summary: 'Show inode-style details for a path.',
  usage: 'stat <path...>',
  run({ argv, fs, cwd }: Ctx) {
    if (!argv.length) return { err: 'stat: missing operand', code: 1 };
    const out: string[] = [];
    for (const target of argv) {
      const path = normalize(target, cwd);
      const node = fs.get(path);
      if (!node) return { err: `stat: cannot statx '${target}': No such file or directory`, code: 1 };
      const size = node.type === 'file' ? node.content.length : fs.size(path);
      out.push(
        `  File: ${fg.bright(path)}`,
        `  Size: ${size} bytes  (${humanSize(size)})`,
        `  Type: ${node.type === 'dir' ? 'directory' : 'regular file'}`,
        `  Mode: ${permissionString(node.mode, node.type === 'dir')} (${node.mode.toString(8)})`,
        `Modify: ${formatDate(node.mtime, 'long')}`,
      );
      if (node.type === 'file') out.push(` Lines: ${node.content.split('\n').length}`);
    }
    return { out: out.join('\n') + '\n' };
  },
};

export const find: Command = {
  name: 'find',
  summary: 'Walk a tree and match names.',
  usage: 'find [path] [-name pattern] [-type f|d]',
  flags: { name: 'value', type: 'value' },
  man: ['  -name <glob>  match the file name ( * and ? )', '  -type f|d     regular files or directories'],
  run({ argv, fs, cwd }: Ctx) {
    let root = '.';
    let name: string | null = null;
    let type: string | null = null;
    const positional: string[] = [];
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === '-name') name = argv[++i] ?? null;
      else if (argv[i] === '-type') type = argv[++i] ?? null;
      else positional.push(argv[i]);
    }
    if (positional.length) root = positional[0];
    const start = normalize(root, cwd);
    if (!fs.get(start)) return { err: `find: '${root}': No such file or directory`, code: 1 };
    const regex = name ? new RegExp('^' + name.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$') : null;
    const hits: string[] = [];
    const walk = (path: string, node: Node) => {
      const matchesName = !regex || regex.test(basename(path));
      const matchesType = !type || (type === 'd' ? node.type === 'dir' : node.type === 'file');
      if (matchesName && matchesType) hits.push(path);
      if (node.type === 'dir') for (const entry of fs.list(path)) walk(`${path}/${entry.name}`, entry.node);
    };
    walk(start, fs.get(start)!);
    return { out: hits.map((hit) => `${hit}\n`).join('') || '' };
  },
};

export const du: Command = {
  name: 'du',
  summary: 'Total size of a directory tree.',
  usage: 'du [-h] [path]',
  flags: { h: 'bool' },
  run({ argv, fs, cwd }: Ctx) {
    const human = argv.includes('-h');
    const target = argv.find((a) => !a.startsWith('-')) ?? '.';
    const path = normalize(target, cwd);
    if (!fs.get(path)) return { err: `du: cannot access '${target}': No such file or directory`, code: 1 };
    const size = fs.size(path);
    return { out: `${human ? humanSize(size) : Math.ceil(size / 1024) + 'K'}\t${target}\n` };
  },
};

export const mkdir: Command = {
  name: 'mkdir',
  summary: 'Create directories.',
  usage: 'mkdir [-p] <name...>',
  flags: { p: 'bool' },
  run({ argv, fs, cwd }: Ctx) {
    const parents = argv.includes('-p');
    const names = argv.filter((a) => !a.startsWith('-'));
    if (!names.length) return { err: 'mkdir: missing operand', code: 1 };
    for (const name of names) {
      const result = fs.mkdir(normalize(name, cwd), parents);
      if (!result.ok) return { err: result.error ?? 'mkdir failed', code: 1 };
    }
    return {};
  },
};

export const touch: Command = {
  name: 'touch',
  summary: 'Create an empty file or bump mtime.',
  usage: 'touch <file...>',
  run({ argv, fs, cwd }: Ctx) {
    if (!argv.length) return { err: 'touch: missing file operand', code: 1 };
    for (const name of argv) {
      const result = fs.touch(normalize(name, cwd));
      if (!result.ok) return { err: result.error ?? 'touch failed', code: 1 };
    }
    return {};
  },
};

export const rm: Command = {
  name: 'rm',
  summary: 'Remove files or directories.',
  usage: 'rm [-rf] <path...>',
  flags: { r: 'bool', f: 'bool' },
  man: ['  -r  recursive', '  -f  ignore missing files'],
  run({ argv, fs, cwd }: Ctx) {
    const recursive = argv.some((a) => a.startsWith('-') && a.includes('r'));
    const force = argv.some((a) => a.startsWith('-') && a.includes('f'));
    const targets = argv.filter((a) => !a.startsWith('-'));
    if (!targets.length) return { err: 'rm: missing operand', code: 1 };
    // -f does not make / disappear, here least of all
    if (targets.some((target) => normalize(target, cwd) === '/')) {
      return { err: 'rm: refusing to remove / — nice try, but this filesystem is a JSON object, not your problems', code: 1 };
    }
    for (const target of targets) {
      const result = fs.remove(normalize(target, cwd), recursive);
      if (!result.ok && !force) return { err: result.error ?? 'rm failed', code: 1 };
    }
    return {};
  },
};

/**
 * Operands for cp/mv: `-r`/`-f` are accepted for muscle memory, `--` ends the
 * options, a lone `-` is a path, and anything else is rejected rather than
 * silently dropped.
 */
function operandsOrError(argv: string[], allowed: string, name: string): string[] | { error: string } {
  const out: string[] = [];
  let endOfFlags = false;
  for (const arg of argv) {
    if (endOfFlags || arg === '-' || !arg.startsWith('-')) {
      out.push(arg);
      continue;
    }
    if (arg === '--') {
      endOfFlags = true;
      continue;
    }
    const unknown = [...arg.slice(1)].find((char) => !allowed.includes(char));
    if (unknown) return { error: `${name}: invalid option -- '${unknown}'` };
  }
  return out;
}

export const cp: Command = {
  name: 'cp',
  summary: 'Copy files or directories.',
  usage: 'cp <source...> <dest>',
  run({ argv, fs, cwd }: Ctx) {
    const parsed = operandsOrError(argv, 'rRfv', 'cp');
    if (!Array.isArray(parsed)) return { err: parsed.error, code: 1 };
    const words = parsed; // copying is recursive anyway
    if (words.length < 2) return { err: 'cp: missing destination file operand', code: 1 };
    const dest = normalize(words[words.length - 1], cwd);
    const sources = words.slice(0, -1);
    const destIsDir = fs.isDir(dest);
    // several sources would all target the same name; only a directory can hold them
    if (sources.length > 1 && !destIsDir) {
      return { err: `cp: target '${words[words.length - 1]}' is not a directory`, code: 1 };
    }
    for (const source of sources) {
      const from = normalize(source, cwd);
      const to = destIsDir ? `${dest}/${basename(from)}` : dest;
      const result = fs.copy(from, to);
      if (!result.ok) return { err: result.error ?? 'cp failed', code: 1 };
    }
    return {};
  },
};

export const mv: Command = {
  name: 'mv',
  summary: 'Move or rename.',
  usage: 'mv <source...> <dest>',
  run({ argv, fs, cwd }: Ctx) {
    const parsed = operandsOrError(argv, 'fv', 'mv');
    if (!Array.isArray(parsed)) return { err: parsed.error, code: 1 };
    const words = parsed;
    if (words.length < 2) return { err: 'mv: missing destination file operand', code: 1 };
    const dest = normalize(words[words.length - 1], cwd);
    const sources = words.slice(0, -1);
    const destIsDir = fs.isDir(dest);
    if (sources.length > 1 && !destIsDir) {
      return { err: `mv: target '${words[words.length - 1]}' is not a directory`, code: 1 };
    }
    for (const source of sources) {
      const from = normalize(source, cwd);
      const to = destIsDir ? `${dest}/${basename(from)}` : dest;
      const result = fs.move(from, to);
      if (!result.ok) return { err: result.error ?? 'mv failed', code: 1 };
    }
    return {};
  },
};

export const file: Command = {
  name: 'file',
  summary: 'Guess the type of a file.',
  usage: 'file <path...>',
  run({ argv, fs, cwd }: Ctx) {
    const out: string[] = [];
    for (const target of argv) {
      const path = normalize(target, cwd);
      const node = fs.get(path);
      if (!node) {
        out.push(`${target}: cannot open`);
        continue;
      }
      if (node.type === 'dir') out.push(`${target}: directory`);
      else if (path.endsWith('.md') || path.endsWith('.mdx')) out.push(`${target}: Markdown document, ASCII text`);
      else if (path.endsWith('.json')) out.push(`${target}: JSON data`);
      else out.push(`${target}: ASCII text`);
    }
    return { out: out.join('\n') + '\n' };
  },
};

export const filesystemCommands: Command[] = [ls, cd, pwd, tree, stat, find, du, mkdir, touch, rm, cp, mv, file];

export { basename, dirname, style };