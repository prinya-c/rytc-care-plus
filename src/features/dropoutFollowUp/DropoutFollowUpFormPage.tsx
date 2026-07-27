import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchAllStudents, fetchStudentsByClasses, fetchStudentByStudentId, studentDisplayName } from '../students/api';
import { fetchDropoutFollowUpById, createDropoutFollowUp, updateDropoutFollowUp } from './api';
import { uploadDropoutFollowUpImage } from '../../lib/storage';
import { canViewCollegeOverview } from '../../utils/rbac';
import type { ContactChannels } from '../../types';
import { LoadingState, ErrorState, Spinner } from '../../components/ui/States';
import { Section, Field, Input, Textarea, Select, Button, Checkbox, Radio } from '../../components/ui/Form';
import { useToast } from '../../components/ui/Toast';

export const emptyContactChannels: ContactChannels = {
  phone: false,
  line: false,
  homeVisit: false,
  other: false,
  otherDetail: '',
};

function ContactChannelsFields({ value, onChange }: { value: ContactChannels; onChange: (next: ContactChannels) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <Checkbox label="โทรศัพท์" checked={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.checked })} />
        <Checkbox label="Line" checked={value.line} onChange={(e) => onChange({ ...value, line: e.target.checked })} />
        <Checkbox label="ไปพบที่บ้าน" checked={value.homeVisit} onChange={(e) => onChange({ ...value, homeVisit: e.target.checked })} />
        <Checkbox label="อื่นๆ" checked={value.other} onChange={(e) => onChange({ ...value, other: e.target.checked })} />
      </div>
      {value.other && (
        <Input
          value={value.otherDetail}
          onChange={(e) => onChange({ ...value, otherDetail: e.target.value })}
          placeholder="ระบุช่องทางอื่นๆ"
        />
      )}
    </div>
  );
}

function EvidenceImages({
  images,
  onChange,
  uploading,
  onUpload,
}: {
  images: string[];
  onChange: (next: string[]) => void;
  uploading: boolean;
  onUpload: (files: FileList | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap gap-2">
      {images.map((url) => (
        <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200">
          <img src={url} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(images.filter((u) => u !== url))}
            className="absolute right-0.5 top-0.5 rounded-full bg-black/50 p-0.5 text-white"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-brand-400 hover:text-brand-500"
      >
        {uploading ? <Spinner className="h-5 w-5" /> : '+'}
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} />
    </div>
  );
}

export default function DropoutFollowUpFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const overview = canViewCollegeOverview(profile?.role);
  const isEdit = !!id;

  const [studentId, setStudentId] = useState('');
  const [recordDate, setRecordDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [absentDays, setAbsentDays] = useState('');
  const [absentReason, setAbsentReason] = useState('');
  const [studentContactChannels, setStudentContactChannels] = useState<ContactChannels>(emptyContactChannels);
  const [studentContactEvidence, setStudentContactEvidence] = useState<string[]>([]);
  const [parentContactChannels, setParentContactChannels] = useState<ContactChannels>(emptyContactChannels);
  const [parentContactEvidence, setParentContactEvidence] = useState<string[]>([]);
  const [followUpSummary, setFollowUpSummary] = useState('');
  const [followUpResult, setFollowUpResult] = useState('');
  const [uploadingStudentEvidence, setUploadingStudentEvidence] = useState(false);
  const [uploadingParentEvidence, setUploadingParentEvidence] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data, loading, error } = useAsync(async () => {
    const existing = isEdit ? await fetchDropoutFollowUpById(id!) : null;
    const roster = overview ? await fetchAllStudents() : await fetchStudentsByClasses(profile?.classIds ?? []);
    // Keep the record's own student selectable even if they've since left the teacher's current roster.
    if (existing && !roster.some((s) => s.sid === existing.studentId)) {
      const missing = await fetchStudentByStudentId(existing.studentId);
      if (missing) roster.push(missing);
    }
    return { roster, existing };
  }, [id, isEdit, overview, profile?.uid, JSON.stringify(profile?.classIds)]);

  useEffect(() => {
    if (data?.existing) {
      const record = data.existing;
      setStudentId(record.studentId);
      setRecordDate(record.recordDate);
      setAbsentDays(record.absentDays);
      setAbsentReason(record.absentReason);
      setStudentContactChannels(record.studentContactChannels);
      setStudentContactEvidence(record.studentContactEvidence);
      setParentContactChannels(record.parentContactChannels);
      setParentContactEvidence(record.parentContactEvidence);
      setFollowUpSummary(record.followUpSummary);
      setFollowUpResult(record.followUpResult);
    }
  }, [data]);

  useEffect(() => {
    if (!studentId && data && data.roster.length > 0) setStudentId(data.roster[0].sid);
  }, [data, studentId]);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState />;
  if (isEdit && !data.existing) return <ErrorState title="ไม่พบบันทึกนี้" description="" />;

  const existing = data.existing;
  const selectedStudent = data.roster.find((s) => s.sid === studentId);

  async function handleStudentEvidenceUpload(files: FileList | null) {
    if (!files || files.length === 0 || !studentId) return;
    setUploadingStudentEvidence(true);
    try {
      const urls = await Promise.all(Array.from(files).map((f) => uploadDropoutFollowUpImage(f, studentId)));
      setStudentContactEvidence((prev) => [...prev, ...urls]);
    } catch {
      showToast('อัปโหลดรูปภาพไม่สำเร็จ', 'error');
    } finally {
      setUploadingStudentEvidence(false);
    }
  }

  async function handleParentEvidenceUpload(files: FileList | null) {
    if (!files || files.length === 0 || !studentId) return;
    setUploadingParentEvidence(true);
    try {
      const urls = await Promise.all(Array.from(files).map((f) => uploadDropoutFollowUpImage(f, studentId)));
      setParentContactEvidence((prev) => [...prev, ...urls]);
    } catch {
      showToast('อัปโหลดรูปภาพไม่สำเร็จ', 'error');
    } finally {
      setUploadingParentEvidence(false);
    }
  }

  async function handleSave() {
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
        advisorTeacherId: existing?.advisorTeacherId ?? profile.teacherId ?? profile.uid,
        advisorTeacherName: existing?.advisorTeacherName ?? profile.displayName,
        recordDate,
        absentDays,
        absentReason,
        studentContactChannels,
        studentContactEvidence,
        parentContactChannels,
        parentContactEvidence,
        followUpSummary,
        followUpResult,
        status: 'submitted' as const,
        createdBy: existing?.createdBy ?? profile.uid,
      };

      if (isEdit && id) {
        await updateDropoutFollowUp(id, payload);
      } else {
        await createDropoutFollowUp(payload);
      }
      showToast('บันทึกข้อมูลการติดตามผู้เรียนสำเร็จ');
      navigate('/dropout-follow-up');
    } catch {
      showToast('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">การติดตามผู้เรียนเพื่อแก้ปัญหาออกกลางคัน</h1>
        <p className="text-sm text-gray-500">บันทึกการติดตามผู้เรียนที่ขาดเรียน พร้อมช่องทางและหลักฐานการติดต่อ</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white px-4 sm:px-5">
        <Section title="ผู้เรียน">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="ชื่อนักเรียน" required>
              <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={isEdit}>
                {data.roster.map((s) => (
                  <option key={s.sid} value={s.sid}>
                    {studentDisplayName(s)} — {s.class_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="วันที่บันทึก" required>
              <Input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="1. ผู้เรียนขาดเรียนทั้งสิ้น">
          <Field label="จำนวนวัน">
            <Input value={absentDays} onChange={(e) => setAbsentDays(e.target.value)} className="max-w-[10rem]" placeholder="เช่น 5" />
          </Field>
        </Section>

        <Section title="2. สาเหตุที่ขาดเรียน">
          <Textarea rows={2} value={absentReason} onChange={(e) => setAbsentReason(e.target.value)} />
        </Section>

        <Section title="3. ครูที่ปรึกษาได้ติดตามผู้เรียนผ่านช่องทาง" description="เลือกได้หลายข้อ">
          <ContactChannelsFields value={studentContactChannels} onChange={setStudentContactChannels} />
        </Section>

        <Section title="4. หลักฐานในการติดตามผู้เรียน" description="แนบภาพประกอบการติดตาม">
          <EvidenceImages
            images={studentContactEvidence}
            onChange={setStudentContactEvidence}
            uploading={uploadingStudentEvidence}
            onUpload={handleStudentEvidenceUpload}
          />
        </Section>

        <Section title="5. ครูที่ปรึกษาได้ติดต่อผู้ปกครองผ่านช่องทาง" description="เลือกได้หลายข้อ">
          <ContactChannelsFields value={parentContactChannels} onChange={setParentContactChannels} />
        </Section>

        <Section title="6. หลักฐานในการติดต่อผู้ปกครอง" description="แนบภาพประกอบการติดต่อ">
          <EvidenceImages
            images={parentContactEvidence}
            onChange={setParentContactEvidence}
            uploading={uploadingParentEvidence}
            onUpload={handleParentEvidenceUpload}
          />
        </Section>

        <Section title="7. สรุปผลการติดตามผู้เรียน">
          <Textarea rows={3} value={followUpSummary} onChange={(e) => setFollowUpSummary(e.target.value)} />
        </Section>

        <Section title="8. ผลการติดตาม">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <Radio
              label="ติดตามผู้เรียนสำเร็จ"
              name="followUpResult"
              checked={followUpResult === 'ติดตามผู้เรียนสำเร็จ'}
              onChange={() => setFollowUpResult('ติดตามผู้เรียนสำเร็จ')}
            />
            <Radio
              label="ติดตามผู้เรียนไม่สำเร็จ"
              name="followUpResult"
              checked={followUpResult === 'ติดตามผู้เรียนไม่สำเร็จ'}
              onChange={() => setFollowUpResult('ติดตามผู้เรียนไม่สำเร็จ')}
            />
          </div>
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-6xl justify-end gap-2">
          <Button variant="primary" loading={saving} disabled={!studentId} onClick={handleSave}>
            บันทึกข้อมูล
          </Button>
        </div>
      </div>
    </div>
  );
}
