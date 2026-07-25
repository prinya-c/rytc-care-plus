import { where, orderBy } from 'firebase/firestore';
import { cpCollection, createDoc, getById, listAll, patchDoc, removeDoc, upsertDocWithId } from '../../lib/firestore';
import { getDocs, query } from 'firebase/firestore';
import type { Screening } from '../../types';

/**
 * Deterministic doc id for one student's screening in one period, so a
 * student can only ever have one screening doc per (academicYear,
 * semester) — no query needed to check "does this already exist", and no
 * risk of a duplicate doc from a race between two writes. Existing
 * screenings created before this convention keep their original
 * (Firestore-assigned) id; only new ones use this scheme — see
 * BulkScreeningPage.tsx, which always prefers an already-loaded doc's
 * existing id over recomputing this for an update.
 */
export function screeningDocId(academicYear: string, semester: string, studentId: string) {
  return `${academicYear}_${semester}_${studentId}`;
}

export async function fetchScreeningById(id: string) {
  return getById<Screening>('screenings', id);
}

export async function fetchScreeningsByTeacher(advisorTeacherId: string) {
  return listAll<Screening>('screenings', where('advisorTeacherId', '==', advisorTeacherId), orderBy('createdAt', 'desc'));
}

/** Screenings for one teacher, scoped to a single academic year + semester — used by the bulk screening grid. */
export async function fetchScreeningsByTeacherAndPeriod(advisorTeacherId: string, academicYear: string, semester: string) {
  return listAll<Screening>(
    'screenings',
    where('advisorTeacherId', '==', advisorTeacherId),
    where('academicYear', '==', academicYear),
    where('semester', '==', semester),
  );
}

export async function fetchScreeningsByStudent(studentId: string) {
  return listAll<Screening>('screenings', where('studentId', '==', studentId), orderBy('createdAt', 'desc'));
}

export async function fetchAllScreenings(filters?: { academicYear?: string; semester?: string; departmentId?: string; classId?: string }) {
  const constraints = [];
  if (filters?.academicYear) constraints.push(where('academicYear', '==', filters.academicYear));
  if (filters?.semester) constraints.push(where('semester', '==', filters.semester));
  if (filters?.departmentId) constraints.push(where('departmentId', '==', filters.departmentId));
  if (filters?.classId) constraints.push(where('classId', '==', filters.classId));
  const snap = await getDocs(query(cpCollection('screenings'), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Screening, 'id'>) }));
}

export async function createScreening(data: Omit<Screening, 'id' | 'createdAt' | 'updatedAt'>) {
  return createDoc('screenings', data);
}

export async function updateScreening(id: string, data: Partial<Screening>) {
  return patchDoc('screenings', id, data);
}

/** Create-or-update a screening at an explicit doc id (see `screeningDocId`). */
export async function upsertScreening(
  id: string,
  data: Omit<Screening, 'id' | 'createdAt' | 'updatedAt'>,
  isNew: boolean,
) {
  return upsertDocWithId('screenings', id, data, { isNew });
}

export async function fetchLatestScreeningForStudent(studentId: string) {
  const results = await fetchScreeningsByStudent(studentId);
  return results[0] ?? null;
}

export async function deleteScreening(id: string) {
  return removeDoc('screenings', id);
}

export interface ScreeningRound {
  academicYear: string;
  semester: string;
  trust: number;
  concern: number;
  close: number;
}

/** Groups screenings into one entry per (academicYear, semester) — a "รอบคัดกรอง" — newest first. */
export function computeScreeningRounds(screenings: Screening[]): ScreeningRound[] {
  const map = new Map<string, ScreeningRound>();
  for (const s of screenings) {
    const key = `${s.academicYear}|${s.semester}`;
    const entry = map.get(key) ?? { academicYear: s.academicYear, semester: s.semester, trust: 0, concern: 0, close: 0 };
    entry[s.resultGroup]++;
    map.set(key, entry);
  }
  return Array.from(map.values()).sort(
    (a, b) => b.academicYear.localeCompare(a.academicYear) || b.semester.localeCompare(a.semester),
  );
}
