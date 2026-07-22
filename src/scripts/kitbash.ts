/**
 * Client-side registration for `@ktbsh/ui` custom elements used by the blog.
 * Import once from the site shell (SiteLayout, top of <body> so the fetch
 * starts before the rest of a long page is parsed). Production also
 * modulepreloads this chunk from <head> (kitbashModulePreload in astro.config).
 */
import '@ktbsh/ui/vanilla/theme-toggle';
import '@ktbsh/ui/vanilla/preset-toggle';
import '@ktbsh/ui/vanilla/toggle-group';
import '@ktbsh/ui/vanilla/scroll-top';
import '@ktbsh/ui/vanilla/tag';
import '@ktbsh/ui/vanilla/tag-list';
import '@ktbsh/ui/vanilla/toc';
import '@ktbsh/ui/vanilla/link';
import '@ktbsh/ui/vanilla/button';
