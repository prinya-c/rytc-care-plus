import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  query,
  type QueryConstraint,
  type DocumentData,
  serverTimestamp,
} from 'firebase/firestore';
import { careDb, outOfDb } from './firebase';

// ---- care-plus (app-owned data, separate named Firestore database) ----

export type CarePlusCollectionName =
  | 'users'
  | 'screenings'
  | 'home-visits'
  | 'referrals'
  | 'interventions'
  | 'follow-up-results';

export function cpCollection(name: CarePlusCollectionName) {
  return collection(careDb, name);
}

export function cpDoc(name: CarePlusCollectionName, id: string) {
  return doc(careDb, name, id);
}

export async function getById<T = DocumentData>(
  name: CarePlusCollectionName,
  id: string,
): Promise<(T & { id: string }) | null> {
  const snap = await getDoc(cpDoc(name, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as T) };
}

export async function listAll<T = DocumentData>(name: CarePlusCollectionName, ...constraints: QueryConstraint[]) {
  const q = query(cpCollection(name), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
}

export async function createDoc<T extends object>(name: CarePlusCollectionName, data: T) {
  const ref = await addDoc(cpCollection(name), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function patchDoc<T extends object>(name: CarePlusCollectionName, id: string, data: Partial<T>) {
  await updateDoc(cpDoc(name, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Create-or-merge at a caller-chosen doc id, instead of Firestore's random
 * auto-id from `createDoc`. Used where a deterministic id is meaningful
 * (e.g. screenings keyed by `{academicYear}_{semester}_{studentId}` so a
 * student can only ever have one screening doc per period, and looking one
 * up doesn't need a query). `isNew` controls whether `createdAt` gets
 * (re)stamped — pass `false` for anything after the first write so repeat
 * edits don't clobber the original creation time.
 */
export async function upsertDocWithId<T extends object>(
  name: CarePlusCollectionName,
  id: string,
  data: T,
  { isNew }: { isNew: boolean },
) {
  await setDoc(
    cpDoc(name, id),
    {
      ...data,
      ...(isNew ? { createdAt: serverTimestamp() } : {}),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

// ---- out-of (legacy read-only data, separate named Firestore database) ----
// These are read-only mirrors of the college's existing student information
// system. Never write to them from this app.

export type LegacyCollectionName = 'department' | 'students' | 'teachers' | 'std_class';

export function legacyCollection(name: LegacyCollectionName) {
  return collection(outOfDb, name);
}

export async function listLegacy<T = DocumentData>(name: LegacyCollectionName, ...constraints: QueryConstraint[]) {
  const q = query(legacyCollection(name), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<T, 'id'>) }) as T & { id: string });
}

export async function getLegacyById<T = DocumentData>(name: LegacyCollectionName, id: string) {
  const snap = await getDoc(doc(outOfDb, name, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<T, 'id'>) } as T & { id: string };
}
