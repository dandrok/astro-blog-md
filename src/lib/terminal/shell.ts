/**
 * Shell core: environment, lookups, globbing, pipelines, redirection,
 * history and completion. No DOM and no xterm — the UI talks to it through
 * `exec()` and the effect union, which keeps the whole thing testable.
 */

import { parseLine, parseFlags, ParseError, FlagError, type FlagSpec } from './args';
import { FileSystem, normalize, dirname, basename } from './fs';
import { fg } from './format';

export type Env = Record<string, string>;

export type Ctx = {
  argv: string[];
  stdin: string;
  fs: FileSystem;
  env: Env;
  cwd: string;
  tty: boolean;
  /** The running shell — commands use it for lookups, history and effects. */
  shell: Shell;
};

export type Effect =
  | { type: 'clear' }
  | { type: 'navigate'; url: string }
  | { type: 'edit'; path: string; editor: 'vim' | 'nano' }
  | { type: 'reset' }
  | { type: 'theme'; config: string }
  | { type: 'exit' }
  | { type: 'title'; value: string };

export type CmdResult = {
  out?: string;
  err?: string;
  code?: number;
  cwd?: string;
  effect?: Effect;
};

export type Command = {
  name: string;
  summary: string;
  usage: string;
  /** Long description shown by `man`. */
  man?: string[];
  flags?: FlagSpec;
  run(ctx: Ctx): CmdResult;
};

export type ExecResult = {
  out: string;
  err: string;
  code: number;
  cwd: string;
  effects: Effect[];
};

const HISTORY_KEY = 'dotfile.history.v1';
const MAX_HISTORY = 200;

export class Shell {
  readonly fs: FileSystem;
  readonly startedAt = Date.now();
  env: Env;
  cwd: string;
  history: string[] = [];
  private commands: Map<string, Command>;
  private storage: Storage | null;

  constructor(opts: {
    fs: FileSystem;
    commands: Command[];
    env?: Env;
    cwd?: string;
    storage?: Storage | null;
  }) {
    this.fs = opts.fs;
    this.commands = new Map(opts.commands.map((command) => [command.name, command]));
    this.env = {
      HOME: '/home/dandrok',
      USER: 'dandrok',
      SHELL: '/bin/zsh',
      TERM: 'xterm-256color',
      PWD: opts.cwd ?? '/home/dandrok',
      ...opts.env,
    };
    this.cwd = opts.cwd ?? '/home/dandrok';
    this.storage = opts.storage ?? null;
    this.loadHistory();
  }

  command(name: string): Command | undefined {
    return this.commands.get(name);
  }

  allCommands(): Command[] {
    return [...this.commands.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  /** `~` and `$VAR` / `${VAR}` expansion, then path normalisation. */
  expand(token: string): string {
    let text = token;
    if (text === '~' || text.startsWith('~/')) text = this.env.HOME + text.slice(1);
    text = text.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (_m, braced: string, bare: string) => this.env[braced ?? bare] ?? '');
    return text;
  }

  resolvePath(token: string): string {
    return normalize(this.expand(token), this.cwd);
  }

  /** Bash-ish globbing: `*` and `?` in the last path segment only. */
  glob(token: string): string[] {
    const expanded = this.expand(token);
    if (!/[*?]/.test(expanded)) return [expanded];
    const dir = expanded.includes('/') ? expanded.slice(0, expanded.lastIndexOf('/')) || '/' : '.';
    const pattern = expanded.slice(expanded.lastIndexOf('/') + 1);
    const base = normalize(dir, this.cwd);
    const regex = new RegExp(
      '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
    );
    const matches = this.fs
      .list(base)
      .filter((entry) => regex.test(entry.name))
      .map((entry) => (expanded.includes('/') ? `${dir}/${entry.name}` : entry.name));
    return matches.length ? matches : [expanded];
  }

  promptPath(): string {
    const home = this.env.HOME;
    return this.cwd === home ? '~' : this.cwd.startsWith(`${home}/`) ? `~${this.cwd.slice(home.length)}` : this.cwd;
  }

  prompt(): string {
    const template = this.env.PROMPT || '{user}@{host}:{path}$ ';
    return template
      .replace('{user}', this.env.USER)
      .replace('{host}', this.env.HOST ?? 'dotfile')
      .replace('{path}', this.promptPath());
  }

  exec(line: string): ExecResult {
    const result: ExecResult = { out: '', err: '', code: 0, cwd: this.cwd, effects: [] };
    const trimmed = line.trim();
    if (!trimmed) return result;

    let parsed;
    try {
      parsed = parseLine(trimmed);
    } catch (error) {
      if (error instanceof ParseError) {
        return { ...result, err: `bash: ${error.message}`, code: 2 };
      }
      throw error;
    }

    this.remember(trimmed);
    let stdin = '';
    for (let index = 0; index < parsed.segments.length; index++) {
      const segment = parsed.segments[index];
      const isLast = index === parsed.segments.length - 1;
      const outcome = this.runSegment(segment.argv, segment.stdin, stdin);
      if (outcome.effect) result.effects.push(outcome.effect);
      if (outcome.cwd) {
        this.cwd = outcome.cwd;
        this.env.PWD = outcome.cwd;
        result.cwd = outcome.cwd;
      }
      if (outcome.err) result.err += (result.err ? '\n' : '') + outcome.err;

      if (segment.stdout) {
        const path = this.resolvePath(segment.stdout.path);
        const written = segment.stdout.append
          ? this.fs.appendFile(path, outcome.out ?? '')
          : this.fs.writeFile(path, outcome.out ?? '');
        if (!written.ok) {
          result.err += (result.err ? '\n' : '') + (written.error ?? 'redirection failed');
          result.code = 1;
        }
      } else if (isLast) {
        // a pipeline only prints the last stage, like a real shell
        result.out += outcome.out ?? '';
      }

      if (outcome.code) {
        result.code = outcome.code;
        break;
      }
      stdin = outcome.out ?? '';
    }
    return result;
  }

  private runSegment(argv: string[], stdinPath: string | null, stdin: string): CmdResult {
    if (!argv.length) return { code: 0 };
    const name = argv[0];
    const command = this.commands.get(name);
    if (!command) {
      return { err: `bash: ${name}: command not found`, code: 127 };
    }

    if (argv[1] === '--help' || (argv[1] === '-h' && !command.flags?.h)) {
      return { out: this.helpText(command) };
    }

    let input = stdin;
    if (stdinPath) {
      const path = this.resolvePath(stdinPath);
      const content = this.fs.read(path);
      if (content === undefined) return { err: `bash: ${stdinPath}: No such file or directory`, code: 1 };
      input = content;
    }

    const args: string[] = [];
    for (const token of argv.slice(1)) args.push(...this.glob(token));

    try {
      return command.run({ argv: args, stdin: input, fs: this.fs, env: this.env, cwd: this.cwd, tty: true, shell: this });
    } catch (error) {
      if (error instanceof FlagError) return { err: `${name}: ${error.message}`, code: 2 };
      return { err: `${name}: ${(error as Error).message}`, code: 1 };
    }
  }

  helpText(command: Command): string {
    const lines = [fg.bright(command.usage), '', command.summary];
    if (command.flags && Object.keys(command.flags).length) {
      lines.push('', fg.dim('options:'));
      for (const [flag, kind] of Object.entries(command.flags)) {
        const label = flag.length === 1 ? `-${flag}` : `--${flag}`;
        lines.push(`  ${fg.green(label)}${kind === 'value' ? ' <value>' : ''}`);
      }
    }
    lines.push('', fg.dim(`run 'man ${command.name}' for the long version`));
    return lines.join('\n') + '\n';
  }

  /** Parsed flags helper so each command stays a few lines long. */
  parse(argv: string[], spec: FlagSpec, defaults: Record<string, string> = {}) {
    return parseFlags(argv, spec, defaults);
  }

  remember(line: string): void {
    if (!line.trim()) return;
    if (this.history[this.history.length - 1] !== line) this.history.push(line);
    if (this.history.length > MAX_HISTORY) this.history.shift();
    this.persistHistory();
  }

  private loadHistory(): void {
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem(HISTORY_KEY);
      if (raw) this.history = (JSON.parse(raw) as string[]).slice(-MAX_HISTORY);
    } catch {
      this.history = [];
    }
  }

  private persistHistory(): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(HISTORY_KEY, JSON.stringify(this.history.slice(-MAX_HISTORY)));
    } catch {
      // ignore quota errors — history is a nicety
    }
  }

  /** Tab completion: commands in the first word, paths afterwards. */
  complete(input: string): string[] {
    const trimmedEnd = input.match(/(\S*)$/)?.[1] ?? '';
    const isFirstWord = input.trimEnd() === trimmedEnd;
    if (isFirstWord) {
      return this.allCommands()
        .map((command) => command.name)
        .filter((name) => name.startsWith(trimmedEnd));
    }
    const slash = trimmedEnd.lastIndexOf('/');
    const dirToken = slash >= 0 ? trimmedEnd.slice(0, slash + 1) : '';
    const fragment = slash >= 0 ? trimmedEnd.slice(slash + 1) : trimmedEnd;
    const dir = this.resolvePath(dirToken || '.');
    return this.fs
      .list(dir)
      .filter((entry) => entry.name.startsWith(fragment))
      .map((entry) => dirToken + entry.name + (entry.node.type === 'dir' ? '/' : ''));
  }

  /** Filesystem location for an editor effect. */
  openEditorPath(token: string): { path: string; error?: string } {
    const path = this.resolvePath(token);
    const node = this.fs.get(path);
    if (!node) return { path, error: `No such file or directory: ${token}` };
    if (node.type === 'dir') return { path, error: `Is a directory: ${token}` };
    return { path };
  }

  parentDir(path: string): string {
    return dirname(path);
  }

  name(path: string): string {
    return basename(path);
  }
}
