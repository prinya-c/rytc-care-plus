import { where, orderBy, getDocs, query, serverTimestamp } from 'firebase/firestore';
import { cpCollection, createDoc, getById, listAll, patchDoc } from '../../lib/firestore';
import type { Referral, ReferralStatus, TargetWork } from '../../types';

export async function fetchReferralById(id: string) {
  return getById<Referral>('referrals', id);
}

export async function fetchReferralsByTeacher(referredBy: string) {
  return listAll<Referral>('referrals', where('referredBy', '==', referredBy), orderBy('createdAt', 'desc'));
}

export async function fetchReferralsByStudent(studentId: string) {
  return listAll<Referral>('referrals', where('studentId', '==', studentId), orderBy('createdAt', 'desc'));
}

export async function fetchReferralsByTargetWork(targetWork: TargetWork, status?: ReferralStatus) {
  const constraints = [where('targetWork', '==', targetWork)];
  if (status) constraints.push(where('status', '==', status));
  return listAll<Referral>('referrals', ...constraints, orderBy('createdAt', 'desc'));
}

export async function fetchAllReferrals(filters?: { academicYear?: string; targetWork?: TargetWork; status?: ReferralStatus }) {
  const constraints = [];
  if (filters?.targetWork) constraints.push(where('targetWork', '==', filters.targetWork));
  if (filters?.status) constraints.push(where('status', '==', filters.status));
  const snap = await getDocs(query(cpCollection('referrals'), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Referral, 'id'>) }));
}

export async function createReferral(data: Omit<Referral, 'id' | 'createdAt' | 'updatedAt' | 'status'>) {
  return createDoc('referrals', { ...data, status: 'sent' as const });
}

export async function receiveReferral(id: string, receivedBy: string) {
  return patchDoc<Referral>('referrals', id, {
    status: 'received',
    receivedBy,
    receivedAt: serverTimestamp() as never,
  });
}

export async function updateReferralStatus(id: string, status: ReferralStatus) {
  return patchDoc<Referral>('referrals', id, { status });
}
