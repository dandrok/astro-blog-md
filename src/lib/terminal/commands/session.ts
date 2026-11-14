/** Session commands: help man clear history export env echo which exit reset theme date uname whoami neofetch. */

import { humanSize, fg, style, table } from '../format';
import { THEMES, THEME_NAMES, parseConfig } from '../theme';
import type { Command, Ctx } from '../shell';

const CONFIG_PATH = '/home/dandrok/.config/site.conf';

export const help: Command = {
  name: 'help',
  summary: 'List every command, or explain one.',
  usage: 'help [command]',
  man: ['`help` prints the command table. `help <command>` and `man <command>` show one command in detail.'],
  run(ctx: Ctx) {
    if (ctx.argv[0]) {
      const target = ctx.shell.command(ctx.argv[0]);
      if (!target) return { err: `help: no such command: ${ctx.argv[0]}`, code: 1 };
      return { out: ctx.shell.helpText(target) };
    }
    const rows = [[fg.dim('command'), fg.dim('what it does')]];
    for (const command of ctx.shell.allCommands()) {
      rows.push([` ${fg.green(command.name)}`, command.summary]);
    }
    rows.push(['', ''], [fg.dim('pipes, redirection and globs work:'), '']);
    rows.push([` ${fg.green('cat ~/writing/*.md | grep -i vite')}`, '']);
    rows.push([` ${fg.green('ls -al > ~/listing.txt')}`, '']);
    rows.push(['', ''], [fg.dim('tab'), 'completes commands and paths']);
    rows.push([fg.dim('↑ ↓'), 'history · ' + fg.dim('ctrl-l') + ' clears · ' + fg.dim('ctrl-c') + ' cancels']);
    return { out: table(rows, 3) + '\n' };
  },
};

export const man: Command = {
  name: 'man',
  summary: 'Manual page for a command.',
  usage: 'man <command>',
  run(ctx: Ctx) {
    const target = ctx.argv[0];
    if (!target) return { err: 'What manual page do you want?', code: 1 };
    const command = ctx.shell.command(target);
    if (!command) return { err: `No manual entry for ${target}`, code: 1 };
    const lines = [
      style.bold(command.name.toUpperCase()) + fg.dim('(1)'),
      '',
      fg.bright('NAME'),
      `    ${command.name} — ${command.summary}`,
      '',
      fg.bright('SYNOPSIS'),
      `    ${command.usage}`,
    ];
    if (command.flags && Object.keys(command.flags).length) {
      lines.push('', fg.bright('OPTIONS'));
      for (const [flag, kind] of Object.entries(command.flags)) {
        const label = flag.length === 1 ? `-${flag}` : `--${flag}`;
        lines.push(`    ${fg.green(label)}${kind === 'value' ? ' <value>' : ''}`);
      }
    }
    if (command.man?.length) lines.push('', fg.bright('DESCRIPTION'), ...command.man.map((line) => `    ${line}`));
    lines.push('', fg.dim('dotfile 1.0 — see `help` for everything else'));
    return { out: lines.join('\n') + '\n' };
  },
};

export const clear: Command = {
  name: 'clear',
  summary: 'Clear the screen.',
  usage: 'clear',
  run() {
    return { effect: { type: 'clear' } };
  },
};

export const history: Command = {
  name: 'history',
  summary: 'Show or clear command history.',
  usage: 'history [-c]',
  flags: { c: 'bool' },
  run(ctx: Ctx) {
    if (ctx.argv.includes('-c')) {
      ctx.shell.history.length = 0;
      return { out: '' };
    }
    return {
      out:
        ctx.shell.history
          .map((line, index) => `${fg.muted(String(index + 1).padStart(4))}  ${line}`)
          .join('\n') + '\n',
    };
  },
};

export const exportCmd: Command = {
  name: 'export',
  summary: 'Set environment variables for this session.',
  usage: 'export NAME=value | export NAME',
  man: ['Variables live in the session (and are saved to ~/.config/env when you ask for it).', '', '  export PROMPT={user}@{host} {path}$'],
  run(ctx: Ctx) {
    if (!ctx.argv.length) {
      return { out: Object.entries(ctx.env).map(([key, value]) => `${fg.green(`export ${key}`)}=${value}`).join('\n') + '\n' };
    }
    const out: string[] = [];
    for (const token of ctx.argv) {
      const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(token);
      if (!match) {
        out.push(fg.dim(`export ${token}`) + `=${ctx.env[token] ?? ''}`);
        continue;
      }
      ctx.env[match[1]] = match[2];
      out.push(fg.dim(`export ${match[1]}`) + `=${match[2]}`);
    }
    return { out: out.join('\n') + '\n' };
  },
};

export const envCmd: Command = {
  name: 'env',
  summary: 'Print the environment.',
  usage: 'env',
  run(ctx: Ctx) {
    return { out: Object.entries(ctx.env).map(([key, value]) => `${key}=${value}`).join('\n') + '\n' };
  },
};

export const echo: Command = {
  name: 'echo',
  summary: 'Print arguments.',
  usage: 'echo [-n] [text...]',
  flags: { n: 'bool' },
  run(ctx: Ctx) {
    const newline = ctx.argv.includes('-n') ? '' : '\n';
    return { out: ctx.argv.filter((a) => a !== '-n').join(' ') + newline };
  },
};

export const which: Command = {
  name: 'which',
  summary: 'Locate a command.',
  usage: 'which <command...>',
  run(ctx: Ctx) {
    const out: string[] = [];
    let code = 0;
    for (const name of ctx.argv) {
      const command = ctx.shell.command(name);
      if (command) out.push(`${fg.green('/usr/local/bin/' + name)}${fg.dim('  # ' + command.summary)}`);
      else {
        out.push(`${name} not found`);
        code = 1;
      }
    }
    return { out: out.join('\n') + '\n', code };
  },
};

export const exitCmd: Command = {
  name: 'exit',
  summary: 'End the session.',
  usage: 'exit',
  run() {
    return { effect: { type: 'exit' } };
  },
};

export const reset: Command = {
  name: 'reset',
  summary: 'Throw away local edits and reload the published site.',
  usage: 'reset [-y]',
  man: ['Every write you make lives in localStorage so it survives a reload.', '`reset` deletes that overlay and shows the published files again.'],
  run(ctx: Ctx) {
    if (!ctx.argv.includes('-y')) {
      const changed = ctx.fs.changedCount();
      return {
        out: fg.warn(`This removes ${changed} local change${changed === 1 ? '' : 's'} and prints the published files.\n`) + fg.dim('run `reset -y` to confirm') + '\n',
      };
    }
    ctx.fs.reset();
    return { out: fg.dim('local overlay cleared — reload to see the published site') + '\n', effect: { type: 'reset' } };
  },
};

export const theme: Command = {
  name: 'theme',
  summary: 'Read or change the terminal theme.',
  usage: 'theme | theme set <key>=<value>',
  man: [
    'Settings live in ~/.config/site.conf and are applied live, to the shell and',
    'to the whole page:',
    '',
    '  theme=matrix|amber|mono|light|nord',
    '  font=vt323|mono',
    '  scanlines=on|off',
    '  cursor=block|bar|underline',
    '  prompt={user}@{host}:{path}$ ',
    '',
    'Themes:',
    ...THEME_NAMES.map((name) => `  ${name.padEnd(9)} ${THEMES[name].summary}`),
  ],
  run(ctx: Ctx) {
    const config = ctx.fs.read(CONFIG_PATH) ?? '';
    const [sub, ...rest] = ctx.argv;
    if (sub !== 'set') {
      const active = parseConfig(config).theme;
      const themes = THEME_NAMES.map((name) => (name === active ? fg.green(name) : fg.dim(name))).join(fg.dim(' · '));
      return {
        out:
          fg.dim(`# ${CONFIG_PATH}`) +
          '\n' +
          config
            .split('\n')
            .filter(Boolean)
            .map((line) => {
              if (line.startsWith('#')) return fg.dim(line);
              const [key] = line.split('=');
              return line.replace(key + '=', fg.green(key + '='));
            })
            .join('\n') +
          '\n\n' +
          fg.dim('themes: ') +
          themes +
          '\n' +
          fg.dim(`try: theme set theme=nord`) +
          '\n',
      };
    }
    const assignment = rest.join(' ');
    const [key, value] = assignment.split('=');
    if (!key || value === undefined) return { err: 'theme: usage: theme set key=value', code: 2 };
    if (key === 'theme' && !THEME_NAMES.includes(value as (typeof THEME_NAMES)[number])) {
      return { err: `theme: unknown theme '${value}'. try: ${THEME_NAMES.join(', ')}`, code: 2 };
    }
    if (key === 'font' && !['mono', 'vt323'].includes(value)) {
      return { err: `theme: font must be mono or vt323`, code: 2 };
    }
    if (key === 'cursor' && !['block', 'bar', 'underline'].includes(value)) {
      return { err: `theme: cursor must be block, bar or underline`, code: 2 };
    }
    if (key === 'scanlines' && !['on', 'off'].includes(value)) {
      return { err: 'theme: scanlines must be on or off', code: 2 };
    }
    const lines = config.split('\n').filter(Boolean).filter((line) => !line.startsWith(`${key}=`));
    lines.push(`${key}=${value}`);
    const written = ctx.fs.writeFile(CONFIG_PATH, lines.join('\n') + '\n');
    if (!written.ok) return { err: `theme: ${written.error}`, code: 1 };
    return {
      out: fg.dim(`wrote ${CONFIG_PATH}`) + '\n' + `${fg.green(key)}=${value}\n` + fg.dim('applied — try `theme` to review'),
      effect: { type: 'theme', config: lines.join('\n') + '\n' },
    };
  },
};

export const source: Command = {
  name: 'source',
  summary: 'Re-read ~/.config/site.conf.',
  usage: 'source [path]',
  run(ctx: Ctx) {
    const path = ctx.argv[0] ?? CONFIG_PATH;
    const config = ctx.fs.read(path.startsWith('/') ? path : `${ctx.cwd}/${path}`);
    if (config === undefined) return { err: `source: ${path}: No such file`, code: 1 };
    return { out: fg.dim(`loaded ${path}`) + '\n', effect: { type: 'theme', config } };
  },
};

export const date: Command = {
  name: 'date',
  summary: 'Print the current date.',
  usage: 'date',
  run() {
    return { out: new Date().toString() + '\n' };
  },
};

export const uname: Command = {
  name: 'uname',
  summary: 'System information.',
  usage: 'uname [-a]',
  flags: { a: 'bool' },
  run(ctx: Ctx) {
    return {
      out: ctx.argv.includes('-a')
        ? 'dotfile 1.0.0 astro-wasm #1 SMP PREEMPT browser x86_64 GNU/JavaScript\n'
        : 'dotfile\n',
    };
  },
};

export const whoami: Command = {
  name: 'whoami',
  summary: 'Print the current user.',
  usage: 'whoami',
  run(ctx: Ctx) {
    return { out: `${ctx.env.USER}\n` };
  },
};

export const id: Command = {
  name: 'id',
  summary: 'User and group ids.',
  usage: 'id',
  run(ctx: Ctx) {
    return { out: `uid=1000(${ctx.env.USER}) gid=1000(${ctx.env.USER}) groups=1000(${ctx.env.USER}),27(sudo)\n` };
  },
};

export const uptime: Command = {
  name: 'uptime',
  summary: 'How long this session has been open.',
  usage: 'uptime',
  run(ctx: Ctx) {
    const seconds = Math.max(1, Math.round((Date.now() - ctx.shell.startedAt) / 1000));
    return { out: ` ${new Date().toTimeString().slice(0, 8)} up ${Math.floor(seconds / 60)}m${seconds % 60}s, 1 user, load average: 0.00, 0.01, 0.05\n` };
  },
};

export const neofetch: Command = {
  name: 'neofetch',
  summary: 'The obligatory system summary.',
  usage: 'neofetch',
  run(ctx: Ctx) {
    const art = [
      '        .--.        ',
      '       |o_o |       ',
      '       |:_/ |       ',
      '      //   \\ \\      ',
      '     (|     | )     ',
      "    /'\\_   _/`\\    ",
      '    \\___)=(___/    ',
    ];
    const changed = ctx.fs.changedCount();
    const info = [
      `${fg.green(ctx.env.USER)}@${fg.green('dotfile')}`,
      fg.dim('─'.repeat(20)),
      `${fg.bright('OS')}: dotfile 1.0 (astro-wasm)`,
      `${fg.bright('Host')}: the browser`,
      `${fg.bright('Shell')}: zsh-ish 0.1`,
      `${fg.bright('Files')}: ${ctx.fs.list(ctx.env.HOME + '/writing').length} in ~/writing`,
      `${fg.bright('Edited')}: ${changed} local change${changed === 1 ? '' : 's'}`,
      `${fg.bright('Uptime')}: ${Math.round(performance.now() / 1000)}s`,
      `${fg.bright('Theme')}: ${(ctx.fs.read(CONFIG_PATH) ?? '').split('\n').find((l) => l.startsWith('theme=')) ?? 'theme=matrix'}`,
    ];
    const rows = Math.max(art.length, info.length);
    const left = Array.from({ length: rows }, (_, i) => art[i] ?? ' '.repeat(20));
    const out: string[] = [];
    for (let i = 0; i < rows; i++) out.push(fg.green(left[i] ?? '') + '  ' + (info[i] ?? ''));
    return { out: out.join('\n') + '\n' };
  },
};

export const hints: Command = {
  name: 'hints',
  summary: 'Show or hide the starter buttons under the window.',
  usage: 'hints [on|off]',
  man: [
    'The chip row under the terminal is a beginner aid. Hiding it sticks',
    '(localStorage), and this command brings it back.',
    '',
    '  hints on   show the buttons',
    '  hints off  hide them',
  ],
  run(ctx: Ctx) {
    const arg = ctx.argv[0];
    if (arg !== 'on' && arg !== 'off') {
      return { out: fg.dim('usage: ') + fg.green('hints on') + fg.dim(' · ') + fg.green('hints off') + '\n' };
    }
    return {
      out: fg.dim(arg === 'on' ? 'starter buttons shown' : 'starter buttons hidden') + '\n',
      effect: { type: 'hints', visible: arg === 'on' },
    };
  },
};

export const sessionCommands: Command[] = [
  hints,
  help,
  man,
  clear,
  history,
  exportCmd,
  envCmd,
  echo,
  which,
  exitCmd,
  reset,
  theme,
  source,
  date,
  uname,
  whoami,
  id,
  uptime,
  neofetch,
];

export { humanSize };