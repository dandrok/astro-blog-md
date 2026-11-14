/** ANSI helpers + a small markdown-aware renderer used by cat/bat/help. */

const esc = '\x1b[';

export const RESET = `${esc}0m`;

export const fg = {
  // The 16-colour palette on purpose: xterm maps these names to the active
  // theme, so `theme set theme=amber` recolours output as well as the frame.
  green: (s: string) => `${esc}32m${s}${RESET}`,
  bright: (s: string) => `${esc}97m${s}${RESET}`,
  dim: (s: string) => `${esc}90m${s}${RESET}`,
  muted: (s: string) => `${esc}2;32m${s}${RESET}`,
  warn: (s: string) => `${esc}33m${s}${RESET}`,
  error: (s: string) => `${esc}91m${s}${RESET}`,
  white: (s: string) => `${esc}97m${s}${RESET}`,
};

export const style = {
  bold: (s: string) => `${esc}1m${s}${esc}22m`,
  underline: (s: string) => `${esc}4m${s}${esc}24m`,
  inverse: (s: string) => `${esc}7m${s}${esc}27m`,
};

/** Terminal width used for wrapping and column output (xterm reports 80–140). */
export function columns(): number {
  if (typeof window === 'undefined') return 80;
  const width = document.getElementById('term')?.clientWidth ?? 0;
  return Math.max(40, Math.floor(width / 8.2) - 2);
}

function wrap(text: string, width: number): string[] {
  // A width of 0 (deep indentation on a narrow terminal) would never consume
  // the paragraph and `cat` would hang the tab.
  const limit = Math.max(1, Math.floor(width) || 0);
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    if (paragraph.length <= limit) {
      lines.push(paragraph);
      continue;
    }
    let rest = paragraph;
    while (rest.length > limit) {
      const cut = rest.lastIndexOf(' ', limit);
      const at = cut > limit * 0.5 ? cut : limit;
      lines.push(rest.slice(0, at));
      rest = rest.slice(at).trimStart();
    }
    lines.push(rest);
  }
  return lines;
}

/**
 * Render markdown for the terminal: headings, bold, inline code, lists,
 * blockquotes, links and code fences. Not a parser — a readable approximation
 * that keeps author line breaks.
 */
export function renderMarkdown(text: string, opts: { width?: number; numbers?: boolean } = {}): string {
  const width = opts.width ?? columns();
  const out: string[] = [];
  let inFence = false;
  let lineNumber = 0;

  for (const raw of text.split('\n')) {
    lineNumber++;
    const prefix = opts.numbers ? fg.muted(String(lineNumber).padStart(3) + ' ') : '';
    const line = raw.replace(/\t/g, '  ');

    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      out.push(prefix + fg.dim(line));
      continue;
    }
    if (inFence) {
      out.push(prefix + fg.bright('  ' + line));
      continue;
    }
    if (!line.trim()) {
      out.push('');
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const title = heading[2].replace(/[*`_]/g, '');
      const text = level <= 2 ? style.bold(title.toUpperCase()) : style.bold(title);
      out.push(prefix + (level <= 2 ? fg.bright(text) : fg.green(text)));
      if (level <= 2) out.push(prefix + fg.dim('─'.repeat(Math.min(width, title.length + 4))));
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      for (const wrapped of wrap(line.replace(/^\s*>\s?/, ''), Math.max(8, width - 4))) {
        out.push(prefix + fg.dim('│ ') + fg.dim(wrapped));
      }
      continue;
    }
    const listItem = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(line);
    if (listItem) {
      const bullet = /\d/.test(listItem[2]) ? listItem[2] : '•';
      const body = inline(listItem[3]);
      // deep nesting must not squeeze the text column down to one character
      const indent = listItem[1].slice(0, Math.max(0, Math.floor(width / 3)));
      const wrapped = wrap(stripAnsi(body), Math.max(8, width - indent.length - 3));
      wrapped.forEach((chunk, index) => {
        out.push(
          prefix +
            indent +
            (index === 0 ? fg.green(bullet + ' ') : '  ') +
            wrapKeepAnsi(body, chunk),
        );
      });
      continue;
    }
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      out.push(prefix + fg.dim('─'.repeat(width)));
      continue;
    }
    for (const wrapped of wrap(line, width)) out.push(prefix + inline(wrapped));
  }
  return out.join('\n');
}

const ANSI_RE = /\x1b\[[0-9;]*m/g;

function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, '');
}

/** Rebuild wrapping for a line that already carries ANSI codes. */
function wrapKeepAnsi(styled: string, plainChunk: string): string {
  if (stripAnsi(styled) === plainChunk) return styled;
  return plainChunk.length >= stripAnsi(styled).length ? styled : plainChunk;
}

/** Inline markdown: bold, italic, code, links. */
export function inline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, (_m, code: string) => fg.dim('`') + fg.bright(code) + fg.dim('`'))
    .replace(/\*\*([^*]+)\*\*/g, (_m, bold: string) => style.bold(bold))
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,]|$)/g, (_m, pre: string, italic: string) => pre + italic)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, url: string) => style.underline(label) + fg.muted(` <${url}>`));
}

/** Render a table of rows into aligned columns. */
export function table(rows: string[][], gap = 2): string {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, index) => {
      const length = stripAnsi(cell).length;
      widths[index] = Math.max(widths[index] ?? 0, length);
    });
  }
  return rows
    .map((row) =>
      row
        .map((cell, index) => (index === row.length - 1 ? cell : cell + ' '.repeat(widths[index] - stripAnsi(cell).length + gap)))
        .join(''),
    )
    .join('\n');
}

/** Human-readable byte size. */
export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  const units = ['K', 'M', 'G'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)}${units[unit]}`;
}

export function permissionString(mode: number, isDir: boolean): string {
  const type = isDir ? 'd' : '-';
  const triplet = (offset: number) =>
    [(mode >> offset) & 4 ? 'r' : '-', (mode >> offset) & 2 ? 'w' : '-', (mode >> offset) & 1 ? 'x' : '-'].join('');
  return type + triplet(6) + triplet(3) + triplet(0);
}

export function formatDate(mtime: number, kind: 'ls' | 'long' = 'ls'): string {
  const date = new Date(mtime);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (kind === 'long') {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  return `${date.toLocaleString('en-GB', { month: 'short' })} ${String(date.getDate()).padStart(2, ' ')} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Wrap text to the terminal width. */
export function wrapText(text: string, width = columns()): string {
  return wrap(text, width).join('\n');
}
