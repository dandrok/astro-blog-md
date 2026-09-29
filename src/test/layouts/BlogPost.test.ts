import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, it, expect, beforeAll } from 'vitest';
import BlogPost from '../../layouts/BlogPost.astro';

let container: Awaited<ReturnType<typeof AstroContainer.create>>;

beforeAll(async () => {
  container = await AstroContainer.create();
});

describe('BlogPost Layout (Efficiency Suite)', () => {
  it('renders all dynamic fields when fully populated', async () => {
    const html = await container.renderToString(BlogPost, {
      props: {
        title: 'Full Post',
        description: 'Desc',
        pubDate: new Date('2024-03-15T00:00:00Z'),
        updatedDate: new Date('2024-03-20T00:00:00Z'),
        heroImage: '/cover.png',
        heroImageAlt: 'Cover Alt',
      },
      params: { slug: 'explicit-slug' },
      slots: { default: '<p id="article-body">Body</p>' },
    });

    expect(html).toContain('<p id="article-body">Body</p>');
    expect(html).toContain('~/blog/explicit-slug');
    expect(html).toContain('Last updated:');
    expect(html).toContain('src="/cover.png"');
    expect(html).toContain('alt="Cover Alt"');
  });

  it('handles fallbacks and omitted optional fields gracefully', async () => {
    const html = await container.renderToString(BlogPost, {
      props: {
        title: 'Hello World Title',
        description: 'Desc',
        pubDate: new Date('2024-03-15T00:00:00Z'),
        heroImage: '/cover.png',
        // updatedDate, heroImageAlt, and params.slug omitted
      },
    });

    expect(html).toContain('~/blog/hello-world-title');
    expect(html).toContain('alt="Hello World Title"');
    expect(html).not.toContain('Last updated:');
  });
});
