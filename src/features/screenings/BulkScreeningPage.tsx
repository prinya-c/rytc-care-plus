import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchAllStudents, fetchStudentsByClasses, studentDisplayName } from '../students/api';
import { fetchScreeningsByTeacherAndPeriod, screeningDocId, upsertScreening } from './api';
import {
  SCREENING_CATEGORY_ORDER,
  SCREENING_CHECKLIST,
  emptyScreeningCategories,
  computeCategoryGroup,
  computeOverallGroup,
  isCategoryReviewed,
} from './checklist';
import { canViewCollegeOverview } from '../../utils/rbac';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Input } from '../../components/ui/Form';
import { GroupBadge, Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import {
  RESULT_GROUP_LABEL,
  SCREENING_CATEGORY_LABEL,
  type ResultGroup,
  type Screening,
  type ScreeningCategories,
  type ScreeningCategoryKey,
} from '../../types';
import type { Student } from '../../types';

type Tab = ScreeningCategoryKey | 'summary';

/** Short labels for this page's dense tables only — RESULT_GROUP_LABEL elsewhere in the app keeps "กลุ่ม...". */
const SHORT_RESULT_LABEL: Record<ResultGroup, string> = {
  trust: 'ไว้ใจ',
  concern: 'ห่วงใย',
  close: 'ใกล้ชิด',
};

export default function BulkScreeningPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { academicYear = '', semester = '' } = useParams<{ academicYear: string; semester: string }>();
  const [tab, setTab] = useState<Tab>(SCREENING_CATEGORY_ORDER[0]);

  const scoped = !canViewCollegeOverview(profile?.role);
  const teacherId = profile?.teacherId ?? profile?.uid ?? '';

  const { data, loading, error, refetch } = useAsync(async () => {
    const [students, screenings] = await Promise.all([
      scoped ? fetchStudentsByClasses(profile?.classIds ?? []) : fetchAllStudents(),
      fetchScreeningsByTeacherAndPeriod(teacherId, academicYear, semester),
    ]);
    const map = new Map<string, Screening>();
    for (const s of screenings) map.set(s.studentId, s);
    return { students, screeningMap: map };
  }, [scoped, teacherId, academicYear, semester, JSON.stringify(profile?.classIds)]);

  const [screeningsByStudent, setScreeningsByStudent] = useState<Map<string, Screening>>(new Map());
  const screeningsRef = useRef<Map<string, Screening>>(new Map());
  const chainsRef = useRef<Map<string, Promise<void>>>(new Map());

  // Sync loaded data into local editable state whenever the period/roster changes.
  useEffect(() => {
    if (!data) return;
    screeningsRef.current = new Map(data.screeningMap);
    setScreeningsByStudent(new Map(data.screeningMap));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const studentsById = useMemo(() => {
    const m = new Map<string, Student>();
    for (const s of data?.students ?? []) m.set(s.sid, s);
    return m;
  }, [data]);

  function setLocalAndRef(studentId: string, screening: Screening) {
    screeningsRef.current.set(studentId, screening);
    setScreeningsByStudent(new Map(screeningsRef.current));
  }

  function applyAndPersist(studentId: string, patch: { categories?: ScreeningCategories; note?: string }) {
    const student = studentsById.get(studentId);
    if (!student || !profile) return;
    const existing = screeningsRef.current.get(studentId);
    const isNew = !existing;
    const categories = patch.categories ?? existing?.categories ?? emptyScreeningCategories();
    const note = patch.note ?? existing?.note ?? '';
    const resultGroup = computeOverallGroup(categories);
    const resultGroupLabel = RESULT_GROUP_LABEL[resultGroup];
    // Preserve an already-loaded doc's own id (which may predate this
    // convention and carry a Firestore-assigned id) — only brand-new
    // screenings get the deterministic `{year}_{semester}_{studentId}` id.
    const docId = existing?.id ?? screeningDocId(academicYear, semester, studentId);

    const optimistic: Screening = existing
      ? { ...existing, categories, note, resultGroup, resultGroupLabel }
      : {
          id: docId,
          studentId: student.sid,
          studentName: studentDisplayName(student),
          classId: student.class_code,
          className: student.class_name ?? '',
          departmentId: student.dep_id ?? '',
          departmentName: student.dep_name ?? '',
          level: '',
          advisorTeacherId: teacherId,
          advisorTeacherName: profile.displayName,
          academicYear,
          semester,
          screeningDate: new Date().toISOString().slice(0, 10),
          resultGroup,
          resultGroupLabel,
          categories,
          note,
          status: 'submitted',
          createdBy: profile.uid,
          createdAt: null,
          updatedAt: null,
        };

    setLocalAndRef(studentId, optimistic);

    const prevChain = chainsRef.current.get(studentId) ?? Promise.resolve();
    const nextChain = prevChain
      .then(async () => {
        const current = screeningsRef.current.get(studentId)!;
        const { id: _id, createdAt: _c, updatedAt: _u, ...payload } = current;
        await upsertScreening(docId, payload, isNew);
      })
      .catch(() => {
        showToast('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
      });
    chainsRef.current.set(studentId, nextChain);
  }

  function toggleItem(studentId: string, key: ScreeningCategoryKey, item: string) {
    const existing = screeningsRef.current.get(studentId);
    const baseCategories = existing?.categories ?? emptyScreeningCategories();
    const currentChecked = baseCategories[key].checkedItems;
    const newChecked = currentChecked.includes(item)
      ? currentChecked.filter((i) => i !== item)
      : [...currentChecked, item];
    const newCategories: ScreeningCategories = {
      ...baseCategories,
      // Ticking/unticking a concern/close item always supersedes any prior
      // "ไว้ใจ" confirmation for this category — the two are mutually exclusive.
      [key]: { group: computeCategoryGroup(newChecked, key), checkedItems: newChecked, trustConfirmed: false },
    };
    applyAndPersist(studentId, { categories: newCategories });
  }

  /** Explicit "กลุ่มไว้ใจ" checkbox — only meaningful while no concern/close item is ticked. */
  function toggleTrust(studentId: string, key: ScreeningCategoryKey) {
    const existing = screeningsRef.current.get(studentId);
    const baseCategories = existing?.categories ?? emptyScreeningCategories();
    const cat = baseCategories[key];
    if (cat.checkedItems.length > 0) return;
    const newCategories: ScreeningCategories = {
      ...baseCategories,
      [key]: { group: 'trust', checkedItems: [], trustConfirmed: !cat.trustConfirmed },
    };
    applyAndPersist(studentId, { categories: newCategories });
  }

  function updateNote(studentId: string, note: string) {
    applyAndPersist(studentId, { note });
  }

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={refetch} />;

  const students = data.students;

  return (
    <div className="space-y-5 pb-10">
      <div>
        <Link to="/screenings" className="text-sm font-medium text-brand-600 hover:underline">
          ← กลับไปหน้ารายการ
        </Link>
        <h1 className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">
          คัดกรองผู้เรียน — ภาคเรียนที่ {semester} ปีการศึกษา {academicYear}
        </h1>
        <p className="text-sm text-gray-500">ติ๊กข้อที่ตรงกับผู้เรียนแต่ละคน ระบบบันทึกและประมวลผลกลุ่มให้อัตโนมัติทันที</p>
      </div>

      {students.length === 0 ? (
        <EmptyState title="ไม่พบผู้เรียนในกลุ่มเรียนที่รับผิดชอบ" description="ตรวจสอบกลุ่มเรียนได้ที่เมนู &quot;กลุ่มเรียนของฉัน&quot;" />
      ) : (
        <>
          <div className="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
            {SCREENING_CATEGORY_ORDER.map((key) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === key ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {SCREENING_CATEGORY_LABEL[key]}
              </button>
            ))}
            <button
              onClick={() => setTab('summary')}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === 'summary' ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              สรุป
            </button>
          </div>

          {tab === 'summary' ? (
            <SummaryTable students={students} screeningsByStudent={screeningsByStudent} onNoteChange={updateNote} />
          ) : (
            <>
              <ChecklistLegend categoryKey={tab} />
              <CategoryTable
                categoryKey={tab}
                students={students}
                screeningsByStudent={screeningsByStudent}
                onToggle={toggleItem}
                onToggleTrust={toggleTrust}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Reference list for the current tab's checklist items, numbered to match
 * the compact numbered column headers in CategoryTable — column width has
 * to stay small (many columns × long Thai criteria text would otherwise
 * force either very wide columns or, if rotated vertically, a header tall
 * enough to eat most of a phone screen). The legend is what makes short
 * numbered columns usable without misreading which number is which item.
 */
function ChecklistLegend({ categoryKey }: { categoryKey: ScreeningCategoryKey }) {
  const checklist = SCREENING_CHECKLIST[categoryKey];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-concern-100 bg-concern-50/60 p-3">
        <p className="mb-2 text-xs font-semibold text-concern-700">กลุ่มห่วงใย</p>
        <ol className="space-y-1 text-xs text-gray-700">
          {checklist.concern.map((item, i) => (
            <li key={item} className="flex gap-1.5">
              <span className="shrink-0 font-semibold text-concern-700">{i + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="rounded-xl border border-close-100 bg-close-50/60 p-3">
        <p className="mb-2 text-xs font-semibold text-close-700">กลุ่มใกล้ชิด</p>
        <ol className="space-y-1 text-xs text-gray-700">
          {checklist.close.map((item, i) => (
            <li key={item} className="flex gap-1.5">
              <span className="shrink-0 font-semibold text-close-700">{checklist.concern.length + i + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function CategoryTable({
  categoryKey,
  students,
  screeningsByStudent,
  onToggle,
  onToggleTrust,
}: {
  categoryKey: ScreeningCategoryKey;
  students: Student[];
  screeningsByStudent: Map<string, Screening>;
  onToggle: (studentId: string, key: ScreeningCategoryKey, item: string) => void;
  onToggleTrust: (studentId: string, key: ScreeningCategoryKey) => void;
}) {
  const checklist = SCREENING_CHECKLIST[categoryKey];
  const columns = [
    ...checklist.concern.map((item, i) => ({ item, number: i + 1, tone: 'concern' as const })),
    ...checklist.close.map((item, i) => ({ item, number: checklist.concern.length + i + 1, tone: 'close' as const })),
  ];

  return (
    <div className="max-h-[70vh] overflow-auto rounded-2xl border border-gray-200 bg-white">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="sticky left-0 top-0 z-30 whitespace-nowrap border-b border-r border-gray-200 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700">
              ชื่อ-สกุล
            </th>
            <th className="sticky top-0 z-20 w-14 min-w-14 border-b border-l border-gray-200 bg-trust-50 px-1 py-2 text-center text-xs font-semibold text-trust-700">
              ไว้ใจ
            </th>
            {columns.map((c) => (
              <th
                key={c.number}
                title={c.item}
                className={`sticky top-0 z-20 w-11 min-w-11 border-b border-l border-gray-200 px-1 py-2 text-center text-xs font-semibold ${
                  c.tone === 'concern' ? 'bg-concern-50 text-concern-700' : 'bg-close-50 text-close-700'
                }`}
              >
                {c.number}
              </th>
            ))}
            <th className="sticky top-0 z-20 border-b border-l border-gray-200 bg-gray-50 px-3 py-2 text-center font-semibold text-gray-700">
              ผล
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {students.map((s) => {
            const screening = screeningsByStudent.get(s.sid);
            const category = screening?.categories[categoryKey];
            const checked = new Set(category?.checkedItems ?? []);
            const group = category?.group ?? 'trust';
            const reviewed = category ? isCategoryReviewed(category) : false;
            const hasFindings = checked.size > 0;
            return (
              <tr key={s.sid} className="hover:bg-gray-50">
                <td className="sticky left-0 z-10 whitespace-nowrap border-r border-gray-200 bg-white px-3 py-2 font-medium text-gray-900">
                  {studentDisplayName(s)}
                </td>
                <td className="border-l border-gray-100 px-1 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={category?.trustConfirmed === true}
                    disabled={hasFindings}
                    onChange={() => onToggleTrust(s.sid, categoryKey)}
                    className="h-4 w-4 rounded border-gray-300 text-trust-600 focus:ring-trust-500 disabled:opacity-30"
                  />
                </td>
                {columns.map((c) => (
                  <td key={c.number} className="border-l border-gray-100 px-1 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={checked.has(c.item)}
                      onChange={() => onToggle(s.sid, categoryKey, c.item)}
                      className={`h-4 w-4 rounded border-gray-300 ${
                        c.tone === 'concern' ? 'text-concern-600 focus:ring-concern-500' : 'text-close-600 focus:ring-close-500'
                      }`}
                    />
                  </td>
                ))}
                <td className="border-l border-gray-100 px-2 py-2 text-center">
                  {reviewed ? (
                    <GroupBadge group={group} label={SHORT_RESULT_LABEL[group]} />
                  ) : (
                    <Badge tone="gray">ยังไม่ประเมิน</Badge>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SummaryTable({
  students,
  screeningsByStudent,
  onNoteChange,
}: {
  students: Student[];
  screeningsByStudent: Map<string, Screening>;
  onNoteChange: (studentId: string, note: string) => void;
}) {
  return (
    <div className="max-h-[70vh] overflow-auto rounded-2xl border border-gray-200 bg-white">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="sticky left-0 top-0 z-30 whitespace-nowrap border-b border-r border-gray-200 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700">
              ชื่อ-สกุล
            </th>
            {SCREENING_CATEGORY_ORDER.map((key) => (
              <th key={key} className="sticky top-0 z-20 w-[72px] min-w-[72px] border-b border-l border-gray-200 bg-gray-50 px-1 py-2 text-center text-xs font-semibold text-gray-600">
                {SCREENING_CATEGORY_LABEL[key]}
              </th>
            ))}
            <th className="sticky top-0 z-20 w-[72px] min-w-[72px] border-b border-l border-gray-200 bg-gray-50 px-1 py-2 text-center text-xs font-semibold text-gray-700">
              ผลรวม
            </th>
            <th className="sticky top-0 z-20 min-w-[200px] border-b border-l border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-700">
              หมายเหตุ
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {students.map((s) => {
            const screening = screeningsByStudent.get(s.sid);
            return (
              <tr key={s.sid} className="hover:bg-gray-50">
                <td className="sticky left-0 z-10 whitespace-nowrap border-r border-gray-200 bg-white px-3 py-2 font-medium text-gray-900">
                  {studentDisplayName(s)}
                </td>
                {SCREENING_CATEGORY_ORDER.map((key) => {
                  const category = screening?.categories[key];
                  const reviewed = category ? isCategoryReviewed(category) : false;
                  const group = category?.group ?? 'trust';
                  return (
                    <td key={key} className="border-l border-gray-100 px-1 py-2 text-center">
                      {reviewed ? (
                        <GroupBadge group={group} label={SHORT_RESULT_LABEL[group]} />
                      ) : (
                        <Badge tone="gray">-</Badge>
                      )}
                    </td>
                  );
                })}
                <td className="border-l border-gray-100 px-1 py-2 text-center">
                  {screening ? (
                    <GroupBadge group={screening.resultGroup} label={SHORT_RESULT_LABEL[screening.resultGroup]} />
                  ) : (
                    <Badge tone="gray">ยังไม่ประเมิน</Badge>
                  )}
                </td>
                <td className="border-l border-gray-100 px-2 py-1.5">
                  <Input
                    defaultValue={screening?.note ?? ''}
                    onBlur={(e) => {
                      if (e.target.value !== (screening?.note ?? '')) onNoteChange(s.sid, e.target.value);
                    }}
                    placeholder="หมายเหตุ..."
                    className="text-xs"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
