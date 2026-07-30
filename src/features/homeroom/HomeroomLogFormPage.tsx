import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchStudentsByClasses, fetchAllTeachers, studentDisplayName } from '../students/api';
import { fetchHomeroomLogById, createHomeroomLog, updateHomeroomLog } from './api';
import { fetchSignatorySettings } from '../settings/api';
import { uploadHomeroomLogImage } from '../../lib/storage';
import type { AbsentStudentEntry } from '../../types';
import { LoadingState, ErrorState, EmptyState, Spinner } from '../../components/ui/States';
import { Section, Field, Input, Textarea, Select, Button, Checkbox } from '../../components/ui/Form';
import { TeacherCombobox } from '../../components/ui/TeacherCombobox';
import { useToast } from '../../components/ui/Toast';

export default function HomeroomLogFormPage() {
  const { logId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const isEdit = !!logId;

  const [classId, setClassId] = useState('');
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sessionNumber, setSessionNumber] = useState('');
  const [semester, setSemester] = useState('1');
  const [academicYear, setAcademicYear] = useState(() => String(new Date().getFullYear() + 543));
  const [docNumber, setDocNumber] = useState('');
  const [absentIds, setAbsentIds] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [deptHeadName, setDeptHeadName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, loading, error } = useAsync(async () => {
    const existing = isEdit ? await fetchHomeroomLogById(logId!) : null;
    // Always include the log's own class in the roster fetch, even if it's
    // since dropped from the teacher's current classIds (e.g. semester change).
    const classCodes = new Set(profile?.classIds ?? []);
    if (existing) classCodes.add(existing.classId);
    const roster = await fetchStudentsByClasses(Array.from(classCodes));
    return { roster, existing };
  }, [logId, isEdit, profile?.uid]);

  const { data: teachers } = useAsync(fetchAllTeachers, []);

  useEffect(() => {
    if (data?.existing) {
      const log = data.existing;
      setClassId(log.classId);
      setSessionDate(log.sessionDate);
      setSessionNumber(log.sessionNumber);
      setSemester(log.semester);
      setAcademicYear(log.academicYear);
      setDocNumber(log.docNumber);
      setAbsentIds(new Set(log.absentStudents.map((s) => s.studentId)));
      setDetail(log.detail);
      setImages(log.images);
      setDeptHeadName(log.deptHeadName);
    }
  }, [data]);

  // ผู้ลงนาม 2 ตำแหน่งนี้เปลี่ยนบ่อย จึงดึงจากการตั้งค่ากลาง (ตั้งค่า > ตั้งค่าชื่อผู้ลงนาม)
  // ตามปีการศึกษา/ภาคเรียนที่เลือก แทนการให้ครูพิมพ์เอง — ถ้ายังไม่มีการตั้งค่าไว้
  // สำหรับช่วงนั้น จะใช้ชื่อที่เคยบันทึกไว้ในบันทึกนี้เป็นค่าสำรอง (สำหรับบันทึกเก่าก่อนมีฟีเจอร์นี้)
  const { data: signatorySettings } = useAsync(
    () => fetchSignatorySettings(academicYear, semester),
    [academicYear, semester],
  );
  const advisorHeadName = signatorySettings?.advisorHeadName || data?.existing?.advisorHeadName || '';
  const deputyDirectorName = signatorySettings?.deputyDirectorName || data?.existing?.deputyDirectorName || '';

  const classOptions = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { classId: string; className: string; departmentId: string; departmentName: string }>();
    for (const s of data.roster) {
      if (!map.has(s.class_code)) {
        map.set(s.class_code, {
          classId: s.class_code,
          className: s.class_name ?? s.class_code,
          departmentId: s.dep_id ?? '',
          departmentName: s.dep_name ?? '',
        });
      }
    }
    return Array.from(map.values());
  }, [data]);

  useEffect(() => {
    if (!classId && classOptions.length > 0) setClassId(classOptions[0].classId);
  }, [classOptions, classId]);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState />;
  if (isEdit && !data.existing) return <ErrorState title="ไม่พบบันทึกกิจกรรมโฮมรูมนี้" description="" />;
  if (classOptions.length === 0) {
    return (
      <EmptyState
        title="ยังไม่ได้กำหนดกลุ่มเรียนที่ดูแล"
        description="ไปที่เมนู “กลุ่มเรียนของฉัน” เพื่อเลือกกลุ่มเรียนก่อนบันทึกกิจกรรมโฮมรูม"
        action={
          <Link
            to="/my-classes"
            className="mt-2 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
          >
            ไปที่กลุ่มเรียนของฉัน
          </Link>
        }
      />
    );
  }

  const selectedClass = classOptions.find((c) => c.classId === classId) ?? classOptions[0];
  const roster = data.roster.filter((s) => s.class_code === selectedClass.classId);
  const totalStudents = roster.length;
  const absentCount = roster.filter((s) => absentIds.has(s.sid)).length;
  const presentCount = totalStudents - absentCount;

  function toggleAbsent(sid: string) {
    setAbsentIds((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  }

  async function handlePhotoUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls = await Promise.all(Array.from(files).map((f) => uploadHomeroomLogImage(f, selectedClass.classId)));
      setImages((prev) => [...prev, ...urls]);
    } catch {
      showToast('อัปโหลดรูปภาพไม่สำเร็จ', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      const absentStudents: AbsentStudentEntry[] = roster
        .filter((s) => absentIds.has(s.sid))
        .map((s) => ({ studentId: s.sid, studentName: studentDisplayName(s) }));

      const payload = {
        classId: selectedClass.classId,
        className: selectedClass.className,
        departmentId: selectedClass.departmentId,
        departmentName: selectedClass.departmentName,
        advisorTeacherId: data!.existing?.advisorTeacherId ?? profile.teacherId ?? profile.uid,
        advisorTeacherName: data!.existing?.advisorTeacherName ?? profile.displayName,
        academicYear,
        semester,
        sessionNumber,
        sessionDate,
        docNumber,
        totalStudents,
        absentStudents,
        detail,
        images,
        deptHeadName,
        advisorHeadName,
        deputyDirectorName,
        status: 'submitted' as const,
        createdBy: data!.existing?.createdBy ?? profile.uid,
      };

      if (isEdit && logId) {
        await updateHomeroomLog(logId, payload);
        showToast('บันทึกกิจกรรมโฮมรูมสำเร็จ');
      } else {
        await createHomeroomLog(payload);
        showToast('บันทึกกิจกรรมโฮมรูมสำเร็จ');
      }
      navigate('/homeroom');
    } catch {
      showToast('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">บันทึกกิจกรรมโฮมรูม</h1>
        <p className="text-sm text-gray-500">บันทึกการพบนักเรียนในคาบโฮมรูม พร้อมพิมพ์เป็นบันทึกข้อความได้</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white px-4 sm:px-5">
        <Section title="ข้อมูลการพบนักเรียน">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {classOptions.length > 1 ? (
              <Field label="กลุ่มเรียน" required>
                <Select value={classId} onChange={(e) => setClassId(e.target.value)} disabled={isEdit}>
                  {classOptions.map((c) => (
                    <option key={c.classId} value={c.classId}>
                      {c.className}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
              <Field label="กลุ่มเรียน">
                <Input value={selectedClass.className} disabled />
              </Field>
            )}
            <Field label="วันที่พบนักเรียน" required>
              <Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
            </Field>
            <Field label="ครั้งที่" required>
              <Input value={sessionNumber} onChange={(e) => setSessionNumber(e.target.value)} placeholder="เช่น 10" />
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
            <Field label="ที่ (เลขที่หนังสือ)" hint="เว้นว่างได้ หากยังไม่ได้ลงเลขที่หนังสือ">
              <Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section
          title="รายชื่อนักเรียน"
          description={`นักเรียนทั้งหมด ${totalStudents} คน — มาพบ ${presentCount} คน ขาด ${absentCount} คน (ติ๊กชื่อนักเรียนที่ขาด)`}
        >
          <div className="max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
            {roster.map((s) => (
              <div key={s.sid} className="px-3">
                <Checkbox label={studentDisplayName(s)} checked={absentIds.has(s.sid)} onChange={() => toggleAbsent(s.sid)} />
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="รายละเอียดการดูแลและให้คำปรึกษา"
          description="เรื่องที่ปรึกษา / คำแนะนำ / ปัญหาที่พบและการแก้ไข การแต่งกาย การมาเรียน"
        >
          <Textarea rows={4} value={detail} onChange={(e) => setDetail(e.target.value)} />
        </Section>

        <Section title="ภาพประกอบ" description="ภาพกิจกรรมการพบนักเรียนในคาบโฮมรูม">
          <div className="flex flex-wrap gap-2">
            {images.map((url) => (
              <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((u) => u !== url))}
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handlePhotoUpload(e.target.files)}
            />
          </div>
        </Section>

        <Section title="ผู้ลงนาม" description="หัวหน้าแผนกวิชากรอกเอง ส่วนอีก 2 ตำแหน่งดึงจากเมนู “ตั้งค่า” ตามภาคเรียน/ปีการศึกษาที่เลือกไว้ด้านบน">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="หัวหน้าแผนกวิชา">
              <TeacherCombobox teachers={teachers ?? []} value={deptHeadName} onChange={setDeptHeadName} />
            </Field>
            <Field label="หัวหน้างานครูที่ปรึกษาและการแนะแนว">
              <Input value={advisorHeadName} disabled placeholder="ยังไม่ได้ตั้งค่าสำหรับภาคเรียนนี้" />
            </Field>
            <Field label="รองผู้อำนวยการฝ่ายกิจการนักเรียนนักศึกษา">
              <Input value={deputyDirectorName} disabled placeholder="ยังไม่ได้ตั้งค่าสำหรับภาคเรียนนี้" />
            </Field>
          </div>
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-6xl justify-end gap-2">
          <Button variant="primary" loading={saving} disabled={!sessionNumber} onClick={handleSave}>
            บันทึก
          </Button>
        </div>
      </div>
    </div>
  );
}
