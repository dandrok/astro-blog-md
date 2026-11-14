/**
 * Read-model for the plain reading views: slugs that match the URLs, real
 * reading time, and no duplicate routes (two drafts can share a slug).
 */

import { getCollection, type CollectionEntry } from 'astro:content';
import { slugify } from './terminal/slug';

export type ReadPost = {
  slug: string;
  entry: CollectionEntry<'blog'>;
  readingMinutes: number;
  words: number;
};

export async function readPosts(): Promise<ReadPost[]> {
  const all = await getCollection('blog');
  const bySlug = new Map<string, ReadPost>();

  for (const entry of all.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())) {
    const slug = slugify(entry.id);
    if (bySlug.has(slug)) continue; // first (newest) wins, no duplicate routes
    const body = (entry as { body?: string }).body ?? '';
    const words = body.split(/\s+/).filter(Boolean).length;
    bySlug.set(slug, {
      slug,
      entry,
      words,
      readingMinutes: Math.max(1, Math.round(words / 220)),
    });
  }
  return [...bySlug.values()];
}

export function longDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** "11 Nov 2026" — the list gutter carries the year, not just the day. */
export function listDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
