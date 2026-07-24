/**
 * Client-side password hashing using the Web Crypto API (PBKDF2-SHA256).
 *
 * This exists only because Firebase Authentication is temporarily disabled
 * (see AuthContext.tsx / README "Temporary custom auth" section) and this
 * app has no server component of its own to hold a real secret-side
 * verifier. PBKDF2 with a per-user random salt is meaningfully better than
 * storing plaintext, but it is NOT equivalent to a proper server-side auth
 * system — the hash is readable by anyone who can read the `users`
 * collection, so offline brute-forcing is still possible. Replace this
 * with Firebase Authentication (already implemented in lib/auth.ts) once
 * the system stabilizes.
 */

const ITERATIONS = 150_000;
const HASH_BITS = 256;

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function randomSaltHex(byteLength = 16) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return toHex(bytes.buffer);
}

async function deriveHash(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: fromHex(saltHex),
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_BITS,
  );
  return toHex(derived);
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = randomSaltHex();
  const hash = await deriveHash(password, salt);
  return { hash, salt };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const hash = await deriveHash(password, salt);
  return hash === expectedHash;
}
