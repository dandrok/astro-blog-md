/**
 * Posts keep their file names in the content collection, which can contain
 * spaces or doubled dashes ("hermes --tui impression"). Slugs have to match
 * the URLs Astro generates, so normalise in one place.
 */
export function slugify(id: string): string {
  return id
    .replace(/\.mdx?$/, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}
