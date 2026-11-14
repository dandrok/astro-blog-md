/**
 * The shell core is DOM-free on purpose: these tests exercise the same code
 * the browser runs, with no xterm and no editor in sight.
 */

import { describe, expect, it } from 'vitest';
import { tokenize, parseLine, parseFlags, FlagError, ParseError } from '../../lib/terminal/args';
import { FileSystem, normalize } from '../../lib/terminal/fs';
import { renderMarkdown } from '../../lib/terminal/format';
import { createShell, slugify } from '../../lib/terminal';
import { actionFor, applyAction, createGame, render as renderGame } from '../../lib/terminal/doom';
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
    expect(result.effects).toEqual([{ type: 'navigate', url: '/vite-in-astro/' }]);
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
      { type: 'navigate', url: '/hermes-tui-impression/' },
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

describe('doom', () => {
  const strip = (text: string) => text.replace(/\x1b\[[0-9;]*m/g, '');

  it('maps keys to actions', () => {
    expect(actionFor('w')).toBe('forward');
    expect(actionFor('\x1b[A')).toBe('forward');
    expect(actionFor('a')).toBe('left');
    expect(actionFor('\x1b[C')).toBe('right');
    expect(actionFor('\\')).toBe('none');
  });

  it('quits on q, Q, ctrl-c and Escape', () => {
    for (const key of ['q', 'Q', '\x03', '\x1b']) {
      expect(applyAction(createGame({ cols: 80, rows: 24, accent: '#00ff41' }), actionFor(key))).toBe(true);
    }
  });

  it('cannot walk through walls', () => {
    const game = createGame({ cols: 80, rows: 24, accent: '#00ff41' });
    game.x = 1.5;
    game.y = 1.5;
    game.dirX = 0;
    game.dirY = -1; // north is solid wall at row 0
    const before = { x: game.x, y: game.y };
    for (let i = 0; i < 20; i++) applyAction(game, 'forward');
    expect(game.y).toBeGreaterThan(1);
    expect(game.y).toBeLessThan(before.y);
    expect(game.x).toBe(before.x);
  });

  it('renders one absolutely positioned row per terminal row', () => {
    const game = createGame({ cols: 60, rows: 20, accent: '#00ff41' });
    const frame = renderGame(game);
    expect(frame.match(/\x1b\[\d+;1H/g) ?? []).toHaveLength(20);
    expect(strip(frame)).toMatch(/[█▀▄]/);
    expect(strip(frame)).toContain('q quit');
  });

  it('is reachable from the shell', () => {
    const shell = newShell();
    expect(shell.exec('doom').effects).toEqual([{ type: 'play', game: 'doom' }]);
  });
});

describe('overlay durability', () => {
  const memoryStorage = () => {
    const store = new Map<string, string>();
    return {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: (i: number) => [...store.keys()][i] ?? null,
      get length() {
        return store.size;
      },
    } as Storage;
  };

  const seed = [{ path: '/home/dandrok/about.md', content: 'published version' }];

  it('keeps an edit made against the current published file', () => {
    const storage = memoryStorage();
    const first = new FileSystem(seed, storage);
    first.writeFile('/home/dandrok/about.md', 'my notes');

    const reopened = new FileSystem(seed, storage);
    expect(reopened.read('/home/dandrok/about.md')).toBe('my notes');
    expect(reopened.droppedEdits).toBe(0);
  });

  it('drops an edit when the published file changed under it', () => {
    const storage = memoryStorage();
    const first = new FileSystem(seed, storage);
    first.writeFile('/home/dandrok/about.md', 'my notes');

    const updated = [{ path: '/home/dandrok/about.md', content: 'edited by the author' }];
    const reopened = new FileSystem(updated, storage);
    expect(reopened.read('/home/dandrok/about.md')).toBe('edited by the author');
    expect(reopened.droppedEdits).toBe(1);
  });

  it('does not resurrect a file the site stopped publishing', () => {
    const storage = memoryStorage();
    const first = new FileSystem(seed, storage);
    first.writeFile('/home/dandrok/about.md', 'my notes against the old file');

    const reopened = new FileSystem([], storage);
    expect(reopened.read('/home/dandrok/about.md')).toBeUndefined();
    expect(reopened.droppedEdits).toBe(1);
  });

  it('keeps files the visitor created themselves', () => {
    const storage = memoryStorage();
    const first = new FileSystem(seed, storage);
    first.writeFile('/home/dandrok/notes.md', 'mine');

    const reopened = new FileSystem([{ path: '/home/dandrok/about.md', content: 'changed' }], storage);
    expect(reopened.read('/home/dandrok/notes.md')).toBe('mine');
  });
});

describe('review findings', () => {
  const shellFor = () => {
    const shell = newShell();
    shell.exec('mkdir -p ~/work');
    shell.exec('echo a > ~/work/a.txt');
    shell.exec('echo b > ~/work/b.txt');
    return shell;
  };

  it('refuses cp/mv with several sources and a file destination', () => {
    const shell = shellFor();
    const cp = shell.exec('cp ~/work/a.txt ~/work/b.txt ~/one.txt');
    expect(cp.code).toBe(1);
    expect(cp.err).toContain('is not a directory');
    expect(shell.fs.read('/home/dandrok/one.txt')).toBeUndefined();
    expect(shell.fs.read('/home/dandrok/work/a.txt')).toBe('a\n');

    const mv = shell.exec('mv ~/work/a.txt ~/work/b.txt ~/one.txt');
    expect(mv.code).toBe(1);
    expect(shell.fs.read('/home/dandrok/work/a.txt')).toBe('a\n');
    expect(shell.fs.read('/home/dandrok/work/b.txt')).toBe('b\n');
  });

  it('does not turn a saved file into a directory for a child', () => {
    const shell = shellFor();
    shell.exec('echo keep > ~/note');
    const touch = shell.exec('touch ~/note/child');
    expect(touch.code).toBe(1);
    expect(touch.err).toContain('Not a directory');
    expect(shell.fs.read('/home/dandrok/note')).toBe('keep\n');

    const mkdir = shell.exec('mkdir -p ~/note/deeper/still');
    expect(mkdir.code).toBe(1);
    expect(shell.fs.read('/home/dandrok/note')).toBe('keep\n');
  });

  it('refuses to copy or move a directory onto itself', () => {
    const shell = shellFor();
    expect(shell.exec('cp ~/work ~/work').code).toBe(1);
    const inside = shell.exec('cp ~/work ~/work/backup');
    expect(inside.code).toBe(1);
    expect(inside.err).toContain('into itself');
    expect(shell.fs.read('/home/dandrok/work/a.txt')).toBe('a\n');
  });

  it('treats `mv a a` as a no-op instead of deleting the file', () => {
    const shell = shellFor();
    const result = shell.exec('mv ~/work/a.txt ~/work/a.txt');
    expect(result.code).toBe(0);
    expect(shell.fs.read('/home/dandrok/work/a.txt')).toBe('a\n');
  });

  it('does not run the command when the redirect cannot be written', () => {
    const shell = shellFor();
    const result = shell.exec('rm ~/work/a.txt > /');
    expect(result.code).toBe(1);
    expect(result.err).toContain('Is a directory');
    expect(shell.fs.read('/home/dandrok/work/a.txt')).toBe('a\n');
  });

  it('wraps a deeply indented list item instead of hanging', () => {
    const text = `${' '.repeat(37)}- ${'word '.repeat(40)}`;
    const rendered = renderMarkdown(text, { width: 40 });
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.replace(/\x1b\[[0-9;]*m/g, '')).toContain('word');
  });
});

describe('minor review findings', () => {
  it('does not glob a quoted pattern', () => {
    const shell = newShell();
    expect(shell.exec("echo '*.md'").out).toContain('*.md');
    expect(shell.exec('echo *.md').out).toContain('about.md');
  });

  it('treats a quoted operator as an argument', () => {
    const shell = newShell();
    const result = shell.exec('echo "|"');
    expect(result.code).toBe(0);
    expect(result.out.trim()).toBe('|');
  });

  it('does not pipe output that was redirected to a file', () => {
    const shell = newShell();
    const result = shell.exec('echo hi > ~/piped.txt | cat');
    expect(result.out).toBe('');
    expect(shell.fs.read('/home/dandrok/piped.txt')).toBe('hi\n');
  });

  it('keeps running the pipeline after a failing stage', () => {
    const shell = newShell();
    const result = shell.exec('sudo nope | echo after');
    expect(result.out.trim()).toBe('after');
    expect(result.code).toBe(0);
  });

  it('parses `head -n 2 file` without eating the count as a filename', () => {
    const shell = newShell();
    shell.exec('echo 1 > ~/n.txt');
    shell.exec('echo 2 >> ~/n.txt');
    shell.exec('echo 3 >> ~/n.txt');
    expect(shell.exec('head -n 2 ~/n.txt').out).toBe('1\n2\n');
    expect(shell.exec('tail -n 2 ~/n.txt').out).toBe('2\n3\n');
    expect(shell.exec('head -n 0 ~/n.txt').out).toBe('');
  });

  it('does not print a blank line for `tail -1` on a newline-terminated file', () => {
    const shell = newShell();
    shell.exec('echo a > ~/t.txt');
    shell.exec('echo b >> ~/t.txt');
    expect(shell.exec('tail -1 ~/t.txt').out).toBe('b\n');
  });

  it('counts UTF-8 bytes, not UTF-16 code units', () => {
    const shell = newShell();
    shell.exec('echo é > ~/e.txt'); // 2 UTF-8 bytes plus the newline
    expect(shell.exec('wc -c ~/e.txt').out.trim().startsWith('3')).toBe(true);
  });

  it('numbers plain text with `cat -n`', () => {
    const shell = newShell();
    shell.exec('echo a > ~/p.txt');
    shell.exec('echo b >> ~/p.txt');
    const out = shell.exec('cat -n ~/p.txt').out.replace(/\x1b\[[0-9;]*m/g, '');
    expect(out).toContain('1 a');
    expect(out).toContain('2 b');
  });

  it('accepts an empty pipe as stdin', () => {
    const shell = newShell();
    expect(shell.exec('echo -n "" | cat').code).toBe(0);
    expect(shell.exec('cat').code).toBe(1);
  });

  it('keeps equals signs inside a prompt value', () => {
    const shell = newShell();
    const result = shell.exec('theme set prompt={user}={path}$');
    expect(result.code).toBe(0);
    const config = result.effects.find((e) => e.type === 'theme') as { config: string };
    expect(config.config).toContain('prompt={user}={path}$');
  });

  it('persists a directory the reader created', () => {
    const storage = (() => {
      const store = new Map<string, string>();
      return {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      } as Storage;
    })();
    const seed = [{ path: '/home/dandrok/README.md', content: 'hi' }];
    const first = new FileSystem(seed, storage);
    first.mkdir('/home/dandrok/empty');

    const reopened = new FileSystem(seed, storage);
    expect(reopened.isDir('/home/dandrok/empty')).toBe(true);
  });

  it('merges a directory copy into an existing directory', () => {
    const shell = newShell();
    shell.exec('mkdir -p ~/a ~/b');
    shell.exec('echo one > ~/a/one.txt');
    shell.exec('echo keep > ~/b/keep.txt');
    shell.exec('cp -r ~/a ~/b');
    // `cp -r a b` with b existing copies into b/a, keeping b's own children
    expect(shell.fs.read('/home/dandrok/b/keep.txt')).toBe('keep\n');
    expect(shell.fs.read('/home/dandrok/b/a/one.txt')).toBe('one\n');
  });

  it('only opens files that are published articles', () => {
    const shell = newShell();
    expect(shell.exec('open README.md').code).toBe(2);
    expect(shell.exec('open ~/writing/vite-in-astro.md').code).toBe(0);
  });

  it('strafe left moves to screen left', () => {
    const game = createGame({ cols: 80, rows: 24, accent: '#00ff41' });
    const startY = game.y;
    applyAction(game, 'strafeLeft');
    // facing +x, screen left is -y
    expect(game.y).toBeLessThan(startY);
  });
});

describe('third review round', () => {
  it('keeps an unquoted operator with a quoted destination', () => {
    const shell = newShell();
    const result = shell.exec('echo hi > "my notes.txt"');
    expect(result.code).toBe(0);
    expect(shell.fs.read('/home/dandrok/my notes.txt')).toBe('hi\n');
  });

  it('treats a leading quoted operator as literal', () => {
    const shell = newShell();
    expect(shell.exec('echo ">"').out.trim()).toBe('>');
  });

  it('counts zero lines for empty content', () => {
    const shell = newShell();
    shell.exec('touch ~/empty.txt');
    expect(shell.exec('wc -l ~/empty.txt').out.trim().startsWith('0')).toBe(true);
  });

  it('matches grep -w patterns that end in punctuation', () => {
    const shell = newShell();
    shell.exec('echo useState() > ~/hook.txt');
    shell.exec('echo useStateValue >> ~/hook.txt');
    // punctuation after the word is still a word match, like GNU grep -w
    expect(shell.exec("grep -w 'useState()' ~/hook.txt").code).toBe(0);
    expect(shell.exec("grep -w 'useState' ~/hook.txt").out).toContain('useState()');
    expect(shell.exec("grep -w 'useState' ~/hook.txt").out).not.toContain('useStateValue');
  });

  it('accepts an empty redirected file as stdin', () => {
    const shell = newShell();
    shell.exec('touch ~/empty.txt');
    expect(shell.exec('cat < ~/empty.txt').code).toBe(0);
  });

  it('skips a stage whose redirect failed but keeps the pipeline running', () => {
    const shell = newShell();
    const result = shell.exec('echo hi > /nope/deeper.txt | cat');
    expect(result.err).toContain('No such file or directory');
    expect(result.out).toBe('');
    expect(result.code).toBe(0); // `cat` ran and decided the status

    const last = shell.exec('echo hi | cat > /nope/deeper.txt');
    expect(last.err).toContain('No such file or directory');
    expect(last.code).toBe(1); // the failing stage is the last one
  });

  it('keeps the failure status when the redirect cannot be written', () => {
    const shell = newShell();
    const result = shell.exec('echo hi > /nope/deeper.txt');
    expect(result.code).toBe(1);
    expect(result.err).toContain('No such file or directory');
  });

  it('writes the redirect where the line was typed, not where cd left us', () => {
    const shell = newShell();
    const result = shell.exec('cd ~/writing > after-cd.txt');
    expect(result.code).toBe(0);
    expect(shell.fs.read('/home/dandrok/after-cd.txt')).toBe('');
  });

  it('rejects unknown options instead of treating them as paths', () => {
    const shell = newShell();
    shell.exec('echo hi > ~/f.txt');
    expect(shell.exec('cp -z ~/f.txt ~/g.txt').code).toBe(1);
    expect(shell.exec('cp -r ~/f.txt ~/g.txt').code).toBe(0);
    expect(shell.fs.read('/home/dandrok/g.txt')).toBe('hi\n');
  });
});
