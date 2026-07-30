import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchHomeVisitMemosByTeacher, fetchAllHomeVisitMemos, deleteHomeVisitMemo } from './memoApi';
import { fetchAllDepartments, fetchAllClasses } from '../students/api';
import { canViewCollegeOverview } from '../../utils/rbac';
import { formatThaiDate } from '../../utils/thaiDate';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Button } from '../../components/ui/Form';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Badge } from '../../components/ui/Badge';
import { Icon } from '../../components/ui/Icon';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { HomeVisitMemoPrintDocument } from './HomeVisitMemoPrintDocument';
import type { HomeVisitMemo } from '../../types';

const ALL = '__all__';

export default function HomeVisitMemoListPage() {
  const { profile } = useAuth();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const overview = canViewCollegeOverview(profile?.role);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  // Which memo is currently being printed, and whether the print dialog has
  // been triggered — printing happens in place, without navigating away.
  const [printTarget, setPrintTarget] = useState<HomeVisitMemo | null>(null);
  const [printing, setPrinting] = useState(false);

  // For college-overview roles, a filter must be picked before the heavy
  // fetch (every home-visit memo in the college) runs at all.
  const hasFilter = !!(classFilter || deptFilter);
  const shouldLoad = !overview || hasFilter;

  const { data: allMemos, loading, error, refetch } = useAsync(async () => {
    if (!shouldLoad) return null;
    return overview ? fetchAllHomeVisitMemos() : fetchHomeVisitMemosByTeacher(profile?.teacherId ?? profile?.uid ?? '');
  }, [shouldLoad, overview, profile?.uid]);

  // Overview roles need the filter dropdowns populated before the memos
  // themselves have been fetched — pull them from the lightweight legacy
  // collections instead of deriving them from the (possibly not-yet-loaded) data.
  const { data: allDepartments } = useAsync(async () => (overview ? fetchAllDepartments() : []), [overview]);
  const departmentOptions = Array.from(new Set((allDepartments ?? []).map((d) => d.dep_name))).filter(Boolean) as string[];

  // HomeVisitMemo.level stores class_name text (comma-joined, no class_code
  // field on this doc type), so the class filter matches against class_name.
  const { data: allClasses } = useAsync(fetchAllClasses, []);
  const classOptions = useMemo(() => {
    const list = allClasses ?? [];
    const relevant = overview ? list : list.filter((c) => (profile?.classIds ?? []).includes(c.class_code));
    return relevant.map((c) => ({ value: c.class_name, label: `${c.class_code} - ${c.short_name || c.class_name}` }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allClasses, overview, JSON.stringify(profile?.classIds)]);

  const data = useMemo(() => {
    if (!allMemos) return null;
    return allMemos.filter((m) => {
      if (classFilter && classFilter !== ALL && !m.level.split(',').map((s) => s.trim()).includes(classFilter)) return false;
      if (deptFilter && deptFilter !== ALL && m.departmentName !== deptFilter) return false;
      return true;
    });
  }, [allMemos, classFilter, deptFilter]);

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

  async function handleDelete(memo: HomeVisitMemo) {
    const ok = await confirm({
      title: 'ลบบันทึกข้อความเยี่ยมบ้านนี้?',
      description: `ครั้งที่ ${memo.roundNumber || '-'} — ${memo.level || '-'} — ลบแล้วไม่สามารถกู้คืนได้`,
      confirmText: 'ลบ',
      tone: 'danger',
    });
    if (!ok) return;
    setDeletingId(memo.id);
    try {
      await deleteHomeVisitMemo(memo.id);
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
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">บันทึกข้อความเยี่ยมบ้าน</h1>
          <p className="text-sm text-gray-500">{data ? `ทั้งหมด ${data.length} รายการ` : 'โปรดเลือกสาขาวิชาหรือกลุ่มเรียนเพื่อแสดงข้อมูล'}</p>
        </div>
        {!overview && (
          <Link to="/home-visits/memo/new">
            <Button variant="primary">+ บันทึกใหม่</Button>
          </Link>
        )}
      </div>

      {overview && (
        <div className="grid grid-cols-2 gap-2 print:hidden">
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
        <EmptyState title="โปรดเลือกสาขาวิชาหรือกลุ่มเรียน" description="เลือกจากเมนูด้านบนก่อนเริ่มดูบันทึกข้อความเยี่ยมบ้าน" />
      ) : data.length === 0 ? (
        <EmptyState
          title="ยังไม่มีบันทึกข้อความเยี่ยมบ้าน"
          description="สร้างบันทึกข้อความรายงานผลการออกเยี่ยมบ้านผู้เรียนครั้งแรกของคุณ"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 print:hidden">
          {data.map((memo) => (
            <div key={memo.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <Icon name="calendar" className="h-4 w-4" />
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    title="พิมพ์บันทึกข้อความเยี่ยมบ้าน"
                    onClick={() => {
                      setPrintTarget(memo);
                      setPrinting(true);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-trust-100 text-trust-700 hover:bg-trust-200"
                  >
                    <Icon name="printer" className="h-4 w-4" />
                  </button>
                  {!overview && (
                    <>
                      <Link
                        to={`/home-visits/memo/${memo.id}/edit`}
                        title="แก้ไข"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
                      >
                        <Icon name="pencil" className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        title="ลบ"
                        disabled={deletingId === memo.id}
                        onClick={() => handleDelete(memo)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-close-100 text-close-700 hover:bg-close-200 disabled:opacity-50"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <p className="mt-3 text-sm font-bold leading-snug text-gray-900">ระดับชั้น {memo.level || '-'}</p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone="blue">ครั้งที่ {memo.roundNumber || '-'}</Badge>
                <Badge tone="green">
                  เยี่ยมแล้ว {memo.visitedCount}/{memo.totalStudents}
                </Badge>
              </div>

              <div className="mt-3 flex items-center gap-1 border-t border-gray-100 pt-2 text-xs text-gray-500">
                <Icon name="calendar" className="h-3.5 w-3.5" />
                {memo.memoDate ? formatThaiDate(memo.memoDate) : 'ไม่ระบุวันที่'}
              </div>
            </div>
          ))}
        </div>
      )}

      {printing && printTarget && (
        <div className="hidden print:block text-sm leading-relaxed">
          <HomeVisitMemoPrintDocument memo={printTarget} />
        </div>
      )}
    </div>
  );
}
