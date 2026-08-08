import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { findTeacherByCitizenId, fetchAllClasses, suggestClassesForTeacher } from '../students/api';
import { registerWithCitizenId, AuthError } from '../../lib/customAuth';
import { Input, Field, Button } from '../../components/ui/Form';
import type { Teacher } from '../../types';

type Step = 'lookup' | 'confirm' | 'done';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('lookup');
  const [citizenId, setCitizenId] = useState('');
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{13}$/.test(citizenId)) {
      setError('กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก');
      return;
    }
    setLoading(true);
    try {
      const found = await findTeacherByCitizenId(citizenId);
      if (!found) {
        setError('ไม่พบข้อมูลครูที่ตรงกับเลขบัตรประชาชนนี้ในระบบ กรุณาติดต่อผู้ดูแลระบบ');
        return;
      }
      setTeacher(found);
      setStep('confirm');
    } catch {
      setError('ค้นหาข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (password !== confirmPassword) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
      return;
    }
    setLoading(true);
    try {
      // Class assignment isn't chosen here — registration should stay a
      // minimal identity+password step. We silently pre-fill classIds by
      // matching out-of/std_class.advisor_name against the teacher's name,
      // so a freshly activated account isn't left with an empty roster;
      // the teacher reviews/adjusts this afterwards at "กลุ่มเรียนของฉัน"
      // (MyClassesPage), the single place class assignment is edited.
      const classes = await fetchAllClasses();
      const suggestedClassIds = suggestClassesForTeacher(classes, teacher?.tname);

      await registerWithCitizenId({
        citizenId,
        password,
        displayName: teacher?.tname ?? '',
        position: teacher?.position,
        departmentId: teacher?.dep_id,
        departmentName: teacher?.dep_name,
        teacherId: teacher?.id,
        classIds: suggestedClassIds,
      });
      setStep('done');
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'ลงทะเบียนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-white px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-bold text-white shadow-lg shadow-brand-600/20">
            C+
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ลงทะเบียนผู้ใช้งาน</h1>
          <p className="mt-1 text-sm text-gray-500">RYTC Care+ · วิทยาลัยเทคนิคระยอง</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {step === 'lookup' && (
            <form onSubmit={handleLookup} className="space-y-4">
              <Field label="เลขประจำตัวประชาชน 13 หลัก" required>
                <Input
                  inputMode="numeric"
                  maxLength={13}
                  required
                  value={citizenId}
                  onChange={(e) => setCitizenId(e.target.value.replace(/\D/g, ''))}
                  placeholder="1234567890123"
                />
              </Field>
              {error && <p className="rounded-lg bg-close-50 px-3 py-2 text-sm text-close-700">{error}</p>}
              <Button type="submit" variant="primary" loading={loading} className="w-full">
                ค้นหาข้อมูล
              </Button>
            </form>
          )}

          {step === 'confirm' && teacher && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="rounded-lg bg-brand-50 px-3 py-3 text-sm">
                <p className="font-semibold text-gray-900">{teacher.tname}</p>
                <p className="text-gray-500">{teacher.position}</p>
                <p className="text-gray-500">{teacher.dep_name}</p>
              </div>

              <Field label="ตั้งรหัสผ่าน" required hint="อย่างน้อย 6 ตัวอักษร">
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Field label="ยืนยันรหัสผ่าน" required>
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </Field>
              {error && <p className="rounded-lg bg-close-50 px-3 py-2 text-sm text-close-700">{error}</p>}
              <p className="text-xs text-gray-400">
                หลังเข้าสู่ระบบ ท่านสามารถตรวจสอบและแก้ไขกลุ่มเรียนที่รับผิดชอบได้ที่เมนู "กลุ่มเรียนของฉัน"
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setStep('lookup')} className="flex-1">
                  ย้อนกลับ
                </Button>
                <Button type="submit" variant="primary" loading={loading} className="flex-1">
                  ลงทะเบียน
                </Button>
              </div>
            </form>
          )}

          {step === 'done' && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-gray-700">
                ลงทะเบียนสำเร็จ! เข้าสู่ระบบได้เลยด้วยเลขประจำตัวประชาชนและรหัสผ่านที่ตั้งไว้
              </p>
              <Button variant="primary" onClick={() => navigate('/login')} className="w-full">
                ไปหน้าเข้าสู่ระบบ
              </Button>
            </div>
          )}
        </div>

        {step !== 'done' && (
          <p className="mt-6 text-center text-sm text-gray-500">
            มีบัญชีอยู่แล้ว?{' '}
            <Link to="/login" className="font-medium text-brand-700 hover:underline">
              เข้าสู่ระบบ
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
