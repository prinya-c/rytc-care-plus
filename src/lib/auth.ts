/**
 * Firebase Authentication wrapper — NOT CURRENTLY WIRED UP.
 *
 * Kept on standby, unused, while the app runs on the temporary
 * citizenId+password custom auth in lib/customAuth.ts (see README
 * "Temporary custom auth" section and AuthContext.tsx). To switch back:
 * point AuthContext.tsx at watchAuthState/signIn/signOut/fetchUserProfile
 * below instead of lib/customAuth.ts, and re-enable Authentication in the
 * Firebase console.
 */
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';
import { getById } from './firestore';
import type { UserProfile } from '../types';

export function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signOut() {
  return firebaseSignOut(auth);
}

export function watchAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const profile = await getById<UserProfile>('users', uid);
  return profile;
}
