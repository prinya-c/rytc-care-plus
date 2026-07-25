import { useEffect, useRef, useState } from 'react';
import { useStudentAuth } from '../studentAuth/StudentAuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchHomeVisitsByStudent, createHomeVisit, updateHomeVisit, updateStudentInfoSection } from './api';
import { fetchAdvisorTeacherForClass } from '../users/api';
import { uploadHomeVisitImage } from '../../lib/storage';
import { emptyStudentInfo, emptyFamilyInfo, emptyBehaviorInfo } from './HomeVisitFormPage';
import { studentDisplayName, studentSubtitle } from '../students/api';
import { calculateAge } from '../../utils/age';
import { ThaiAddressFields } from './ThaiAddressFields';
import type { FamilyInfo, HomeVisit, Student, StudentInfo } from '../../types';
import { LoadingState, ErrorState, Spinner } from '../../components/ui/States';
import { Section, Field, Input, Select, Button } from '../../components/ui/Form';

const currentAcademicYear = String(new Date().getFullYear() + 543);

/** Finds the student's current home-visit record, or creates a fresh draft. */
async function ensureVisit(student: Student): Promise<HomeVisit> {
  const visits = await fetchHomeVisitsByStudent(student.sid);
  if (visits[0]) return visits[0];

  const advisor = await fetchAdvisorTeacherForClass(student.class_code);
  const payload = {
    studentId: student.sid,
    studentName: studentDisplayName(student),
    classId: student.class_code,
    className: student.class_name ?? '',
    departmentId: student.dep_id ?? '',
    departmentName: student.dep_name ?? '',
    level: '',
    advisorTeacherId: advisor?.uid ?? '',
    advisorTeacherName: advisor?.displayName ?? '',
    academicYear: currentAcademicYear,
    semester: '1',
    visitDate: '',
    // เลขบัตรประชาชนมีอยู่แล้วในทะเบียนผู้เรียน ไม่ต้องให้กรอกซ้ำ.
    studentInfo: { ...emptyStudentInfo, citizenId: student.sidcard ?? '' },
    familyInfo: emptyFamilyInfo,
    behaviorInfo: emptyBehaviorInfo,
    parentOpinion: '',
    advisorOpinion: '',
    studentInfoUpdatedAt: null,
    images: { homeVisitPhotos: [], mapImage: '' },
    status: 'draft' as const,
    createdBy: student.sid,
  };
  const id = await createHomeVisit(payload);
  return { id, ...payload, createdAt: null, updatedAt: null };
}

export default function StudentHomeVisitPage() {
  const { student, logout } = useStudentAuth();
  const { data: visit, loading, error } = useAsync(() => ensureVisit(student!), [student?.sid]);

  const [studentInfo, setStudentInfo] = useState<StudentInfo>(emptyStudentInfo);
  const [familyInfo, setFamilyInfo] = useState<FamilyInfo>(emptyFamilyInfo);
  const [chronicDisease, setChronicDisease] = useState('');
  const [chronicDiseaseDetail, setChronicDiseaseDetail] = useState('');
  const [closeFriendName, setCloseFriendName] = useState('');
  const [closeFriendPhone, setCloseFriendPhone] = useState('');
  const [familyResponsibility, setFamilyResponsibility] = useState('');
  const [mapImage, setMapImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [done, setDone] = useState(false);
  const mapInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!visit || !student) return;
    const age = calculateAge(visit.studentInfo.birthDate);
    setStudentInfo({
      ...visit.studentInfo,
      // Recompute rather than trust a possibly-stale stored value — age is derived, not editable.
      age: age.years,
      ageMonths: age.months,
      // Backfill from the roster for records saved before citizenId was auto-filled.
      citizenId: visit.studentInfo.citizenId || student.sidcard || '',
    });
    setFamilyInfo(visit.familyInfo);
    setChronicDisease(visit.behaviorInfo.chronicDisease);
    setChronicDiseaseDetail(visit.behaviorInfo.chronicDiseaseDetail);
    setCloseFriendName(visit.behaviorInfo.closeFriendName);
    setCloseFriendPhone(visit.behaviorInfo.closeFriendPhone);
    setFamilyResponsibility(visit.behaviorInfo.familyResponsibility);
    setMapImage(visit.images.mapImage);
  }, [visit, student]);

  if (!student) return null;
  if (loading) return <LoadingState />;
  if (error || !visit) {
    return <ErrorState title="เกิดข้อผิดพลาด" description="ไม่สามารถโหลดแบบฟอร์มได้ กรุณาลองใหม่อีกครั้ง" />;
  }

  async function handleMapUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const url = await uploadHomeVisitImage(files[0], visit!.studentId);
      setMapImage(url);
    } catch {
      setSaveError(true);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    setSaving(true);
    setSaveError(false);
    try {
      await updateStudentInfoSection(visit!.id, {
        studentInfo,
        familyInfo,
        behaviorInfo: {
          ...visit!.behaviorInfo,
          chronicDisease,
          chronicDiseaseDetail,
          closeFriendName,
          closeFriendPhone,
          familyResponsibility,
        },
      });
      await updateHomeVisit(visit!.id, { images: { ...visit!.images, mapImage } });
      setDone(true);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-trust-100 text-trust-700">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-bold text-gray-900">บันทึกข้อมูลเรียบร้อยแล้ว</p>
          <p className="mt-2 text-sm text-gray-500">ขอบคุณที่กรอกข้อมูล ครูที่ปรึกษาจะนำไปใช้ประกอบการเยี่ยมบ้านต่อไป</p>
          <Button variant="secondary" className="mt-4" onClick={() => setDone(false)}>
            แก้ไขข้อมูลอีกครั้ง
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 pb-28">
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
              C+
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">แบบกรอกข้อมูลก่อนเยี่ยมบ้าน</p>
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">{visit.studentName}</h1>
            {studentSubtitle(student) && <p className="text-sm text-gray-500">{studentSubtitle(student)}</p>}
            <p className="mt-1 text-xs text-gray-400">กรอกเฉพาะข้อมูลส่วนตัวและครอบครัวเบื้องต้น</p>
          </div>
        </div>

        <div className="mb-4 flex justify-end">
          <button type="button" onClick={logout} className="text-xs font-medium text-gray-500 hover:text-close-700">
            ออกจากระบบ
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white px-4 sm:px-5">
          <Section title="ข้อมูลผู้เรียน" description="ข้อมูลส่วนตัวและที่อยู่อาศัย">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="เลขประจำตัวประชาชน">
                <Input value={studentInfo.citizenId} onChange={(e) => setStudentInfo({ ...studentInfo, citizenId: e.target.value })} />
              </Field>
              <Field label="ชื่อเล่น">
                <Input value={studentInfo.nickname} onChange={(e) => setStudentInfo({ ...studentInfo, nickname: e.target.value })} />
              </Field>
              <Field label="ปีการศึกษาที่เข้าเรียน">
                <Input value={studentInfo.enrollmentYear} onChange={(e) => setStudentInfo({ ...studentInfo, enrollmentYear: e.target.value })} placeholder="เช่น 2567" />
              </Field>
              <Field label="วันเกิด">
                <Input
                  type="date"
                  value={studentInfo.birthDate}
                  onChange={(e) => {
                    const age = calculateAge(e.target.value);
                    setStudentInfo({ ...studentInfo, birthDate: e.target.value, age: age.years, ageMonths: age.months });
                  }}
                />
              </Field>
              <Field label="อายุ" hint="คำนวณจากวันเกิดโดยอัตโนมัติ">
                <div className="flex items-center gap-2">
                  <Input value={studentInfo.age} disabled className="bg-gray-50 text-gray-500" />
                  <span className="shrink-0 text-sm text-gray-500">ปี</span>
                  <Input value={studentInfo.ageMonths} disabled className="bg-gray-50 text-gray-500" />
                  <span className="shrink-0 text-sm text-gray-500">เดือน</span>
                </div>
              </Field>
              <Field label="เบอร์โทรศัพท์">
                <Input value={studentInfo.phone} onChange={(e) => setStudentInfo({ ...studentInfo, phone: e.target.value })} />
              </Field>
              <Field label="Email">
                <Input type="email" value={studentInfo.email} onChange={(e) => setStudentInfo({ ...studentInfo, email: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="เลขที่">
                <Input value={studentInfo.houseNumber} onChange={(e) => setStudentInfo({ ...studentInfo, houseNumber: e.target.value })} />
              </Field>
              <Field label="หมู่">
                <Input value={studentInfo.moo} onChange={(e) => setStudentInfo({ ...studentInfo, moo: e.target.value })} />
              </Field>
              <Field label="ซอย">
                <Input value={studentInfo.soi} onChange={(e) => setStudentInfo({ ...studentInfo, soi: e.target.value })} />
              </Field>
              <Field label="ถนน">
                <Input value={studentInfo.road} onChange={(e) => setStudentInfo({ ...studentInfo, road: e.target.value })} />
              </Field>
            </div>
            <ThaiAddressFields
              value={{
                postalCode: studentInfo.postalCode,
                province: studentInfo.province,
                district: studentInfo.district,
                subdistrict: studentInfo.subdistrict,
              }}
              onChange={(next) => setStudentInfo({ ...studentInfo, ...next })}
            />
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
                  <option value="มีชีวิตอยู่">มีชีวิตอยู่</option>
                  <option value="เสียชีวิตแล้ว">เสียชีวิตแล้ว</option>
                  <option value="อยู่ด้วยกัน">อยู่ด้วยกัน</option>
                  <option value="แยกกันอยู่">แยกกันอยู่</option>
                </Select>
              </Field>
              <Field label="สถานภาพมารดา">
                <Select value={familyInfo.motherStatus} onChange={(e) => setFamilyInfo({ ...familyInfo, motherStatus: e.target.value })}>
                  <option value="">เลือกสถานภาพ</option>
                  <option value="มีชีวิตอยู่">มีชีวิตอยู่</option>
                  <option value="เสียชีวิตแล้ว">เสียชีวิตแล้ว</option>
                  <option value="อยู่ด้วยกัน">อยู่ด้วยกัน</option>
                  <option value="แยกกันอยู่">แยกกันอยู่</option>
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
                <Input
                  value={familyInfo.guardianRelationship}
                  onChange={(e) => setFamilyInfo({ ...familyInfo, guardianRelationship: e.target.value })}
                />
              </Field>
              <Field label="บุคคลที่สามารถติดต่อได้">
                <Input
                  value={familyInfo.emergencyContactName}
                  onChange={(e) => setFamilyInfo({ ...familyInfo, emergencyContactName: e.target.value })}
                />
              </Field>
              <Field label="เบอร์โทรบุคคลที่ติดต่อได้">
                <Input
                  value={familyInfo.emergencyContactPhone}
                  onChange={(e) => setFamilyInfo({ ...familyInfo, emergencyContactPhone: e.target.value })}
                />
              </Field>
            </div>
          </Section>

          <Section title="สุขภาพและเพื่อน">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="โรคประจำตัว">
                <Input value={chronicDisease} onChange={(e) => setChronicDisease(e.target.value)} />
              </Field>
              <Field label="รายละเอียดโรคประจำตัว">
                <Input value={chronicDiseaseDetail} onChange={(e) => setChronicDiseaseDetail(e.target.value)} />
              </Field>
              <Field label="ชื่อเพื่อนสนิท">
                <Input value={closeFriendName} onChange={(e) => setCloseFriendName(e.target.value)} />
              </Field>
              <Field label="เบอร์โทรเพื่อนสนิท">
                <Input value={closeFriendPhone} onChange={(e) => setCloseFriendPhone(e.target.value)} />
              </Field>
            </div>
            <Field label="ภารกิจที่ได้รับมอบหมายจากครอบครัว">
              <Input value={familyResponsibility} onChange={(e) => setFamilyResponsibility(e.target.value)} />
            </Field>
          </Section>

          <Section title="แผนที่บ้าน" description="แนบรูปแผนที่หรือตำแหน่งบ้าน เพื่อให้ครูที่ปรึกษาหาบ้านเจอง่ายขึ้น">
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
          </Section>
        </div>

        {saveError && <p className="mt-3 text-center text-sm text-close-700">บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>}

        <div className="mt-4 flex justify-end">
          <Button variant="primary" loading={saving} onClick={handleSubmit}>
            ส่งข้อมูล
          </Button>
        </div>
      </div>
    </div>
  );
}
