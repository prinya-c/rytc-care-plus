import { where, orderBy, getDocs, query } from 'firebase/firestore';
import { cpCollection, createDoc, getById, listAll, patchDoc, removeDoc } from '../../lib/firestore';
import type { DisabilitySurvey } from '../../types';

export async function fetchDisabilitySurveyById(id: string) {
  return getById<DisabilitySurvey>('disabilities', id);
}

/** Ordered newest-first — callers wanting "the latest survey for this student" take `[0]`. */
export async function fetchDisabilitySurveysByStudent(studentId: string) {
  return listAll<DisabilitySurvey>('disabilities', where('studentId', '==', studentId), orderBy('createdAt', 'desc'));
}

export async function fetchDisabilitySurveysByTeacher(advisorTeacherId: string) {
  return listAll<DisabilitySurvey>('disabilities', where('advisorTeacherId', '==', advisorTeacherId), orderBy('createdAt', 'desc'));
}

export async function fetchAllDisabilitySurveys() {
  const snap = await getDocs(query(cpCollection('disabilities'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DisabilitySurvey, 'id'>) }));
}

export async function createDisabilitySurvey(data: Omit<DisabilitySurvey, 'id' | 'createdAt' | 'updatedAt'>) {
  return createDoc('disabilities', data);
}

export async function updateDisabilitySurvey(id: string, data: Partial<DisabilitySurvey>) {
  return patchDoc('disabilities', id, data);
}

export async function deleteDisabilitySurvey(id: string) {
  return removeDoc('disabilities', id);
}
