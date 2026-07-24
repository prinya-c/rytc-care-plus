import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);

/**
 * This project uses two separate named Firestore databases in the same
 * Firebase project (not the "(default)" database):
 * - "out-of"   — the college's existing student information system.
 *                Read-only from this app.
 * - "care-plus" — all data this app owns (users, screenings, home-visits,
 *                referrals, interventions, follow-up-results).
 * Each database has its own security rules file (see firestore.out-of.rules
 * and firestore.care-plus.rules) since Firestore rules cannot read across
 * databases.
 */
export const outOfDb = getFirestore(app, 'out-of');
export const careDb = getFirestore(app, 'care-plus');
