import { beforeAll, describe, expect, it } from 'vitest';

import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import Footer from '../../components/Footer.astro';
import { rot13 } from '../../utils/rot13';

let container: Awaited<ReturnType<typeof AstroContainer.create>>;

beforeAll(async () => {
  container = await AstroContainer.create();
});

describe('Footer — rendered HTML', () => {
  it('renders the footer nav with an aria-label', async () => {
    const html = await container.renderToString(Footer);
    expect(html).toContain('aria-label="Footer links"');
  });

  it('renders the github link with safe external attributes', async () => {
    const html = await container.renderToString(Footer);
    expect(html).toContain('href="https://github.com/dandrok"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('renders blog and rss links', async () => {
    const html = await container.renderToString(Footer);
    expect(html).toContain('href="/blog/"');
    expect(html).toContain('href="/rss.xml"');
  });

  it('renders the obfuscated email placeholder', async () => {
    const html = await container.renderToString(Footer);
    expect(html).toContain('id="email-link"');
    expect(html).toContain('data-u="pbagnpg"');
    expect(html).toContain('data-d="gurqbgsvyr"');
    expect(html).toContain('data-t="pbz"');
    expect(html).toContain('email=[protected]');
  });

  it('includes a noscript fallback with the plaintext address', async () => {
    const html = await container.renderToString(Footer);
    expect(html).toContain('<noscript>');
    expect(html).toContain('contact [at] thedotfile [dot] com');
  });
});

describe('rot13', () => {
  it('decodes the footer email parts', () => {
    expect(rot13('pbagnpg')).toBe('contact');
    expect(rot13('gurqbgsvyr')).toBe('thedotfile');
    expect(rot13('pbz')).toBe('com');
  });

  it('rotates letters and leaves other characters alone', () => {
    expect(rot13('abc')).toBe('nop');
    expect(rot13('ABC')).toBe('NOP');
    expect(rot13('123!@#')).toBe('123!@#');
  });

  it('is its own inverse', () => {
    expect(rot13(rot13('hello'))).toBe('hello');
  });
});
