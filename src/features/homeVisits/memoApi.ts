import { where, orderBy, getDocs, query } from 'firebase/firestore';
import { cpCollection, createDoc, getById, listAll, patchDoc, removeDoc } from '../../lib/firestore';
import type { HomeVisitMemo } from '../../types';

export async function fetchHomeVisitMemoById(id: string) {
  return getById<HomeVisitMemo>('home-visit-memos', id);
}

export async function fetchHomeVisitMemosByTeacher(advisorTeacherId: string) {
  return listAll<HomeVisitMemo>('home-visit-memos', where('advisorTeacherId', '==', advisorTeacherId), orderBy('createdAt', 'desc'));
}

export async function fetchAllHomeVisitMemos() {
  const snap = await getDocs(query(cpCollection('home-visit-memos'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<HomeVisitMemo, 'id'>) }));
}

export async function createHomeVisitMemo(data: Omit<HomeVisitMemo, 'id' | 'createdAt' | 'updatedAt'>) {
  return createDoc('home-visit-memos', data);
}

export async function updateHomeVisitMemo(id: string, data: Partial<HomeVisitMemo>) {
  return patchDoc('home-visit-memos', id, data);
}

export async function deleteHomeVisitMemo(id: string) {
  return removeDoc('home-visit-memos', id);
}
