import { listAll, patchDoc, cpDoc } from '../../lib/firestore';
import { setDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '../../types';

export async function fetchAllUsers() {
  return listAll<UserProfile>('users');
}

/** Create or overwrite the profile doc for a given Firebase Auth uid. */
export async function upsertUserProfile(uid: string, data: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>) {
  await setDoc(
    cpDoc('users', uid),
    {
      uid,
      ...data,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  return patchDoc('users', uid, data);
}

export async function setUserActive(uid: string, isActive: boolean) {
  return patchDoc<UserProfile>('users', uid, { isActive });
}
