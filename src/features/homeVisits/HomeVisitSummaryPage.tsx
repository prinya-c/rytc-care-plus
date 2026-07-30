import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAsync } from '../../hooks/useAsync';
import { fetchAllHomeVisits } from './api';
import { fetchAllStudents, fetchAllDepartments } from '../students/api';
import { Card, CardHeader, CardBody, StatCard } from '../../components/ui/Card';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Select, Button } from '../../components/ui/Form';

const ALL_DEPARTMENTS = '__all__';

export default function HomeVisitSummaryPage() {
  const [departmentName, setDepartmentName] = useState('');

  // Cheap up front — just the department names for the dropdown, not every
  // student. The heavy fetch (every student + every home-visit college-wide)
  // only runs once a department is actually chosen, below.
  const { data: departments } = useAsync(fetchAllDepartments, []);

  const { data, loading, error, refetch } = useAsync(async () => {
    if (!departmentName) return null;
    const [visits, students] = await Promise.all([fetchAllHomeVisits(), fetchAllStudents()]);
    return { visits, students };
  }, [departmentName]);

  const rows = useMemo(() => {
    if (!data || !departmentName) return [];
    let students = data.students;
    if (departmentName !== ALL_DEPARTMENTS) students = students.filter((s) => s.dep_name === departmentName);
    // Only a submitted visit counts — drafts (e.g. a student pre-filled their own info) don't.
    const visitedIds = new Set(data.visits.filter((v) => v.status === 'submitted').map((v) => v.studentId));
    return students.map((s) => ({ ...s, visited: visitedIds.has(s.sid) }));
  }, [data, departmentName]);

  if (departmentName && loading) return <LoadingState />;
  if (departmentName && (error || !data)) return <ErrorState onRetry={refetch} />;

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
          <p className="text-sm text-gray-500">{departmentName ? `ทั้งหมด ${rows.length} คน` : 'โปรดเลือกสาขาวิชาเพื่อแสดงข้อมูล'}</p>
        </div>
        <Button variant="secondary" disabled={!departmentName} onClick={() => window.print()}>
          พิมพ์รายงาน
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 print:hidden">
        <Select value={departmentName} onChange={(e) => setDepartmentName(e.target.value)}>
          <option value="">โปรดเลือกสาขาวิชา</option>
          <option value={ALL_DEPARTMENTS}>ทุกสาขาวิชา</option>
          {(departments ?? []).map((d) => (
            <option key={d.dep_id} value={d.dep_name}>
              {d.dep_name}
            </option>
          ))}
        </Select>
      </div>

      {!departmentName ? (
        <EmptyState title="โปรดเลือกสาขาวิชา" description="เลือกจากเมนูด้านบนก่อนเริ่มดูสรุปผลการเยี่ยมบ้าน" />
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
