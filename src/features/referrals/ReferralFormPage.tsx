import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchStudentByStudentId, studentDisplayName } from '../students/api';
import { fetchLatestScreeningForStudent } from '../screenings/api';
import { fetchHomeVisitsByStudent } from '../homeVisits/api';
import { createReferral } from './api';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { Section, Field, Select, Textarea, Button } from '../../components/ui/Form';
import { GroupBadge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { RESULT_GROUP_LABEL, TARGET_WORK_LABEL, REFERRAL_PRIORITY_LABEL, type TargetWork, type ReferralPriority } from '../../types';

export default function ReferralFormPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { showToast } = useToast();

  const [targetWork, setTargetWork] = useState<TargetWork>('guidance');
  const [priority, setPriority] = useState<ReferralPriority>('normal');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, loading, error } = useAsync(async () => {
    const [student, screening, visits] = await Promise.all([
      fetchStudentByStudentId(studentId!),
      fetchLatestScreeningForStudent(studentId!),
      fetchHomeVisitsByStudent(studentId!),
    ]);
    return { student, screening, latestVisit: visits[0] ?? null };
  }, [studentId]);

  if (loading) return <LoadingState />;
  if (error || !data || !data.student) return <ErrorState title="ไม่พบข้อมูลผู้เรียน" description="" />;

  const { student, screening, latestVisit } = data;

  async function handleSubmit() {
    if (!profile || !reason.trim()) {
      showToast('กรุณากรอกเหตุผลการส่งต่อ', 'error');
      return;
    }
    setSaving(true);
    try {
      await createReferral({
        studentId: student!.sid,
        studentName: studentDisplayName(student!),
        classId: student!.class_code,
        className: student!.class_name ?? '',
        departmentId: student!.dep_id ?? '',
        departmentName: student!.dep_name ?? '',
        level: '',
        screeningId: screening?.id,
        homeVisitId: latestVisit?.id,
        referredBy: profile.teacherId ?? profile.uid,
        referredByName: profile.displayName,
        referredDate: new Date().toISOString().slice(0, 10),
        targetWork,
        targetWorkLabel: TARGET_WORK_LABEL[targetWork],
        reason,
        priority,
      });
      showToast('ส่งต่อผู้เรียนสำเร็จ');
      navigate('/students');
    } catch {
      showToast('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">ส่งต่อผู้เรียน</h1>
        <p className="text-sm text-gray-500">{studentDisplayName(student)}</p>
      </div>

      {(screening || latestVisit) && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">ข้อมูลอ้างอิง</h2>
          <div className="flex flex-wrap gap-2 text-sm text-gray-600">
            {screening && (
              <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5">
                ผลคัดกรองล่าสุด: <GroupBadge group={screening.resultGroup} label={RESULT_GROUP_LABEL[screening.resultGroup]} />
              </div>
            )}
            {latestVisit && (
              <div className="rounded-lg bg-gray-50 px-3 py-1.5">เยี่ยมบ้านล่าสุด: {latestVisit.visitDate}</div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white px-4 sm:px-5">
        <Section title="รายละเอียดการส่งต่อ">
          <Field label="ส่งต่อไปยัง" required>
            <Select value={targetWork} onChange={(e) => setTargetWork(e.target.value as TargetWork)}>
              {(Object.keys(TARGET_WORK_LABEL) as TargetWork[]).map((tw) => (
                <option key={tw} value={tw}>
                  {TARGET_WORK_LABEL[tw]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="ระดับความเร่งด่วน" required>
            <Select value={priority} onChange={(e) => setPriority(e.target.value as ReferralPriority)}>
              {(Object.keys(REFERRAL_PRIORITY_LABEL) as ReferralPriority[]).map((p) => (
                <option key={p} value={p}>
                  {REFERRAL_PRIORITY_LABEL[p]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="เหตุผลการส่งต่อ" required>
            <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ระบุเหตุผลและรายละเอียดที่เกี่ยวข้อง" />
          </Field>
        </Section>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          ยกเลิก
        </Button>
        <Button variant="primary" loading={saving} onClick={handleSubmit}>
          ส่งต่อผู้เรียน
        </Button>
      </div>
    </div>
  );
}
