import { where, orderBy, getDocs, query, serverTimestamp } from 'firebase/firestore';
import { cpCollection, createDoc, getById, listAll, patchDoc, removeDoc } from '../../lib/firestore';
import type { BehaviorInfo, FamilyInfo, HomeVisit, StudentInfo } from '../../types';

export async function fetchHomeVisitById(id: string) {
  return getById<HomeVisit>('home-visits', id);
}

export async function fetchHomeVisitsByTeacher(advisorTeacherId: string) {
  return listAll<HomeVisit>('home-visits', where('advisorTeacherId', '==', advisorTeacherId), orderBy('createdAt', 'desc'));
}

export async function fetchHomeVisitsByStudent(studentId: string) {
  return listAll<HomeVisit>('home-visits', where('studentId', '==', studentId), orderBy('createdAt', 'desc'));
}

export async function fetchAllHomeVisits(filters?: { academicYear?: string; semester?: string; departmentId?: string; classId?: string }) {
  const constraints = [];
  if (filters?.academicYear) constraints.push(where('academicYear', '==', filters.academicYear));
  if (filters?.semester) constraints.push(where('semester', '==', filters.semester));
  if (filters?.departmentId) constraints.push(where('departmentId', '==', filters.departmentId));
  if (filters?.classId) constraints.push(where('classId', '==', filters.classId));
  const snap = await getDocs(query(cpCollection('home-visits'), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<HomeVisit, 'id'>) }));
}

export async function createHomeVisit(data: Omit<HomeVisit, 'id' | 'createdAt' | 'updatedAt'>) {
  return createDoc('home-visits', data);
}

export async function updateHomeVisit(id: string, data: Partial<HomeVisit>) {
  return patchDoc('home-visits', id, data);
}

/** Saves only the ข้อมูลนักเรียน section (studentInfo/familyInfo/behaviorInfo), stamping studentInfoUpdatedAt — used by both the student self-report page and the teacher-facing ข้อมูลนักเรียน edit page. */
export async function updateStudentInfoSection(
  id: string,
  data: { studentInfo: StudentInfo; familyInfo: FamilyInfo; behaviorInfo: BehaviorInfo },
) {
  return patchDoc('home-visits', id, { ...data, studentInfoUpdatedAt: serverTimestamp() });
}

export async function deleteHomeVisit(id: string) {
  return removeDoc('home-visits', id);
}
