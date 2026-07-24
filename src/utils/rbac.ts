import type { TargetWork, UserRole } from '../types';

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'ผู้ดูแลระบบ',
  advisor_teacher: 'ครูที่ปรึกษา',
  advisor_staff: 'เจ้าหน้าที่งานครูที่ปรึกษา',
  guidance_staff: 'เจ้าหน้าที่งานแนะแนว',
  scholarship_staff: 'เจ้าหน้าที่งานทุนการศึกษา',
  rehabilitation_staff: 'เจ้าหน้าที่งานบำบัดผู้เรียน',
};

export const OFFICER_ROLES: UserRole[] = ['guidance_staff', 'scholarship_staff', 'rehabilitation_staff'];

export const ROLE_TARGET_WORK: Partial<Record<UserRole, TargetWork>> = {
  guidance_staff: 'guidance',
  scholarship_staff: 'scholarship',
  rehabilitation_staff: 'rehabilitation',
};

export function canManageUsers(role?: UserRole) {
  return role === 'admin' || role === 'advisor_staff';
}

export function canViewCollegeOverview(role?: UserRole) {
  return role === 'admin' || role === 'advisor_staff';
}

export function isAdvisorTeacher(role?: UserRole) {
  return role === 'advisor_teacher';
}

export function isOfficer(role?: UserRole) {
  return !!role && OFFICER_ROLES.includes(role);
}

export function targetWorkForRole(role?: UserRole): TargetWork | undefined {
  return role ? ROLE_TARGET_WORK[role] : undefined;
}
