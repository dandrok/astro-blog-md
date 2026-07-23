/**
 * Ambient typings for `@ktbsh/ui` custom elements used in Astro templates.
 * Registration: `src/scripts/kitbash.ts` (imported from SiteLayout).
 */
export {};

type KitbashAttrs = Record<string, unknown>;

declare global {
  namespace astroHTML.JSX {
    interface IntrinsicElements {
      'kitbash-scroll-top': KitbashAttrs;
      'kitbash-tag': KitbashAttrs;
      'kitbash-tag-list': KitbashAttrs;
      'kitbash-toc': KitbashAttrs;
      'kitbash-link': KitbashAttrs;
      'kitbash-button': KitbashAttrs;
    }
  }
}
