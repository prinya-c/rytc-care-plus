import { where, orderBy, getDocs, query } from 'firebase/firestore';
import { cpCollection, createDoc, getById, listAll, patchDoc, removeDoc } from '../../lib/firestore';
import type { HomeroomLog } from '../../types';

export async function fetchHomeroomLogById(id: string) {
  return getById<HomeroomLog>('homeroom-logs', id);
}

export async function fetchHomeroomLogsByTeacher(advisorTeacherId: string) {
  return listAll<HomeroomLog>('homeroom-logs', where('advisorTeacherId', '==', advisorTeacherId), orderBy('createdAt', 'desc'));
}

export async function fetchAllHomeroomLogs() {
  const snap = await getDocs(query(cpCollection('homeroom-logs'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<HomeroomLog, 'id'>) }));
}

export async function createHomeroomLog(data: Omit<HomeroomLog, 'id' | 'createdAt' | 'updatedAt'>) {
  return createDoc('homeroom-logs', data);
}

export async function updateHomeroomLog(id: string, data: Partial<HomeroomLog>) {
  return patchDoc('homeroom-logs', id, data);
}

export async function deleteHomeroomLog(id: string) {
  return removeDoc('homeroom-logs', id);
}
