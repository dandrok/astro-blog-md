/** site.conf → xterm theme + page CSS variables. */

export type ThemeName = 'matrix' | 'amber' | 'mono' | 'light';

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
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [rawKey, ...rest] = trimmed.split('=');
    const key = rawKey.trim();
    const value = rest.join('=').trim();
    if (key === 'theme' && ['matrix', 'amber', 'mono', 'light'].includes(value)) config.theme = value as ThemeName;
    else if (key === 'font' && ['mono', 'vt323'].includes(value)) config.font = value as SiteConfig['font'];
    else if (key === 'scanlines') config.scanlines = value === 'on';
    else if (key === 'cursor' && ['block', 'bar', 'underline'].includes(value)) config.cursor = value as SiteConfig['cursor'];
    else if (key === 'prompt') config.prompt = rest.join('=');
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
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightWhite: string;
  brightBlack: string;
  brightGreen: string;
};

export function xtermTheme(name: ThemeName): XtermTheme {
  switch (name) {
    case 'amber':
      return {
        background: '#0a0602',
        foreground: '#ffcf8a',
        cursor: '#ffb454',
        selectionBackground: 'rgba(255,180,84,0.25)',
        black: '#1a1206',
        red: '#ff8a5c',
        green: '#ffd08a',
        yellow: '#ffb454',
        blue: '#9ac7ff',
        magenta: '#e0a3ff',
        cyan: '#8fe3d0',
        white: '#ffe9c7',
        brightWhite: '#ffeecc',
        brightBlack: '#7a5220',
        brightGreen: '#ffdf9e',
      };
    case 'mono':
      return {
        background: '#07090b',
        foreground: '#d8dee6',
        cursor: '#ffffff',
        selectionBackground: 'rgba(255,255,255,0.18)',
        black: '#12161b',
        red: '#ff6b6b',
        green: '#c9d1d9',
        yellow: '#e3b341',
        blue: '#79c0ff',
        magenta: '#d2a8ff',
        cyan: '#7ee787',
        white: '#f0f6fc',
        brightWhite: '#ffffff',
        brightBlack: '#6e7681',
        brightGreen: '#ffffff',
      };
    case 'light':
      return {
        background: '#f6f7f4',
        foreground: '#1d2b1f',
        cursor: '#0b6b1f',
        selectionBackground: 'rgba(11,107,31,0.18)',
        black: '#1d2b1f',
        red: '#a41f1f',
        green: '#0b6b1f',
        yellow: '#8a6100',
        blue: '#1a4f8a',
        magenta: '#6b2d8a',
        cyan: '#0f6f6a',
        white: '#f6f7f4',
        brightWhite: '#0b1a0d',
        brightBlack: '#5c6b5e',
        brightGreen: '#0b6b1f',
      };
    default:
      return {
        background: '#030804',
        foreground: '#a3f2b0',
        cursor: '#00ff41',
        selectionBackground: 'rgba(0,255,65,0.25)',
        black: '#0a1a0d',
        red: '#ff6b6b',
        green: '#00ff41',
        yellow: '#febc2e',
        blue: '#4f8cff',
        magenta: '#c792ea',
        cyan: '#2ec4b6',
        white: '#d1fae5',
        brightWhite: '#d1fae5',
        brightBlack: '#2f7a3d',
        brightGreen: '#7dff9b',
      };
  }
}

/** Page-level colours so the frame around the terminal matches the theme. */
export function pageColors(name: ThemeName): { bg: string; frame: string; text: string; dim: string } {
  switch (name) {
    case 'amber':
      return { bg: '#0a0602', frame: 'rgba(255,180,84,0.32)', text: '#ffcf8a', dim: '#7a5220' };
    case 'mono':
      return { bg: '#07090b', frame: 'rgba(255,255,255,0.16)', text: '#d8dee6', dim: '#6e7681' };
    case 'light':
      return { bg: '#f6f7f4', frame: 'rgba(11,107,31,0.25)', text: '#1d2b1f', dim: '#5c6b5e' };
    default:
      return { bg: '#030804', frame: 'rgba(0,255,65,0.30)', text: '#a3f2b0', dim: '#2f7a3d' };
  }
}
