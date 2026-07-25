import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchAllScreenings, fetchScreeningsByTeacher, computeScreeningRounds } from './api';
import { canViewCollegeOverview } from '../../utils/rbac';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Button, Select, Field } from '../../components/ui/Form';
import { Badge } from '../../components/ui/Badge';
import { Icon } from '../../components/ui/Icon';

const currentAcademicYear = String(new Date().getFullYear() + 543);

export default function ScreeningRoundListPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const overview = canViewCollegeOverview(profile?.role);
  const teacherId = profile?.teacherId ?? profile?.uid ?? '';

  const [showNewModal, setShowNewModal] = useState(false);
  const [newYear, setNewYear] = useState(currentAcademicYear);
  const [newSemester, setNewSemester] = useState('1');

  const { data, loading, error, refetch } = useAsync(
    () => (overview ? fetchAllScreenings() : fetchScreeningsByTeacher(teacherId)),
    [overview, teacherId],
  );

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={refetch} />;

  const rounds = computeScreeningRounds(data);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">คัดกรองผู้เรียน</h1>
          <p className="text-sm text-gray-500">ทั้งหมด {rounds.length} รอบ</p>
        </div>
        <Button variant="primary" onClick={() => setShowNewModal(true)}>
          + บันทึกใหม่
        </Button>
      </div>

      {rounds.length === 0 ? (
        <EmptyState title="ยังไม่มีการคัดกรอง" description="เริ่มคัดกรองผู้เรียนรอบแรกของคุณ" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rounds.map((r) => {
            const total = r.trust + r.concern + r.close;
            return (
              <button
                key={`${r.academicYear}|${r.semester}`}
                type="button"
                onClick={() => navigate(`/screenings/${r.academicYear}/${r.semester}`)}
                className="rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-brand-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    <Icon name="clipboard" className="h-4 w-4" />
                  </div>
                  <span className="text-xs text-gray-400">{total} คน</span>
                </div>
                <p className="mt-3 text-sm font-bold text-gray-900">
                  ภาคเรียนที่ {r.semester} ปีการศึกษา {r.academicYear}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="green">ไว้ใจ {r.trust}</Badge>
                  <Badge tone="yellow">ห่วงใย {r.concern}</Badge>
                  <Badge tone="red">ใกล้ชิด {r.close}</Badge>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showNewModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">เริ่มคัดกรองรอบใหม่</h3>
            <div className="mt-4 space-y-3">
              <Field label="ปีการศึกษา">
                <Select value={newYear} onChange={(e) => setNewYear(e.target.value)}>
                  {[currentAcademicYear, String(Number(currentAcademicYear) - 1)].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="ภาคเรียนที่">
                <Select value={newSemester} onChange={(e) => setNewSemester(e.target.value)}>
                  <option value="1">1</option>
                  <option value="2">2</option>
                </Select>
              </Field>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowNewModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                ยกเลิก
              </button>
              <Button onClick={() => navigate(`/screenings/${newYear}/${newSemester}`)}>เริ่มคัดกรอง</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
