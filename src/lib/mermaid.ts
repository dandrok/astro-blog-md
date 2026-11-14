/**
 * Mermaid fences in an article are drawn in the browser.
 *
 * shiki emits `<pre data-language="mermaid">` for a ```mermaid fence, so the
 * markdown stays plain text and the build stays static; this module swaps the
 * block for the drawing, and redraws it when the reader's theme changes.
 * Colours come from the page's own palette tokens, so a diagram is never a
 * light-theme island in the dark reading view.
 */

const FENCE_SELECTOR = 'pre[data-language="mermaid"]';

type Diagram = { source: string; target: HTMLElement };
type Engine = typeof import('mermaid').default;

const diagrams: Diagram[] = [];
let engine: Engine | null = null;
let drawn = 0;

/**
 * The fence's text with shiki's per-line spans flattened back into newlines.
 * `textContent` alone loses them, and mermaid cannot parse a one-line graph.
 */
export function mermaidSource(pre: Element): string {
  const code = pre.querySelector('code');
  if (!code) return '';
  const lines = code.querySelectorAll('.line');
  if (lines.length === 0) return code.textContent ?? '';
  return Array.from(lines, (line) => line.textContent ?? '').join('\n');
}

function token(name: string, fallback: string): string {
  if (typeof getComputedStyle !== 'function') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * Mermaid's base theme, fed from the palette. Only solid hex tokens are used:
 * mermaid derives shades from these, and a derived-from-rgba colour comes out
 * black on some palettes.
 */
export function mermaidTheme() {
  const bg = token('--bg', '#050805');
  const surface = token('--surface', '#08130b');
  const text = token('--text', '#a3f2b0');
  const bright = token('--bright', '#d1fae5');
  const dim = token('--dim', '#4f9f63');
  const dim2 = token('--dim-2', '#3f8f52');
  const accent = token('--accent', '#00ff41');
  const light = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light';

  return {
    darkMode: !light,
    background: bg,
    fontSize: '15px',
    fontFamily: token('--mono', "ui-monospace, 'JetBrains Mono', monospace"),
    primaryColor: surface,
    mainBkg: surface,
    primaryTextColor: text,
    nodeTextColor: text,
    textColor: text,
    titleColor: bright,
    primaryBorderColor: accent,
    nodeBorder: accent,
    lineColor: dim,
    arrowheadColor: dim2,
    secondaryColor: surface,
    tertiaryColor: bg,
    edgeLabelBackground: bg,
    clusterBkg: bg,
    clusterBorder: dim2,
  };
}

async function loadEngine(): Promise<Engine> {
  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    // The fit is the stylesheet's job: mermaid's own `max-width` inline style
    // would win over the phone rule and squeeze a wide diagram into unreadable type.
    flowchart: { useMaxWidth: false },
    fontFamily: mermaidTheme().fontFamily,
    themeVariables: mermaidTheme(),
  });
  engine = mermaid;
  return mermaid;
}

/** Replace every mermaid fence under `root` with its drawing. Returns how many are on the page. */
export async function renderMermaidDiagrams(root: ParentNode = document): Promise<number> {
  const fences = Array.from(root.querySelectorAll<HTMLElement>(FENCE_SELECTOR));
  if (fences.length === 0) return 0;
  const mermaid = engine ?? (await loadEngine());

  for (const pre of fences) {
    const source = mermaidSource(pre);
    if (source.trim() === '') continue;
    const target = document.createElement('figure');
    target.className = 'mermaid-diagram';
    try {
      drawn += 1;
      const { svg } = await mermaid.render(`mermaid-diagram-${drawn}`, source);
      target.innerHTML = svg;
    } catch (error) {
      // Keep the fence: the source is the honest fallback for a broken diagram.
      pre.dataset.mermaidError = 'true';
      console.error('mermaid: could not draw this diagram', error);
      continue;
    }
    pre.replaceWith(target);
    diagrams.push({ source, target });
  }
  return diagrams.length;
}

async function redraw(): Promise<void> {
  const mermaid = await loadEngine();
  for (const diagram of diagrams) {
    try {
      drawn += 1;
      const { svg } = await mermaid.render(`mermaid-diagram-${drawn}`, diagram.source);
      diagram.target.innerHTML = svg;
    } catch (error) {
      console.error('mermaid: could not redraw this diagram', error);
    }
  }
}

/** Keep every drawn diagram in the palette the reader currently has. */
export function followTheme(): void {
  if (diagrams.length === 0 || typeof MutationObserver !== 'function') return;
  new MutationObserver(() => void redraw()).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
}
