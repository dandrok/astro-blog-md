import { beforeAll, describe, expect, it } from 'vitest';

import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import FormattedDate from '../../components/FormattedDate.astro';

let container: Awaited<ReturnType<typeof AstroContainer.create>>;

beforeAll(async () => {
  container = await AstroContainer.create();
});

describe('FormattedDate', () => {
  it('renders formatted date and datetime attribute', async () => {
    const result = await container.renderToString(FormattedDate, {
      props: { date: new Date('2024-03-15T00:00:00.000Z') },
    });

    expect(result).toContain('<time');
    expect(result).toContain('datetime="2024-03-15T00:00:00.000Z"');
    expect(result).toContain('Mar 15, 2024');
    expect(result).not.toContain('datetime="1024-03-15T00:00:00.000Z"');
  });

  it('formats different dates correctly', async () => {
    const result = await container.renderToString(FormattedDate, {
      props: { date: new Date('2023-12-25T00:00:00.000Z') },
    });

    expect(result).toContain('Dec 25, 2023');
  });
});
