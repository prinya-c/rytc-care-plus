/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** ISO timestamp injected at build time — see `define` in vite.config.ts. */
declare const __BUILD_DATE__: string;

/** Router basename for this build — '/rytc-care-plus' on GitHub Pages, '/' on Cloudflare Pages. See `define` in vite.config.ts. */
declare const __BASE_PATH__: string;
