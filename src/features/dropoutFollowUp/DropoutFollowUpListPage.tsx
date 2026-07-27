import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchDropoutFollowUpsByTeacher, fetchAllDropoutFollowUps, deleteDropoutFollowUp } from './api';
import { deleteImageByUrl } from '../../lib/storage';
import { canViewCollegeOverview } from '../../utils/rbac';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Button } from '../../components/ui/Form';
import { Badge } from '../../components/ui/Badge';
import { Icon } from '../../components/ui/Icon';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { DropoutFollowUpPrintDocument } from './DropoutFollowUpPrintDocument';
import type { DropoutFollowUp } from '../../types';

export default function DropoutFollowUpListPage() {
  const { profile } = useAuth();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const overview = canViewCollegeOverview(profile?.role);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Which record is currently being printed, and whether the print dialog
  // has been triggered — printing happens in place, without navigating away.
  const [printTarget, setPrintTarget] = useState<DropoutFollowUp | null>(null);
  const [printing, setPrinting] = useState(false);

  const { data, loading, error, refetch } = useAsync(
    () => (overview ? fetchAllDropoutFollowUps() : fetchDropoutFollowUpsByTeacher(profile?.teacherId ?? profile?.uid ?? '')),
    [overview, profile?.uid],
  );

  useEffect(() => {
    if (!printing) return;
    const timer = setTimeout(() => window.print(), 50);
    return () => clearTimeout(timer);
  }, [printing]);

  useEffect(() => {
    function handleAfterPrint() {
      setPrinting(false);
    }
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  async function handleDelete(record: DropoutFollowUp) {
    const ok = await confirm({
      title: 'ลบบันทึกการติดตามผู้เรียนนี้?',
      description: `${record.studentName} — ลบแล้วไม่สามารถกู้คืนได้`,
      confirmText: 'ลบ',
      tone: 'danger',
    });
    if (!ok) return;
    setDeletingId(record.id);
    try {
      await deleteDropoutFollowUp(record.id);
      const images = [...record.studentContactEvidence, ...record.parentContactEvidence];
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
    <div className="space-y-5 print:space-y-0">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">การติดตามผู้เรียนเพื่อแก้ปัญหาออกกลางคัน</h1>
          <p className="text-sm text-gray-500">ทั้งหมด {data.length} รายการ</p>
        </div>
        <Link to="/dropout-follow-up/new">
          <Button variant="primary">+ บันทึกใหม่</Button>
        </Link>
      </div>

      {data.length === 0 ? (
        <EmptyState
          title="ยังไม่มีบันทึกการติดตามผู้เรียน"
          description="เริ่มบันทึกการติดตามผู้เรียนที่ขาดเรียนครั้งแรกของคุณ"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 print:hidden">
          {data.map((record) => (
            <div key={record.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <Icon name="user-minus" className="h-4 w-4" />
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    title="พิมพ์บันทึกข้อความ รายงานผลการติดตามผู้เรียน"
                    onClick={() => {
                      setPrintTarget(record);
                      setPrinting(true);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-trust-100 text-trust-700 hover:bg-trust-200"
                  >
                    <Icon name="printer" className="h-4 w-4" />
                  </button>
                  <Link
                    to={`/dropout-follow-up/${record.id}/edit`}
                    title="แก้ไข"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
                  >
                    <Icon name="pencil" className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    title="ลบ"
                    disabled={deletingId === record.id}
                    onClick={() => handleDelete(record)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-close-100 text-close-700 hover:bg-close-200 disabled:opacity-50"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="mt-3 text-sm font-bold leading-snug text-gray-900">{record.studentName}</p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone="blue">{record.className}</Badge>
                <Badge tone="red">ขาด {record.absentDays || '-'} วัน</Badge>
              </div>

              <p className="mt-2 line-clamp-2 text-xs text-gray-500">{record.absentReason || 'ไม่ระบุสาเหตุ'}</p>

              <div className="mt-3 flex items-center gap-1 border-t border-gray-100 pt-2 text-xs text-gray-500">
                <Icon name="calendar" className="h-3.5 w-3.5" />
                {record.recordDate || 'ไม่ระบุวันที่'}
              </div>
            </div>
          ))}
        </div>
      )}

      {printing && printTarget && (
        <div className="hidden print:block text-sm leading-relaxed">
          <DropoutFollowUpPrintDocument record={printTarget} />
        </div>
      )}
    </div>
  );
}
