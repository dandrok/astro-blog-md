/** Site commands: open, blog, github, mail, vim/nvim/nano. */

import { normalize } from '../fs';
import { fg } from '../format';
import { slugify } from '../slug';
import type { Command, Ctx } from '../shell';

const slugOf = (path: string) => slugify(path.split('/').pop() ?? '');

export const open: Command = {
  name: 'open',
  summary: 'Open a file in the site — articles go to their reading page.',
  usage: 'open <file>',
  man: ['Articles open the plain reading page; this is the escape hatch from the', 'terminal back into the typeset article.'],
  run(ctx: Ctx) {
    const target = ctx.argv[0];
    if (!target) return { err: 'open: usage: open <file>', code: 1 };
    const path = normalize(target, ctx.cwd);
    const node = ctx.fs.get(path);
    if (!node) return { err: `open: ${target}: No such file or directory`, code: 1 };
    if (node.type === 'dir') return { err: `open: ${target}: Is a directory`, code: 2 };
    if (!/\.mdx?$/.test(path)) return { err: `open: ${target}: not an article`, code: 2 };
    const slug = slugOf(path);
    return {
      out: fg.dim(`opening /${slug}/ …`) + '\n',
      effect: { type: 'navigate', url: `/${slug}/` },
    };
  },
};

export const github: Command = {
  name: 'github',
  summary: 'Open my GitHub profile.',
  usage: 'github',
  run() {
    return { out: fg.dim('opening github.com/dandrok …') + '\n', effect: { type: 'navigate', url: 'https://github.com/dandrok' } };
  },
};

export const mail: Command = {
  name: 'mail',
  summary: 'Open a mail draft.',
  usage: 'mail',
  run() {
    return {
      out: fg.dim('opening mail client …') + '\n',
      effect: { type: 'navigate', url: 'mailto:contact@thedotfile.com?subject=hi' },
    };
  },
};

function editorCommand(name: 'vim' | 'nano'): Command {
  return {
    name,
    summary: name === 'nano' ? 'Edit a file (^O write, ^X exit).' : 'Edit a file with vim keybindings.',
    usage: `${name} <file>`,
    man:
      name === 'nano'
        ? ['  ^O  write out', '  ^X  exit', '', 'A plain editor: arrows, selection, no modes.']
        : [
            'Real vim keybindings via CodeMirror: modes, motions, operators, registers,',
            'marks and macros (qa…q, @a).',
            '',
            '  i a o O   enter insert mode',
            '  :w        write back into the virtual filesystem (persists in localStorage)',
            '  :q        quit, :wq write and quit',
            '  /pattern  search, n / N to repeat',
          ],
    run(ctx: Ctx) {
      const target = ctx.argv[0];
      if (!target) return { err: `${name}: missing file operand`, code: 1 };
      const opened = ctx.shell.openEditorPath(target);
      if (opened.error) return { err: `${name}: ${opened.error}`, code: 1 };
      return { effect: { type: 'edit', path: opened.path, editor: name } };
    },
  };
}

export const vim = editorCommand('vim');
export const nano = editorCommand('nano');

export const nvim: Command = { ...vim, name: 'nvim', summary: 'Alias for vim (keybindings, no real nvim binary).' };

export const siteCommands: Command[] = [open, github, mail, vim, nvim, nano];