/**
 * Client-side registration for `@ktbsh/ui` custom elements used by the blog.
 * Import once from BaseHead (<head>) so the CE chunk download starts as early
 * as possible. Module scripts still defer until after HTML parse — light-DOM
 * FOUC shells in global.css hold layout until customElements.define runs.
 * Production also modulepreloads this chunk (kitbashModulePreload in astro.config).
 *
 * Header theme/UI toggles are plain HTML in PageHeader (not kitbash CEs) so they
 * never FOUC on MPA navigation — same first-paint model as the logo.
 */
import '@ktbsh/ui/vanilla/scroll-top';
import '@ktbsh/ui/vanilla/tag';
import '@ktbsh/ui/vanilla/tag-list';
import '@ktbsh/ui/vanilla/toc';
import '@ktbsh/ui/vanilla/link';
import '@ktbsh/ui/vanilla/button';