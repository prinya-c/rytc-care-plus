import { getDocs, query, orderBy } from 'firebase/firestore';
import { cpCollection, getById, upsertDocWithId } from '../../lib/firestore';
import type { SignatorySettings } from '../../types';

/** Deterministic doc id — one signatory record per (academicYear, semester). */
export function signatorySettingsDocId(academicYear: string, semester: string) {
  return `${academicYear}_${semester}`;
}

export async function fetchSignatorySettings(academicYear: string, semester: string) {
  return getById<SignatorySettings>('signatory-settings', signatorySettingsDocId(academicYear, semester));
}

export async function fetchAllSignatorySettings() {
  const snap = await getDocs(query(cpCollection('signatory-settings'), orderBy('academicYear', 'desc'), orderBy('semester', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SignatorySettings, 'id'>) }));
}

export async function upsertSignatorySettings(
  academicYear: string,
  semester: string,
  data: { orderNumber: string; advisorHeadName: string; deputyDirectorName: string; updatedBy: string },
  { isNew }: { isNew: boolean },
) {
  await upsertDocWithId(
    'signatory-settings',
    signatorySettingsDocId(academicYear, semester),
    { academicYear, semester, ...data },
    { isNew },
  );
}
