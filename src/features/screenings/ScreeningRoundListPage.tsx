import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchAllScreenings, fetchScreeningsByTeacher, computeScreeningRounds, deleteScreening } from './api';
import { canViewCollegeOverview } from '../../utils/rbac';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Button, Select, Field } from '../../components/ui/Form';
import { Badge } from '../../components/ui/Badge';
import { Icon } from '../../components/ui/Icon';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';

const currentAcademicYear = String(new Date().getFullYear() + 543);

export default function ScreeningRoundListPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const overview = canViewCollegeOverview(profile?.role);
  const teacherId = profile?.teacherId ?? profile?.uid ?? '';

  const [showNewModal, setShowNewModal] = useState(false);
  const [newYear, setNewYear] = useState(currentAcademicYear);
  const [newSemester, setNewSemester] = useState('1');
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const { data, loading, error, refetch } = useAsync(
    () => (overview ? fetchAllScreenings() : fetchScreeningsByTeacher(teacherId)),
    [overview, teacherId],
  );

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={refetch} />;

  const rounds = computeScreeningRounds(data);

  async function handleDelete(academicYear: string, semester: string) {
    const key = `${academicYear}|${semester}`;
    const ok = await confirm({
      title: 'ลบรอบคัดกรองนี้?',
      description: `ภาคเรียนที่ ${semester} ปีการศึกษา ${academicYear} — ลบข้อมูลคัดกรองของผู้เรียนทุกคนในรอบนี้ ไม่สามารถกู้คืนได้`,
      confirmText: 'ลบ',
      tone: 'danger',
    });
    if (!ok) return;
    setDeletingKey(key);
    try {
      const idsInRound = (data ?? [])
        .filter((s) => s.academicYear === academicYear && s.semester === semester)
        .map((s) => s.id);
      await Promise.all(idsInRound.map((id) => deleteScreening(id)));
      showToast('ลบรอบคัดกรองเรียบร้อยแล้ว');
      refetch();
    } catch {
      showToast('ลบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setDeletingKey(null);
    }
  }

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
            const key = `${r.academicYear}|${r.semester}`;
            return (
              <div key={key} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    <Icon name="clipboard" className="h-4 w-4" />
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      title="ดูผลรวม"
                      onClick={() => navigate('/screenings/summary', { state: { academicYear: r.academicYear, semester: r.semester } })}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-trust-100 text-trust-700 hover:bg-trust-200"
                    >
                      <Icon name="eye" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="พิมพ์บันทึกข้อความ"
                      onClick={() =>
                        navigate('/screenings/summary', {
                          state: { academicYear: r.academicYear, semester: r.semester, openPrint: 'memo' },
                        })
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      <Icon name="printer" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="พิมพ์สรุป"
                      onClick={() =>
                        navigate('/screenings/summary', {
                          state: { academicYear: r.academicYear, semester: r.semester, openPrint: 'report' },
                        })
                      }
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200"
                    >
                      <Icon name="printer" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="คัดกรองต่อ / แก้ไข"
                      onClick={() => navigate(`/screenings/${r.academicYear}/${r.semester}`)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      <Icon name="pencil" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="ลบ"
                      disabled={deletingKey === key}
                      onClick={() => handleDelete(r.academicYear, r.semester)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-close-100 text-close-700 hover:bg-close-200 disabled:opacity-50"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-sm font-bold leading-snug text-gray-900">
                  ภาคเรียนที่ {r.semester} ปีการศึกษา {r.academicYear}
                </p>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="green">ไว้ใจ {r.trust}</Badge>
                  <Badge tone="yellow">ห่วงใย {r.concern}</Badge>
                  <Badge tone="red">ใกล้ชิด {r.close}</Badge>
                </div>

                <div className="mt-3 flex items-center justify-end border-t border-gray-100 pt-2 text-xs text-gray-500">
                  <span>{total} คน</span>
                </div>
              </div>
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
