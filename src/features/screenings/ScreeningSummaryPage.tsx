import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAsync } from '../../hooks/useAsync';
import { fetchAllScreenings } from './api';
import { fetchAllClasses, fetchAllDepartments } from '../students/api';
import { Card, CardHeader, CardBody, StatCard } from '../../components/ui/Card';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Select, Button } from '../../components/ui/Form';
import { Icon } from '../../components/ui/Icon';

const GROUP_COLORS = { trust: '#16a34a', concern: '#ca8a04', close: '#dc2626' };
const currentAcademicYear = String(new Date().getFullYear() + 543);
const YEAR_OPTIONS = [currentAcademicYear, String(Number(currentAcademicYear) - 1), String(Number(currentAcademicYear) - 2)];

type AppliedFilters = { academicYear: string; semester: string; classFilter: string; departmentId: string };

export default function ScreeningSummaryPage() {
  // A round card's "ดูผลรวม" button navigates here with the round already
  // picked, so the dashboard opens pre-filtered instead of showing everyone.
  const location = useLocation();
  const initialFilter = location.state as { academicYear?: string; semester?: string } | null;
  const [academicYear, setAcademicYear] = useState(initialFilter?.academicYear ?? '');
  const [semester, setSemester] = useState(initialFilter?.semester ?? '');
  const [classFilter, setClassFilter] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  // The heavy fetch only runs once "ค้นหาข้อมูล" is pressed (or the page
  // arrives pre-filtered from "ดูผลรวม"), to avoid pulling every screening
  // record college-wide just for the page to render.
  const [applied, setApplied] = useState<AppliedFilters | null>(
    initialFilter ? { academicYear: initialFilter.academicYear ?? '', semester: initialFilter.semester ?? '', classFilter: '', departmentId: '' } : null,
  );

  // Dropdown options come from the cheap legacy lookup collections, not from
  // the (possibly not-yet-fetched) screening data, so they're always ready.
  const { data: allClasses } = useAsync(fetchAllClasses, []);
  const { data: allDepartments } = useAsync(fetchAllDepartments, []);
  const options = {
    years: YEAR_OPTIONS,
    classes: (allClasses ?? []).map((c) => [c.class_code, c.class_name] as [string, string]),
    departments: (allDepartments ?? []).map((d) => [d.dep_id, d.dep_name] as [string, string]),
  };

  const { data, loading, error, refetch } = useAsync(async () => {
    if (!applied) return null;
    const screenings = await fetchAllScreenings({
      academicYear: applied.academicYear || undefined,
      semester: applied.semester || undefined,
      departmentId: applied.departmentId || undefined,
    });
    // classId can come back as a number from legacy-seeded data even though
    // the type says string, so compare as strings — the <select>'s value is
    // always a string regardless of the option's original JS type.
    return applied.classFilter ? screenings.filter((s) => String(s.classId) === applied.classFilter) : screenings;
  }, [applied]);

  if (applied && loading) return <LoadingState />;
  if (applied && (error || !data)) return <ErrorState onRetry={refetch} />;

  const filtered = data ?? [];
  const trust = filtered.filter((s) => s.resultGroup === 'trust').length;
  const concern = filtered.filter((s) => s.resultGroup === 'concern').length;
  const close = filtered.filter((s) => s.resultGroup === 'close').length;

  const pieData = [
    { name: 'กลุ่มไว้ใจ', value: trust, key: 'trust' },
    { name: 'กลุ่มห่วงใย', value: concern, key: 'concern' },
    { name: 'กลุ่มใกล้ชิด', value: close, key: 'close' },
  ];

  const byClass = Array.from(new Set(filtered.map((s) => s.className))).map((cls) => {
    const rows = filtered.filter((s) => s.className === cls);
    return {
      name: cls,
      ไว้ใจ: rows.filter((r) => r.resultGroup === 'trust').length,
      ห่วงใย: rows.filter((r) => r.resultGroup === 'concern').length,
      ใกล้ชิด: rows.filter((r) => r.resultGroup === 'close').length,
    };
  });

  return (
    <div className="space-y-5 print:space-y-3">
      <div className="print:hidden">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">สรุปผลการคัดกรองผู้เรียน</h1>
        <p className="text-sm text-gray-500">{applied ? `ทั้งหมด ${filtered.length} รายการ` : 'เลือกเงื่อนไขแล้วกด "ค้นหาข้อมูล" เพื่อแสดงผล'}</p>
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
          {options.classes.map(([id, name]) => (
            <option key={id} value={id}>
              {id} - {name}
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
        <EmptyState title="โปรดเลือกเงื่อนไขและกดค้นหาข้อมูล" description="เลือกจากเมนูด้านบนแล้วกดปุ่ม “ค้นหาข้อมูล” ก่อนเริ่มดูสรุปผลการคัดกรอง" />
      ) : filtered.length === 0 ? (
        <EmptyState title="ไม่พบข้อมูลการคัดกรองตามเงื่อนไขที่เลือก" />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 print:hidden">
            <StatCard label="กลุ่มไว้ใจ" value={trust} tone="trust" />
            <StatCard label="กลุ่มห่วงใย" value={concern} tone="concern" />
            <StatCard label="กลุ่มใกล้ชิด" value={close} tone="close" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2 print:hidden">
            <Card>
              <CardHeader title="สัดส่วนกลุ่มผู้เรียน" />
              <CardBody>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {pieData.map((entry) => (
                        <Cell key={entry.key} fill={GROUP_COLORS[entry.key as keyof typeof GROUP_COLORS]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="แยกตามกลุ่มเรียน" />
              <CardBody>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byClass}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="ไว้ใจ" stackId="a" fill={GROUP_COLORS.trust} />
                    <Bar dataKey="ห่วงใย" stackId="a" fill={GROUP_COLORS.concern} />
                    <Bar dataKey="ใกล้ชิด" stackId="a" fill={GROUP_COLORS.close} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
