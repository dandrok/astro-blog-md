/**
 * One palette drives both the terminal (ANSI slots) and the page (CSS tokens),
 * so `theme set theme=nord` recolours the shell, the header, the list and the
 * articles together. Every dim tone clears WCAG AA (>= 4.5:1) on its own
 * background — the old greys were 2:1 and unreadable.
 */

export type ThemeName = 'matrix' | 'amber' | 'mono' | 'light' | 'nord';

export const THEME_NAMES: ThemeName[] = ['matrix', 'amber', 'mono', 'light', 'nord'];

export const THEMES: Record<ThemeName, { summary: string }> = {
  matrix: { summary: 'green on near-black — the default' },
  amber: { summary: 'amber phosphor, like an old VT' },
  mono: { summary: 'greyscale, no colour at all' },
  light: { summary: 'paper-light for daylight reading' },
  nord: { summary: 'cool blue-grey, easy on the eyes at night' },
};

export type Palette = {
  bg: string;
  surface: string;
  text: string;
  bright: string;
  dim: string;
  dim2: string;
  accent: string;
  edge: string;
  line: string;
  lineSoft: string;
};

const PALETTES: Record<ThemeName, Palette> = {
  matrix: {
    bg: '#050805',
    surface: '#08130b',
    text: '#a3f2b0',
    bright: '#d1fae5',
    dim: '#4f9f63',
    dim2: '#3f8f52',
    accent: '#00ff41',
    edge: 'rgba(0, 255, 65, 0.3)',
    line: 'rgba(0, 255, 65, 0.14)',
    lineSoft: 'rgba(0, 255, 65, 0.08)',
  },
  amber: {
    bg: '#0a0602',
    surface: '#170f05',
    text: '#ffcf8a',
    bright: '#ffe9c7',
    dim: '#c08a36',
    dim2: '#a97a2e',
    accent: '#ffb454',
    edge: 'rgba(255, 180, 84, 0.34)',
    line: 'rgba(255, 180, 84, 0.16)',
    lineSoft: 'rgba(255, 180, 84, 0.09)',
  },
  mono: {
    bg: '#07090b',
    surface: '#10151a',
    text: '#d8dee6',
    bright: '#f0f6fc',
    dim: '#98a2ae',
    dim2: '#7f8894',
    accent: '#ffffff',
    edge: 'rgba(255, 255, 255, 0.26)',
    line: 'rgba(255, 255, 255, 0.13)',
    lineSoft: 'rgba(255, 255, 255, 0.07)',
  },
  light: {
    bg: '#f6f7f4',
    surface: '#eceee8',
    text: '#1d2b1f',
    bright: '#000000',
    dim: '#42533f',
    dim2: '#55635a',
    accent: '#0b6b1f',
    edge: 'rgba(11, 107, 31, 0.35)',
    line: 'rgba(11, 107, 31, 0.18)',
    lineSoft: 'rgba(11, 107, 31, 0.1)',
  },
  nord: {
    bg: '#0b1220',
    surface: '#121a2b',
    text: '#d8e3f0',
    bright: '#eceff4',
    dim: '#98abc2',
    dim2: '#8699b0',
    accent: '#88c0d0',
    edge: 'rgba(136, 192, 208, 0.34)',
    line: 'rgba(136, 192, 208, 0.16)',
    lineSoft: 'rgba(136, 192, 208, 0.09)',
  },
};

export function palette(name: ThemeName): Palette {
  return PALETTES[name] ?? PALETTES.matrix;
}

export type SiteConfig = {
  theme: ThemeName;
  font: 'mono' | 'vt323';
  scanlines: boolean;
  cursor: 'block' | 'bar' | 'underline';
  prompt: string;
};

const DEFAULTS: SiteConfig = {
  theme: 'matrix',
  font: 'mono',
  scanlines: false,
  cursor: 'bar',
  prompt: '{user}@{host}:{path}$ ',
};

export function parseConfig(text: string): SiteConfig {
  const config = { ...DEFAULTS };
  for (const line of text.split('\n')) {
    // trimStart only: the prompt's trailing space separates it from the input
    const current = line.trimStart();
    if (!current || current.startsWith('#')) continue;
    const split = current.indexOf('=');
    if (split < 0) continue;
    const key = current.slice(0, split).trim();
    const rawValue = current.slice(split + 1).replace(/\r$/, '');
    const value = key === 'prompt' ? rawValue : rawValue.trim();

    if (key === 'theme' && (THEME_NAMES as string[]).includes(value)) config.theme = value as ThemeName;
    else if (key === 'font' && ['mono', 'vt323'].includes(value)) config.font = value as SiteConfig['font'];
    else if (key === 'scanlines') config.scanlines = value === 'on';
    else if (key === 'cursor' && ['block', 'bar', 'underline'].includes(value)) {
      config.cursor = value as SiteConfig['cursor'];
    } else if (key === 'prompt') config.prompt = rawValue;
  }
  return config;
}

export type XtermTheme = {
  background: string;
  foreground: string;
  cursor: string;
  selectionBackground: string;
  black: string;
  red: string;
  yellow: string;
  green: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightWhite: string;
};

/** ANSI accents per theme; everything else comes from the palette. */
const ANSI: Record<ThemeName, Partial<XtermTheme>> = {
  matrix: { red: '#ff6b6b', yellow: '#febc2e', blue: '#4f8cff', magenta: '#c792ea', cyan: '#2ec4b6' },
  amber: { red: '#ff8a5c', yellow: '#ffd08a', blue: '#9ac7ff', magenta: '#e0a3ff', cyan: '#8fe3d0' },
  mono: { red: '#ff8f8f', yellow: '#e3b341', blue: '#a8c7ff', magenta: '#cbb6e8', cyan: '#a8e6d8' },
  light: { red: '#a41f1f', yellow: '#8a6100', blue: '#1a4f8a', magenta: '#6b2d8a', cyan: '#0f6f6a' },
  nord: { red: '#bf616a', yellow: '#ebcb8b', blue: '#81a1c1', magenta: '#b48ead', cyan: '#8fbcbb' },
};

export function xtermTheme(name: ThemeName): XtermTheme {
  const p = palette(name);
  const accent = p.accent;
  return {
    background: p.bg,
    foreground: p.text,
    cursor: accent,
    selectionBackground: name === 'light' ? 'rgba(11,107,31,0.18)' : `${hexToRgba(accent, 0.24)}`,
    black: p.surface,
    red: ANSI[name].red ?? '#ff6b6b',
    green: p.accent,
    yellow: ANSI[name].yellow ?? '#febc2e',
    blue: ANSI[name].blue ?? '#4f8cff',
    magenta: ANSI[name].magenta ?? '#c792ea',
    cyan: ANSI[name].cyan ?? '#2ec4b6',
    white: p.bright,
    brightBlack: p.dim,
    brightWhite: p.bright,
  };
}

/** WCAG relative luminance; exported so the palettes can be tested. */
export function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => parseInt(clean.slice(offset, offset + 2), 16) / 255);
  const [r, g, b] = channels.map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colours (1..21). */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(255, 255, 255, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
