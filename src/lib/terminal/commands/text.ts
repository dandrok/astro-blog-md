/** Text commands: cat bat head tail wc grep nl sort uniq. */

import { normalize } from '../fs';
import { fg, renderMarkdown, style, table } from '../format';
import type { Command, Ctx } from '../shell';

function readTargets(argv: string[], ctx: Ctx): { name: string; content: string }[] | { error: string; code: number } {
  const targets = argv.filter((arg) => !arg.startsWith('-'));
  // no operands: behave like the real tools and read what came through the pipe
  if (!targets.length) return ctx.stdin ? [{ name: '(standard input)', content: ctx.stdin }] : { error: 'missing file operand', code: 1 };
  const files: { name: string; content: string }[] = [];
  for (const target of targets) {
    const path = normalize(target, ctx.cwd);
    const node = ctx.fs.get(path);
    if (!node) return { error: `cannot open '${target}': No such file or directory`, code: 1 };
    if (node.type === 'dir') return { error: `'${target}' is a directory`, code: 1 };
    files.push({ name: target, content: node.content });
  }
  return files;
}

export const cat: Command = {
  name: 'cat',
  summary: 'Print files (markdown is rendered, -r for raw).',
  usage: 'cat [-n] [-r] <file...>',
  flags: { n: 'bool', r: 'bool' },
  man: [
    'Prints file contents. Markdown is rendered with headings, lists and',
    'inline code so articles read well in the terminal.',
    '',
    '  -n  number lines',
    '  -r  raw output, no markdown rendering',
  ],
  run({ argv, ...rest }: Ctx) {
    const ctx = { argv, ...rest } as Ctx;
    const numbered = argv.includes('-n') || argv.some((a) => a.startsWith('-') && a.includes('n'));
    const raw = argv.some((a) => a.startsWith('-') && a.includes('r'));
    const files = readTargets(argv, ctx);
    if ('error' in files) return { err: `cat: ${files.error}`, code: files.code };
    return {
      out: files
        .map((entry) =>
          raw || !/\.mdx?$/.test(entry.name)
            ? entry.content
            : renderMarkdown(entry.content, { numbers: numbered }),
        )
        .join('\n'),
    };
  },
};

export const bat: Command = {
  name: 'bat',
  summary: 'cat with a header, line numbers and markdown rendering.',
  usage: 'bat <file...>',
  man: ['  bat ~/writing/pomo-doro-tui.md'],
  run(ctx: Ctx) {
    const files = readTargets(ctx.argv, ctx);
    if ('error' in files) return { err: `bat: ${files.error}`, code: files.code };
    return {
      out: files
        .map((entry) => {
          const header = fg.dim(`───── ${entry.name} ` + '─'.repeat(Math.max(0, 40 - entry.name.length)));
          const body = /\.mdx?$/.test(entry.name) ? renderMarkdown(entry.content, { numbers: true }) : entry.content;
          return `${header}\n${body}`;
        })
        .join('\n\n'),
    };
  },
};

export const head: Command = {
  name: 'head',
  summary: 'First lines of a file.',
  usage: 'head [-n lines] <file>',
  flags: { n: 'value' },
  run(ctx: Ctx) {
    const count = lineCount(ctx.argv);
    const files = readTargets(ctx.argv, ctx);
    if ('error' in files) return { err: `head: ${files.error}`, code: files.code };
    return { out: files.map((entry) => entry.content.split('\n').slice(0, count).join('\n') + '\n').join('') };
  },
};

export const tail: Command = {
  name: 'tail',
  summary: 'Last lines of a file.',
  usage: 'tail [-n lines] <file>',
  flags: { n: 'value' },
  run(ctx: Ctx) {
    const count = lineCount(ctx.argv);
    const files = readTargets(ctx.argv, ctx);
    if ('error' in files) return { err: `tail: ${files.error}`, code: files.code };
    return { out: files.map((entry) => entry.content.split('\n').slice(-count).join('\n') + '\n').join('') };
  },
};

export const wc: Command = {
  name: 'wc',
  summary: 'Count lines, words and bytes.',
  usage: 'wc [-l] [-w] [-c] <file...>',
  flags: { l: 'bool', w: 'bool', c: 'bool' },
  run(ctx: Ctx) {
    const onlyLines = ctx.argv.includes('-l');
    const onlyWords = ctx.argv.includes('-w');
    const onlyBytes = ctx.argv.includes('-c');
    const files = readTargets(ctx.argv, ctx);
    if ('error' in files) return { err: `wc: ${files.error}`, code: files.code };
    const rows = files.map((entry) => {
      const lines = entry.content.split('\n').length - (entry.content.endsWith('\n') ? 1 : 0);
      const words = entry.content.split(/\s+/).filter(Boolean).length;
      const bytes = entry.content.length;
      const cells: string[] = [];
      if (onlyLines || (!onlyWords && !onlyBytes)) cells.push(String(lines));
      if (onlyWords || (!onlyLines && !onlyBytes)) cells.push(String(words));
      if (onlyBytes || (!onlyLines && !onlyWords)) cells.push(String(bytes));
      if (entry.name !== '(standard input)') cells.push(fg.bright(entry.name));
      return cells;
    });
    return { out: table(rows, 2) + '\n' };
  },
};

export const grep: Command = {
  name: 'grep',
  summary: 'Search files for a pattern.',
  usage: 'grep [-rinvwE] <pattern> [path...]',
  flags: { r: 'bool', i: 'bool', n: 'bool', v: 'bool', w: 'bool', E: 'bool', c: 'bool' },
  man: [
    '  -r  recursive',
    '  -i  case insensitive',
    '  -n  prefix line numbers',
    '  -v  invert the match',
    '  -w  match whole words',
    '  -E  treat the pattern as a regular expression',
    '  -c  print only a match count per file',
    '',
    'Pipelines work: cat ~/writing/*.md | grep -i vite',
  ],
  run(ctx: Ctx) {
    const flags = new Set(ctx.argv.filter((a) => a.startsWith('-')).join('').replace(/-/g, '').split(''));
    const positional = ctx.argv.filter((a) => !a.startsWith('-'));
    const pattern = positional.shift();
    if (!pattern) return { err: 'grep: usage: grep [flags] pattern [path...]', code: 2 };

    const source =
      flags.has('E')
        ? new RegExp(flags.has('i') ? pattern : pattern, flags.has('i') ? 'i' : '')
        : null;
    const test = (line: string): boolean => {
      if (source) return source.test(line);
      const needle = flags.has('i') ? pattern.toLowerCase() : pattern;
      const haystack = flags.has('i') ? line.toLowerCase() : line;
      return flags.has('w') ? new RegExp(`\\b${needle}\\b`, flags.has('i') ? 'i' : '').test(line) : haystack.includes(needle);
    };

    const files: { path: string; content: string }[] = [];
    if (!positional.length) {
      files.push({ path: '(standard input)', content: ctx.stdin });
    } else {
      for (const target of positional) {
        const path = normalize(target, ctx.cwd);
        const node = ctx.fs.get(path);
        if (!node) return { err: `grep: ${target}: No such file or directory`, code: 2 };
        if (node.type === 'file') files.push({ path, content: node.content });
        else if (flags.has('r')) {
          const walk = (dir: string) => {
            for (const entry of ctx.fs.list(dir)) {
              const child = `${dir}/${entry.name}`;
              if (entry.node.type === 'dir') walk(child);
              else files.push({ path: child, content: entry.node.content });
            }
          };
          walk(path);
        } else {
          return { err: `grep: ${target}: Is a directory`, code: 2 };
        }
      }
    }

    const out: string[] = [];
    let total = 0;
    for (const file of files) {
      const hits: string[] = [];
      file.content.split('\n').forEach((line, index) => {
        const matched = test(line);
        if (matched === flags.has('v')) return;
        hits.push(
          (files.length > 1 ? fg.green(file.path) + fg.dim(':') : '') +
            (flags.has('n') ? fg.muted(String(index + 1) + ':') : '') +
            line,
        );
      });
      total += hits.length;
      if (flags.has('c')) out.push(`${hits.length}`);
      else out.push(...hits);
    }
    // real grep prints the counts with -c even when nothing matched, but exits 1
    if (!total) return { out: flags.has('c') ? out.join('\n') + '\n' : '', code: 1 };
    return { out: out.join('\n') + '\n' };
  },
};

export const nl: Command = {
  name: 'nl',
  summary: 'Number lines.',
  usage: 'nl <file...>',
  run(ctx: Ctx) {
    const files = readTargets(ctx.argv, ctx);
    if ('error' in files) return { err: `nl: ${files.error}`, code: files.code };
    const out: string[] = [];
    for (const entry of files) {
      entry.content.split('\n').forEach((line, index) => out.push(`${fg.muted(String(index + 1).padStart(5))}\t${line}`));
    }
    return { out: out.join('\n') + '\n' };
  },
};

export const sort: Command = {
  name: 'sort',
  summary: 'Sort lines.',
  usage: 'sort [-r] [-u] [file]',
  flags: { r: 'bool', u: 'bool' },
  run(ctx: Ctx) {
    const input = ctx.argv.filter((a) => !a.startsWith('-')).length
      ? readTargets(ctx.argv, ctx)
      : [{ name: 'stdin', content: ctx.stdin }];
    if ('error' in input) return { err: `sort: ${input.error}`, code: input.code };
    let lines = input.flatMap((entry) => entry.content.split('\n')).filter((line, index, all) => line || index < all.length - 1);
    lines = lines.sort((a, b) => a.localeCompare(b));
    if (ctx.argv.includes('-u')) lines = [...new Set(lines)];
    if (ctx.argv.includes('-r')) lines.reverse();
    return { out: lines.join('\n') + '\n' };
  },
};

export const uniq: Command = {
  name: 'uniq',
  summary: 'Collapse repeated adjacent lines.',
  usage: 'uniq [-c] [file]',
  flags: { c: 'bool' },
  run(ctx: Ctx) {
    const content = ctx.argv.filter((a) => !a.startsWith('-')).length
      ? readTargets(ctx.argv, ctx)
      : [{ name: 'stdin', content: ctx.stdin }];
    if ('error' in content) return { err: `uniq: ${content.error}`, code: content.code };
    const lines = content.flatMap((entry) => entry.content.split('\n'));
    const out: string[] = [];
    let previous: string | null = null;
    let count = 0;
    const flush = () => {
      if (previous === null) return;
      out.push(ctx.argv.includes('-c') ? `${fg.muted(String(count).padStart(4))} ${previous}` : previous);
    };
    for (const line of lines) {
      if (line === previous) count++;
      else {
        flush();
        previous = line;
        count = 1;
      }
    }
    flush();
    return { out: out.join('\n') + '\n' };
  },
};

/** `-n 5`, `-n5` and the obsolete `-5` shorthand, like head(1)/tail(1). */
function lineCount(argv: string[]): number {
  const bare = argv.find((arg) => /^-\d+$/.test(arg));
  if (bare) return Number(bare.slice(1)) || 10;
  return numberFlag(argv, 'n', 10);
}

function numberFlag(argv: string[], name: string, fallback: number): number {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === `-${name}`) return Number(argv[i + 1] ?? fallback) || fallback;
    if (argv[i].startsWith(`-${name}`)) {
      const inline = Number(argv[i].slice(name.length + 1));
      if (inline) return inline;
    }
  }
  return fallback;
}

export const textCommands: Command[] = [cat, bat, head, tail, wc, grep, nl, sort, uniq];

export { style };