// Cloudflare Pages Function — only runs on the Cloudflare deploy (care.rytc.ac.th).
// The GitHub Pages deploy has no backend, so this endpoint simply doesn't
// exist there; LoginPage.tsx treats that as "verification unavailable" and
// falls back to the client-side widget completion alone.
//
// TURNSTILE_SECRET_KEY must be set as an environment variable in the
// Cloudflare Pages project settings (Settings > Environment variables) —
// never commit the secret key to the repo.
export async function onRequestPost({ request, env }) {
  let token;
  try {
    ({ token } = await request.json());
  } catch {
    return Response.json({ success: false, error: 'invalid-request' }, { status: 400 });
  }
  if (!token || typeof token !== 'string') {
    return Response.json({ success: false, error: 'missing-token' }, { status: 400 });
  }
  if (!env.TURNSTILE_SECRET_KEY) {
    return Response.json({ success: false, error: 'not-configured' }, { status: 500 });
  }

  const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: request.headers.get('CF-Connecting-IP') }),
  });
  const outcome = await verifyRes.json();
  return Response.json({ success: outcome.success === true });
}
