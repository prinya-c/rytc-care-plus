import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAsync } from '../../hooks/useAsync';
import { fetchAllHomeVisits } from './api';
import { fetchAllStudents } from '../students/api';
import { Card, CardHeader, CardBody, StatCard } from '../../components/ui/Card';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Select, Button } from '../../components/ui/Form';

export default function HomeVisitSummaryPage() {
  const [academicYear, setAcademicYear] = useState('');
  const [semester, setSemester] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [departmentName, setDepartmentName] = useState('');

  const { data, loading, error, refetch } = useAsync(async () => {
    const [visits, students] = await Promise.all([fetchAllHomeVisits(), fetchAllStudents()]);
    return { visits, students };
  }, []);

  const options = useMemo(() => {
    if (!data) return { years: [], classes: [], departments: [] };
    return {
      years: Array.from(new Set(data.visits.map((v) => v.academicYear))).filter(Boolean).sort().reverse(),
      classes: Array.from(new Map(data.students.map((s) => [s.class_code, s.class_name])).entries()).filter(
        ([code]) => code,
      ) as [string, string][],
      departments: Array.from(new Set(data.students.map((s) => s.dep_name))).filter(Boolean) as string[],
    };
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    let students = data.students;
    if (departmentName) students = students.filter((s) => s.dep_name === departmentName);
    if (classFilter) students = students.filter((s) => s.class_code === classFilter);
    // Only a submitted visit counts — drafts (e.g. a student pre-filled their own info) don't.
    const visitedIds = new Set(
      data.visits
        .filter((v) => v.status === 'submitted')
        .filter((v) => !academicYear || v.academicYear === academicYear)
        .filter((v) => !semester || v.semester === semester)
        .map((v) => v.studentId),
    );
    return students.map((s) => ({ ...s, visited: visitedIds.has(s.sid) }));
  }, [data, departmentName, classFilter, academicYear, semester]);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={refetch} />;

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
          <p className="text-sm text-gray-500">ทั้งหมด {rows.length} คน</p>
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
        <Select value={departmentName} onChange={(e) => setDepartmentName(e.target.value)}>
          <option value="">ทุกสาขาวิชา</option>
          {options.departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
      </div>

      {rows.length === 0 ? (
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
