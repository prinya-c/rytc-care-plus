import { where, orderBy } from 'firebase/firestore';
import { createDoc, getById, listAll, patchDoc, removeDoc } from '../../lib/firestore';
import type { FollowUpResult, Intervention } from '../../types';

export async function fetchInterventionsByReferral(referralId: string) {
  return listAll<Intervention>('interventions', where('referralId', '==', referralId), orderBy('createdAt', 'desc'));
}

export async function fetchInterventionsByOfficer(officerId: string) {
  return listAll<Intervention>('interventions', where('officerId', '==', officerId), orderBy('createdAt', 'desc'));
}

export async function fetchInterventionById(id: string) {
  return getById<Intervention>('interventions', id);
}

export async function createIntervention(data: Omit<Intervention, 'id' | 'createdAt' | 'updatedAt'>) {
  return createDoc('interventions', data);
}

export async function updateIntervention(id: string, data: Partial<Intervention>) {
  return patchDoc('interventions', id, data);
}

export async function fetchFollowUpResultsByReferral(referralId: string) {
  return listAll<FollowUpResult>('follow-up-results', where('referralId', '==', referralId), orderBy('createdAt', 'desc'));
}

export async function createFollowUpResult(data: Omit<FollowUpResult, 'id' | 'createdAt' | 'updatedAt'>) {
  return createDoc('follow-up-results', data);
}

/** Deletes every intervention/follow-up-result tied to a referral — call before deleting the referral itself so nothing is orphaned. */
export async function deleteInterventionsAndFollowUpsByReferral(referralId: string) {
  const [interventions, followUps] = await Promise.all([
    fetchInterventionsByReferral(referralId),
    fetchFollowUpResultsByReferral(referralId),
  ]);
  await Promise.all([
    ...interventions.map((iv) => removeDoc('interventions', iv.id)),
    ...followUps.map((f) => removeDoc('follow-up-results', f.id)),
  ]);
}
