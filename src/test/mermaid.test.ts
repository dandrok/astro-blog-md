/**
 * The fence a mermaid diagram comes from is shiki output, not raw markdown:
 * each source line is its own span, so joining the text has to put the
 * newlines back or mermaid sees one long unparsable line.
 */

import { describe, expect, it } from 'vitest';
import { mermaidSource, mermaidTheme } from '../lib/mermaid';

function fence(lines: string[], text: string | null = null): Element {
  const code = {
    querySelectorAll: () => lines.map((line) => ({ textContent: line })),
    textContent: text ?? lines.join(''),
  };
  return { querySelector: (selector: string) => (selector === 'code' ? code : null) } as unknown as Element;
}

describe('mermaidSource', () => {
  it('joins shiki line spans back with newlines', () => {
    const pre = fence(['flowchart TD', '    A[Start] --> B[End]']);
    expect(mermaidSource(pre)).toBe('flowchart TD\n    A[Start] --> B[End]');
  });

  it('falls back to the code block text when no line spans exist', () => {
    const pre = fence([], 'graph LR\n  A --> B');
    expect(mermaidSource(pre)).toBe('graph LR\n  A --> B');
  });

  it('returns an empty string when the fence has no code element', () => {
    const pre = { querySelector: () => null } as unknown as Element;
    expect(mermaidSource(pre)).toBe('');
  });
});

describe('mermaidTheme', () => {
  it('falls back to the default palette outside a browser', () => {
    const theme = mermaidTheme();
    expect(theme.mainBkg).toBe('#08130b');
    expect(theme.primaryTextColor).toBe('#a3f2b0');
  });
});
