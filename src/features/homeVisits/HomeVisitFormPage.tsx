import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchStudentByStudentId, studentDisplayName } from '../students/api';
import { fetchHomeVisitById, createHomeVisit, updateHomeVisit } from './api';
import { uploadHomeVisitImage } from '../../lib/storage';
import type { BehaviorInfo, FamilyInfo, StudentInfo } from '../../types';
import { LoadingState, ErrorState, Spinner } from '../../components/ui/States';
import { Section, Field, Input, Textarea, Select, Button } from '../../components/ui/Form';
import { useToast } from '../../components/ui/Toast';

export const emptyStudentInfo: StudentInfo = {
  citizenId: '',
  nickname: '',
  birthDate: '',
  age: '',
  phone: '',
  email: '',
  address: '',
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

export default function HomeVisitFormPage() {
  const { studentId, visitId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const isEdit = !!visitId;

  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [studentInfo, setStudentInfo] = useState<StudentInfo>(emptyStudentInfo);
  const [familyInfo, setFamilyInfo] = useState<FamilyInfo>(emptyFamilyInfo);
  const [behaviorInfo, setBehaviorInfo] = useState<BehaviorInfo>(emptyBehaviorInfo);
  const [parentOpinion, setParentOpinion] = useState('');
  const [advisorOpinion, setAdvisorOpinion] = useState('');
  const [homeVisitPhotos, setHomeVisitPhotos] = useState<string[]>([]);
  const [mapImage, setMapImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapInputRef = useRef<HTMLInputElement>(null);

  const { data, loading, error } = useAsync(async () => {
    if (isEdit) {
      const existing = await fetchHomeVisitById(visitId!);
      return { mode: 'edit' as const, existing };
    }
    const student = await fetchStudentByStudentId(studentId!);
    return { mode: 'new' as const, student };
  }, [studentId, visitId, isEdit]);

  useEffect(() => {
    if (data?.mode === 'edit' && data.existing) {
      const v = data.existing;
      setVisitDate(v.visitDate);
      setStudentInfo(v.studentInfo);
      setFamilyInfo(v.familyInfo);
      setBehaviorInfo(v.behaviorInfo);
      setParentOpinion(v.parentOpinion);
      setAdvisorOpinion(v.advisorOpinion);
      setHomeVisitPhotos(v.images.homeVisitPhotos);
      setMapImage(v.images.mapImage);
    }
  }, [data]);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState />;
  if (data.mode === 'new' && !data.student) return <ErrorState title="ไม่พบข้อมูลผู้เรียน" description="" />;

  const student = data.mode === 'new' ? data.student! : null;
  const existing = data.mode === 'edit' ? data.existing : null;
  const displayName = existing?.studentName ?? (student ? studentDisplayName(student) : '');

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
      const payload = {
        studentId: existing?.studentId ?? student!.sid,
        studentName: existing?.studentName ?? studentDisplayName(student!),
        classId: existing?.classId ?? student!.class_code,
        className: existing?.className ?? student!.class_name ?? '',
        departmentId: existing?.departmentId ?? student!.dep_id ?? '',
        departmentName: existing?.departmentName ?? student!.dep_name ?? '',
        level: existing?.level ?? '',
        advisorTeacherId: profile.teacherId ?? profile.uid,
        advisorTeacherName: profile.displayName,
        academicYear: existing?.academicYear ?? String(new Date().getFullYear() + 543),
        semester: existing?.semester ?? '1',
        visitDate,
        studentInfo,
        familyInfo,
        behaviorInfo,
        parentOpinion,
        advisorOpinion,
        images: { homeVisitPhotos, mapImage },
        status,
        createdBy: existing?.createdBy ?? profile.uid,
      };

      if (isEdit && visitId) {
        await updateHomeVisit(visitId, payload);
      } else {
        await createHomeVisit(payload);
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
    <div className="space-y-5 pb-24">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">แบบบันทึกการเยี่ยมบ้านผู้เรียน</h1>
        <p className="text-sm text-gray-500">{displayName}</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white px-4 sm:px-5">
        <Section title="วันที่เยี่ยมบ้าน">
          <Field label="วัน เดือน ปี ที่เยี่ยมบ้าน" required>
            <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="max-w-xs" />
          </Field>
        </Section>

        <Section title="ข้อมูลผู้เรียน" description="ข้อมูลส่วนตัวและที่อยู่อาศัย">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="เลขประจำตัวประชาชน">
              <Input value={studentInfo.citizenId} onChange={(e) => setStudentInfo({ ...studentInfo, citizenId: e.target.value })} />
            </Field>
            <Field label="ชื่อเล่น">
              <Input value={studentInfo.nickname} onChange={(e) => setStudentInfo({ ...studentInfo, nickname: e.target.value })} />
            </Field>
            <Field label="วันเกิด">
              <Input type="date" value={studentInfo.birthDate} onChange={(e) => setStudentInfo({ ...studentInfo, birthDate: e.target.value })} />
            </Field>
            <Field label="อายุ">
              <Input value={studentInfo.age} onChange={(e) => setStudentInfo({ ...studentInfo, age: e.target.value })} />
            </Field>
            <Field label="เบอร์โทรศัพท์">
              <Input value={studentInfo.phone} onChange={(e) => setStudentInfo({ ...studentInfo, phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input type="email" value={studentInfo.email} onChange={(e) => setStudentInfo({ ...studentInfo, email: e.target.value })} />
            </Field>
          </div>
          <Field label="ที่อยู่">
            <Textarea rows={2} value={studentInfo.address} onChange={(e) => setStudentInfo({ ...studentInfo, address: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="จังหวัด">
              <Input value={studentInfo.province} onChange={(e) => setStudentInfo({ ...studentInfo, province: e.target.value })} />
            </Field>
            <Field label="อำเภอ">
              <Input value={studentInfo.district} onChange={(e) => setStudentInfo({ ...studentInfo, district: e.target.value })} />
            </Field>
            <Field label="ตำบล">
              <Input value={studentInfo.subdistrict} onChange={(e) => setStudentInfo({ ...studentInfo, subdistrict: e.target.value })} />
            </Field>
            <Field label="รหัสไปรษณีย์">
              <Input value={studentInfo.postalCode} onChange={(e) => setStudentInfo({ ...studentInfo, postalCode: e.target.value })} />
            </Field>
          </div>
        </Section>

        <Section title="ข้อมูลครอบครัว">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="ชื่อบิดา">
              <Input value={familyInfo.fatherName} onChange={(e) => setFamilyInfo({ ...familyInfo, fatherName: e.target.value })} />
            </Field>
            <Field label="ชื่อมารดา">
              <Input value={familyInfo.motherName} onChange={(e) => setFamilyInfo({ ...familyInfo, motherName: e.target.value })} />
            </Field>
            <Field label="อาชีพบิดา">
              <Input value={familyInfo.fatherOccupation} onChange={(e) => setFamilyInfo({ ...familyInfo, fatherOccupation: e.target.value })} />
            </Field>
            <Field label="อาชีพมารดา">
              <Input value={familyInfo.motherOccupation} onChange={(e) => setFamilyInfo({ ...familyInfo, motherOccupation: e.target.value })} />
            </Field>
            <Field label="เบอร์โทรบิดา">
              <Input value={familyInfo.fatherPhone} onChange={(e) => setFamilyInfo({ ...familyInfo, fatherPhone: e.target.value })} />
            </Field>
            <Field label="เบอร์โทรมารดา">
              <Input value={familyInfo.motherPhone} onChange={(e) => setFamilyInfo({ ...familyInfo, motherPhone: e.target.value })} />
            </Field>
            <Field label="รายได้บิดา (บาท/เดือน)">
              <Input value={familyInfo.fatherIncome} onChange={(e) => setFamilyInfo({ ...familyInfo, fatherIncome: e.target.value })} />
            </Field>
            <Field label="รายได้มารดา (บาท/เดือน)">
              <Input value={familyInfo.motherIncome} onChange={(e) => setFamilyInfo({ ...familyInfo, motherIncome: e.target.value })} />
            </Field>
            <Field label="สถานภาพบิดา">
              <Select value={familyInfo.fatherStatus} onChange={(e) => setFamilyInfo({ ...familyInfo, fatherStatus: e.target.value })}>
                <option value="">เลือกสถานภาพ</option>
                <option value="อยู่ด้วยกัน">อยู่ด้วยกัน</option>
                <option value="หย่าร้าง">หย่าร้าง</option>
                <option value="แยกกันอยู่">แยกกันอยู่</option>
                <option value="เสียชีวิต">เสียชีวิต</option>
              </Select>
            </Field>
            <Field label="สถานภาพมารดา">
              <Select value={familyInfo.motherStatus} onChange={(e) => setFamilyInfo({ ...familyInfo, motherStatus: e.target.value })}>
                <option value="">เลือกสถานภาพ</option>
                <option value="อยู่ด้วยกัน">อยู่ด้วยกัน</option>
                <option value="หย่าร้าง">หย่าร้าง</option>
                <option value="แยกกันอยู่">แยกกันอยู่</option>
                <option value="เสียชีวิต">เสียชีวิต</option>
              </Select>
            </Field>
            <Field label="ลักษณะที่อยู่อาศัย">
              <Select value={familyInfo.houseType} onChange={(e) => setFamilyInfo({ ...familyInfo, houseType: e.target.value })}>
                <option value="">เลือกลักษณะที่อยู่อาศัย</option>
                <option value="บ้านพ่อแม่">บ้านพ่อแม่</option>
                <option value="บ้านเช่า">บ้านเช่า</option>
                <option value="บ้านญาติ">บ้านญาติ</option>
                <option value="หอพัก">หอพัก</option>
                <option value="อื่นๆ">อื่นๆ</option>
              </Select>
            </Field>
            <Field label="จำนวนพี่น้องทั้งหมด">
              <Input value={familyInfo.siblingsTotal} onChange={(e) => setFamilyInfo({ ...familyInfo, siblingsTotal: e.target.value })} />
            </Field>
            <Field label="เป็นบุตรคนที่">
              <Input value={familyInfo.birthOrder} onChange={(e) => setFamilyInfo({ ...familyInfo, birthOrder: e.target.value })} />
            </Field>
            <Field label="ชาย (คน)">
              <Input value={familyInfo.maleSiblings} onChange={(e) => setFamilyInfo({ ...familyInfo, maleSiblings: e.target.value })} />
            </Field>
            <Field label="หญิง (คน)">
              <Input value={familyInfo.femaleSiblings} onChange={(e) => setFamilyInfo({ ...familyInfo, femaleSiblings: e.target.value })} />
            </Field>
            <Field label="ผู้ที่นักเรียนอาศัยอยู่ด้วย">
              <Input value={familyInfo.currentGuardian} onChange={(e) => setFamilyInfo({ ...familyInfo, currentGuardian: e.target.value })} />
            </Field>
            <Field label="ความเกี่ยวข้องกับผู้ปกครอง">
              <Input value={familyInfo.guardianRelationship} onChange={(e) => setFamilyInfo({ ...familyInfo, guardianRelationship: e.target.value })} />
            </Field>
            <Field label="บุคคลที่สามารถติดต่อได้">
              <Input value={familyInfo.emergencyContactName} onChange={(e) => setFamilyInfo({ ...familyInfo, emergencyContactName: e.target.value })} />
            </Field>
            <Field label="เบอร์โทรบุคคลที่ติดต่อได้">
              <Input value={familyInfo.emergencyContactPhone} onChange={(e) => setFamilyInfo({ ...familyInfo, emergencyContactPhone: e.target.value })} />
            </Field>
          </div>
        </Section>

        <Section title="พฤติกรรมและสุขภาพ">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="โรคประจำตัว">
              <Input value={behaviorInfo.chronicDisease} onChange={(e) => setBehaviorInfo({ ...behaviorInfo, chronicDisease: e.target.value })} />
            </Field>
            <Field label="รายละเอียดโรคประจำตัว">
              <Input value={behaviorInfo.chronicDiseaseDetail} onChange={(e) => setBehaviorInfo({ ...behaviorInfo, chronicDiseaseDetail: e.target.value })} />
            </Field>
            <Field label="ชื่อเพื่อนสนิท">
              <Input value={behaviorInfo.closeFriendName} onChange={(e) => setBehaviorInfo({ ...behaviorInfo, closeFriendName: e.target.value })} />
            </Field>
            <Field label="เบอร์โทรเพื่อนสนิท">
              <Input value={behaviorInfo.closeFriendPhone} onChange={(e) => setBehaviorInfo({ ...behaviorInfo, closeFriendPhone: e.target.value })} />
            </Field>
            <Field label="พฤติกรรมเครื่องดื่มแอลกอฮอล์/สารเสพติด">
              <Input value={behaviorInfo.alcoholOrDrugUse} onChange={(e) => setBehaviorInfo({ ...behaviorInfo, alcoholOrDrugUse: e.target.value })} />
            </Field>
            <Field label="การออกเที่ยวกลางคืน">
              <Input value={behaviorInfo.nightOut} onChange={(e) => setBehaviorInfo({ ...behaviorInfo, nightOut: e.target.value })} />
            </Field>
            <Field label="เพื่อนต่างเพศ">
              <Input value={behaviorInfo.oppositeSexFriend} onChange={(e) => setBehaviorInfo({ ...behaviorInfo, oppositeSexFriend: e.target.value })} />
            </Field>
            <Field label="การสูบบุหรี่">
              <Input value={behaviorInfo.smoking} onChange={(e) => setBehaviorInfo({ ...behaviorInfo, smoking: e.target.value })} />
            </Field>
            <Field label="การพนัน">
              <Input value={behaviorInfo.gambling} onChange={(e) => setBehaviorInfo({ ...behaviorInfo, gambling: e.target.value })} />
            </Field>
            <Field label="ภารกิจที่ได้รับมอบหมายจากครอบครัว">
              <Input value={behaviorInfo.familyResponsibility} onChange={(e) => setBehaviorInfo({ ...behaviorInfo, familyResponsibility: e.target.value })} />
            </Field>
          </div>
          <Field label="ความสัมพันธ์กับสมาชิกในครอบครัว">
            <Textarea rows={2} value={behaviorInfo.familyRelationship} onChange={(e) => setBehaviorInfo({ ...behaviorInfo, familyRelationship: e.target.value })} />
          </Field>
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

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-6xl justify-end gap-2">
          <Button variant="secondary" loading={saving} onClick={() => handleSave('draft')}>
            บันทึกแบบร่าง
          </Button>
          <Button variant="primary" loading={saving} onClick={() => handleSave('submitted')}>
            ส่งข้อมูล
          </Button>
        </div>
      </div>
    </div>
  );
}
