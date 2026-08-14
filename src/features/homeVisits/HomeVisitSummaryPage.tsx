import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAsync } from '../../hooks/useAsync';
import { fetchAllHomeVisits } from './api';
import { fetchAllClasses, fetchAllDepartments, fetchAllStudents } from '../students/api';
import { Card, CardHeader, CardBody, StatCard } from '../../components/ui/Card';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Select, Button } from '../../components/ui/Form';
import { Icon } from '../../components/ui/Icon';

const currentAcademicYear = String(new Date().getFullYear() + 543);
const YEAR_OPTIONS = [currentAcademicYear, String(Number(currentAcademicYear) - 1), String(Number(currentAcademicYear) - 2)];

type AppliedFilters = { academicYear: string; semester: string; classFilter: string; departmentId: string };

export default function HomeVisitSummaryPage() {
  const [academicYear, setAcademicYear] = useState('');
  const [semester, setSemester] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  // The heavy fetch (every student + every home-visit college-wide) only
  // runs once "ค้นหาข้อมูล" is pressed, to avoid pulling the whole college
  // roster just for the page to render.
  const [applied, setApplied] = useState<AppliedFilters | null>(null);

  // Dropdown options come from the cheap legacy lookup collections, not from
  // the (possibly not-yet-fetched) roster/visit data, so they're always ready.
  const { data: allClasses } = useAsync(fetchAllClasses, []);
  const { data: allDepartments } = useAsync(fetchAllDepartments, []);
  const options = {
    years: YEAR_OPTIONS,
    classes: (allClasses ?? [])
      .map((c) => [c.class_code, c.class_name] as [string, string])
      .sort((a, b) => a[0].localeCompare(b[0])),
    departments: (allDepartments ?? []).map((d) => [d.dep_id, d.dep_name] as [string, string]),
  };

  const { data, loading, error, refetch } = useAsync(async () => {
    if (!applied) return null;
    const [visits, students] = await Promise.all([fetchAllHomeVisits(), fetchAllStudents()]);
    return { visits, students };
  }, [applied]);

  if (applied && loading) return <LoadingState />;
  if (applied && (error || !data)) return <ErrorState onRetry={refetch} />;

  const rows = (() => {
    if (!data || !applied) return [];
    // class_code/dep_id can come back as a number from legacy-seeded data
    // even though the type says string, so coerce it — the <select>'s value
    // is always a string regardless of the option's original JS type.
    let students = data.students;
    if (applied.departmentId) students = students.filter((s) => String(s.dep_id) === applied.departmentId);
    if (applied.classFilter) students = students.filter((s) => String(s.class_code) === applied.classFilter);
    // Only a submitted visit counts — drafts (e.g. a student pre-filled their own info) don't.
    const visitedIds = new Set(
      data.visits
        .filter((v) => v.status === 'submitted')
        .filter((v) => !applied.academicYear || v.academicYear === applied.academicYear)
        .filter((v) => !applied.semester || v.semester === applied.semester)
        .map((v) => v.studentId),
    );
    return students.map((s) => ({ ...s, visited: visitedIds.has(s.sid) }));
  })();

  const visitedCount = rows.filter((r) => r.visited).length;
  const unvisitedCount = rows.length - visitedCount;

  const byClass = Array.from(new Set(rows.map((r) => r.class_name))).map((cls) => {
    const group = rows.filter((r) => r.class_name === cls);
    return {
      name: cls,
      เยี่ยมแล้ว: group.filter((g) => g.visited).length,
      ยังไม่เยี่ยม: group.filter((g) => !g.visited).length,
    };
  });

  return (
    <div className="space-y-5 print:space-y-3">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">สรุปการเยี่ยมบ้านผู้เรียน</h1>
          <p className="text-sm text-gray-500">{applied ? `ทั้งหมด ${rows.length} คน` : 'เลือกเงื่อนไขแล้วกด "ค้นหาข้อมูล" เพื่อแสดงผล'}</p>
        </div>
        <Button variant="secondary" disabled={rows.length === 0} onClick={() => window.print()}>
          พิมพ์รายงาน
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 print:hidden">
        <Select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
          <option value="">ทุกปีการศึกษา</option>
          {options.years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
        <Select value={semester} onChange={(e) => setSemester(e.target.value)}>
          <option value="">ทุกภาคเรียน</option>
          <option value="1">ภาคเรียนที่ 1</option>
          <option value="2">ภาคเรียนที่ 2</option>
        </Select>
        <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">ทุกกลุ่มเรียน</option>
          {options.classes.map(([code, name]) => (
            <option key={code} value={code}>
              {code} - {name}
            </option>
          ))}
        </Select>
        <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
          <option value="">ทุกสาขาวิชา</option>
          {options.departments.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </Select>
      </div>

      <div className="print:hidden">
        <Button
          variant="primary"
          onClick={() => setApplied({ academicYear, semester, classFilter, departmentId })}
        >
          <Icon name="search" className="h-4 w-4" />
          ค้นหาข้อมูล
        </Button>
      </div>

      {!applied ? (
        <EmptyState title="โปรดเลือกเงื่อนไขและกดค้นหาข้อมูล" description="เลือกจากเมนูด้านบนแล้วกดปุ่ม “ค้นหาข้อมูล” ก่อนเริ่มดูสรุปผลการเยี่ยมบ้าน" />
      ) : rows.length === 0 ? (
        <EmptyState title="ไม่พบข้อมูลตามเงื่อนไขที่เลือก" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="เยี่ยมบ้านแล้ว" value={visitedCount} tone="trust" />
            <StatCard label="ยังไม่ได้เยี่ยมบ้าน" value={unvisitedCount} tone="concern" />
          </div>

          <Card>
            <CardHeader title="สถานะการเยี่ยมบ้านแยกตามกลุ่มเรียน" />
            <CardBody>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={byClass}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="เยี่ยมแล้ว" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ยังไม่เยี่ยม" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
