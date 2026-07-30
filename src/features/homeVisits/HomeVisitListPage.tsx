import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchHomeVisitsByTeacher, fetchAllHomeVisits, deleteHomeVisit } from './api';
import { fetchAllStudents, fetchStudentsByClasses, fetchAllDepartments, fetchAllClasses, studentDisplayName } from '../students/api';
import { deleteImageByUrl } from '../../lib/storage';
import { canViewCollegeOverview } from '../../utils/rbac';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Input } from '../../components/ui/Form';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Icon } from '../../components/ui/Icon';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { HomeVisitPrintDocument } from './HomeVisitPrintDocument';
import { waitForImages } from '../../utils/waitForImages';
import type { HomeVisit, Student } from '../../types';

const ALL = '__all__';

export default function HomeVisitListPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const overview = canViewCollegeOverview(profile?.role);
  const teacherId = profile?.teacherId ?? profile?.uid ?? '';
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  // Which visit is currently being printed, and whether the print dialog has
  // been triggered — printing happens in place, without navigating away.
  const [printTarget, setPrintTarget] = useState<{ visit: HomeVisit; student: Student } | null>(null);
  const [printing, setPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // For college-overview roles, a filter must be picked before the heavy
  // fetch (every student + home-visit in the college) runs at all.
  const hasFilter = !!(classFilter || deptFilter);
  const shouldLoad = !overview || hasFilter;

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

  const { data, loading, error, refetch } = useAsync(async () => {
    if (!shouldLoad) return null;
    const [visits, students] = await Promise.all([
      overview ? fetchAllHomeVisits() : fetchHomeVisitsByTeacher(teacherId),
      overview ? fetchAllStudents() : fetchStudentsByClasses(profile?.classIds ?? []),
    ]);
    const visitByStudent = new Map<string, HomeVisit>();
    for (const v of visits) if (!visitByStudent.has(v.studentId)) visitByStudent.set(v.studentId, v);

    return { students, visitByStudent };
  }, [shouldLoad, overview, teacherId, JSON.stringify(profile?.classIds)]);

  // Overview roles need the department dropdown populated before the roster
  // itself has been fetched — pull it from the lightweight legacy collection
  // instead of deriving it from the (possibly not-yet-fetched) student list.
  const { data: allDepartments } = useAsync(async () => (overview ? fetchAllDepartments() : []), [overview]);
  const departmentOptions = overview
    ? (Array.from(new Set((allDepartments ?? []).map((d) => d.dep_name))).filter(Boolean) as string[])
    : (Array.from(new Set((data?.students ?? []).map((s) => s.dep_name))).filter(Boolean) as string[]);

  // Class options always come from the legacy std_class collection (cheap),
  // scoped down to the teacher's own classes when not viewing the whole college.
  const { data: allClasses } = useAsync(fetchAllClasses, []);
  const classOptions = useMemo(() => {
    const list = allClasses ?? [];
    const relevant = overview ? list : list.filter((c) => (profile?.classIds ?? []).includes(c.class_code));
    return relevant.map((c) => ({ value: c.class_code, label: `${c.class_code} - ${c.short_name || c.class_name}` }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allClasses, overview, JSON.stringify(profile?.classIds)]);

  const filteredStudents = useMemo(() => {
    if (!data) return [];
    return data.students.filter((s) => {
      if (classFilter && classFilter !== ALL && s.class_code !== classFilter) return false;
      if (deptFilter && deptFilter !== ALL && s.dep_name !== deptFilter) return false;
      if (search) {
        const q = search.trim().toLowerCase();
        if (!studentDisplayName(s).toLowerCase().includes(q) && !s.sid.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [data, classFilter, deptFilter, search]);

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

  if (shouldLoad && loading) return <LoadingState />;
  if (shouldLoad && (error || !data)) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-5 print:space-y-0">
      <div className="flex items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">เยี่ยมบ้าน</h1>
          <p className="text-sm text-gray-500">
            {data ? `ทั้งหมด ${filteredStudents.length} คน` : 'โปรดเลือกสาขาวิชาหรือกลุ่มเรียนเพื่อแสดงข้อมูล'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/home-visits/memo')}
          className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          {overview ? 'ดูบันทึกข้อความ' : 'สร้างบันทึกข้อความ'}
        </button>
      </div>

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

      {!data ? (
        <EmptyState title="โปรดเลือกสาขาวิชาหรือกลุ่มเรียน" description="เลือกจากเมนูด้านบนก่อนเริ่มดูรายชื่อผู้เรียน" />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          title="ไม่พบผู้เรียนตามเงื่อนไขที่เลือก"
          description={overview ? undefined : 'ตรวจสอบกลุ่มเรียนได้ที่เมนู "กลุ่มเรียนของฉัน"'}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 print:hidden">
          {filteredStudents.map((s) => {
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
                  {visit ? (
                    <button
                      type="button"
                      title="พิมพ์แบบบันทึกการเยี่ยมบ้านผู้เรียน"
                      onClick={() => {
                        setPrintTarget({ visit, student: s });
                        setPrinting(true);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-trust-100 text-trust-700 hover:bg-trust-200"
                    >
                      <Icon name="printer" className="h-4 w-4" />
                    </button>
                  ) : (
                    <span
                      title="ยังไม่มีข้อมูลให้พิมพ์"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-300"
                    >
                      <Icon name="printer" className="h-4 w-4" />
                    </span>
                  )}
                  {!overview && (
                    <>
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
                    </>
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

      <div ref={printRef}>
        {printing && printTarget && <HomeVisitPrintDocument visit={printTarget.visit} student={printTarget.student} />}
      </div>
    </div>
  );
}
