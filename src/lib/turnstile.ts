/**
 * Verifies a Turnstile token against the Cloudflare Pages Function at
 * /api/verify-turnstile. That function only exists on the Cloudflare deploy
 * (care.rytc.ac.th) — the GitHub Pages deploy has no backend, so a request
 * there 404s. Treat "endpoint unreachable" as verification unavailable
 * (fail open) rather than blocking login entirely on GitHub Pages; an
 * explicit { success: false } from a reachable endpoint still blocks.
 */
export async function verifyTurnstileToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}api/verify-turnstile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return true;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return true;
  }
}
