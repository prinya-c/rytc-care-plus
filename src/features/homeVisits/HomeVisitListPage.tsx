import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">เยี่ยมบ้าน</h1>
        <p className="text-sm text-gray-500">ทั้งหมด {data.students.length} คน</p>
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
            const visited = !!visit;
            return (
              <div
                key={s.sid}
                role="button"
                tabIndex={0}
                onClick={() => navigate(visited ? `/home-visits/${visit.id}/edit` : `/home-visits/new/${s.sid}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(visited ? `/home-visits/${visit!.id}/edit` : `/home-visits/new/${s.sid}`);
                }}
                className={`relative cursor-pointer rounded-2xl border p-4 shadow-sm transition-colors ${
                  visited
                    ? 'border-trust-100 bg-trust-50 hover:border-trust-600/40'
                    : 'border-close-100 bg-close-50 hover:border-close-600/40'
                }`}
              >
                {visited && (
                  <button
                    type="button"
                    title="ลบ"
                    disabled={deletingId === visit.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(visit);
                    }}
                    className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-close-700 shadow-sm hover:bg-close-100 disabled:opacity-50"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                )}
                <p className="pr-8 text-sm font-bold leading-snug text-gray-900">{studentDisplayName(s)}</p>
                <p className="mt-1 text-xs text-gray-500">{s.class_name}</p>
                <p className={`mt-3 text-sm font-semibold ${visited ? 'text-trust-700' : 'text-close-700'}`}>
                  {visited ? `เยี่ยมบ้านแล้ว · ${visit.visitDate}` : 'ยังไม่ได้เยี่ยมบ้าน'}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
