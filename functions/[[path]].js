// Cloudflare Pages catch-all — guarantees SPA fallback (serve index.html for
// any client-side route) independently of public/_redirects, which is the
// standard "Advanced Mode" pattern for Pages Functions. Without this, a
// direct load or refresh on a route like /dashboard has no matching static
// file, and any misfiring fallback (e.g. the GitHub-Pages-only 404.html
// redirect script) can corrupt the URL instead of just rendering the app.
//
// Real static assets (hashed JS/CSS/icons/manifest/etc.) and /api/* requests
// must be excluded so they keep being served/handled normally.
const ASSET_EXTENSION = /\.[a-z0-9]+$/i;

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/') || ASSET_EXTENSION.test(url.pathname)) {
    return next();
  }

  return context.env.ASSETS.fetch(new URL('/index.html', url));
}
