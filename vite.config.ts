import { defineConfig, type Plugin } from 'vite'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Cloudflare Pages injects CF_PAGES=1 into every git-connected build
// automatically (no dashboard config needed) — used here to tell it apart
// from the GitHub Actions build, since the two deploy to different paths:
// GitHub Pages serves this app under /rytc-care-plus/, Cloudflare Pages
// serves it at the domain root. Previously this required manually editing
// this file (and App.tsx's basename) before every manual Cloudflare build.
const isCloudflarePages = !!process.env.CF_PAGES

// public/404.html implements the GitHub-Pages-only SPA-fallback hack
// (encodes the requested path into a query string, since GH Pages has no
// server-side rewrites). Cloudflare Pages instead uses public/_redirects
// for proper server-side SPA fallback and must never serve 404.html — if it
// ever did, its redirect script would re-encode an already-encoded query
// string on every reload, corrupting the URL. Strip it from Cloudflare builds
// as defense-in-depth on top of functions/[[path]].js.
function stripGitHubPages404(): Plugin {
  return {
    name: 'strip-github-pages-404',
    apply: () => isCloudflarePages,
    async closeBundle() {
      await rm(path.resolve(__dirname, 'dist/404.html'), { force: true })
    },
  }
}
const basePath = isCloudflarePages ? '/' : '/rytc-care-plus/'
// react-router's basename doesn't take a trailing slash (except the root '/' itself).
const routerBasename = isCloudflarePages ? '/' : '/rytc-care-plus'

// https://vite.dev/config/
export default defineConfig({
  base: basePath,
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    __BASE_PATH__: JSON.stringify(routerBasename),
  },
  plugins: [
    react(),
    tailwindcss(),
    stripGitHubPages404(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered manually in main.tsx via `virtual:pwa-register` instead of
      // the auto-injected script, since only the manual registration wires up
      // the reload-on-update behaviour that registerType 'autoUpdate' implies.
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: basePath,
        name: 'RYTC Care+',
        short_name: 'Care+',
        description: 'ระบบดูแลช่วยเหลือและติดตามนักเรียน นักศึกษา วิทยาลัยเทคนิคระยอง',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: basePath,
        scope: basePath,
        lang: 'th',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // index.html is deliberately NOT precached here (no 'html' glob) —
        // hashed JS/CSS/icon filenames make CacheFirst precaching safe for
        // them (new content always gets a new filename), but the one
        // unhashed, always-same-URL document (index.html, which is what a
        // plain page refresh loads) must never be served stale from cache.
        // The navigate runtimeCaching rule below handles it instead:
        // network-first, cache only as an offline fallback.
        globPatterns: ['**/*.{js,css,ico,png,svg,webmanifest}'],
        // Disable Workbox's auto-generated navigateFallback route (which
        // defaults to 'index.html' and requires it to be precached — it
        // isn't, by design, above). The custom NetworkFirst 'navigate' rule
        // below already handles all navigation requests, so the fallback
        // route only ever produced an uncaught 'non-precached-url' error.
        navigateFallback: undefined,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-shell',
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://firestore.googleapis.com',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-cache',
              networkTimeoutSeconds: 10,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 365, maxEntries: 20 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
