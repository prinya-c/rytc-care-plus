import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchHomeVisitsByTeacher, fetchAllHomeVisits, deleteHomeVisit } from './api';
import { fetchAllStudents, fetchStudentsByClasses, studentDisplayName } from '../students/api';
import { deleteImageByUrl } from '../../lib/storage';
import { canViewCollegeOverview } from '../../utils/rbac';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Button, Input } from '../../components/ui/Form';
import { Badge } from '../../components/ui/Badge';
import { Icon } from '../../components/ui/Icon';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import type { HomeVisit, Student } from '../../types';

export default function HomeVisitListPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const overview = canViewCollegeOverview(profile?.role);
  const teacherId = profile?.teacherId ?? profile?.uid ?? '';

  const [showNewModal, setShowNewModal] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useAsync(async () => {
    const [visits, students] = await Promise.all([
      overview ? fetchAllHomeVisits() : fetchHomeVisitsByTeacher(teacherId),
      overview ? fetchAllStudents() : fetchStudentsByClasses(profile?.classIds ?? []),
    ]);
    return { visits, students };
  }, [overview, teacherId, JSON.stringify(profile?.classIds)]);

  async function handleDelete(visit: HomeVisit) {
    const ok = await confirm({
      title: 'ลบบันทึกการเยี่ยมบ้านนี้?',
      description: `${visit.studentName} — ลบแล้วไม่สามารถกู้คืนได้`,
      confirmText: 'ลบ',
      tone: 'danger',
    });
    if (!ok) return;
    setDeletingId(visit.id);
    try {
      await deleteHomeVisit(visit.id);
      const images = [...visit.images.homeVisitPhotos, ...(visit.images.mapImage ? [visit.images.mapImage] : [])];
      await Promise.all(images.map((url) => deleteImageByUrl(url)));
      showToast('ลบบันทึกเรียบร้อยแล้ว');
      refetch();
    } catch {
      showToast('ลบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={refetch} />;

  const q = studentSearch.trim().toLowerCase();
  const matchingStudents: Student[] = q
    ? data.students.filter((s) => studentDisplayName(s).toLowerCase().includes(q)).slice(0, 30)
    : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">เยี่ยมบ้าน</h1>
          <p className="text-sm text-gray-500">ทั้งหมด {data.visits.length} รายการ</p>
        </div>
        <Button variant="primary" onClick={() => setShowNewModal(true)}>
          + บันทึกใหม่
        </Button>
      </div>

      {data.visits.length === 0 ? (
        <EmptyState title="ยังไม่มีบันทึกการเยี่ยมบ้าน" description="เริ่มบันทึกการเยี่ยมบ้านผู้เรียนครั้งแรกของคุณ" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.visits.map((visit) => (
            <div key={visit.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <Icon name="map" className="h-4 w-4" />
                </div>
                <div className="flex gap-1.5">
                  <Link
                    to={`/home-visits/${visit.id}/edit`}
                    title="แก้ไข"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
                  >
                    <Icon name="pencil" className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    title="ลบ"
                    disabled={deletingId === visit.id}
                    onClick={() => handleDelete(visit)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-close-100 text-close-700 hover:bg-close-200 disabled:opacity-50"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="mt-3 text-sm font-bold leading-snug text-gray-900">{visit.studentName}</p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone="blue">{visit.className || 'ไม่ระบุกลุ่มเรียน'}</Badge>
                <Badge tone={visit.status === 'submitted' ? 'green' : 'gray'}>
                  {visit.status === 'submitted' ? 'ส่งข้อมูลแล้ว' : 'แบบร่าง'}
                </Badge>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Icon name="calendar" className="h-3.5 w-3.5" />
                  {visit.visitDate}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNewModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">บันทึกการเยี่ยมบ้านใหม่</h3>
            <p className="mt-1 text-xs text-gray-500">ค้นหาชื่อผู้เรียนที่จะบันทึกการเยี่ยมบ้าน</p>
            <div className="mt-3">
              <Input
                autoFocus
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="พิมพ์ชื่อผู้เรียน..."
              />
              <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-gray-200">
                {q && matchingStudents.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-gray-400">ไม่พบผู้เรียนที่ตรงกับคำค้นหา</p>
                ) : (
                  matchingStudents.map((s) => (
                    <button
                      key={s.sid}
                      type="button"
                      onClick={() => navigate(`/home-visits/new/${s.sid}`)}
                      className="block w-full border-b border-gray-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-brand-50"
                    >
                      <p className="font-medium text-gray-900">{studentDisplayName(s)}</p>
                      <p className="text-xs text-gray-500">{s.class_name}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setShowNewModal(false);
                  setStudentSearch('');
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
