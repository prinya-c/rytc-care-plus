import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Input, Field, Button } from '../../components/ui/Form';

export default function LoginPage() {
  const { profile, loading, error, login } = useAuth();
  const [citizenId, setCitizenId] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && profile?.isActive) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(citizenId, password);
    } catch {
      // error surfaced via AuthContext `error`
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-bold text-white shadow-lg shadow-brand-600/20">
            C+
          </div>
          <h1 className="text-2xl font-bold text-gray-900">RYC Care+</h1>
          <p className="mt-1 text-sm text-gray-500">ระบบดูแลช่วยเหลือและติดตามนักเรียน นักศึกษา</p>
          <p className="text-xs text-gray-400">วิทยาลัยเทคนิคระยอง</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <Field label="เลขประจำตัวประชาชน 13 หลัก" required>
            <Input
              inputMode="numeric"
              maxLength={13}
              required
              autoComplete="username"
              value={citizenId}
              onChange={(e) => setCitizenId(e.target.value.replace(/\D/g, ''))}
              placeholder="1234567890123"
            />
          </Field>
          <Field label="รหัสผ่าน" required>
            <Input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          {error && <p className="rounded-lg bg-close-50 px-3 py-2 text-sm text-close-700">{error}</p>}

          <Button type="submit" variant="primary" loading={submitting} className="w-full">
            เข้าสู่ระบบ
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          ยังไม่มีบัญชี?{' '}
          <Link to="/register" className="font-medium text-brand-700 hover:underline">
            ลงทะเบียน
          </Link>
        </p>

        <p className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} วิทยาลัยเทคนิคระยอง · care.rytc.ac.th
        </p>
      </div>
    </div>
  );
}
