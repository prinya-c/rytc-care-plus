import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  getStoredSessionCitizenId,
  fetchSessionProfile,
  loginWithCitizenId,
  logout as clearSession,
  AuthError,
} from '../../lib/customAuth';
import type { UserProfile } from '../../types';

interface AuthContextValue {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (citizenId: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFromStoredSession = useCallback(async () => {
    const citizenId = getStoredSessionCitizenId();
    if (!citizenId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      const p = await fetchSessionProfile(citizenId);
      setProfile(p);
      if (p && !p.isActive) {
        setError('บัญชีนี้ยังไม่ได้รับการเปิดใช้งานจากผู้ดูแลระบบ กรุณาติดต่อเจ้าหน้าที่งานครูที่ปรึกษา');
      }
      if (!p) {
        clearSession();
      }
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFromStoredSession();
  }, [loadFromStoredSession]);

  async function login(citizenId: string, password: string) {
    setError(null);
    try {
      const p = await loginWithCitizenId(citizenId, password);
      setProfile(p);
      if (!p.isActive) {
        setError('บัญชีนี้ยังไม่ได้รับการเปิดใช้งานจากผู้ดูแลระบบ กรุณาติดต่อเจ้าหน้าที่งานครูที่ปรึกษา');
      }
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      throw err;
    }
  }

  function logout() {
    clearSession();
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ profile, loading, error, login, logout, refreshProfile: loadFromStoredSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
