import { describe, expect, test } from 'vitest';

import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import SiteLayout from '../../layouts/SiteLayout.astro';

describe('SiteLayout Integration', async () => {
  const container = await AstroContainer.create();

  const result = await container.renderToString(SiteLayout, {
    props: { title: 'Test Page', description: 'test-descrition' },
    slots: {
      default: '<div id="test-content">Page Body Content</div>',
    },
  });

  describe('renders semantic landmarks and slots correctly', () => {
    const testCase = [{ tag: 'footer' }, { tag: 'nav' }, { tag: 'button' }, { tag: 'ul' }];

    test.each(testCase)('the $tag tag should be in layout', ({ tag }) => {
      expect(result).toContain(tag);
    });
    test.each([[]]);
  });

  describe('a11y  patterns are implemented correctly', () => {
    const testCase = [
      { accessability: 'html lang=' },
      { accessability: 'initial-scale' },
      { accessability: 'title' },
      { accessability: 'aria' },
      { accessability: 'focus:' },
      { accessability: 'matchMedia' },
      { accessability: 'email=' },
      { accessability: 'aria-label' },
    ];

    test.each(testCase)(
      'the $accessability accessability should be in layout',
      ({ accessability }) => {
        expect(result).toContain(accessability);
      },
    );
  });
});
