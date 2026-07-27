import { where, orderBy, getDocs, query } from 'firebase/firestore';
import { cpCollection, createDoc, getById, listAll, patchDoc, removeDoc } from '../../lib/firestore';
import type { DropoutFollowUp } from '../../types';

export async function fetchDropoutFollowUpById(id: string) {
  return getById<DropoutFollowUp>('dropout-follow-ups', id);
}

export async function fetchDropoutFollowUpsByTeacher(advisorTeacherId: string) {
  return listAll<DropoutFollowUp>('dropout-follow-ups', where('advisorTeacherId', '==', advisorTeacherId), orderBy('createdAt', 'desc'));
}

export async function fetchAllDropoutFollowUps() {
  const snap = await getDocs(query(cpCollection('dropout-follow-ups'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DropoutFollowUp, 'id'>) }));
}

export async function createDropoutFollowUp(data: Omit<DropoutFollowUp, 'id' | 'createdAt' | 'updatedAt'>) {
  return createDoc('dropout-follow-ups', data);
}

export async function updateDropoutFollowUp(id: string, data: Partial<DropoutFollowUp>) {
  return patchDoc('dropout-follow-ups', id, data);
}

export async function deleteDropoutFollowUp(id: string) {
  return removeDoc('dropout-follow-ups', id);
}
