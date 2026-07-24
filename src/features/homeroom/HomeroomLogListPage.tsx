import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchHomeroomLogsByTeacher, fetchAllHomeroomLogs } from './api';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Button } from '../../components/ui/Form';
import { canViewCollegeOverview } from '../../utils/rbac';

export default function HomeroomLogListPage() {
  const { profile } = useAuth();
  const overview = canViewCollegeOverview(profile?.role);

  const { data, loading, error, refetch } = useAsync(
    () => (overview ? fetchAllHomeroomLogs() : fetchHomeroomLogsByTeacher(profile?.teacherId ?? profile?.uid ?? '')),
    [overview, profile?.uid],
  );

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">บันทึกกิจกรรมโฮมรูม</h1>
          <p className="text-sm text-gray-500">ทั้งหมด {data.length} รายการ</p>
        </div>
        <Link to="/homeroom/new">
          <Button variant="primary">+ บันทึกใหม่</Button>
        </Link>
      </div>

      {data.length === 0 ? (
        <EmptyState
          title="ยังไม่มีบันทึกกิจกรรมโฮมรูม"
          description="เริ่มบันทึกการพบนักเรียนในคาบโฮมรูมครั้งแรกของคุณ"
        />
      ) : (
        <ul className="space-y-2">
          {data.map((log) => {
            const presentCount = log.totalStudents - log.absentStudents.length;
            return (
              <li key={log.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      ครั้งที่ {log.sessionNumber} — {log.className}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {log.sessionDate} · ภาคเรียนที่ {log.semester} ปีการศึกษา {log.academicYear} · โดย {log.advisorTeacherName}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      มาพบ {presentCount} คน · ขาด {log.absentStudents.length} คน จากทั้งหมด {log.totalStudents} คน
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link to={`/homeroom/${log.id}`}>
                      <Button variant="secondary">ดู / พิมพ์</Button>
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
