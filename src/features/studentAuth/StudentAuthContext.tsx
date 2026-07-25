import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { fetchStudentByStudentId } from '../students/api';
import type { Student } from '../../types';

/**
 * Session for the student self-service side of the app (filling in their own
 * home-visit info). Deliberately separate from AuthContext/customAuth.ts,
 * which is for staff accounts in care-plus/users — students have no account
 * there. A student "logs in" with their student ID + the 13-digit citizen ID
 * already on file in the read-only out-of/students collection; there is no
 * password to set or hash.
 */

const SESSION_KEY = 'rytc-care-plus:student-session-sid';

export class StudentAuthError extends Error {}

interface StudentAuthContextValue {
  student: Student | null;
  loading: boolean;
  error: string | null;
  login: (studentId: string, citizenId: string) => Promise<void>;
  logout: () => void;
}

const StudentAuthContext = createContext<StudentAuthContextValue | undefined>(undefined);

export function StudentAuthProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFromStoredSession = useCallback(async () => {
    const sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
      setStudent(null);
      setLoading(false);
      return;
    }
    try {
      const s = await fetchStudentByStudentId(sid);
      setStudent(s);
      if (!s) localStorage.removeItem(SESSION_KEY);
    } catch {
      setStudent(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFromStoredSession();
  }, [loadFromStoredSession]);

  async function login(studentId: string, citizenId: string) {
    setError(null);
    const sid = studentId.trim();
    const s = await fetchStudentByStudentId(sid);
    if (!s || !s.sidcard || s.sidcard !== citizenId.trim()) {
      const message = 'รหัสนักศึกษาหรือเลขบัตรประชาชนไม่ถูกต้อง';
      setError(message);
      throw new StudentAuthError(message);
    }
    localStorage.setItem(SESSION_KEY, s.sid);
    setStudent(s);
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setStudent(null);
  }

  return (
    <StudentAuthContext.Provider value={{ student, loading, error, login, logout }}>
      {children}
    </StudentAuthContext.Provider>
  );
}

export function useStudentAuth() {
  const ctx = useContext(StudentAuthContext);
  if (!ctx) throw new Error('useStudentAuth must be used within StudentAuthProvider');
  return ctx;
}
