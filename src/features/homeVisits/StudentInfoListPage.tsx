import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchHomeVisitsByTeacher, fetchAllHomeVisits } from './api';
import { fetchAllStudents, fetchStudentsByClasses, fetchAllDepartments, fetchAllClasses, studentDisplayName } from '../students/api';
import { canViewCollegeOverview } from '../../utils/rbac';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Input } from '../../components/ui/Form';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Icon } from '../../components/ui/Icon';
import type { HomeVisit } from '../../types';

const ALL = '__all__';

export default function StudentInfoListPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const overview = canViewCollegeOverview(profile?.role);
  const teacherId = profile?.teacherId ?? profile?.uid ?? '';

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // For college-overview roles, a filter must be picked before the heavy
  // roster fetch (every student + home-visit in the college) runs at all.
  const hasFilter = !!(classFilter || deptFilter);
  const shouldLoad = !overview || hasFilter;

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

  const filtered = useMemo(() => {
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

  if (shouldLoad && loading) return <LoadingState />;
  if (shouldLoad && (error || !data)) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">ข้อมูลผู้เรียน</h1>
        <p className="text-sm text-gray-500">
          {data
            ? `ทั้งหมด ${data.students.length} คน · แสดงผล ${filtered.length} คน`
            : 'โปรดเลือกสาขาวิชาหรือกลุ่มเรียนเพื่อแสดงข้อมูล'}{' '}
          · ดูและแก้ไขข้อมูลส่วนตัว ครอบครัว และพฤติกรรมของผู้เรียน
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
        <EmptyState title="โปรดเลือกสาขาวิชาหรือกลุ่มเรียน" description="เลือกจากเมนูด้านบนก่อนเริ่มดูข้อมูลผู้เรียน" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="ไม่พบผู้เรียนตามเงื่อนไขที่เลือก"
          description={overview ? undefined : 'ตรวจสอบกลุ่มเรียนได้ที่เมนู "กลุ่มเรียนของฉัน"'}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => {
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
