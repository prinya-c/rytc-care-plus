import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useStudentAuth } from '../studentAuth/StudentAuthContext';
import { Input, Field, Button } from '../../components/ui/Form';

type Tab = 'staff' | 'student';

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('staff');

  const { profile, loading: staffLoading, error: staffError, login: staffLogin } = useAuth();
  const { student, loading: studentLoading, error: studentError, login: studentLogin } = useStudentAuth();
  const navigate = useNavigate();

  const [citizenId, setCitizenId] = useState('');
  const [password, setPassword] = useState('');
  const [staffSubmitting, setStaffSubmitting] = useState(false);

  const [studentId, setStudentId] = useState('');
  const [studentCitizenId, setStudentCitizenId] = useState('');
  const [studentSubmitting, setStudentSubmitting] = useState(false);

  if (!staffLoading && profile?.isActive) {
    return <Navigate to="/dashboard" replace />;
  }
  if (!studentLoading && student) {
    return <Navigate to="/student/home-visit" replace />;
  }

  async function handleStaffSubmit(e: FormEvent) {
    e.preventDefault();
    setStaffSubmitting(true);
    try {
      await staffLogin(citizenId, password);
    } catch {
      // error surfaced via AuthContext `error`
    } finally {
      setStaffSubmitting(false);
    }
  }

  async function handleStudentSubmit(e: FormEvent) {
    e.preventDefault();
    setStudentSubmitting(true);
    try {
      await studentLogin(studentId, studentCitizenId);
      navigate('/student/home-visit');
    } catch {
      // error surfaced via StudentAuthContext `error`
    } finally {
      setStudentSubmitting(false);
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

        <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setTab('staff')}
            className={`rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === 'staff' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            บุคลากร
          </button>
          <button
            type="button"
            onClick={() => setTab('student')}
            className={`rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === 'student' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            นักเรียน นักศึกษา
          </button>
        </div>

        {tab === 'staff' ? (
          <>
            <form onSubmit={handleStaffSubmit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
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

              {staffError && <p className="rounded-lg bg-close-50 px-3 py-2 text-sm text-close-700">{staffError}</p>}

              <Button type="submit" variant="primary" loading={staffSubmitting} className="w-full">
                เข้าสู่ระบบ
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              ยังไม่มีบัญชี?{' '}
              <Link to="/register" className="font-medium text-brand-700 hover:underline">
                ลงทะเบียน
              </Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleStudentSubmit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <Field label="รหัสนักศึกษา" required>
              <Input
                required
                autoComplete="username"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="63301010001"
              />
            </Field>
            <Field label="เลขประจำตัวประชาชน 13 หลัก" required>
              <Input
                inputMode="numeric"
                maxLength={13}
                required
                autoComplete="current-password"
                value={studentCitizenId}
                onChange={(e) => setStudentCitizenId(e.target.value.replace(/\D/g, ''))}
                placeholder="1234567890123"
              />
            </Field>

            {studentError && <p className="rounded-lg bg-close-50 px-3 py-2 text-sm text-close-700">{studentError}</p>}

            <Button type="submit" variant="primary" loading={studentSubmitting} className="w-full">
              เข้าสู่ระบบ
            </Button>
            <p className="text-center text-xs text-gray-400">
              ใช้รหัสนักศึกษาและเลขบัตรประชาชนที่มีในระบบทะเบียน เพื่อกรอกข้อมูลก่อนครูที่ปรึกษาเยี่ยมบ้าน
            </p>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} วิทยาลัยเทคนิคระยอง · care.rytc.ac.th
        </p>
      </div>
    </div>
  );
}
