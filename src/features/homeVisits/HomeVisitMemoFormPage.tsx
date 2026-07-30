import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchHomeVisitsByTeacher, fetchAllHomeVisits } from './api';
import { fetchHomeVisitMemoById, createHomeVisitMemo, updateHomeVisitMemo } from './memoApi';
import { fetchSignatorySettings } from '../settings/api';
import { fetchAllStudents, fetchStudentsByClasses, fetchAllTeachers } from '../students/api';
import { canViewCollegeOverview } from '../../utils/rbac';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { Field, Input, Select, Button } from '../../components/ui/Form';
import { TeacherCombobox } from '../../components/ui/TeacherCombobox';
import { useToast } from '../../components/ui/Toast';

const DEPT_HEAD_STORAGE_KEY = 'rytc-care-plus:home-visit-memo-dept-head';
const currentAcademicYear = String(new Date().getFullYear() + 543);

export default function HomeVisitMemoFormPage() {
  const { memoId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const isEdit = !!memoId;
  const overview = canViewCollegeOverview(profile?.role);
  const teacherId = profile?.teacherId ?? profile?.uid ?? '';

  const { data, loading, error } = useAsync(async () => {
    const existing = isEdit ? await fetchHomeVisitMemoById(memoId!) : null;
    if (existing) return { existing, totalStudents: existing.totalStudents, visitedCount: existing.visitedCount, classNames: [] as string[] };

    const [visits, students] = await Promise.all([
      overview ? fetchAllHomeVisits() : fetchHomeVisitsByTeacher(teacherId),
      overview ? fetchAllStudents() : fetchStudentsByClasses(profile?.classIds ?? []),
    ]);
    const visitByStudent = new Map(visits.map((v) => [v.studentId, v]));
    const visitedCount = students.filter((s) => visitByStudent.get(s.sid)?.status === 'submitted').length;
    const classNames = Array.from(new Set(students.map((s) => s.class_name).filter(Boolean)));
    return { existing: null, totalStudents: students.length, visitedCount, classNames };
  }, [memoId, isEdit, overview, teacherId, JSON.stringify(profile?.classIds)]);

  const [orderNumber, setOrderNumber] = useState('');
  const [roundNumber, setRoundNumber] = useState('1');
  const [level, setLevel] = useState('');
  const [memoDate, setMemoDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [academicYear, setAcademicYear] = useState(currentAcademicYear);
  const [semester, setSemester] = useState('1');
  const [deptHeadName, setDeptHeadName] = useState(() => localStorage.getItem(DEPT_HEAD_STORAGE_KEY) ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    if (data.existing) {
      const memo = data.existing;
      setOrderNumber(memo.orderNumber);
      setRoundNumber(memo.roundNumber);
      setLevel(memo.level);
      setMemoDate(memo.memoDate);
      setAcademicYear(memo.academicYear || currentAcademicYear);
      setSemester(memo.semester || '1');
      setDeptHeadName(memo.deptHeadName);
    } else if (!level) {
      setLevel(data.classNames.join(', '));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    localStorage.setItem(DEPT_HEAD_STORAGE_KEY, deptHeadName);
  }, [deptHeadName]);

  // หัวหน้างานครูที่ปรึกษาและการแนะแนว / รองผู้อำนวยการฝ่ายกิจการนักเรียนนักศึกษา
  // เปลี่ยนบ่อย จึงดึงจากการตั้งค่ากลางตามภาคเรียน/ปีการศึกษาที่เลือก แทนการพิมพ์เอง
  const { data: signatorySettings } = useAsync(
    () => fetchSignatorySettings(academicYear, semester),
    [academicYear, semester],
  );
  const advisorHeadName = signatorySettings?.advisorHeadName || data?.existing?.advisorHeadName || '';
  const deputyDirectorName = signatorySettings?.deputyDirectorName || data?.existing?.deputyDirectorName || '';

  const { data: teachers } = useAsync(fetchAllTeachers, []);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState />;
  if (isEdit && !data.existing) return <ErrorState title="ไม่พบบันทึกข้อความเยี่ยมบ้านนี้" description="" />;

  async function handleSave() {
    if (!profile || !data) return;
    setSaving(true);
    try {
      const payload = {
        advisorTeacherId: data.existing?.advisorTeacherId ?? profile.teacherId ?? profile.uid,
        advisorTeacherName: data.existing?.advisorTeacherName ?? profile.displayName,
        departmentName: data.existing?.departmentName ?? profile.departmentName ?? '',
        orderNumber,
        roundNumber,
        level,
        memoDate,
        academicYear,
        semester,
        totalStudents: data.totalStudents,
        visitedCount: data.visitedCount,
        deptHeadName,
        advisorHeadName,
        deputyDirectorName,
        status: 'submitted' as const,
        createdBy: data.existing?.createdBy ?? profile.uid,
      };

      if (isEdit && memoId) {
        await updateHomeVisitMemo(memoId, payload);
        showToast('บันทึกข้อความเยี่ยมบ้านสำเร็จ');
      } else {
        await createHomeVisitMemo(payload);
        showToast('บันทึกข้อความเยี่ยมบ้านสำเร็จ');
      }
      navigate('/home-visits/memo');
    } catch {
      showToast('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">บันทึกข้อความเยี่ยมบ้าน</h1>
        <p className="text-sm text-gray-500">รายงานผลการออกเยี่ยมบ้านผู้เรียน — กรอกรายละเอียดให้ครบก่อนบันทึก</p>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2">
        <Field label="เลขที่คำสั่งแต่งตั้งคณะกรรมการ" hint="เช่น 1751/2568">
          <Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
        </Field>
        <Field label="วันที่ในบันทึกข้อความ">
          <Input type="date" value={memoDate} onChange={(e) => setMemoDate(e.target.value)} />
        </Field>
        <Field label="ระดับชั้น/กลุ่มเรียนที่ดูแล">
          <Input value={level} onChange={(e) => setLevel(e.target.value)} />
        </Field>
        <Field label="ออกเยี่ยมบ้านเป็นครั้งที่" required>
          <Input value={roundNumber} onChange={(e) => setRoundNumber(e.target.value)} className="max-w-[6rem]" />
        </Field>
        <Field label="ภาคเรียนที่">
          <Select value={semester} onChange={(e) => setSemester(e.target.value)}>
            <option value="1">ภาคเรียนที่ 1</option>
            <option value="2">ภาคเรียนที่ 2</option>
          </Select>
        </Field>
        <Field label="ปีการศึกษา">
          <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
        </Field>
        <Field label="หัวหน้าแผนกวิชา">
          <TeacherCombobox teachers={teachers ?? []} value={deptHeadName} onChange={setDeptHeadName} />
        </Field>
        <Field label="หัวหน้างานครูที่ปรึกษาและการแนะแนว" hint="ตั้งค่าได้ที่เมนู “ตั้งค่า”">
          <Input value={advisorHeadName} disabled placeholder="ยังไม่ได้ตั้งค่าสำหรับภาคเรียนนี้" />
        </Field>
        <Field label="รองผู้อำนวยการฝ่ายกิจการนักเรียนนักศึกษา" hint="ตั้งค่าได้ที่เมนู “ตั้งค่า”">
          <Input value={deputyDirectorName} disabled placeholder="ยังไม่ได้ตั้งค่าสำหรับภาคเรียนนี้" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">นักเรียนในความดูแล</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{data.totalStudents}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">เยี่ยมบ้านแล้ว</p>
          <p className="mt-2 text-3xl font-bold text-trust-700">{data.visitedCount}</p>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-6xl justify-end gap-2">
          <Button variant="primary" loading={saving} disabled={!roundNumber} onClick={handleSave}>
            บันทึก
          </Button>
        </div>
      </div>
    </div>
  );
}
