import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchAllScreenings, fetchScreeningsByTeacher, computeScreeningRounds, deleteScreening } from './api';
import { fetchAllTeachers, fetchAllClasses } from '../students/api';
import { fetchAllSignatorySettings } from '../settings/api';
import { SCREENING_CATEGORY_ORDER } from './checklist';
import { canViewCollegeOverview } from '../../utils/rbac';
import { formatThaiDate } from '../../utils/thaiDate';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Button, Select, Field, Input } from '../../components/ui/Form';
import { Badge } from '../../components/ui/Badge';
import { Icon } from '../../components/ui/Icon';
import { TeacherCombobox } from '../../components/ui/TeacherCombobox';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { SCREENING_CATEGORY_LABEL, type ResultGroup } from '../../types';

const currentAcademicYear = String(new Date().getFullYear() + 543);

export default function ScreeningRoundListPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const overview = canViewCollegeOverview(profile?.role);
  const teacherId = profile?.teacherId ?? profile?.uid ?? '';

  const [showNewModal, setShowNewModal] = useState(false);
  const [newYear, setNewYear] = useState(currentAcademicYear);
  const [newSemester, setNewSemester] = useState('1');
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  // Which round a print action targets — set when a card's printer icon is
  // clicked, so printing happens right here instead of navigating away.
  const [printRound, setPrintRound] = useState<{ academicYear: string; semester: string } | null>(null);
  // Which print-only section is currently shown — only one prints at a time.
  const [printMode, setPrintMode] = useState<'memo' | 'report' | null>(null);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [memoDate, setMemoDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [deptHeadName, setDeptHeadName] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportDeptHeadName, setReportDeptHeadName] = useState('');

  const { data: teachers } = useAsync(fetchAllTeachers, []);
  const { data: classes } = useAsync(fetchAllClasses, []);
  const { data: signatorySettings } = useAsync(fetchAllSignatorySettings, []);
  const signatoryFor = printRound
    ? signatorySettings?.find((s) => s.academicYear === printRound.academicYear && s.semester === printRound.semester)
    : undefined;

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
    () => (overview ? fetchAllScreenings() : fetchScreeningsByTeacher(teacherId)),
    [overview, teacherId],
  );

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={refetch} />;

  const rounds = computeScreeningRounds(data);

  const printFiltered = printRound
    ? data.filter((s) => s.academicYear === printRound.academicYear && s.semester === printRound.semester)
    : [];
  const classShortNameById = new Map((classes ?? []).map((c) => [c.class_code, c.short_name || c.class_name]));
  const printClassNames = Array.from(
    new Set(printFiltered.map((s) => classShortNameById.get(s.classId) || s.className).filter(Boolean)),
  );
  const printDepartmentNames = Array.from(new Set(printFiltered.map((s) => s.departmentName).filter(Boolean)));

  // Per-category breakdown — matches "แบบสรุปผลการคัดกรองผู้เรียน", the
  // official print form (one row per category, count of students by group
  // *within that category*, not the overall per-student result used above).
  const categoryStats = SCREENING_CATEGORY_ORDER.map((key) => {
    const counts: Record<ResultGroup, number> = { trust: 0, concern: 0, close: 0 };
    for (const s of printFiltered) {
      const g = s.categories?.[key]?.group ?? 'trust';
      counts[g]++;
    }
    return { key, ...counts };
  });

  async function handleDelete(academicYear: string, semester: string) {
    const key = `${academicYear}|${semester}`;
    const ok = await confirm({
      title: 'ลบรอบคัดกรองนี้?',
      description: `ภาคเรียนที่ ${semester} ปีการศึกษา ${academicYear} — ลบข้อมูลคัดกรองของผู้เรียนทุกคนในรอบนี้ ไม่สามารถกู้คืนได้`,
      confirmText: 'ลบ',
      tone: 'danger',
    });
    if (!ok) return;
    setDeletingKey(key);
    try {
      const idsInRound = (data ?? [])
        .filter((s) => s.academicYear === academicYear && s.semester === semester)
        .map((s) => s.id);
      await Promise.all(idsInRound.map((id) => deleteScreening(id)));
      showToast('ลบรอบคัดกรองเรียบร้อยแล้ว');
      refetch();
    } catch {
      showToast('ลบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setDeletingKey(null);
    }
  }

  return (
    <div className="space-y-5 print:space-y-0">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">คัดกรองผู้เรียน</h1>
          <p className="text-sm text-gray-500">ทั้งหมด {rounds.length} รอบ</p>
        </div>
        <Button variant="primary" onClick={() => setShowNewModal(true)}>
          + บันทึกใหม่
        </Button>
      </div>

      {rounds.length === 0 ? (
        <EmptyState title="ยังไม่มีการคัดกรอง" description="เริ่มคัดกรองผู้เรียนรอบแรกของคุณ" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 print:hidden">
          {rounds.map((r) => {
            const total = r.trust + r.concern + r.close;
            const key = `${r.academicYear}|${r.semester}`;
            return (
              <div key={key} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    <Icon name="clipboard" className="h-4 w-4" />
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      title="ดูผลรวม"
                      onClick={() => navigate('/screenings/summary', { state: { academicYear: r.academicYear, semester: r.semester } })}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-trust-100 text-trust-700 hover:bg-trust-200"
                    >
                      <Icon name="eye" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="พิมพ์บันทึกข้อความ"
                      onClick={() => {
                        setPrintRound({ academicYear: r.academicYear, semester: r.semester });
                        setShowMemoModal(true);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      <Icon name="printer" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="พิมพ์สรุป"
                      onClick={() => {
                        setPrintRound({ academicYear: r.academicYear, semester: r.semester });
                        setShowReportModal(true);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200"
                    >
                      <Icon name="printer" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="คัดกรองต่อ / แก้ไข"
                      onClick={() => navigate(`/screenings/${r.academicYear}/${r.semester}`)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      <Icon name="pencil" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="ลบ"
                      disabled={deletingKey === key}
                      onClick={() => handleDelete(r.academicYear, r.semester)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-close-100 text-close-700 hover:bg-close-200 disabled:opacity-50"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-sm font-bold leading-snug text-gray-900">
                  ภาคเรียนที่ {r.semester} ปีการศึกษา {r.academicYear}
                </p>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="green">ไว้ใจ {r.trust}</Badge>
                  <Badge tone="yellow">ห่วงใย {r.concern}</Badge>
                  <Badge tone="red">ใกล้ชิด {r.close}</Badge>
                </div>

                <div className="mt-3 flex items-center justify-end border-t border-gray-100 pt-2 text-xs text-gray-500">
                  <span>{total} คน</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Print-only: official บันทึกข้อความ (memo) addressed to the college director. */}
      {printMode === 'memo' && printRound && (
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
          <div className="mt-1 flex items-end gap-1">
            <span className="shrink-0">ที่</span>
            <span className="flex-1 border-b border-black">{' '}</span>
            <span className="shrink-0">วันที่</span>
            <span className="flex-1 border-b border-black">{formatThaiDate(memoDate)}</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="shrink-0 font-bold">เรื่อง</span>
            <span className="flex-1 border-b border-black">
              การคัดกรองนักเรียนนักศึกษาจำแนกกลุ่มไว้ใจ กลุ่มห่วงใย กลุ่มใกล้ชิด ประจำปีการศึกษา {printRound.academicYear}
            </span>
          </div>

          <hr className="mt-[0.5cm] border-t-2 border-black" />

          <p className="mt-3">
            <span className="font-bold">เรียน</span> ผู้อำนวยการวิทยาลัยเทคนิคระยอง
          </p>

          <p className="mt-3 indent-8 text-justify">
            ตามที่วิทยาลัยเทคนิคระยอง ได้มอบหมายให้ครูที่ปรึกษาจัดกลุ่มนักเรียนนักศึกษา กลุ่มไว้ใจ กลุ่มห่วงใย
            กลุ่มใกล้ชิด ตามโครงการขับเคลื่อนแก้ไขปัญหาผู้เรียนอาชีวศึกษาออกนอกระบบการศึกษา (Vocational Education
            Zero Drop Out) ปีการศึกษา {printRound.academicYear} นั้น
          </p>
          <p className="mt-3 indent-8 text-justify">
            บัดนี้ ข้าพเจ้าได้ดำเนินการสรุปผลการคัดกรองและแบ่งกลุ่มนักเรียนนักศึกษา กลุ่มไว้ใจ กลุ่มห่วงใย
            กลุ่มใกล้ชิด ดังเอกสารแนบมาท้ายนี้
          </p>

          <div className="mt-10 flex justify-end">
            <div className="w-64 text-center">
              <p>ลงชื่อ.............................................</p>
              <p className="mt-1">({profile?.displayName || '.............................................'})</p>
              <p>ครูที่ปรึกษา</p>
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <div className="w-64 text-center">
              <p>ลงชื่อ.............................................</p>
              <p className="mt-1">({deptHeadName || '.............................................'})</p>
              <p>หัวหน้าแผนกวิชา</p>
            </div>
            <div className="w-64 text-center">
              <p>ลงชื่อ.............................................</p>
              <p className="mt-1">({signatoryFor?.advisorHeadName || '.............................................'})</p>
              <p>หัวหน้างานครูที่ปรึกษาและการแนะแนว</p>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <div className="w-64 text-center">
              <p>ลงชื่อ.............................................</p>
              <p className="mt-1">({signatoryFor?.deputyDirectorName || '.............................................'})</p>
              <p>รองผู้อำนวยการฝ่ายกิจการนักเรียนนักศึกษา</p>
            </div>
          </div>
        </div>
      )}

      {/* Print-only: official "แบบสรุปผลการคัดกรองผู้เรียน" form layout — hidden on screen, shown only in print output. */}
      {printMode === 'report' && printRound && (
        <div className="hidden print:block">
          <h2 className="text-center text-base font-bold">แบบสรุปผลการคัดกรองผู้เรียน</h2>
          <p className="text-center text-sm">
            ภาคเรียนที่ {printRound.semester} ปีการศึกษา {printRound.academicYear}
          </p>
          <p className="mt-3 text-center text-sm">
            <span className="font-bold">กลุ่มเรียน</span> {printClassNames.join(', ') || '.......................'}{' '}
            <span className="font-bold">แผนกวิชา</span> {printDepartmentNames.join(', ') || '.......................'}
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
              <p>ลงชื่อ.............................................</p>
              <p className="mt-1">({profile?.displayName || '.............................................'})</p>
              <p>ครูที่ปรึกษา</p>
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <div className="text-center text-sm">
              <p>ลงชื่อ.............................................</p>
              <p className="mt-1">({reportDeptHeadName || '.............................................'})</p>
              <p>หัวหน้าแผนก</p>
            </div>
          </div>
        </div>
      )}

      {showNewModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">เริ่มคัดกรองรอบใหม่</h3>
            <div className="mt-4 space-y-3">
              <Field label="ปีการศึกษา">
                <Select value={newYear} onChange={(e) => setNewYear(e.target.value)}>
                  {[currentAcademicYear, String(Number(currentAcademicYear) - 1)].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="ภาคเรียนที่">
                <Select value={newSemester} onChange={(e) => setNewSemester(e.target.value)}>
                  <option value="1">1</option>
                  <option value="2">2</option>
                </Select>
              </Field>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowNewModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                ยกเลิก
              </button>
              <Button onClick={() => navigate(`/screenings/${newYear}/${newSemester}`)}>เริ่มคัดกรอง</Button>
            </div>
          </div>
        </div>
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
