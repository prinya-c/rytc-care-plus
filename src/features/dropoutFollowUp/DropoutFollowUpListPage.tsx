import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchDropoutFollowUpsByTeacher, fetchAllDropoutFollowUps, deleteDropoutFollowUp } from './api';
import { fetchAllDepartments, fetchAllClasses } from '../students/api';
import { deleteImageByUrl } from '../../lib/storage';
import { waitForImages } from '../../utils/waitForImages';
import { canViewCollegeOverview } from '../../utils/rbac';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Input, Button } from '../../components/ui/Form';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Badge } from '../../components/ui/Badge';
import { Icon } from '../../components/ui/Icon';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { DropoutFollowUpPrintDocument } from './DropoutFollowUpPrintDocument';
import type { DropoutFollowUp } from '../../types';

const ALL = '__all__';

export default function DropoutFollowUpListPage() {
  const { profile } = useAuth();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const overview = canViewCollegeOverview(profile?.role);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  // Which record is currently being printed, and whether the print dialog
  // has been triggered — printing happens in place, without navigating away.
  const [printTarget, setPrintTarget] = useState<DropoutFollowUp | null>(null);
  const [printing, setPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // For college-overview roles, a filter must be picked before the heavy
  // fetch (every dropout follow-up record in the college) runs at all.
  const hasFilter = !!(classFilter || deptFilter);
  const shouldLoad = !overview || hasFilter;

  const { data: allRecords, loading, error, refetch } = useAsync(async () => {
    if (!shouldLoad) return null;
    return overview ? fetchAllDropoutFollowUps() : fetchDropoutFollowUpsByTeacher(profile?.teacherId ?? profile?.uid ?? '');
  }, [shouldLoad, overview, profile?.uid]);

  // Overview roles need the filter dropdowns populated before the records
  // themselves have been fetched — pull them from the lightweight legacy
  // collections instead of deriving them from the (possibly not-yet-loaded) data.
  const { data: allDepartments } = useAsync(async () => (overview ? fetchAllDepartments() : []), [overview]);
  const departmentOptions = Array.from(new Set((allDepartments ?? []).map((d) => d.dep_name))).filter(Boolean) as string[];

  const { data: allClasses } = useAsync(fetchAllClasses, []);
  const classOptions = useMemo(() => {
    const list = allClasses ?? [];
    const relevant = overview ? list : list.filter((c) => (profile?.classIds ?? []).includes(c.class_code));
    return relevant.map((c) => ({ value: c.class_code, label: `${c.class_code} - ${c.short_name || c.class_name}` }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allClasses, overview, JSON.stringify(profile?.classIds)]);

  const data = useMemo(() => {
    if (!allRecords) return null;
    return allRecords.filter((record) => {
      if (classFilter && classFilter !== ALL && record.classId !== classFilter) return false;
      if (deptFilter && deptFilter !== ALL && record.departmentName !== deptFilter) return false;
      if (search) {
        const q = search.trim().toLowerCase();
        if (!record.studentName.toLowerCase().includes(q) && !record.studentId.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allRecords, classFilter, deptFilter, search]);

  useEffect(() => {
    if (!printing) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      await waitForImages(printRef.current);
      if (!cancelled) window.print();
    }, 50);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
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

  if (shouldLoad && loading) return <LoadingState />;
  if (shouldLoad && (error || !data)) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-5 print:space-y-0">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">การติดตามผู้เรียนเพื่อแก้ปัญหาออกกลางคัน</h1>
          <p className="text-sm text-gray-500">{data ? `ทั้งหมด ${data.length} รายการ` : 'โปรดเลือกสาขาวิชาหรือกลุ่มเรียนเพื่อแสดงข้อมูล'}</p>
        </div>
        {!overview && (
          <Link to="/dropout-follow-up/new">
            <Button variant="primary">+ บันทึกใหม่</Button>
          </Link>
        )}
      </div>

      {overview && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 print:hidden">
          <div className="relative col-span-2 sm:col-span-1">
            <Icon name="search" className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาชื่อ / รหัส" className="pl-9" />
          </div>
          <SearchableSelect
            options={departmentOptions.map((d) => ({ value: d, label: d }))}
            value={deptFilter}
            onChange={setDeptFilter}
            placeholder="ทุกสาขาวิชา"
            allLabel="ทุกสาขาวิชา"
            allValue={ALL}
          />
          <SearchableSelect
            options={classOptions}
            value={classFilter}
            onChange={setClassFilter}
            placeholder="ทุกกลุ่มเรียน"
            allLabel="ทุกกลุ่มเรียน"
            allValue={ALL}
          />
        </div>
      )}

      {!data ? (
        <EmptyState title="โปรดเลือกสาขาวิชาหรือกลุ่มเรียน" description="เลือกจากเมนูด้านบนก่อนเริ่มดูบันทึกการติดตามผู้เรียน" />
      ) : data.length === 0 ? (
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
                  {!overview && (
                    <>
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
                    </>
                  )}
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
        <div ref={printRef} className="hidden print:block text-sm leading-relaxed">
          <DropoutFollowUpPrintDocument record={printTarget} />
        </div>
      )}
    </div>
  );
}
