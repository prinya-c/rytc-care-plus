import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchHomeVisitsByTeacher, fetchAllHomeVisits } from './api';
import { fetchAllStudents, fetchStudentsByClasses, studentDisplayName } from '../students/api';
import { canViewCollegeOverview } from '../../utils/rbac';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import type { HomeVisit } from '../../types';

export default function StudentInfoListPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const overview = canViewCollegeOverview(profile?.role);
  const teacherId = profile?.teacherId ?? profile?.uid ?? '';

  const { data, loading, error, refetch } = useAsync(async () => {
    const [visits, students] = await Promise.all([
      overview ? fetchAllHomeVisits() : fetchHomeVisitsByTeacher(teacherId),
      overview ? fetchAllStudents() : fetchStudentsByClasses(profile?.classIds ?? []),
    ]);
    const visitByStudent = new Map<string, HomeVisit>();
    for (const v of visits) if (!visitByStudent.has(v.studentId)) visitByStudent.set(v.studentId, v);

    return { students, visitByStudent };
  }, [overview, teacherId, JSON.stringify(profile?.classIds)]);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">ข้อมูลนักเรียน</h1>
        <p className="text-sm text-gray-500">ทั้งหมด {data.students.length} คน · ดูและแก้ไขข้อมูลส่วนตัว ครอบครัว และพฤติกรรมของผู้เรียน</p>
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
            const updated = !!visit?.studentInfoUpdatedAt;
            return (
              <div
                key={s.sid}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/student-info/${s.sid}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(`/student-info/${s.sid}`);
                }}
                className={`cursor-pointer rounded-2xl border p-4 shadow-sm transition-colors ${
                  updated ? 'border-trust-100 bg-trust-50' : 'border-close-100 bg-close-50'
                }`}
              >
                <p className="text-sm font-bold leading-snug text-gray-900">{studentDisplayName(s)}</p>
                <p className="mt-1 text-xs text-gray-500">{s.class_name}</p>
                <p className={`mt-2 text-sm font-semibold ${updated ? 'text-trust-700' : 'text-close-700'}`}>
                  {updated ? 'อัพเดทแล้ว' : 'ยังไม่ได้อัพเดท'}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
