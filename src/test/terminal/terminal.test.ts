/**
 * The shell core is DOM-free on purpose: these tests exercise the same code
 * the browser runs, with no xterm and no editor in sight.
 */

import { describe, expect, it } from 'vitest';
import { tokenize, parseLine, parseFlags, FlagError, ParseError } from '../../lib/terminal/args';
import { FileSystem, normalize } from '../../lib/terminal/fs';
import { createShell, slugify } from '../../lib/terminal';
import { parseConfig, palette, contrastRatio, THEME_NAMES } from '../../lib/terminal/theme';
import type { PostSeed } from '../../lib/terminal';

const posts: PostSeed[] = [
  {
    slug: 'vite-in-astro',
    title: 'Vite inside Astro',
    description: 'How the dev server is put together',
    date: '2026-02-01',
    tags: ['astro', 'vite'],
    body: '# Vite inside Astro\n\nThe dev server is Vite. Vite handles HMR.\n',
  },
  {
    slug: 'pomo-doro-tui',
    title: 'Pomo doro in the terminal',
    description: 'A pomodoro timer as a TUI',
    date: '2026-01-15',
    tags: ['rust', 'tui'],
    body: '# Pomo doro\n\nA timer that lives in the terminal.\n',
  },
];

/** In-memory Storage so the overlay can be tested without a browser. */
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

const newShell = (storage: Storage | null = null) => createShell({ posts, storage });

describe('tokenizer', () => {
  it('splits on whitespace and honours quotes', () => {
    expect(tokenize('cat "my file.md"')).toEqual(['cat', 'my file.md']);
    expect(tokenize("grep -i 'two words'")).toEqual(['grep', '-i', 'two words']);
  });

  it('keeps empty quoted arguments', () => {
    expect(tokenize('echo ""')).toEqual(['echo', '']);
  });

  it('supports backslash escapes', () => {
    expect(tokenize('echo hello\\ world')).toEqual(['echo', 'hello world']);
  });

  it('reports an unterminated quote', () => {
    expect(() => tokenize('echo "unclosed')).toThrow(ParseError);
  });
});

describe('line parser', () => {
  it('splits pipelines', () => {
    const parsed = parseLine('cat a.md | grep vite | wc -l');
    expect(parsed.segments).toHaveLength(3);
    expect(parsed.segments[1].argv).toEqual(['grep', 'vite']);
  });

  it('detects redirection with and without spaces', () => {
    expect(parseLine('echo hi > out.txt').segments[0].stdout).toEqual({ path: 'out.txt', append: false });
    expect(parseLine('echo hi >> out.txt').segments[0].stdout).toEqual({ path: 'out.txt', append: true });
    expect(parseLine('cat >out.txt').segments[0].stdout?.path).toBe('out.txt');
    expect(parseLine('wc -l < out.txt').segments[0].stdin).toBe('out.txt');
  });

  it('rejects a dangling pipe', () => {
    expect(() => parseLine('cat file |')).toThrow(ParseError);
  });
});

describe('flags', () => {
  it('parses clustered short flags', () => {
    const parsed = parseFlags(['-la', 'writing'], { l: 'bool', a: 'bool' });
    expect([...parsed.flags]).toEqual(['l', 'a']);
    expect(parsed.operands).toEqual(['writing']);
  });

  it('parses long flags with values', () => {
    expect(parseFlags(['--name=*.md'], { name: 'value' }).values.name).toBe('*.md');
    expect(parseFlags(['--name', '*.md'], { name: 'value' }).values.name).toBe('*.md');
  });

  it('accepts a value glued to a short flag', () => {
    expect(parseFlags(['-n5'], { n: 'value' }).values.n).toBe('5');
  });

  it('treats -- as end of flags', () => {
    expect(parseFlags(['--', '-weird'], { l: 'bool' }).operands).toEqual(['-weird']);
  });

  it('rejects unknown flags', () => {
    expect(() => parseFlags(['-z'], { l: 'bool' })).toThrow(FlagError);
  });
});

describe('filesystem', () => {
  it('normalises paths', () => {
    // '..' walks up from /home/dandrok, exactly like a real path resolver
    expect(normalize('../writing/./a.md', '/home/dandrok')).toBe('/home/writing/a.md');
    expect(normalize('writing/a.md', '/home/dandrok')).toBe('/home/dandrok/writing/a.md');
    expect(normalize('/home/../etc', '/')).toBe('/etc');
  });

  it('creates nested directories with -p semantics', () => {
    const fs = new FileSystem([]);
    expect(fs.mkdir('/home/dandrok/a/b/c', true).ok).toBe(true);
    expect(fs.isDir('/home/dandrok/a/b/c')).toBe(true);
  });

  it('refuses to remove /', () => {
    const fs = new FileSystem([]);
    expect(fs.remove('/', true).ok).toBe(false);
  });

  it('persists writes through the overlay and reloads them', () => {
    const storage = new MemoryStorage();
    const first = new FileSystem([{ path: '/home/dandrok/a.md', content: 'one\n' }], storage);
    expect(first.writeFile('/home/dandrok/a.md', 'two\n').ok).toBe(true);

    const reloaded = new FileSystem([{ path: '/home/dandrok/a.md', content: 'one\n' }], storage);
    expect(reloaded.read('/home/dandrok/a.md')).toBe('two\n');
    expect(reloaded.changedCount()).toBe(1);
  });

  it('remembers deletions in the overlay', () => {
    const storage = new MemoryStorage();
    const first = new FileSystem([{ path: '/home/dandrok/a.md', content: 'x' }], storage);
    first.remove('/home/dandrok/a.md');
    const reloaded = new FileSystem([{ path: '/home/dandrok/a.md', content: 'x' }], storage);
    expect(reloaded.exists('/home/dandrok/a.md')).toBe(false);
  });
});

describe('shell', () => {
  it('seeds the articles as files', () => {
    const shell = newShell();
    const names = shell.fs.list('/home/dandrok/writing').map((entry) => entry.name);
    expect(names).toContain('vite-in-astro.md');
    expect(names).toHaveLength(2);
  });

  it('ls lists the home directory', () => {
    const shell = newShell();
    const result = shell.exec('ls');
    expect(result.out).toContain('writing/');
    expect(result.out).toContain('README.md');
  });

  it('cd moves the working directory and updates $PWD', () => {
    const shell = newShell();
    const result = shell.exec('cd writing');
    expect(result.cwd).toBe('/home/dandrok/writing');
    expect(shell.env.PWD).toBe('/home/dandrok/writing');
    expect(shell.prompt()).toContain('~/writing');
  });

  it('cd fails loudly on a missing directory', () => {
    const shell = newShell();
    const result = shell.exec('cd nope');
    expect(result.code).toBe(1);
    expect(result.err).toContain('no such file or directory');
    expect(shell.cwd).toBe('/home/dandrok');
  });

  it('cat renders markdown to the terminal', () => {
    const shell = newShell();
    const result = shell.exec('cat ~/writing/vite-in-astro.md');
    expect(result.out).toContain('VITE INSIDE ASTRO');
    expect(result.out).not.toContain('# Vite');
  });

  it('cat -r prints the raw source', () => {
    const shell = newShell();
    expect(shell.exec('cat -r ~/writing/vite-in-astro.md').out).toContain('# Vite inside Astro');
  });

  it('pipes output between commands', () => {
    const shell = newShell();
    const result = shell.exec('cat ~/writing/*.md | grep -i vite');
    expect(result.out).toContain('Vite');
    expect(result.out.split('\n').filter(Boolean).length).toBeGreaterThan(0);
  });

  it('head -N shorthand limits lines through a pipe', () => {
    const shell = newShell();
    shell.fs.writeFile('/home/dandrok/nums.txt', 'a\nb\nc\nd\n');
    const out = shell.exec('cat -r ~/nums.txt | head -2').out.replace(/\x1b\[[0-9;]*m/g, '');
    expect(out.trim().split('\n')).toEqual(['a', 'b']);
  });

  it('wc -l counts lines through a pipe', () => {
    const shell = newShell();
    const result = shell.exec('cat ~/writing/pomo-doro-tui.md | wc -l');
    expect(Number(result.out.trim().split(/\s+/)[0])).toBeGreaterThan(1);
  });

  it('redirection writes a file and appends', () => {
    const shell = newShell();
    shell.exec('echo first > ~/notes.txt');
    shell.exec('echo second >> ~/notes.txt');
    expect(shell.fs.read('/home/dandrok/notes.txt')).toBe('first\nsecond\n');
  });

  it('reads stdin from a file with <', () => {
    const shell = newShell();
    shell.fs.writeFile('/home/dandrok/words.txt', 'beta\nalpha\n');
    const result = shell.exec('sort < ~/words.txt');
    expect(result.out.trim().split('\n')[0]).toBe('alpha');
  });

  it('greps recursively with -r -n', () => {
    const shell = newShell();
    const result = shell.exec('grep -rn terminal ~/writing');
    const plain = result.out.replace(/\x1b\[[0-9;]*m/g, '');
    expect(plain).toContain('writing/pomo-doro-tui.md');
    expect(plain).toMatch(/:\d+:/);
  });

  it('reports unknown commands with exit code 127', () => {
    const shell = newShell();
    const result = shell.exec('frobnicate');
    expect(result.code).toBe(127);
    expect(result.err).toContain('command not found');
  });

  it('supports $VAR expansion and ~', () => {
    const shell = newShell();
    shell.exec('export GREETING=hello');
    expect(shell.exec('echo $GREETING').out).toBe('hello\n');
    expect(shell.exec('echo ~/writing').out).toBe('/home/dandrok/writing\n');
  });

  it('globs multiple files', () => {
    const shell = newShell();
    const result = shell.exec('wc -l ~/writing/*.md');
    expect(result.out.split('\n').filter(Boolean)).toHaveLength(2);
  });

  it('persists history', () => {
    const storage = new MemoryStorage();
    const shell = newShell(storage);
    shell.exec('ls');
    shell.exec('pwd');
    const reloaded = newShell(storage);
    expect(reloaded.history).toEqual(['ls', 'pwd']);
  });

  it('completes command names and paths', () => {
    const shell = newShell();
    expect(shell.complete('gr')).toContain('grep');
    expect(shell.complete('cat ~/wri')).toContain('~/writing/');
  });
});

describe('commands', () => {
  it('help lists every command', () => {
    const shell = newShell();
    const out = shell.exec('help').out;
    expect(out).toContain('grep');
    expect(out).toContain('vim');
    expect(out).toContain('neofetch');
  });

  it('man shows usage', () => {
    expect(newShell().exec('man grep').out).toContain('grep [-rinvwE]');
  });

  it('--help works for any command', () => {
    expect(newShell().exec('ls --help').out).toContain('ls [-a] [-1] [-t]');
  });

  it('mkdir/touch/rm round-trip', () => {
    const shell = newShell();
    shell.exec('mkdir -p ~/scratch/deep');
    shell.exec('touch ~/scratch/deep/file.md');
    expect(shell.fs.exists('/home/dandrok/scratch/deep/file.md')).toBe(true);
    shell.exec('rm -r ~/scratch');
    expect(shell.fs.exists('/home/dandrok/scratch')).toBe(false);
  });

  it('theme set writes site.conf and asks for a re-theme', () => {
    const shell = newShell();
    const result = shell.exec('theme set theme=amber');
    expect(result.effects).toEqual([{ type: 'theme', config: expect.stringContaining('theme=amber') }]);
    expect(shell.fs.read('/home/dandrok/.config/site.conf')).toContain('theme=amber');
    expect(shell.fs.read('/home/dandrok/.config/site.conf')).not.toContain('theme=matrix');
  });

  it('reset needs -y before dropping edits', () => {
    const storage = new MemoryStorage();
    const shell = newShell(storage);
    shell.fs.writeFile('/home/dandrok/README.md', 'changed');
    expect(shell.exec('reset').out).toContain('reset -y');
    expect(shell.fs.read('/home/dandrok/README.md')).toBe('changed');
    shell.exec('reset -y');
    expect(shell.fs.read('/home/dandrok/README.md')).not.toBe('changed');
  });

  it('open turns a markdown file into a navigation effect', () => {
    const shell = newShell();
    const result = shell.exec('open ~/writing/vite-in-astro.md');
    expect(result.effects).toEqual([{ type: 'navigate', url: '/blog/vite-in-astro/' }]);
  });

  it('vim and nano return edit effects', () => {
    const shell = newShell();
    expect(shell.exec('vim ~/writing/vite-in-astro.md').effects).toEqual([
      { type: 'edit', path: '/home/dandrok/writing/vite-in-astro.md', editor: 'vim' },
    ]);
    expect(shell.exec('nano ~/README.md').effects[0]).toMatchObject({ editor: 'nano' });
  });

  it('grep -c prints a count and exits 1 with no match', () => {
    const shell = newShell();
    // two lines of vite-in-astro.md mention Vite; case-sensitive, like the real grep
    expect(shell.exec('grep -c Vite ~/writing/vite-in-astro.md').out.trim()).toBe('2');
    expect(shell.exec('grep -c vite ~/writing/vite-in-astro.md').out.trim()).toBe('0');
    expect(shell.exec('grep -i nothing-matches-this ~/writing/vite-in-astro.md').code).toBe(1);
    // a directory without -r is an error, like the real grep (exit 2)
    expect(shell.exec('grep -i vite ~/writing').code).toBe(2);
  });
});

describe('site.conf', () => {
  it('keeps the prompt trailing space but trims other values', () => {
    const config = parseConfig('prompt={user}@{host}: {path}$ \ntheme=  amber  \n');
    expect(config.prompt).toBe('{user}@{host}: {path}$ ');
    expect(config.theme).toBe('amber');
  });

  it('falls back to defaults for unknown values', () => {
    const config = parseConfig('theme=neon\ncursor=sideways\nscanlines=maybe\n');
    expect(config.theme).toBe('matrix');
    expect(config.cursor).toBe('bar');
    expect(config.scanlines).toBe(false);
  });
});

describe('slugs', () => {
  it('normalises names that are not URL safe', () => {
    expect(slugify('hermes --tui impression')).toBe('hermes-tui-impression');
    expect(slugify('post_with_underscores.md')).toBe('post-with-underscores');
    expect(slugify('Event Loop Promises.md')).toBe('event-loop-promises');
  });

  it('seeds and opens odd file names with the same slug', () => {
    const odd: PostSeed[] = [
      ...posts,
      { slug: 'hermes --tui impression', title: 'Hermes TUI', description: 'd', date: '2025-12-01', tags: [], body: '# Hermes\n' },
    ];
    const shell = createShell({ posts: odd, storage: null });
    expect(shell.fs.exists('/home/dandrok/writing/hermes-tui-impression.md')).toBe(true);
    expect(shell.exec('open ~/writing/hermes-tui-impression.md').effects).toEqual([
      { type: 'navigate', url: '/blog/hermes-tui-impression/' },
    ]);
  });
});

describe('cd -', () => {
  it('returns to the previous directory and prints it', () => {
    const shell = newShell();
    shell.exec('cd writing');
    const back = shell.exec('cd -');
    expect(back.cwd).toBe('/home/dandrok');
    expect(back.out.trim()).toBe('/home/dandrok');
    expect(shell.env.OLDPWD).toBe('/home/dandrok/writing');
    // and forward again
    expect(shell.exec('cd -').cwd).toBe('/home/dandrok/writing');
  });

  it('complains when there is nothing to go back to', () => {
    const shell = newShell();
    const result = shell.exec('cd -');
    expect(result.code).toBe(1);
    expect(result.err).toContain('OLDPWD not set');
  });
});

describe('ls long view', () => {
  it('shows mode, size, owner, date and name by default', () => {
    const plain = newShell().exec('ls').out.replace(/\x1b\[[0-9;]*m/g, '');
    expect(plain).toContain('writing/');
    expect(plain).toMatch(/\.rw-r--r--/);
    expect(plain).toContain('dandrok');
    expect(plain).toMatch(/\d{2} [A-Z][a-z]{2} \d{2}:\d{2}/);
  });

  it('puts directories first', () => {
    const lines = newShell().exec('ls').out.replace(/\x1b\[[0-9;]*m/g, '').trim().split('\n');
    expect(lines[0]).toContain('writing/');
  });

  it('hides dotfiles unless -a, and -1 drops the long columns', () => {
    const shell = newShell();
    expect(shell.exec('ls').out).not.toContain('.config');
    expect(shell.exec('ls -a').out).toContain('.config');
    const short = shell.exec('ls -1 ~/writing').out.replace(/\x1b\[[0-9;]*m/g, '').trim().split('\n');
    expect(short).toContain('vite-in-astro.md');
    expect(short.join(' ')).not.toContain('dandrok');
  });

  it('--icons adds glyphs only when asked', () => {
    const shell = newShell();
    expect(shell.exec('ls').out).not.toContain('\uf07b');
    expect(shell.exec('ls --icons').out).toContain('\uf07b');
  });
});

describe('typo hints', () => {
  it('suggests the closest command', () => {
    const err = (line: string) => newShell().exec(line).err.replace(/\x1b\[[0-9;]*m/g, '');
    expect(err('gerp vite')).toContain('did you mean grep?');
    expect(err('lsit')).toContain('did you mean ls?');
    expect(err('cls')).toContain('did you mean ls?');
  });

  it('stays quiet when nothing is close', () => {
    expect(newShell().exec('frobnicate').err).not.toContain('did you mean');
  });
});

describe('easter eggs', () => {
  it('sl is not ls', () => {
    const out = newShell().exec('sl').out.replace(/\x1b\[[0-9;]*m/g, '');
    expect(out).toContain('choo choo');
    expect(out).toContain('_D _|');
  });

  it('sudo refuses, except for one sandwich', () => {
    const shell = newShell();
    const denied = shell.exec('sudo rm -rf /');
    expect(denied.code).toBe(1);
    expect(denied.err).toContain('not in the sudoers file');
    expect(shell.exec('sudo make me a sandwich').out.trim()).toBe('okay.');
  });

  it('cowsay wraps the text and draws the cow', () => {
    const out = newShell().exec('cowsay hello there').out.replace(/\x1b\[[0-9;]*m/g, '');
    expect(out).toContain('(oo)');
    expect(out).toContain('hello there');
  });

  it('matrix and fortune say something', () => {
    expect(newShell().exec('matrix').out).toContain('wake up, neo.');
    expect(newShell().exec('fortune').out.trim().length).toBeGreaterThan(10);
  });

  it('refuses to delete the root', () => {
    const shell = newShell();
    const result = shell.exec('rm -rf /');
    expect(result.code).toBe(1);
    expect(shell.fs.exists('/home/dandrok/README.md')).toBe(true);
  });
});

describe('themes', () => {
  it('accepts every documented theme and rejects the rest', () => {
    for (const name of THEME_NAMES) {
      expect(parseConfig(`theme=${name}`).theme).toBe(name);
    }
    const shell = newShell();
    const bad = shell.exec('theme set theme=neon');
    expect(bad.code).toBe(2);
    expect(bad.err).toContain('unknown theme');
    expect(shell.exec('theme set cursor=sideways').code).toBe(2);
  });

  it('lists the themes and says how to switch', () => {
    const out = newShell().exec('theme').out;
    for (const name of THEME_NAMES) expect(out).toContain(name);
    expect(out).toContain('theme set theme=');
  });

  it('switching a theme rewrites the config and asks for a repaint', () => {
    const shell = newShell();
    const result = shell.exec('theme set theme=nord');
    expect(result.effects).toEqual([{ type: 'theme', config: expect.stringContaining('theme=nord') }]);
    expect(shell.fs.read('/home/dandrok/.config/site.conf')).toContain('theme=nord');
  });

  it('every palette is complete and readable', () => {
    for (const name of THEME_NAMES) {
      const p = palette(name);
      for (const key of ['bg', 'surface', 'text', 'bright', 'dim', 'dim2', 'accent', 'edge', 'line', 'lineSoft'] as const) {
        expect(p[key], `${name}.${key}`).toBeTruthy();
      }
      // small labels need AA (4.5:1); body text needs AAA (7:1)
      expect(contrastRatio(p.dim, p.bg), `${name} dim`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.dim2, p.bg), `${name} dim2`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.text, p.bg), `${name} text`).toBeGreaterThanOrEqual(7);
    }
  });
});
