import { where, orderBy } from 'firebase/firestore';
import { listLegacy, getLegacyById } from '../../lib/firestore';
import type { Department, Student, StdClass, Teacher } from '../../types';

export async function fetchAllStudents() {
  return listLegacy<Student>('students');
}

/** Student doc id equals `sid`, so this is a direct lookup, not a query. */
export async function fetchStudentByStudentId(sid: string) {
  return getLegacyById<Student>('students', sid);
}

export async function fetchStudentsByClass(classCode: string) {
  return listLegacy<Student>('students', where('class_code', '==', classCode));
}

export async function fetchStudentsByClasses(classCodes: string[]) {
  if (classCodes.length === 0) return [];
  // Firestore `in` supports up to 30 values; chunk if a teacher somehow has more.
  const chunks: string[][] = [];
  for (let i = 0; i < classCodes.length; i += 30) chunks.push(classCodes.slice(i, i + 30));
  const results = await Promise.all(
    chunks.map((chunk) => listLegacy<Student>('students', where('class_code', 'in', chunk))),
  );
  return results.flat();
}

export async function fetchAllClasses() {
  return listLegacy<StdClass>('std_class', orderBy('class_name'));
}

export async function fetchAllDepartments() {
  return listLegacy<Department>('department');
}

export async function fetchAllTeachers() {
  return listLegacy<Teacher>('teachers');
}

/**
 * Field in out-of/teachers that stores the 13-digit Thai citizen ID.
 * Confirmed against real data — it's also the document ID, so lookup by
 * citizen ID is a direct getDoc, not a query.
 */
export const TEACHER_ID_CARD_FIELD = 'tidcard';

export async function findTeacherByCitizenId(citizenId: string) {
  return getLegacyById<Teacher>('teachers', citizenId);
}

export function studentDisplayName(student: Student) {
  return student.sname;
}

/** "แผนกวิชา{dep_name} · {short_name}" for a subtitle under the student's name, e.g. on home-visit forms. */
export function studentSubtitle(student: Student | null | undefined): string {
  if (!student) return '';
  const parts: string[] = [];
  if (student.dep_name) parts.push(`แผนกวิชา${student.dep_name}`);
  if (student.short_name) parts.push(student.short_name);
  return parts.join(' · ');
}

function normalizeName(name?: string) {
  return (name ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Best-effort match of std_class.advisor_name (plain text, from the legacy
 * system) against a teacher's name, to auto-suggest which classes they
 * advise. Not authoritative — always editable by the teacher.
 */
export function suggestClassesForTeacher(classes: StdClass[], teacherName?: string) {
  const target = normalizeName(teacherName);
  if (!target) return [];
  return classes.filter((c) => normalizeName(c.advisor_name) === target).map((c) => c.class_code);
}
