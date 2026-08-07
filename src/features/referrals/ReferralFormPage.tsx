import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import {
  fetchAllStudents,
  fetchStudentsByClasses,
  fetchStudentByStudentId,
  studentDisplayName,
} from '../students/api';
import { fetchLatestScreeningForStudent } from '../screenings/api';
import { fetchHomeVisitsByStudent } from '../homeVisits/api';
import { createReferral, fetchReferralById, updateReferral } from './api';
import { canViewCollegeOverview } from '../../utils/rbac';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { Section, Field, Select, Input, Textarea, Button, Checkbox, Radio } from '../../components/ui/Form';
import { GroupBadge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import {
  RESULT_GROUP_LABEL,
  TARGET_WORK_LABEL,
  TARGET_WORK_PURPOSE,
  PROBLEM_LABEL,
  PROBLEM_ORDER,
  type TargetWork,
  type StudentProblems,
} from '../../types';

const TARGET_WORK_ORDER: TargetWork[] = ['guidance', 'scholarship', 'discipline', 'rehabilitation'];

const emptyProblems: StudentProblems = {
  financialHardship: false,
  frequentAbsence: false,
  notAttending: false,
  familyProblem: false,
  nightOuting: false,
  fighting: false,
  stealing: false,
  gambling: false,
  smoking: false,
  alcohol: false,
  drugs: false,
  affair: false,
  other: false,
  otherDetail: '',
};

export default function ReferralFormPage() {
  const { studentId: routeStudentId, id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const overview = canViewCollegeOverview(profile?.role);
  const isEdit = !!id;

  const [studentId, setStudentId] = useState('');
  const [problems, setProblems] = useState<StudentProblems>(emptyProblems);
  const [problemSummary, setProblemSummary] = useState('');
  const [targetWork, setTargetWork] = useState<TargetWork>('guidance');
  const [saving, setSaving] = useState(false);

  const { data, loading, error } = useAsync(async () => {
    const existing = isEdit ? await fetchReferralById(id!) : null;
    const roster = overview ? await fetchAllStudents() : await fetchStudentsByClasses(profile?.classIds ?? []);
    const targetStudentId = existing?.studentId ?? routeStudentId;
    if (targetStudentId && !roster.some((s) => s.sid === targetStudentId)) {
      const missing = await fetchStudentByStudentId(targetStudentId);
      if (missing) roster.push(missing);
    }
    return { roster, existing };
  }, [isEdit, id, overview, routeStudentId, profile?.uid, JSON.stringify(profile?.classIds)]);

  useEffect(() => {
    if (!data) return;
    if (data.existing) {
      const referral = data.existing;
      setStudentId(referral.studentId);
      setProblems(referral.problems);
      setProblemSummary(referral.problemSummary);
      setTargetWork(referral.targetWork);
    } else if (!studentId && routeStudentId) {
      setStudentId(routeStudentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const { data: reference } = useAsync(async () => {
    if (!studentId) return { screening: null, latestVisit: null };
    const [screening, visits] = await Promise.all([
      fetchLatestScreeningForStudent(studentId),
      fetchHomeVisitsByStudent(studentId),
    ]);
    return { screening, latestVisit: visits[0] ?? null };
  }, [studentId]);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState />;
  if (isEdit && !data.existing) return <ErrorState title="ไม่พบรายการส่งต่อนี้" description="" />;

  const existing = data.existing;
  const selectedStudent = data.roster.find((s) => s.sid === studentId);

  async function handleSubmit() {
    if (!profile || !selectedStudent) return;
    setSaving(true);
    try {
      const payload = {
        studentId: selectedStudent.sid,
        studentName: studentDisplayName(selectedStudent),
        classId: selectedStudent.class_code,
        className: selectedStudent.class_name ?? '',
        departmentId: selectedStudent.dep_id ?? '',
        departmentName: selectedStudent.dep_name ?? '',
        level: '',
        // Firestore rejects `undefined` field values outright, so these two
        // optional refs must be omitted entirely rather than set to undefined
        // when the student has no screening/home-visit record yet.
        ...(reference?.screening?.id ? { screeningId: reference.screening.id } : {}),
        ...(reference?.latestVisit?.id ? { homeVisitId: reference.latestVisit.id } : {}),
        referredBy: existing?.referredBy ?? profile.teacherId ?? profile.uid,
        referredByName: existing?.referredByName ?? profile.displayName,
        referredDate: existing?.referredDate ?? new Date().toISOString().slice(0, 10),
        targetWork,
        targetWorkLabel: TARGET_WORK_LABEL[targetWork],
        problems,
        problemSummary,
      };

      if (isEdit && id) {
        await updateReferral(id, payload);
        showToast('บันทึกการแก้ไขสำเร็จ');
      } else {
        await createReferral(payload);
        showToast('ส่งต่อผู้เรียนสำเร็จ');
      }
      navigate('/referrals');
    } catch {
      showToast('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{isEdit ? 'แก้ไขการส่งต่อผู้เรียน' : 'ส่งต่อผู้เรียน'}</h1>
        <p className="text-sm text-gray-500">บันทึกปัญหาที่พบและส่งต่อผู้เรียนไปยังงานที่เกี่ยวข้อง</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white px-4 sm:px-5">
        <Section title="ผู้เรียน">
          <Field label="ชื่อนักเรียน" required>
            <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={isEdit || !!routeStudentId}>
              <option value="">โปรดเลือก</option>
              {data.roster.map((s) => (
                <option key={s.sid} value={s.sid}>
                  {studentDisplayName(s)} — {s.class_name}
                </option>
              ))}
            </Select>
          </Field>
        </Section>

        {(reference?.screening || reference?.latestVisit) && (
          <div className="pb-4">
            <div className="flex flex-wrap gap-2 text-sm text-gray-600">
              {reference.screening && (
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5">
                  ผลคัดกรองล่าสุด:{' '}
                  <GroupBadge group={reference.screening.resultGroup} label={RESULT_GROUP_LABEL[reference.screening.resultGroup]} />
                </div>
              )}
              {reference.latestVisit && (
                <div className="rounded-lg bg-gray-50 px-3 py-1.5">เยี่ยมบ้านล่าสุด: {reference.latestVisit.visitDate}</div>
              )}
            </div>
          </div>
        )}

        <Section title="ปัญหาที่เกิดขึ้นกับผู้เรียน" description="เลือกได้หลายข้อ">
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {PROBLEM_ORDER.map((key) => (
              <Checkbox
                key={key}
                label={PROBLEM_LABEL[key]}
                checked={problems[key]}
                onChange={(e) => setProblems({ ...problems, [key]: e.target.checked })}
              />
            ))}
            <Checkbox
              label="อื่นๆ"
              checked={problems.other}
              onChange={(e) => setProblems({ ...problems, other: e.target.checked })}
            />
          </div>
          {problems.other && (
            <Input
              value={problems.otherDetail}
              onChange={(e) => setProblems({ ...problems, otherDetail: e.target.value })}
              placeholder="ระบุปัญหาอื่นๆ"
            />
          )}
        </Section>

        <Section title="สรุปปัญหาพอสังเขป">
          <Textarea rows={3} value={problemSummary} onChange={(e) => setProblemSummary(e.target.value)} />
        </Section>

        <Section title="ส่งต่อไปยังงานใด" description="เลือก 1 ข้อ">
          <div className="space-y-2">
            {TARGET_WORK_ORDER.map((tw) => (
              <Radio
                key={tw}
                label={`${TARGET_WORK_LABEL[tw]} ${TARGET_WORK_PURPOSE[tw]}`}
                name="targetWork"
                checked={targetWork === tw}
                onChange={() => setTargetWork(tw)}
              />
            ))}
          </div>
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-6xl justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            ยกเลิก
          </Button>
          <Button variant="primary" loading={saving} disabled={!studentId} onClick={handleSubmit}>
            {isEdit ? 'บันทึกการแก้ไข' : 'ส่งต่อผู้เรียน'}
          </Button>
        </div>
      </div>
    </div>
  );
}
