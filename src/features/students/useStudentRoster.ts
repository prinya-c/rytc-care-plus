import { useMemo } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { fetchAllStudents, fetchStudentsByClasses, studentDisplayName } from './api';
import { fetchScreeningsByTeacher, fetchAllScreenings } from '../screenings/api';
import { fetchHomeVisitsByTeacher, fetchAllHomeVisits } from '../homeVisits/api';
import { fetchReferralsByTeacher, fetchAllReferrals } from '../referrals/api';
import type { ResultGroup, UserProfile } from '../../types';
import { canViewCollegeOverview } from '../../utils/rbac';

export interface RosterRow {
  studentId: string;
  name: string;
  classCode: string;
  className?: string;
  departmentName?: string;
  screened: boolean;
  resultGroup?: ResultGroup;
  visited: boolean;
  referred: boolean;
}

export function useStudentRoster(profile: UserProfile) {
  const scoped = !canViewCollegeOverview(profile.role);

  return useAsync(async () => {
    const teacherId = profile.teacherId ?? profile.uid;
    const [students, screenings, homeVisits, referrals] = await Promise.all([
      scoped ? fetchStudentsByClasses(profile.classIds ?? []) : fetchAllStudents(),
      scoped ? fetchScreeningsByTeacher(teacherId) : fetchAllScreenings(),
      scoped ? fetchHomeVisitsByTeacher(teacherId) : fetchAllHomeVisits(),
      scoped ? fetchReferralsByTeacher(teacherId) : fetchAllReferrals(),
    ]);

    const latestScreeningByStudent = new Map<string, ResultGroup>();
    for (const s of screenings) {
      if (!latestScreeningByStudent.has(s.studentId)) latestScreeningByStudent.set(s.studentId, s.resultGroup);
    }
    const visitedSet = new Set(homeVisits.map((v) => v.studentId));
    const referredSet = new Set(referrals.map((r) => r.studentId));

    const rows: RosterRow[] = students.map((s) => ({
      studentId: s.sid,
      name: studentDisplayName(s),
      classCode: s.class_code,
      className: s.class_name,
      departmentName: s.dep_name,
      screened: latestScreeningByStudent.has(s.sid),
      resultGroup: latestScreeningByStudent.get(s.sid),
      visited: visitedSet.has(s.sid),
      referred: referredSet.has(s.sid),
    }));

    return rows;
  }, [profile.uid, scoped, JSON.stringify(profile.classIds)]);
}

export function useRosterFilters(rows: RosterRow[] | null) {
  return useMemo(() => {
    if (!rows) return { classes: [], departments: [] };
    return {
      classes: Array.from(new Set(rows.map((r) => r.className).filter(Boolean))) as string[],
      departments: Array.from(new Set(rows.map((r) => r.departmentName).filter(Boolean))) as string[],
    };
  }, [rows]);
}
