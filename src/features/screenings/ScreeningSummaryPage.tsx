import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../auth/AuthContext';
import { fetchAllScreenings } from './api';
import { fetchAllTeachers } from '../students/api';
import { SCREENING_CATEGORY_ORDER } from './checklist';
import { Card, CardHeader, CardBody, StatCard } from '../../components/ui/Card';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Select, Button, Field, Input } from '../../components/ui/Form';
import { formatThaiDate } from '../../utils/thaiDate';
import { SCREENING_CATEGORY_LABEL, type ResultGroup, type Teacher } from '../../types';

const GROUP_COLORS = { trust: '#16a34a', concern: '#ca8a04', close: '#dc2626' };

/** Compact single-select, type-to-filter combobox for picking a teacher's name. */
function TeacherCombobox({
  teachers,
  value,
  onChange,
}: {
  teachers: Teacher[];
  value: string;
  onChange: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const q = value.trim().toLowerCase();
  const filtered = teachers.filter((t) => !q || t.tname.toLowerCase().includes(q)).slice(0, 50);

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="พิมพ์ชื่อครูเพื่อค้นหา..."
      />
      {open && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-400">ไม่พบชื่อครูที่ตรงกับคำค้นหา</li>
          ) : (
            filtered.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(t.tname);
                    setOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-50"
                >
                  {t.tname}
                  {t.dep_name ? ` (${t.dep_name})` : ''}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export default function ScreeningSummaryPage() {
  // A round card's "ดูผลรวม" button navigates here with the round already
  // picked, so the dashboard opens pre-filtered instead of showing everyone.
  const location = useLocation();
  const initialFilter = location.state as
    | { academicYear?: string; semester?: string; openPrint?: 'memo' | 'report' }
    | null;
  const [academicYear, setAcademicYear] = useState(initialFilter?.academicYear ?? '');
  const [semester, setSemester] = useState(initialFilter?.semester ?? '');
  const [classFilter, setClassFilter] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  // Which print-only section is currently shown — only one prints at a time.
  const [printMode, setPrintMode] = useState<'memo' | 'report' | null>(null);
  // The round list's printer icons navigate straight here with the modal
  // already requested, instead of landing on the summary and requiring a
  // second click.
  const [showMemoModal, setShowMemoModal] = useState(initialFilter?.openPrint === 'memo');
  const [memoDate, setMemoDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [deptHeadName, setDeptHeadName] = useState('');
  const [showReportModal, setShowReportModal] = useState(initialFilter?.openPrint === 'report');
  const [reportDeptHeadName, setReportDeptHeadName] = useState('');

  const { profile } = useAuth();
  const { data: teachers } = useAsync(fetchAllTeachers, []);

  useEffect(() => {
    if (!printMode) return;
    const timer = setTimeout(() => window.print(), 50);
    return () => clearTimeout(timer);
  }, [printMode]);

  useEffect(() => {
    function handleAfterPrint() {
      setPrintMode(null);
    }
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const { data, loading, error, refetch } = useAsync(
    () => fetchAllScreenings({ academicYear: academicYear || undefined, semester: semester || undefined, departmentId: departmentId || undefined }),
    [academicYear, semester, departmentId],
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    return classFilter ? data.filter((s) => s.className === classFilter) : data;
  }, [data, classFilter]);

  const options = useMemo(() => {
    if (!data) return { years: [], classes: [], departments: [] };
    return {
      years: Array.from(new Set(data.map((s) => s.academicYear))).sort().reverse(),
      classes: Array.from(new Set(data.map((s) => s.className))).filter(Boolean),
      departments: Array.from(new Map(data.map((s) => [s.departmentId, s.departmentName])).entries()).filter(
        ([id]) => id,
      ),
    };
  }, [data]);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={refetch} />;

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

  // Per-category breakdown — matches "แบบสรุปผลการคัดกรองผู้เรียน", the
  // official print form (one row per category, count of students by group
  // *within that category*, not the overall per-student result used above).
  const categoryStats = SCREENING_CATEGORY_ORDER.map((key) => {
    const counts: Record<ResultGroup, number> = { trust: 0, concern: 0, close: 0 };
    for (const s of filtered) {
      const g = s.categories?.[key]?.group ?? 'trust';
      counts[g]++;
    }
    return { key, ...counts };
  });

  const departmentName = departmentId ? options.departments.find(([id]) => id === departmentId)?.[1] : '';

  return (
    <div className="space-y-5 print:space-y-3">
      <div className="print:hidden">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">สรุปผลการคัดกรองผู้เรียน</h1>
        <p className="text-sm text-gray-500">ทั้งหมด {filtered.length} รายการ</p>
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
          {options.classes.map((c) => (
            <option key={c} value={c}>
              {c}
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

      {filtered.length === 0 ? (
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

          {/* Print-only: official บันทึกข้อความ (memo) addressed to the college director. */}
          {printMode === 'memo' && (
            <div className="hidden print:block text-sm leading-relaxed">
              <div className="relative flex items-center justify-center">
                <img
                  src={`${import.meta.env.BASE_URL}300px-Thai_government_Garuda.jpg`}
                  alt="ครุฑ"
                  className="absolute left-0 h-16 w-auto"
                />
                <h2 className="text-lg font-bold">บันทึกข้อความ</h2>
              </div>

              <div className="mt-[1cm] flex items-baseline gap-1">
                <span className="shrink-0 font-bold">ส่วนราชการ</span>
                <span className="flex-1 border-b border-black">วิทยาลัยเทคนิคระยอง</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="shrink-0">ที่</span>
                <span className="flex-1 border-b border-black">{' '}</span>
                <span className="shrink-0">วันที่</span>
                <span className="flex-1 border-b border-black">{formatThaiDate(memoDate)}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="shrink-0 font-bold">เรื่อง</span>
                <span className="flex-1 border-b border-black">
                  การคัดกรองนักเรียนนักศึกษาจำแนกกลุ่มไว้ใจ กลุ่มห่วงใย กลุ่มใกล้ชิด ประจำปีการศึกษา {academicYear || '.....'}
                </span>
              </div>

              <hr className="mt-[0.5cm] border-t-2 border-black" />

              <p className="mt-3">
                <span className="font-bold">เรียน</span> ผู้อำนวยการวิทยาลัยเทคนิคระยอง
              </p>

              <p className="mt-3 indent-8 text-justify">
                ตามที่วิทยาลัยเทคนิคระยอง ได้มอบหมายให้ครูที่ปรึกษาจัดกลุ่มนักเรียนนักศึกษา กลุ่มไว้ใจ กลุ่มห่วงใย
                กลุ่มใกล้ชิด ตามโครงการขับเคลื่อนแก้ไขปัญหาผู้เรียนอาชีวศึกษาออกนอกระบบการศึกษา (Vocational Education
                Zero Drop Out) ปีการศึกษา {academicYear || '.....'} นั้น
              </p>
              <p className="mt-3 indent-8 text-justify">
                บัดนี้ ข้าพเจ้าได้ดำเนินการสรุปผลการคัดกรองและแบ่งกลุ่มนักเรียนนักศึกษา กลุ่มไว้ใจ กลุ่มห่วงใย
                กลุ่มใกล้ชิด ดังเอกสารแนบมาท้ายนี้
              </p>

              <div className="mt-10 flex justify-end">
                <div className="text-center">
                  <p>ลงชื่อ.............................................</p>
                  <p className="mt-1">({profile?.displayName || '.............................................'})</p>
                  <p>ครูที่ปรึกษา</p>
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <div className="text-center">
                  <p>ลงชื่อ.............................................</p>
                  <p className="mt-1">({deptHeadName || '.............................................'})</p>
                  <p>หัวหน้าแผนกวิชา</p>
                </div>
                <div className="text-center">
                  <p>ลงชื่อ.............................................</p>
                  <p className="mt-1">(นางสาวสิริขวัญ นพสันเทียะ)</p>
                  <p>หัวหน้างานครูที่ปรึกษา</p>
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <div className="text-center">
                  <p>ลงชื่อ.............................................</p>
                  <p className="mt-1">(นายชาคริต รุ่งรัตน์)</p>
                  <p>รองผู้อำนวยการฝ่ายกิจการนักเรียนนักศึกษา</p>
                </div>
              </div>
            </div>
          )}

          {/* Print-only: official "แบบสรุปผลการคัดกรองผู้เรียน" form layout — hidden on screen, shown only in print output. */}
          {printMode === 'report' && (
            <div className="hidden print:block">
              <h2 className="text-center text-base font-bold">แบบสรุปผลการคัดกรองผู้เรียน</h2>
              <p className="text-center text-sm">
                ภาคเรียนที่ {semester || '.....'} ปีการศึกษา {academicYear || '.....'}
              </p>
              <p className="mt-3 text-center text-sm">
                <span className="font-bold">กลุ่มเรียน</span> {classFilter || '.....................'}{' '}
                <span className="font-bold">แผนกวิชา</span> {departmentName || '.....................'}
              </p>

              <table className="mt-3 w-full border-collapse border border-black text-sm">
                <thead>
                  <tr>
                    <th className="border border-black px-2 py-1.5 text-left">รายการพิจารณา</th>
                    <th className="border border-black px-2 py-1.5">กลุ่มใกล้ชิด (คน)</th>
                    <th className="border border-black px-2 py-1.5">กลุ่มห่วงใย (คน)</th>
                    <th className="border border-black px-2 py-1.5">กลุ่มไว้ใจ (คน)</th>
                    <th className="border border-black px-2 py-1.5">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryStats.map((row) => (
                    <tr key={row.key}>
                      <td className="border border-black px-2 py-1.5">{SCREENING_CATEGORY_LABEL[row.key]}</td>
                      <td className="border border-black px-2 py-1.5 text-center">{row.close || ''}</td>
                      <td className="border border-black px-2 py-1.5 text-center">{row.concern || ''}</td>
                      <td className="border border-black px-2 py-1.5 text-center">{row.trust || ''}</td>
                      <td className="border border-black px-2 py-1.5"></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-10 flex justify-end">
                <div className="text-center text-sm">
                  <p>ลงชื่อ.............................................ครูที่ปรึกษา</p>
                  <p className="mt-1">({profile?.displayName || '.............................................'})</p>
                </div>
              </div>
              <div className="mt-8 flex justify-end">
                <div className="text-center text-sm">
                  <p>ลงชื่อ.............................................หัวหน้าแผนก</p>
                  <p className="mt-1">({reportDeptHeadName || '.............................................'})</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {showMemoModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4 print:hidden">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">ข้อมูลก่อนพิมพ์บันทึกข้อความ</h3>
            <div className="mt-4 space-y-3">
              <Field label="วันที่">
                <Input type="date" value={memoDate} onChange={(e) => setMemoDate(e.target.value)} />
              </Field>
              <Field label="หัวหน้าแผนกวิชา">
                <TeacherCombobox teachers={teachers ?? []} value={deptHeadName} onChange={setDeptHeadName} />
              </Field>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowMemoModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                ยกเลิก
              </button>
              <Button
                disabled={!memoDate || !deptHeadName.trim()}
                onClick={() => {
                  setShowMemoModal(false);
                  setPrintMode('memo');
                }}
              >
                ดูตัวอย่างก่อนพิมพ์
              </Button>
            </div>
          </div>
        </div>
      )}

      {showReportModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4 print:hidden">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">ข้อมูลก่อนพิมพ์สรุป</h3>
            <div className="mt-4 space-y-3">
              <Field label="หัวหน้าแผนกวิชา">
                <TeacherCombobox teachers={teachers ?? []} value={reportDeptHeadName} onChange={setReportDeptHeadName} />
              </Field>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowReportModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                ยกเลิก
              </button>
              <Button
                disabled={!reportDeptHeadName.trim()}
                onClick={() => {
                  setShowReportModal(false);
                  setPrintMode('report');
                }}
              >
                ดูตัวอย่างก่อนพิมพ์
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
