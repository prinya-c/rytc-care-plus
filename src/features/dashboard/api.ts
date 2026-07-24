import { fetchStudentsByClasses, fetchAllStudents } from '../students/api';
import { fetchScreeningsByTeacher, fetchAllScreenings } from '../screenings/api';
import { fetchHomeVisitsByTeacher, fetchAllHomeVisits } from '../homeVisits/api';
import { fetchReferralsByTeacher, fetchAllReferrals, fetchReferralsByTargetWork } from '../referrals/api';
import type { DashboardSummary, ReferralInboxSummary, TargetWork } from '../../types';

function summarize(
  totalStudents: number,
  screenings: { studentId: string; resultGroup: string }[],
  homeVisits: { studentId: string }[],
  referrals: unknown[],
): DashboardSummary {
  const screenedStudentIds = new Set(screenings.map((s) => s.studentId));
  const visitedStudentIds = new Set(homeVisits.map((v) => v.studentId));

  return {
    totalStudents,
    screenedCount: screenedStudentIds.size,
    unscreenedCount: Math.max(totalStudents - screenedStudentIds.size, 0),
    trustCount: screenings.filter((s) => s.resultGroup === 'trust').length,
    concernCount: screenings.filter((s) => s.resultGroup === 'concern').length,
    closeCount: screenings.filter((s) => s.resultGroup === 'close').length,
    visitedCount: visitedStudentIds.size,
    unvisitedCount: Math.max(totalStudents - visitedStudentIds.size, 0),
    referredCount: referrals.length,
  };
}

export async function fetchTeacherDashboard(teacherId: string, classIds: string[]) {
  const [students, screenings, homeVisits, referrals] = await Promise.all([
    fetchStudentsByClasses(classIds),
    fetchScreeningsByTeacher(teacherId),
    fetchHomeVisitsByTeacher(teacherId),
    fetchReferralsByTeacher(teacherId),
  ]);
  return summarize(students.length, screenings, homeVisits, referrals);
}

export interface CollegeDashboard {
  summary: DashboardSummary;
  /**
   * Grouped by กลุ่มเรียน (class_name), not ระดับชั้น (level) — out-of/students
   * and out-of/std_class have no confirmed "level" field to group by. If one
   * turns up (e.g. parsed from class_code), swap the grouping key here.
   */
  byClass: Record<string, DashboardSummary>;
  byDepartment: Record<string, DashboardSummary>;
}

export async function fetchCollegeDashboard(): Promise<CollegeDashboard> {
  const [students, screenings, homeVisits, referrals] = await Promise.all([
    fetchAllStudents(),
    fetchAllScreenings(),
    fetchAllHomeVisits(),
    fetchAllReferrals(),
  ]);

  const summary = summarize(students.length, screenings, homeVisits, referrals);

  const classNames = Array.from(new Set(students.map((s) => s.class_name).filter(Boolean))) as string[];
  const byClass: Record<string, DashboardSummary> = {};
  for (const className of classNames) {
    const classStudents = students.filter((s) => s.class_name === className);
    const classStudentIds = new Set(classStudents.map((s) => s.sid));
    byClass[className] = summarize(
      classStudents.length,
      screenings.filter((s) => classStudentIds.has(s.studentId)),
      homeVisits.filter((v) => classStudentIds.has(v.studentId)),
      referrals.filter((r) => classStudentIds.has((r as { studentId: string }).studentId)),
    );
  }

  const departments = Array.from(new Set(students.map((s) => s.dep_name).filter(Boolean))) as string[];
  const byDepartment: Record<string, DashboardSummary> = {};
  for (const dept of departments) {
    const deptStudents = students.filter((s) => s.dep_name === dept);
    const deptIds = new Set(deptStudents.map((s) => s.sid));
    byDepartment[dept] = summarize(
      deptStudents.length,
      screenings.filter((s) => deptIds.has(s.studentId)),
      homeVisits.filter((v) => deptIds.has(v.studentId)),
      referrals.filter((r) => deptIds.has((r as { studentId: string }).studentId)),
    );
  }

  return { summary, byClass, byDepartment };
}

export async function fetchOfficerInboxSummary(targetWork: TargetWork): Promise<ReferralInboxSummary> {
  const referrals = await fetchReferralsByTargetWork(targetWork);
  return {
    sent: referrals.filter((r) => r.status === 'sent').length,
    received: referrals.filter((r) => r.status === 'received').length,
    in_progress: referrals.filter((r) => r.status === 'in_progress').length,
    completed: referrals.filter((r) => r.status === 'completed').length,
    closed: referrals.filter((r) => r.status === 'closed').length,
  };
}
