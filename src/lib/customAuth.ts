/**
 * Temporary custom authentication (citizenId + password) while Firebase
 * Authentication is disabled — see README "Temporary custom auth" section
 * and lib/auth.ts (kept in place, unused, for when Firebase Auth comes
 * back). There is no real server-side secret holder in this setup: the
 * password hash lives in Firestore and is verified client-side, and the
 * "session" is just a citizenId remembered in localStorage. This is a
 * deliberately accepted, temporary trade-off — see Implementation_Plan.md.
 */

import { getById } from './firestore';
import { upsertUserProfile } from '../features/users/api';
import { hashPassword, verifyPassword } from './passwordHash';
import type { UserProfile } from '../types';

const SESSION_KEY = 'rytc-care-plus:session-citizen-id';

export class AuthError extends Error {}

export function getStoredSessionCitizenId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

function setStoredSession(citizenId: string) {
  localStorage.setItem(SESSION_KEY, citizenId);
}

export function clearStoredSession() {
  localStorage.removeItem(SESSION_KEY);
}

export interface RegisterInput {
  citizenId: string;
  password: string;
  displayName: string;
  position?: string;
  departmentId?: string;
  departmentName?: string;
  teacherId?: string;
  classIds?: string[];
}

export async function registerWithCitizenId(input: RegisterInput): Promise<void> {
  const existing = await getById<UserProfile>('users', input.citizenId);
  if (existing) {
    throw new AuthError('เลขบัตรประชาชนนี้ลงทะเบียนไว้แล้ว กรุณาเข้าสู่ระบบแทน');
  }

  const { hash, salt } = await hashPassword(input.password);

  await upsertUserProfile(input.citizenId, {
    authProvider: 'custom',
    citizenId: input.citizenId,
    passwordHash: hash,
    passwordSalt: salt,
    displayName: input.displayName,
    position: input.position,
    departmentId: input.departmentId,
    departmentName: input.departmentName,
    teacherId: input.teacherId,
    role: 'advisor_teacher',
    classIds: input.classIds ?? [],
    // New self-registered accounts start inactive until an admin/advisor_staff
    // reviews and activates them (prevents anyone who merely knows a
    // teacher's citizen ID number from getting standing access unchecked).
    isActive: false,
  });
}

export async function loginWithCitizenId(citizenId: string, password: string): Promise<UserProfile> {
  const profile = await getById<UserProfile>('users', citizenId);
  if (!profile || profile.authProvider !== 'custom' || !profile.passwordHash || !profile.passwordSalt) {
    throw new AuthError('ไม่พบบัญชีผู้ใช้งานสำหรับเลขบัตรประชาชนนี้');
  }

  const ok = await verifyPassword(password, profile.passwordSalt, profile.passwordHash);
  if (!ok) {
    throw new AuthError('เลขบัตรประชาชนหรือรหัสผ่านไม่ถูกต้อง');
  }

  setStoredSession(citizenId);
  return profile;
}

export async function fetchSessionProfile(citizenId: string): Promise<UserProfile | null> {
  return getById<UserProfile>('users', citizenId);
}

export function logout() {
  clearStoredSession();
}
