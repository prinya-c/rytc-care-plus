import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchStudentByStudentId, studentDisplayName, studentSubtitle } from '../students/api';
import { fetchHomeVisitById, createHomeVisit, updateHomeVisit } from './api';
import { uploadHomeVisitImage } from '../../lib/storage';
import { formatThaiDate } from '../../utils/thaiDate';
import type { BehaviorInfo, FamilyInfo, StudentInfo } from '../../types';
import { LoadingState, ErrorState, Spinner } from '../../components/ui/States';
import { Section, Field, Input, Textarea, Select, Button } from '../../components/ui/Form';
import { useToast } from '../../components/ui/Toast';

export const emptyStudentInfo: StudentInfo = {
  citizenId: '',
  nickname: '',
  enrollmentYear: '',
  birthDate: '',
  age: '',
  ageMonths: '',
  phone: '',
  email: '',
  houseNumber: '',
  moo: '',
  soi: '',
  road: '',
  province: '',
  district: '',
  subdistrict: '',
  postalCode: '',
};

export const emptyFamilyInfo: FamilyInfo = {
  fatherName: '',
  fatherOccupation: '',
  fatherPhone: '',
  fatherEmail: '',
  fatherStatus: '',
  motherName: '',
  motherOccupation: '',
  motherPhone: '',
  motherEmail: '',
  motherStatus: '',
  siblingsTotal: '',
  maleSiblings: '',
  femaleSiblings: '',
  birthOrder: '',
  currentGuardian: '',
  guardianRelationship: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  fatherIncome: '',
  motherIncome: '',
  houseType: '',
};

export const emptyBehaviorInfo: BehaviorInfo = {
  chronicDisease: '',
  chronicDiseaseDetail: '',
  closeFriendName: '',
  closeFriendPhone: '',
  alcoholOrDrugUse: '',
  nightOut: '',
  oppositeSexFriend: '',
  smoking: '',
  gambling: '',
  familyResponsibility: '',
  familyRelationship: '',
};

/**
 * The teacher's part of a home visit: when it happened, photos/map,
 * opinions, and the sensitive behavior questions (13-17, 19 on the paper
 * form) meant to be observed/asked in person during the visit itself —
 * these are also editable from the ข้อมูลผู้เรียน page (StudentInfoFormPage),
 * since a teacher may want to review/update a student's record outside of
 * an actual visit too. Personal/family info and the rest of behaviorInfo
 * stay untouched here (only the 6 fields below are ever included in this
 * form's save payload), so this form never clobbers what the ข้อมูลผู้เรียน
 * page or the student's own self-report own.
 */
export default function HomeVisitFormPage() {
  const { studentId, visitId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const isEdit = !!visitId;

  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [alcoholOrDrugUse, setAlcoholOrDrugUse] = useState('');
  const [nightOut, setNightOut] = useState('');
  const [oppositeSexFriend, setOppositeSexFriend] = useState('');
  const [smoking, setSmoking] = useState('');
  const [gambling, setGambling] = useState('');
  const [familyRelationship, setFamilyRelationship] = useState('');
  const [parentOpinion, setParentOpinion] = useState('');
  const [advisorOpinion, setAdvisorOpinion] = useState('');
  const [homeVisitPhotos, setHomeVisitPhotos] = useState<string[]>([]);
  const [mapImage, setMapImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapInputRef = useRef<HTMLInputElement>(null);

  const { data, loading, error } = useAsync(async () => {
    if (isEdit) {
      const existing = await fetchHomeVisitById(visitId!);
      // Also fetch the live roster record so the header can show the
      // student's current แผนกวิชา/short_name — HomeVisit docs don't store those.
      const student = existing ? await fetchStudentByStudentId(existing.studentId) : null;
      return { mode: 'edit' as const, existing, student };
    }
    const student = await fetchStudentByStudentId(studentId!);
    return { mode: 'new' as const, student };
  }, [studentId, visitId, isEdit]);

  useEffect(() => {
    if (data?.mode === 'edit' && data.existing) {
      const v = data.existing;
      setVisitDate(v.visitDate);
      setAlcoholOrDrugUse(v.behaviorInfo.alcoholOrDrugUse);
      setNightOut(v.behaviorInfo.nightOut);
      setOppositeSexFriend(v.behaviorInfo.oppositeSexFriend);
      setSmoking(v.behaviorInfo.smoking);
      setGambling(v.behaviorInfo.gambling);
      setFamilyRelationship(v.behaviorInfo.familyRelationship);
      setParentOpinion(v.parentOpinion);
      setAdvisorOpinion(v.advisorOpinion);
      setHomeVisitPhotos(v.images.homeVisitPhotos);
      setMapImage(v.images.mapImage);
    }
  }, [data]);

  useEffect(() => {
    if (!printing) return;
    const timer = setTimeout(() => window.print(), 50);
    return () => clearTimeout(timer);
  }, [printing]);

  useEffect(() => {
    function handleAfterPrint() {
      setPrinting(false);
    }
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState />;
  if (data.mode === 'new' && !data.student) return <ErrorState title="ไม่พบข้อมูลผู้เรียน" description="" />;

  const student = data.student;
  const existing = data.mode === 'edit' ? data.existing : null;
  const displayName = existing?.studentName ?? (student ? studentDisplayName(student) : '');
  const subtitle = studentSubtitle(student);
  const infoStudentId = existing?.studentId ?? studentId ?? '';

  async function handlePhotoUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls = await Promise.all(Array.from(files).map((f) => uploadHomeVisitImage(f, studentId ?? existing?.studentId ?? '')));
      setHomeVisitPhotos((prev) => [...prev, ...urls]);
    } catch {
      showToast('อัปโหลดรูปภาพไม่สำเร็จ', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleMapUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const url = await uploadHomeVisitImage(files[0], studentId ?? existing?.studentId ?? '');
      setMapImage(url);
    } catch {
      showToast('อัปโหลดแผนที่ไม่สำเร็จ', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(status: 'draft' | 'submitted') {
    if (!profile) return;
    setSaving(true);
    try {
      const behaviorPatch = { alcoholOrDrugUse, nightOut, oppositeSexFriend, smoking, gambling, familyRelationship };
      if (isEdit && visitId) {
        // Visit-owned fields plus the 6 teacher-observed behavior questions —
        // leaves studentInfo/familyInfo and the rest of behaviorInfo untouched.
        await updateHomeVisit(visitId, {
          visitDate,
          behaviorInfo: { ...existing!.behaviorInfo, ...behaviorPatch },
          parentOpinion,
          advisorOpinion,
          images: { homeVisitPhotos, mapImage },
          status,
        });
      } else {
        await createHomeVisit({
          studentId: student!.sid,
          studentName: studentDisplayName(student!),
          classId: student!.class_code,
          className: student!.class_name ?? '',
          departmentId: student!.dep_id ?? '',
          departmentName: student!.dep_name ?? '',
          level: '',
          advisorTeacherId: profile.teacherId ?? profile.uid,
          advisorTeacherName: profile.displayName,
          academicYear: String(new Date().getFullYear() + 543),
          semester: '1',
          visitDate,
          studentInfo: emptyStudentInfo,
          familyInfo: emptyFamilyInfo,
          behaviorInfo: { ...emptyBehaviorInfo, ...behaviorPatch },
          studentInfoUpdatedAt: null,
          parentOpinion,
          advisorOpinion,
          images: { homeVisitPhotos, mapImage },
          status,
          createdBy: profile.uid,
        });
      }
      showToast(status === 'draft' ? 'บันทึกแบบร่างเรียบร้อยแล้ว' : 'บันทึกการเยี่ยมบ้านสำเร็จ');
      navigate('/students');
    } catch {
      showToast('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 pb-24 print:space-y-0 print:pb-0">
      <div className="flex items-start justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">แบบบันทึกการเยี่ยมบ้านผู้เรียน</p>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{displayName}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          {existing && (
            <button
              type="button"
              onClick={() => setPrinting(true)}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              พิมพ์แบบบันทึกการเยี่ยมบ้าน
            </button>
          )}
          {infoStudentId && (
            <Link
              to={`/student-info/${infoStudentId}`}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              ข้อมูลผู้เรียน
            </Link>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white px-4 sm:px-5 print:hidden">
        <Section title="วันที่เยี่ยมบ้าน">
          <Field label="วัน เดือน ปี ที่เยี่ยมบ้าน" required>
            <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="max-w-xs" />
          </Field>
        </Section>

        <Section title="พฤติกรรมและสุขภาพ" description="สอบถาม/สังเกตจากการเยี่ยมบ้านจริง">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="พฤติกรรมเครื่องดื่มแอลกอฮอล์/สารเสพติด">
              <Select value={alcoholOrDrugUse} onChange={(e) => setAlcoholOrDrugUse(e.target.value)}>
                <option value="">เลือกคำตอบ</option>
                <option value="ดื่มบ่อยๆ">ดื่มบ่อยๆ</option>
                <option value="ดื่มแต่ไม่บ่อย">ดื่มแต่ไม่บ่อย</option>
                <option value="เคยดื่ม">เคยดื่ม</option>
                <option value="ไม่เคยดื่ม">ไม่เคยดื่ม</option>
              </Select>
            </Field>
            <Field label="การออกเที่ยวกลางคืน">
              <Select value={nightOut} onChange={(e) => setNightOut(e.target.value)}>
                <option value="">เลือกคำตอบ</option>
                <option value="บ่อยๆ">บ่อยๆ</option>
                <option value="ออกแต่ไม่บ่อย">ออกแต่ไม่บ่อย</option>
                <option value="นานๆครั้ง">นานๆครั้ง</option>
                <option value="ไม่มี">ไม่มี</option>
              </Select>
            </Field>
            <Field label="เพื่อนต่างเพศ">
              <Select value={oppositeSexFriend} onChange={(e) => setOppositeSexFriend(e.target.value)}>
                <option value="">เลือกคำตอบ</option>
                <option value="บ่อยๆ">บ่อยๆ</option>
                <option value="ไม่บ่อย">ไม่บ่อย</option>
                <option value="นานๆครั้ง">นานๆครั้ง</option>
                <option value="ไม่มี">ไม่มี</option>
              </Select>
            </Field>
            <Field label="การสูบบุหรี่">
              <Select value={smoking} onChange={(e) => setSmoking(e.target.value)}>
                <option value="">เลือกคำตอบ</option>
                <option value="สูบบ่อยๆ">สูบบ่อยๆ</option>
                <option value="สูบไม่บ่อย">สูบไม่บ่อย</option>
                <option value="นานๆครั้ง">นานๆครั้ง</option>
                <option value="ไม่สูบ">ไม่สูบ</option>
              </Select>
            </Field>
            <Field label="การพนัน">
              <Select value={gambling} onChange={(e) => setGambling(e.target.value)}>
                <option value="">เลือกคำตอบ</option>
                <option value="เล่นบ่อยๆ">เล่นบ่อยๆ</option>
                <option value="เล่นแต่ไม่บ่อย">เล่นแต่ไม่บ่อย</option>
                <option value="นานๆครั้ง">นานๆครั้ง</option>
                <option value="ไม่เล่น">ไม่เล่น</option>
              </Select>
            </Field>
            <Field label="ความสัมพันธ์กับสมาชิกในครอบครัว">
              <Select value={familyRelationship} onChange={(e) => setFamilyRelationship(e.target.value)}>
                <option value="">เลือกคำตอบ</option>
                <option value="ดีมาก">ดีมาก</option>
                <option value="ดี">ดี</option>
                <option value="ปานกลาง">ปานกลาง</option>
                <option value="น้อย">น้อย</option>
              </Select>
            </Field>
          </div>
        </Section>

        <Section title="ความคิดเห็น">
          <Field label="ความคิดเห็นของผู้ปกครอง">
            <Textarea rows={3} value={parentOpinion} onChange={(e) => setParentOpinion(e.target.value)} />
          </Field>
          <Field label="ความคิดเห็นและข้อเสนอแนะของครูที่ปรึกษา">
            <Textarea rows={3} value={advisorOpinion} onChange={(e) => setAdvisorOpinion(e.target.value)} />
          </Field>
        </Section>

        <Section title="ภาพประกอบ" description="ภาพกิจกรรมการเยี่ยมบ้านและแผนที่บ้านผู้เรียน">
          <div>
            <span className="mb-1 block text-sm font-medium text-gray-700">ภาพกิจกรรมการเยี่ยมบ้าน</span>
            <div className="flex flex-wrap gap-2">
              {homeVisitPhotos.map((url) => (
                <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setHomeVisitPhotos((prev) => prev.filter((u) => u !== url))}
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
          </div>

          <div>
            <span className="mb-1 block text-sm font-medium text-gray-700">แผนที่บ้านผู้เรียน / สถานที่ใกล้เคียง</span>
            {mapImage ? (
              <div className="relative h-32 w-full max-w-xs overflow-hidden rounded-lg border border-gray-200">
                <img src={mapImage} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setMapImage('')}
                  className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => mapInputRef.current?.click()}
                className="flex h-32 w-full max-w-xs items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-brand-400 hover:text-brand-500"
              >
                {uploading ? <Spinner className="h-5 w-5" /> : 'อัปโหลดแผนที่'}
              </button>
            )}
            <input ref={mapInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleMapUpload(e.target.files)} />
          </div>
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64 print:hidden">
        <div className="mx-auto flex max-w-6xl justify-end gap-2">
          <Button variant="secondary" loading={saving} onClick={() => handleSave('draft')}>
            บันทึกแบบร่าง
          </Button>
          <Button variant="primary" loading={saving} onClick={() => handleSave('submitted')}>
            ส่งข้อมูล
          </Button>
        </div>
      </div>

      {/* Print-only: the 2-page แบบบันทึกการเยี่ยมบ้านผู้เรียน paper form, filled in from the record. */}
      {printing && existing && (
        <div className="hidden print:block text-sm leading-relaxed">
          <h2 className="text-center text-lg font-bold">แบบบันทึกการเยี่ยมบ้านผู้เรียน</h2>
          <p className="mt-1 text-right">วัน/เดือน/ปี {formatThaiDate(existing.visitDate)}</p>

          <p className="mt-3">
            ๑. ชื่อ-สกุล <span className="border-b border-black">{existing.studentName}</span> ชื่อเล่น{' '}
            <span className="border-b border-black">{existing.studentInfo.nickname || ' '}</span> เลขประจำตัวประชาชน{' '}
            <span className="border-b border-black">{existing.studentInfo.citizenId || ' '}</span>
          </p>
          <p className="mt-2">
            ๒. ระดับชั้น <span className="border-b border-black">{student?.short_name || existing.className || ' '}</span> แผนกวิชา{' '}
            <span className="border-b border-black">{student?.dep_name || existing.departmentName || ' '}</span> ปีการศึกษาที่เข้าเรียน{' '}
            <span className="border-b border-black">{existing.studentInfo.enrollmentYear || ' '}</span>
          </p>
          <p className="mt-2">
            ๓. เกิดวันที่ <span className="border-b border-black">{formatThaiDate(existing.studentInfo.birthDate)}</span> อายุ{' '}
            <span className="border-b border-black">{existing.studentInfo.age || ' '}</span> ปี{' '}
            <span className="border-b border-black">{existing.studentInfo.ageMonths || ' '}</span> เดือน
          </p>
          <p className="mt-2">
            ๔. ที่อยู่ เลขที่ <span className="border-b border-black">{existing.studentInfo.houseNumber || ' '}</span> หมู่{' '}
            <span className="border-b border-black">{existing.studentInfo.moo || ' '}</span> ซอย{' '}
            <span className="border-b border-black">{existing.studentInfo.soi || ' '}</span> ถนน{' '}
            <span className="border-b border-black">{existing.studentInfo.road || ' '}</span> ตำบล/แขวง{' '}
            <span className="border-b border-black">{existing.studentInfo.subdistrict || ' '}</span>
          </p>
          <p className="ml-4">
            อำเภอ/เขต <span className="border-b border-black">{existing.studentInfo.district || ' '}</span> จังหวัด{' '}
            <span className="border-b border-black">{existing.studentInfo.province || ' '}</span> รหัสไปรษณีย์{' '}
            <span className="border-b border-black">{existing.studentInfo.postalCode || ' '}</span>
          </p>
          <p className="ml-4">
            หมายเลขโทรศัพท์ติดต่อ <span className="border-b border-black">{existing.studentInfo.phone || ' '}</span> E-mail{' '}
            <span className="border-b border-black">{existing.studentInfo.email || ' '}</span>
          </p>

          <p className="mt-2">
            ๕. ชื่อ-สกุลบิดา <span className="border-b border-black">{existing.familyInfo.fatherName || ' '}</span> อาชีพ{' '}
            <span className="border-b border-black">{existing.familyInfo.fatherOccupation || ' '}</span>
          </p>
          <p className="ml-4">
            หมายเลขโทรศัพท์ติดต่อ <span className="border-b border-black">{existing.familyInfo.fatherPhone || ' '}</span> E-mail{' '}
            <span className="border-b border-black">{existing.familyInfo.fatherEmail || ' '}</span>
          </p>
          <p className="ml-4">
            {['มีชีวิตอยู่', 'เสียชีวิตแล้ว', 'อยู่ด้วยกัน', 'แยกกันอยู่'].map((opt) => (
              <span key={opt} className="mr-4">
                {existing.familyInfo.fatherStatus === opt ? '☑' : '☐'} {opt}
              </span>
            ))}
          </p>

          <p className="mt-2">
            ๖. ชื่อ-นามสกุลมารดา <span className="border-b border-black">{existing.familyInfo.motherName || ' '}</span> อาชีพ{' '}
            <span className="border-b border-black">{existing.familyInfo.motherOccupation || ' '}</span>
          </p>
          <p className="ml-4">
            หมายเลขโทรศัพท์ติดต่อ <span className="border-b border-black">{existing.familyInfo.motherPhone || ' '}</span> E-mail{' '}
            <span className="border-b border-black">{existing.familyInfo.motherEmail || ' '}</span>
          </p>
          <p className="ml-4">
            {['มีชีวิตอยู่', 'เสียชีวิตแล้ว', 'อยู่ด้วยกัน', 'แยกกันอยู่'].map((opt) => (
              <span key={opt} className="mr-4">
                {existing.familyInfo.motherStatus === opt ? '☑' : '☐'} {opt}
              </span>
            ))}
          </p>

          <p className="mt-2">
            ๗. จำนวนพี่น้องในครอบครัวทั้งหมด <span className="border-b border-black">{existing.familyInfo.siblingsTotal || ' '}</span> คน ชาย{' '}
            <span className="border-b border-black">{existing.familyInfo.maleSiblings || ' '}</span> คน หญิง{' '}
            <span className="border-b border-black">{existing.familyInfo.femaleSiblings || ' '}</span> คน ผู้เรียนเป็นบุตรคนที่{' '}
            <span className="border-b border-black">{existing.familyInfo.birthOrder || ' '}</span> ของครอบครัว
          </p>
          <p className="mt-2">
            ๘. ปัจจุบันอาศัยอยู่กับ <span className="border-b border-black">{existing.familyInfo.currentGuardian || ' '}</span> เกี่ยวข้องเป็น{' '}
            <span className="border-b border-black">{existing.familyInfo.guardianRelationship || ' '}</span> กับผู้เรียน
          </p>
          <p className="ml-4">
            บุคคลที่สามารถติดต่อได้ <span className="border-b border-black">{existing.familyInfo.emergencyContactName || ' '}</span> เบอร์โทรศัพท์{' '}
            <span className="border-b border-black">{existing.familyInfo.emergencyContactPhone || ' '}</span>
          </p>
          <p className="mt-2">
            ๙. รายได้ของบิดา <span className="border-b border-black">{existing.familyInfo.fatherIncome || ' '}</span> บาท/เดือน มารดา{' '}
            <span className="border-b border-black">{existing.familyInfo.motherIncome || ' '}</span> บาท/เดือน
          </p>
          <p className="mt-2">
            ๑๐. บ้านที่อยู่เป็นของ{' '}
            {['บ้านพ่อแม่', 'บ้านเช่า', 'บ้านญาติ', 'หอพัก', 'อื่นๆ'].map((opt) => (
              <span key={opt} className="mr-4">
                {existing.familyInfo.houseType === opt ? '☑' : '☐'} {opt}
              </span>
            ))}
          </p>
          <p className="mt-2">
            ๑๑. ผู้เรียนมีโรคประจำตัว {existing.behaviorInfo.chronicDisease ? '☑ มี' : '☐ ไม่มี'} ระบุ{' '}
            <span className="border-b border-black">{existing.behaviorInfo.chronicDiseaseDetail || ' '}</span>
          </p>
          <p className="mt-2">
            ๑๒. เพื่อนสนิทของผู้เรียน คือ <span className="border-b border-black">{existing.behaviorInfo.closeFriendName || ' '}</span>{' '}
            หมายเลขโทรศัพท์ <span className="border-b border-black">{existing.behaviorInfo.closeFriendPhone || ' '}</span>
          </p>
          <p className="mt-2">๑๓. ผู้เรียนดื่มเครื่องดื่มที่มีแอลกอฮอล์หรือสารเสพติดหรือไม่</p>
          <p className="ml-4">
            {['ดื่มบ่อยๆ', 'ดื่มแต่ไม่บ่อย', 'เคยดื่ม', 'ไม่เคยดื่ม'].map((opt) => (
              <span key={opt} className="mr-4">
                {existing.behaviorInfo.alcoholOrDrugUse === opt ? '☑' : '☐'} {opt}
              </span>
            ))}
          </p>
          <p className="mt-2">๑๔. ผู้เรียนออกเที่ยวกลางคืน</p>
          <p className="ml-4">
            {['บ่อยๆ', 'ออกแต่ไม่บ่อย', 'นานๆครั้ง', 'ไม่มี'].map((opt) => (
              <span key={opt} className="mr-4">
                {existing.behaviorInfo.nightOut === opt ? '☑' : '☐'} {opt}
              </span>
            ))}
          </p>
          <p className="mt-2">๑๕. ผู้เรียนมีเพื่อนต่างเพศคบหาหรือไปด้วยกัน</p>
          <p className="ml-4">
            {['บ่อยๆ', 'ไม่บ่อย', 'นานๆครั้ง', 'ไม่มี'].map((opt) => (
              <span key={opt} className="mr-4">
                {existing.behaviorInfo.oppositeSexFriend === opt ? '☑' : '☐'} {opt}
              </span>
            ))}
          </p>
          <p className="mt-2">๑๖. ผู้เรียนสูบบุหรี่หรือไม่</p>
          <p className="ml-4">
            {['สูบบ่อยๆ', 'สูบไม่บ่อย', 'นานๆครั้ง', 'ไม่สูบ'].map((opt) => (
              <span key={opt} className="mr-4">
                {existing.behaviorInfo.smoking === opt ? '☑' : '☐'} {opt}
              </span>
            ))}
          </p>

          <div className="break-before-page">
            <p className="mt-2">๑๗. ผู้เรียนเล่นการพนัน</p>
            <p className="ml-4">
              {['เล่นบ่อยๆ', 'เล่นแต่ไม่บ่อย', 'นานๆครั้ง', 'ไม่เล่น'].map((opt) => (
                <span key={opt} className="mr-4">
                  {existing.behaviorInfo.gambling === opt ? '☑' : '☐'} {opt}
                </span>
              ))}
            </p>
            <p className="mt-3">
              ๑๘. ภารกิจที่ได้รับมอบหมายจากครอบครัว{' '}
              <span className="border-b border-black">{existing.behaviorInfo.familyResponsibility || ' '}</span>
            </p>
            <p className="mt-3">๑๙. ความสัมพันธ์กับสมาชิกในครอบครัว</p>
            <p className="ml-4">
              {['ดีมาก', 'ดี', 'ปานกลาง', 'น้อย'].map((opt) => (
                <span key={opt} className="mr-4">
                  {existing.behaviorInfo.familyRelationship === opt ? '☑' : '☐'} {opt}
                </span>
              ))}
            </p>

            <p className="mt-4">๒๐. ความคิดเห็นของผู้ปกครองที่มีต่อผู้เรียน</p>
            <p className="ml-4 min-h-[3em] whitespace-pre-wrap border-b border-black">{existing.parentOpinion || ' '}</p>

            <p className="mt-4">๒๑. ความคิดเห็นและข้อเสนอแนะของครูที่ปรึกษาในการออกเยี่ยมบ้านครั้งนี้</p>
            <p className="ml-4 min-h-[3em] whitespace-pre-wrap border-b border-black">{existing.advisorOpinion || ' '}</p>

            <div className="mt-10 flex justify-end">
              <div className="text-center">
                <p>ลงชื่อ.............................................</p>
                <p className="mt-1">({existing.advisorTeacherName || '.............................................'})</p>
                <p>ครูที่ปรึกษา</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
