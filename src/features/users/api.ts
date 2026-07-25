import { listAll, patchDoc, cpDoc } from '../../lib/firestore';
import { setDoc, serverTimestamp, where } from 'firebase/firestore';
import type { UserProfile } from '../../types';

export async function fetchAllUsers() {
  return listAll<UserProfile>('users');
}

/**
 * Best-effort lookup of the active advisor teacher for a class, so a
 * student filling in their own home-visit info (self-service login) can
 * have a record attributed to their advisor. classIds is teacher-editable
 * and only best-effort suggested from legacy data (see
 * suggestClassesForTeacher), so this may return null if no teacher has
 * claimed the class yet — the record still gets created and shows up for
 * admin/advisor_staff via the college-wide view.
 */
export async function fetchAdvisorTeacherForClass(classCode: string): Promise<UserProfile | null> {
  // A single array-contains filter needs no composite index; the role/active
  // checks are cheap enough to do client-side and avoid requiring one.
  const candidates = await listAll<UserProfile>('users', where('classIds', 'array-contains', classCode));
  return candidates.find((u) => u.role === 'advisor_teacher' && u.isActive) ?? null;
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
