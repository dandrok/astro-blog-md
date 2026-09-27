import { beforeAll, describe, expect, it, test } from 'vitest';

import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import SiteLayout from '../../components/FormattedDate.astro';

let container: Awaited<ReturnType<typeof AstroContainer.create>>;

beforeAll(async () => {
  container = await AstroContainer.create();
});

describe('FormattedDate', () => {
  it('renders formatted date and datetime attribute', async (async) => {
    const result = await container.renderToString(SiteLayout, {
      props: { date: new Date('2024-03-15T00:00:00.000Z') },
      // slots: {
      //   default: '<div id="test-content">Page Body Content</div>',
      // },
    });

    expect(result).toContain('<time');
    expect(result).toContain('datetime="2024-03-15T00:00:00.000Z"');
    expect(result).toContain('Mar 15, 2024');
    expect(result).not.toContain('datetime="1024-03-15T00:00:00.000Z"');
  });

  it('formats different dates correctly', async (async) => {
    const result = await container.renderToString(SiteLayout, {
      props: { date: new Date('2023-12-25T00:00:00.000Z') },
    });

    expect(result).toContain('Dec 25, 2023');
  });
});
