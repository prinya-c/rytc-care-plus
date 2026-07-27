import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchHomeVisitsByTeacher, fetchAllHomeVisits, deleteHomeVisit } from './api';
import { fetchAllStudents, fetchStudentsByClasses, studentDisplayName } from '../students/api';
import { deleteImageByUrl } from '../../lib/storage';
import { canViewCollegeOverview } from '../../utils/rbac';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Icon } from '../../components/ui/Icon';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import type { HomeVisit } from '../../types';

export default function HomeVisitListPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const overview = canViewCollegeOverview(profile?.role);
  const teacherId = profile?.teacherId ?? profile?.uid ?? '';
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useAsync(async () => {
    const [visits, students] = await Promise.all([
      overview ? fetchAllHomeVisits() : fetchHomeVisitsByTeacher(teacherId),
      overview ? fetchAllStudents() : fetchStudentsByClasses(profile?.classIds ?? []),
    ]);
    const visitByStudent = new Map<string, HomeVisit>();
    for (const v of visits) if (!visitByStudent.has(v.studentId)) visitByStudent.set(v.studentId, v);

    return { students, visitByStudent };
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

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">เยี่ยมบ้าน</h1>
          <p className="text-sm text-gray-500">ทั้งหมด {data.students.length} คน</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/home-visits/memo')}
          className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          พิมพ์บันทึกข้อความ
        </button>
      </div>

      {data.students.length === 0 ? (
        <EmptyState
          title="ไม่พบผู้เรียนในกลุ่มเรียนที่รับผิดชอบ"
          description='ตรวจสอบกลุ่มเรียนได้ที่เมนู "กลุ่มเรียนของฉัน"'
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.students.map((s) => {
            const visit = data.visitByStudent.get(s.sid);
            const visited = visit?.status === 'submitted';
            return (
              <div
                key={s.sid}
                className={`rounded-2xl border p-4 shadow-sm transition-colors ${
                  visited ? 'border-trust-100 bg-trust-50' : 'border-close-100 bg-close-50'
                }`}
              >
                <div className="flex items-center justify-end gap-1.5">
                  <Link
                    to={`/student-info/${s.sid}`}
                    title="ดูข้อมูลผู้เรียน"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-trust-100 text-trust-700 hover:bg-trust-200"
                  >
                    <Icon name="eye" className="h-4 w-4" />
                  </Link>
                  <Link
                    to={visit ? `/home-visits/${visit.id}/edit` : `/home-visits/new/${s.sid}`}
                    title="แก้ไขเยี่ยมบ้าน"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
                  >
                    <Icon name="pencil" className="h-4 w-4" />
                  </Link>
                  {visited && (
                    <button
                      type="button"
                      title="ลบ"
                      disabled={deletingId === visit.id}
                      onClick={() => handleDelete(visit)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-close-100 text-close-700 hover:bg-close-200 disabled:opacity-50"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <p className="mt-3 text-sm font-bold leading-snug text-gray-900">{studentDisplayName(s)}</p>
                <p className="mt-1 text-xs text-gray-500">{s.class_name}</p>
                <p className={`mt-2 text-sm font-semibold ${visited ? 'text-trust-700' : 'text-close-700'}`}>
                  {visited ? `เยี่ยมบ้านแล้ว · ${visit!.visitDate || 'ยังไม่ระบุวันที่'}` : 'ยังไม่ได้เยี่ยมบ้าน'}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
