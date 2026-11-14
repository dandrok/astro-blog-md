/**
 * Easter eggs. Nothing here touches the filesystem and nothing here elevates
 * anything — they exist so the site rewards people who poke at it.
 */

import { fg } from '../format';
import type { Command, Ctx } from '../shell';

const TRAIN = [
  '      ====        ________                ___________ ',
  '  _D _|  |_______/        \\__I_I_____===__|_________| ',
  '   |(_)---  |   H\\________/ |   |        =|___ ___|   ',
  '   /     |  |   H  |  |     |   |         ||_| |_||   ',
  '  |      |  |   H  |__--------------------| [___] |   ',
  '  | ________|___H__/__|_____/[][]~\\_______|       |   ',
  '  |/ |   |-----------I_____I [][] []  D   |=======|__ ',
  "__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__ ",
  ' |/-=|___|=    ||    ||    ||    |_____/~\\___/        ',
  "  \\_/      \\O=====O=====O=====O_/      \\_/            ",
];

export const sl: Command = {
  name: 'sl',
  summary: 'You meant `ls`.',
  usage: 'sl',
  man: ['Steam locomotive. Appears when `ls` is typed with the wrong fingers.'],
  run() {
    return {
      out: TRAIN.map((line) => fg.warn(line)).join('\n') + '\n\n' + fg.dim(' choo choo — that was `sl`, not `ls`') + '\n',
    };
  },
};

export const sudo: Command = {
  name: 'sudo',
  summary: 'Ask for root. The answer is no.',
  usage: 'sudo <command>',
  man: [
    'There is no root here: the filesystem is a JSON object in your tab.',
    '`sudo make me a sandwich` is the one exception.',
  ],
  run(ctx: Ctx) {
    if (!ctx.argv.length) return { err: 'usage: sudo <command>', code: 1 };
    if (ctx.argv.join(' ').toLowerCase() === 'make me a sandwich') {
      return { out: 'okay.\n' };
    }
    return {
      err:
        `${fg.error('dandrok is not in the sudoers file.')} This incident has been reported.\n` +
        fg.dim(' (the whole filesystem lives in localStorage — there is nothing to elevate)'),
      code: 1,
    };
  },
};

export const cowsay: Command = {
  name: 'cowsay',
  summary: 'A cow says what you typed.',
  usage: 'cowsay [text...]',
  run(ctx: Ctx) {
    const text = ctx.stdin.trim() || ctx.argv.join(' ') || 'moo.';
    const width = Math.min(46, Math.max(6, text.length));
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      if ((line + ' ' + word).trim().length > width) {
        if (line) lines.push(line);
        line = word;
      } else {
        line = (line + ' ' + word).trim();
      }
    }
    if (line) lines.push(line);

    const top = ' ' + '_'.repeat(width + 2);
    const bottom = ' ' + '-'.repeat(width + 2);
    const body = lines.map((chunk, index) => {
      const padded = chunk.padEnd(width);
      const open = lines.length === 1 ? '<' : index === 0 ? '/' : index === lines.length - 1 ? '\\' : '|';
      const close = lines.length === 1 ? '>' : index === 0 ? '\\' : index === lines.length - 1 ? '/' : '|';
      return `${open} ${padded} ${close}`;
    });
    const cow = [
      '        \\   ^__^',
      '         \\  (oo)\\_______',
      '            (__)\\       )\\/\\',
      '                ||----w |',
      '                ||     ||',
    ];
    return { out: [top, ...body, bottom, ...cow].map((l) => fg.green(l)).join('\n') + '\n' };
  },
};

export const matrix: Command = {
  name: 'matrix',
  summary: 'Wake up, neo.',
  usage: 'matrix',
  man: ['Prints a burst of glyph rain. No animation, no canvas, no regrets.'],
  run() {
    const glyphs = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ';
    const out: string[] = [];
    for (let row = 0; row < 12; row++) {
      let line = '';
      for (let column = 0; column < 64; column++) {
        line += Math.random() > 0.55 ? glyphs[Math.floor(Math.random() * glyphs.length)] : ' ';
      }
      out.push(row === 11 ? fg.bright(line) : fg.dim(line));
    }
    out.push('', fg.green('wake up, neo.') + fg.dim('  the blog has you.'));
    return { out: out.join('\n') + '\n' };
  },
};

const FORTUNES = [
  'The best code review comment is the one you write before merging.',
  'A build that passes tells you nothing about the page it produced.',
  'Anyone can write code a computer understands. This site tries the other kind.',
  'If the file tree is the site, the site is a file tree. Nothing more.',
  'You are reading a blog through a shell you did not have to install.',
  'Ship the small thing. The large thing is three small things.',
];

export const fortune: Command = {
  name: 'fortune',
  summary: 'A short thought, mostly about software.',
  usage: 'fortune',
  run() {
    return { out: `${fg.green(FORTUNES[Math.floor(Math.random() * FORTUNES.length)])}\n` };
  },
};

export const doom: Command = {
  name: 'doom',
  summary: 'A tiny raycaster in the terminal — not the 1993 one.',
  usage: 'doom',
  man: [
    'A DDA raycaster, the technique Doom made famous, drawn with half blocks',
    'straight into this terminal. No WASM, no WAD, no download.',
    '',
    '  W A S D / arrows   walk and turn',
    '  , .                strafe',
    '  q                  quit',
  ],
  run() {
    return { out: '', effect: { type: 'play', game: 'doom' } };
  },
};

export const eggCommands: Command[] = [sl, sudo, cowsay, matrix, fortune, doom];
