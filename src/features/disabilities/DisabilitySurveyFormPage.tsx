import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchAllStudents, fetchStudentsByClasses, fetchStudentByStudentId, studentDisplayName } from '../students/api';
import { fetchHomeVisitsByStudent } from '../homeVisits/api';
import {
  fetchDisabilitySurveyById,
  fetchDisabilitySurveysByStudent,
  createDisabilitySurvey,
  updateDisabilitySurvey,
} from './api';
import { uploadDisabilityPhoto } from '../../lib/storage';
import { calculateAge } from '../../utils/age';
import { ThaiAddressFields } from '../homeVisits/ThaiAddressFields';
import { canViewCollegeOverview } from '../../utils/rbac';
import { DISABILITY_TYPE_LABEL, DISABILITY_TYPE_ORDER } from '../../types';
import type { AssistiveNeeds, DisabilitySurvey, DisabilityTypes } from '../../types';
import { LoadingState, ErrorState, Spinner } from '../../components/ui/States';
import { Section, Field, Input, Textarea, Select, Button, Checkbox, Radio } from '../../components/ui/Form';
import { useToast } from '../../components/ui/Toast';

const currentAcademicYear = String(new Date().getFullYear() + 543);

const emptyDisabilityTypes: DisabilityTypes = {
  visual: false,
  hearing: false,
  physical: false,
  mental: false,
  intellectual: false,
  learning: false,
  autism: false,
};

const emptyAssistiveNeeds: AssistiveNeeds = {
  sameAsRegular: false,
  brailleNote: false,
  brailleLevel: false,
  brailleLevelDetail: '',
  hearingAid: false,
  signLanguage: false,
  audioReaderOrTabPlayer: false,
  mp3Player: false,
  portableCctv: false,
  zoomText: false,
  computerProgram: false,
  computerProgramDetail: '',
  other: false,
  otherDetail: '',
};

type FormData = Omit<
  DisabilitySurvey,
  'id' | 'studentId' | 'studentName' | 'classId' | 'className' | 'departmentId' | 'departmentName' |
  'advisorTeacherId' | 'advisorTeacherName' | 'status' | 'createdBy' | 'createdAt' | 'updatedAt'
>;

const emptyForm: FormData = {
  academicYear: currentAcademicYear,
  semester: '1',
  citizenId: '',
  religion: '',
  birthDate: '',
  age: '',
  houseNumber: '',
  moo: '',
  villageName: '',
  soi: '',
  road: '',
  subdistrict: '',
  district: '',
  province: '',
  postalCode: '',
  phone: '',
  mobile: '',
  fax: '',
  email: '',
  guardianName: '',
  guardianAddress: '',
  guardianPhone: '',
  photoUrl: '',
  disabilityRegistrationNumber: '',
  disabilityExpiryDate: '',
  disabilityTypes: emptyDisabilityTypes,
  priorEducationLevel: '',
  priorSchoolName: '',
  priorSchoolProvince: '',
  priorSchoolDistrict: '',
  referenceTeacherName: '',
  referenceTeacherPosition: '',
  referenceTeacherPhone: '',
  studyFormat: '',
  currentLevel: '',
  currentLevelYear: '',
  major: '',
  curriculum: '',
  hasChronicDisease: false,
  chronicDiseaseDetail: '',
  doctorVisitFrequency: '',
  assistiveNeeds: emptyAssistiveNeeds,
  neededSupportDetail: '',
  hasOtherScholarship: false,
  otherScholarshipDetail: '',
  wantsSubsidy: false,
  subsidyWaiveOption: '',
};

/** Pulls just the form-editable fields back out of a saved record (edit mode, or re-using a student's previous survey). */
function recordToForm(record: DisabilitySurvey): FormData {
  const { id, studentId, studentName, classId, className, departmentId, departmentName, advisorTeacherId, advisorTeacherName, status, createdBy, createdAt, updatedAt, ...rest } = record;
  void id; void studentId; void studentName; void classId; void className; void departmentId; void departmentName;
  void advisorTeacherId; void advisorTeacherName; void status; void createdBy; void createdAt; void updatedAt;
  return rest;
}

export default function DisabilitySurveyFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const overview = canViewCollegeOverview(profile?.role);
  const isEdit = !!id;

  const [studentId, setStudentId] = useState('');
  const [form, setForm] = useState<FormData>(emptyForm);
  const [prefilling, setPrefilling] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const { data, loading, error } = useAsync(async () => {
    const existing = isEdit ? await fetchDisabilitySurveyById(id!) : null;
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
      setStudentId(data.existing.studentId);
      setForm(recordToForm(data.existing));
    }
  }, [data]);

  // New record: when a student is picked, prefer that student's own previous
  // survey (ทุกส่วนคงเดิม — ข้อมูลความพิการไม่ค่อยเปลี่ยน) — otherwise fall back to
  // whatever ข้อมูลผู้เรียน (StudentInfo/FamilyInfo, saved via home-visits) already
  // exists for ส่วนที่ 1 only. Sections 2-10 stay blank when neither exists.
  useEffect(() => {
    if (isEdit || !studentId) return;
    let cancelled = false;
    setPrefilling(true);
    (async () => {
      const prior = await fetchDisabilitySurveysByStudent(studentId);
      if (cancelled) return;
      if (prior[0]) {
        setForm(recordToForm(prior[0]));
        setPrefilling(false);
        return;
      }
      const [visits, student] = await Promise.all([fetchHomeVisitsByStudent(studentId), fetchStudentByStudentId(studentId)]);
      if (cancelled) return;
      const visit = visits[0];
      const age = visit ? calculateAge(visit.studentInfo.birthDate) : { years: '' };
      setForm({
        ...emptyForm,
        citizenId: visit?.studentInfo.citizenId || student?.sidcard || '',
        birthDate: visit?.studentInfo.birthDate || '',
        age: age.years,
        houseNumber: visit?.studentInfo.houseNumber || '',
        moo: visit?.studentInfo.moo || '',
        soi: visit?.studentInfo.soi || '',
        road: visit?.studentInfo.road || '',
        subdistrict: visit?.studentInfo.subdistrict || '',
        district: visit?.studentInfo.district || '',
        province: visit?.studentInfo.province || '',
        postalCode: visit?.studentInfo.postalCode || '',
        phone: visit?.studentInfo.phone || '',
        email: visit?.studentInfo.email || '',
        guardianName:
          visit?.familyInfo.currentGuardian ||
          [visit?.familyInfo.fatherName, visit?.familyInfo.motherName].filter(Boolean).join(' / '),
        guardianPhone: visit?.familyInfo.emergencyContactPhone || visit?.familyInfo.fatherPhone || visit?.familyInfo.motherPhone || '',
      });
      setPrefilling(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId, isEdit]);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState />;
  if (isEdit && !data.existing) return <ErrorState title="ไม่พบแบบสำรวจนี้" description="" />;

  const existing = data.existing;
  const selectedStudent = data.roster.find((s) => s.sid === studentId);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleDisabilityType(key: keyof DisabilityTypes) {
    setForm((prev) => ({ ...prev, disabilityTypes: { ...prev.disabilityTypes, [key]: !prev.disabilityTypes[key] } }));
  }

  function setAssistive<K extends keyof AssistiveNeeds>(key: K, value: AssistiveNeeds[K]) {
    setForm((prev) => ({ ...prev, assistiveNeeds: { ...prev.assistiveNeeds, [key]: value } }));
  }

  async function handlePhotoUpload(files: FileList | null) {
    const file = files?.[0];
    if (!file || !studentId) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadDisabilityPhoto(file, studentId);
      set('photoUrl', url);
    } catch {
      showToast('อัปโหลดรูปภาพไม่สำเร็จ', 'error');
    } finally {
      setUploadingPhoto(false);
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
        ...form,
        status: 'submitted' as const,
        createdBy: existing?.createdBy ?? profile.uid,
      };

      if (isEdit && id) {
        await updateDisabilitySurvey(id, payload);
      } else {
        await createDisabilitySurvey(payload);
      }
      showToast('บันทึกข้อมูลผู้เรียนพิการสำเร็จ');
      navigate('/disabilities');
    } catch {
      showToast('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">แบบสำรวจข้อมูลผู้เรียนพิการ</h1>
        <p className="text-sm text-gray-500">กรอกรายละเอียดให้ครบทุกส่วนตามความเป็นจริงก่อนบันทึก</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white px-4 sm:px-5">
        <Section title="ผู้เรียน">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="ชื่อนักเรียน" required>
              <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={isEdit}>
                <option value="">โปรดเลือก</option>
                {data.roster.map((s) => (
                  <option key={s.sid} value={s.sid}>
                    {studentDisplayName(s)} — {s.class_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="ภาคเรียนที่">
              <Select value={form.semester} onChange={(e) => set('semester', e.target.value)}>
                <option value="1">ภาคเรียนที่ 1</option>
                <option value="2">ภาคเรียนที่ 2</option>
              </Select>
            </Field>
            <Field label="ประจำปีการศึกษา">
              <Input value={form.academicYear} onChange={(e) => set('academicYear', e.target.value)} />
            </Field>
          </div>
          {prefilling && <p className="mt-2 text-xs text-gray-400">กำลังโหลดข้อมูลเดิมของผู้เรียนคนนี้...</p>}
        </Section>

        <Section title="1. ข้อมูลทั่วไป" description="ระบบเติมข้อมูลที่เคยบันทึกไว้ให้อัตโนมัติเมื่อเลือกผู้เรียน แก้ไขเพิ่มเติมได้">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="เลขบัตรประจำตัวประชาชน 13 หลัก">
              <Input value={form.citizenId} onChange={(e) => set('citizenId', e.target.value)} />
            </Field>
            <Field label="ศาสนา">
              <Input value={form.religion} onChange={(e) => set('religion', e.target.value)} />
            </Field>
            <Field label="วันเดือนปีเกิด">
              <Input
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm((prev) => ({ ...prev, birthDate: e.target.value, age: calculateAge(e.target.value).years }))}
              />
            </Field>
            <Field label="อายุ" hint="คำนวณจากวันเกิดโดยอัตโนมัติ">
              <div className="flex items-center gap-2">
                <Input value={form.age} disabled className="bg-gray-50 text-gray-500" />
                <span className="shrink-0 text-sm text-gray-500">ปี</span>
              </div>
            </Field>
          </div>

          <p className="mt-4 text-sm font-medium text-gray-700">ที่อยู่ปัจจุบันที่ติดต่อได้</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="บ้านเลขที่">
              <Input value={form.houseNumber} onChange={(e) => set('houseNumber', e.target.value)} />
            </Field>
            <Field label="หมู่ที่">
              <Input value={form.moo} onChange={(e) => set('moo', e.target.value)} />
            </Field>
            <Field label="หมู่บ้าน">
              <Input value={form.villageName} onChange={(e) => set('villageName', e.target.value)} />
            </Field>
            <Field label="ซอย">
              <Input value={form.soi} onChange={(e) => set('soi', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="ถนน">
              <Input value={form.road} onChange={(e) => set('road', e.target.value)} />
            </Field>
          </div>
          <ThaiAddressFields
            value={{ postalCode: form.postalCode, province: form.province, district: form.district, subdistrict: form.subdistrict }}
            onChange={(next) => setForm((prev) => ({ ...prev, ...next }))}
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="โทรศัพท์">
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="โทรศัพท์มือถือ">
              <Input value={form.mobile} onChange={(e) => set('mobile', e.target.value)} />
            </Field>
            <Field label="โทรสาร">
              <Input value={form.fax} onChange={(e) => set('fax', e.target.value)} />
            </Field>
            <Field label="E-Mail">
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
          </div>

          <p className="mt-4 text-sm font-medium text-gray-700">บิดา / มารดา / ผู้ปกครอง / ผู้ดูแล</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="ชื่อบิดา / มารดา / ผู้ปกครอง / ผู้ดูแล">
              <Input value={form.guardianName} onChange={(e) => set('guardianName', e.target.value)} />
            </Field>
            <Field label="ที่อยู่ปัจจุบัน">
              <Input value={form.guardianAddress} onChange={(e) => set('guardianAddress', e.target.value)} />
            </Field>
            <Field label="โทรศัพท์">
              <Input value={form.guardianPhone} onChange={(e) => set('guardianPhone', e.target.value)} />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="รูปถ่ายขนาด 1 นิ้ว" hint="ไม่บังคับ">
              <div className="flex items-center gap-3">
                {form.photoUrl && (
                  <img src={form.photoUrl} alt="" className="h-16 w-16 rounded-lg border border-gray-200 object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={!studentId}
                  className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-brand-400 hover:text-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploadingPhoto ? <Spinner className="h-5 w-5" /> : '+'}
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhotoUpload(e.target.files)}
                />
              </div>
            </Field>
          </div>
        </Section>

        <Section title="2. ข้อมูลความพิการ">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="ทะเบียนคนพิการเลขที่">
              <Input value={form.disabilityRegistrationNumber} onChange={(e) => set('disabilityRegistrationNumber', e.target.value)} />
            </Field>
            <Field label="หมดอายุวันที่">
              <Input type="date" value={form.disabilityExpiryDate} onChange={(e) => set('disabilityExpiryDate', e.target.value)} />
            </Field>
          </div>
          <p className="mt-3 text-sm font-medium text-gray-700">ประเภทความพิการ (เลือกได้หลายข้อ)</p>
          <div className="mt-1 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            {DISABILITY_TYPE_ORDER.map((key) => (
              <Checkbox key={key} label={DISABILITY_TYPE_LABEL[key]} checked={form.disabilityTypes[key]} onChange={() => toggleDisabilityType(key)} />
            ))}
          </div>
        </Section>

        <Section title="3. ประวัติการศึกษา (เดิม)">
          <p className="text-sm font-medium text-gray-700">วุฒิการศึกษาที่ใช้ในการสมัคร</p>
          <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1">
            {['ม.3', 'ม.6', 'ปวช.', 'ปวส.'].map((opt) => (
              <Radio
                key={opt}
                label={opt}
                name="priorEducationLevel"
                checked={form.priorEducationLevel === opt}
                onChange={() => set('priorEducationLevel', opt)}
              />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="ชื่อสถานศึกษา">
              <Input value={form.priorSchoolName} onChange={(e) => set('priorSchoolName', e.target.value)} />
            </Field>
            <Field label="จังหวัด">
              <Input value={form.priorSchoolProvince} onChange={(e) => set('priorSchoolProvince', e.target.value)} />
            </Field>
            <Field label="เขต/อำเภอ">
              <Input value={form.priorSchoolDistrict} onChange={(e) => set('priorSchoolDistrict', e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="4. ครู/อาจารย์ที่อ้างอิงได้ (สถานศึกษาเดิม)">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="ชื่อ-นามสกุล">
              <Input value={form.referenceTeacherName} onChange={(e) => set('referenceTeacherName', e.target.value)} />
            </Field>
            <Field label="ตำแหน่ง">
              <Input value={form.referenceTeacherPosition} onChange={(e) => set('referenceTeacherPosition', e.target.value)} />
            </Field>
            <Field label="โทรศัพท์">
              <Input value={form.referenceTeacherPhone} onChange={(e) => set('referenceTeacherPhone', e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="5. สถานศึกษาปัจจุบัน">
          <p className="text-sm font-medium text-gray-700">รูปแบบการจัดการศึกษา</p>
          <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1">
            {['ในเวลาปกติ', 'นอกเวลา (ภาคสมทบ)', 'ทวิภาคี'].map((opt) => (
              <Radio key={opt} label={opt} name="studyFormat" checked={form.studyFormat === opt} onChange={() => set('studyFormat', opt)} />
            ))}
          </div>
          <p className="mt-3 text-sm font-medium text-gray-700">ระดับชั้น</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-1">
            {['ปวช.', 'ปวส.', 'ปริญญาตรีสายเทคโนโลยีหรือสายปฏิบัติการ'].map((opt) => (
              <Radio key={opt} label={opt} name="currentLevel" checked={form.currentLevel === opt} onChange={() => set('currentLevel', opt)} />
            ))}
            <Input
              value={form.currentLevelYear}
              onChange={(e) => set('currentLevelYear', e.target.value)}
              placeholder="ปีที่"
              className="max-w-[6rem]"
            />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="สาขาวิชา">
              <Input value={form.major} onChange={(e) => set('major', e.target.value)} />
            </Field>
            <Field label="หลักสูตร">
              <Input value={form.curriculum} onChange={(e) => set('curriculum', e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="6. ประวัติสุขภาพ">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <Radio label="มีโรคประจำตัว" name="hasChronicDisease" checked={form.hasChronicDisease} onChange={() => set('hasChronicDisease', true)} />
            <Radio label="ไม่มีโรคประจำตัว" name="hasChronicDisease" checked={!form.hasChronicDisease} onChange={() => set('hasChronicDisease', false)} />
          </div>
          {form.hasChronicDisease && (
            <Input
              className="mt-2"
              value={form.chronicDiseaseDetail}
              onChange={(e) => set('chronicDiseaseDetail', e.target.value)}
              placeholder="ระบุโรคประจำตัว"
            />
          )}
          <p className="mt-3 text-sm font-medium text-gray-700">การพบแพทย์</p>
          <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1">
            <Radio
              label="พบแพทย์ทุกเดือน"
              name="doctorVisitFrequency"
              checked={form.doctorVisitFrequency === 'monthly'}
              onChange={() => set('doctorVisitFrequency', 'monthly')}
            />
            <Radio
              label="พบแพทย์ตามนัด (มากกว่า 2 เดือน)"
              name="doctorVisitFrequency"
              checked={form.doctorVisitFrequency === 'as_appointed'}
              onChange={() => set('doctorVisitFrequency', 'as_appointed')}
            />
            <Radio
              label="ไม่ได้พบแพทย์ประจำ"
              name="doctorVisitFrequency"
              checked={form.doctorVisitFrequency === 'none'}
              onChange={() => set('doctorVisitFrequency', 'none')}
            />
          </div>
        </Section>

        <Section title="7. ความสามารถในการศึกษาและการใช้อุปกรณ์ช่วยศึกษา" description="เลือกได้หลายข้อ">
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            <Checkbox label="เช่นเดียวกับนักศึกษาทั่วไป" checked={form.assistiveNeeds.sameAsRegular} onChange={(e) => setAssistive('sameAsRegular', e.target.checked)} />
            <Checkbox label="ใช้เบรลล์โน้ต" checked={form.assistiveNeeds.brailleNote} onChange={(e) => setAssistive('brailleNote', e.target.checked)} />
            <Checkbox label="ใช้เครื่องช่วยฟัง" checked={form.assistiveNeeds.hearingAid} onChange={(e) => setAssistive('hearingAid', e.target.checked)} />
            <Checkbox label="ใช้ภาษามือ" checked={form.assistiveNeeds.signLanguage} onChange={(e) => setAssistive('signLanguage', e.target.checked)} />
            <Checkbox
              label="ใช้เครื่องอ่านหนังสือเสียง/โปรแกรม TAB Player"
              checked={form.assistiveNeeds.audioReaderOrTabPlayer}
              onChange={(e) => setAssistive('audioReaderOrTabPlayer', e.target.checked)}
            />
            <Checkbox label="ใช้เครื่องเล่น MP3 Mp4" checked={form.assistiveNeeds.mp3Player} onChange={(e) => setAssistive('mp3Player', e.target.checked)} />
            <Checkbox
              label="ใช้เครื่องขยายจอภาพ CCTV พกพา"
              checked={form.assistiveNeeds.portableCctv}
              onChange={(e) => setAssistive('portableCctv', e.target.checked)}
            />
            <Checkbox label="ใช้โปรแกรม ZoomText" checked={form.assistiveNeeds.zoomText} onChange={(e) => setAssistive('zoomText', e.target.checked)} />
          </div>
          <div className="mt-2 space-y-2">
            <Checkbox
              label="ใช้อักษรเบรลล์ (ระบุระดับ)"
              checked={form.assistiveNeeds.brailleLevel}
              onChange={(e) => setAssistive('brailleLevel', e.target.checked)}
            />
            {form.assistiveNeeds.brailleLevel && (
              <Input
                value={form.assistiveNeeds.brailleLevelDetail}
                onChange={(e) => setAssistive('brailleLevelDetail', e.target.value)}
                placeholder="ระบุระดับ"
              />
            )}
            <Checkbox
              label="ใช้โปรแกรมคอมพิวเตอร์ (ระบุโปรแกรมที่ใช้)"
              checked={form.assistiveNeeds.computerProgram}
              onChange={(e) => setAssistive('computerProgram', e.target.checked)}
            />
            {form.assistiveNeeds.computerProgram && (
              <Input
                value={form.assistiveNeeds.computerProgramDetail}
                onChange={(e) => setAssistive('computerProgramDetail', e.target.value)}
                placeholder="ระบุโปรแกรมที่ใช้"
              />
            )}
            <Checkbox label="อื่นๆ ระบุ" checked={form.assistiveNeeds.other} onChange={(e) => setAssistive('other', e.target.checked)} />
            {form.assistiveNeeds.other && (
              <Input value={form.assistiveNeeds.otherDetail} onChange={(e) => setAssistive('otherDetail', e.target.value)} placeholder="ระบุ" />
            )}
          </div>
        </Section>

        <Section title="8. การขอรับความช่วยเหลือหรือบริการทางการศึกษาที่ต้องการ" description="สิ่งอำนวยความสะดวกในการเรียนและการสอบ — วิทยาลัยจะพิจารณาตามความเหมาะสม">
          <Textarea rows={3} value={form.neededSupportDetail} onChange={(e) => set('neededSupportDetail', e.target.value)} />
        </Section>

        <Section title="9. ทุนการศึกษา" description="ทุนอื่นใดที่เกี่ยวข้องกับค่าเล่าเรียน ค่าบำรุง ค่าธรรมเนียม และค่าใช้จ่ายอื่นในทำนองเดียวกันกับค่าเล่าเรียน">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Radio label="ได้รับทุน (โปรดระบุ)" name="hasOtherScholarship" checked={form.hasOtherScholarship} onChange={() => set('hasOtherScholarship', true)} />
              {form.hasOtherScholarship && (
                <Input
                  value={form.otherScholarshipDetail}
                  onChange={(e) => set('otherScholarshipDetail', e.target.value)}
                  placeholder="ระบุทุน"
                  className="flex-1"
                />
              )}
            </div>
            <Radio
              label="ไม่ได้รับทุนอื่นใดที่เกี่ยวข้องกับค่าเล่าเรียนหรือทำนองเดียวกัน"
              name="hasOtherScholarship"
              checked={!form.hasOtherScholarship}
              onChange={() => set('hasOtherScholarship', false)}
            />
          </div>
        </Section>

        <Section title="10. การขอรับเงินอุดหนุนทางการศึกษาสำหรับผู้เรียนพิการ">
          <div className="space-y-2">
            <Radio label="มีความประสงค์" name="wantsSubsidy" checked={form.wantsSubsidy} onChange={() => set('wantsSubsidy', true)} />
            <Radio label="ไม่มีความประสงค์" name="wantsSubsidy" checked={!form.wantsSubsidy} onChange={() => set('wantsSubsidy', false)} />
            {!form.wantsSubsidy && (
              <div className="ml-6 space-y-1">
                <Radio
                  label="สละสิทธิ์การขอรับเงินอุดหนุนและยินดีชำระค่าใช้จ่ายด้วยตนเอง"
                  name="subsidyWaiveOption"
                  checked={form.subsidyWaiveOption === 'self_pay'}
                  onChange={() => set('subsidyWaiveOption', 'self_pay')}
                />
                <Radio
                  label="สละสิทธิ์การขอรับเงินอุดหนุนโดยขอใช้สิทธิสวัสดิการอื่นๆ"
                  name="subsidyWaiveOption"
                  checked={form.subsidyWaiveOption === 'other_welfare'}
                  onChange={() => set('subsidyWaiveOption', 'other_welfare')}
                />
              </div>
            )}
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
