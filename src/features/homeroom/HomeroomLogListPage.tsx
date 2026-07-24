import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchHomeroomLogsByTeacher, fetchAllHomeroomLogs, deleteHomeroomLog } from './api';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Button } from '../../components/ui/Form';
import { Badge } from '../../components/ui/Badge';
import { Icon } from '../../components/ui/Icon';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { canViewCollegeOverview } from '../../utils/rbac';

export default function HomeroomLogListPage() {
  const { profile } = useAuth();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const overview = canViewCollegeOverview(profile?.role);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useAsync(
    () => (overview ? fetchAllHomeroomLogs() : fetchHomeroomLogsByTeacher(profile?.teacherId ?? profile?.uid ?? '')),
    [overview, profile?.uid],
  );

  async function handleDelete(id: string, label: string) {
    const ok = await confirm({
      title: 'ลบบันทึกกิจกรรมโฮมรูมนี้?',
      description: `${label} — ลบแล้วไม่สามารถกู้คืนได้`,
      confirmText: 'ลบ',
      tone: 'danger',
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      await deleteHomeroomLog(id);
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((log) => {
            const presentCount = log.totalStudents - log.absentStudents.length;
            return (
              <div key={log.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    <Icon name="calendar" className="h-4 w-4" />
                  </div>
                  <div className="flex gap-1.5">
                    <Link
                      to={`/homeroom/${log.id}`}
                      title="ดู / พิมพ์"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-trust-100 text-trust-700 hover:bg-trust-200"
                    >
                      <Icon name="eye" className="h-4 w-4" />
                    </Link>
                    <Link
                      to={`/homeroom/${log.id}/edit`}
                      title="แก้ไข"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      <Icon name="pencil" className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      title="ลบ"
                      disabled={deletingId === log.id}
                      onClick={() => handleDelete(log.id, `ครั้งที่ ${log.sessionNumber} — ${log.className}`)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-close-100 text-close-700 hover:bg-close-200 disabled:opacity-50"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-sm font-bold leading-snug text-gray-900">{log.className}</p>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="blue">ครั้งที่ {log.sessionNumber}</Badge>
                  <Badge tone="green">{log.classId}</Badge>
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  ภาคเรียนที่ {log.semester} ปีการศึกษา {log.academicYear}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Icon name="calendar" className="h-3.5 w-3.5" />
                    {log.sessionDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="users" className="h-3.5 w-3.5" />
                    {presentCount}/{log.totalStudents}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
