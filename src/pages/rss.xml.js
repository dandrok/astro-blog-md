import rss from '@astrojs/rss';
import { readPosts } from '../lib/read';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';

export async function GET(context) {
  const posts = await readPosts();
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: posts.map(({ slug, entry }) => ({
      title: entry.data.title,
      description: entry.data.description ?? '',
      pubDate: entry.data.pubDate,
      link: `/${slug}/`,
    })),
  });
}
