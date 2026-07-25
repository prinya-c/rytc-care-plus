import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAsync } from '../../hooks/useAsync';
import { fetchHomeVisitById, updateHomeVisit } from './api';
import { uploadHomeVisitImage } from '../../lib/storage';
import { emptyStudentInfo, emptyFamilyInfo } from './HomeVisitFormPage';
import type { FamilyInfo, StudentInfo } from '../../types';
import { LoadingState, ErrorState, Spinner } from '../../components/ui/States';
import { Section, Field, Input, Textarea, Select, Button } from '../../components/ui/Form';

export default function HomeVisitSelfReportPage() {
  const { visitId, token } = useParams<{ visitId: string; token: string }>();
  const { data: visit, loading, error } = useAsync(() => fetchHomeVisitById(visitId!), [visitId]);

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
    if (!visit) return;
    setStudentInfo(visit.studentInfo);
    setFamilyInfo(visit.familyInfo);
    setChronicDisease(visit.behaviorInfo.chronicDisease);
    setChronicDiseaseDetail(visit.behaviorInfo.chronicDiseaseDetail);
    setCloseFriendName(visit.behaviorInfo.closeFriendName);
    setCloseFriendPhone(visit.behaviorInfo.closeFriendPhone);
    setFamilyResponsibility(visit.behaviorInfo.familyResponsibility);
    setMapImage(visit.images.mapImage);
  }, [visit]);

  if (loading) return <LoadingState />;
  if (error || !visit) {
    return <ErrorState title="ไม่พบแบบฟอร์มนี้" description="ลิงก์อาจไม่ถูกต้อง กรุณาตรวจสอบกับครูที่ปรึกษา" />;
  }
  if (!visit.shareToken || visit.shareToken !== token) {
    return <ErrorState title="ลิงก์ไม่ถูกต้อง" description="กรุณาตรวจสอบลิงก์ที่ได้รับจากครูที่ปรึกษาอีกครั้ง" />;
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
      await updateHomeVisit(visit!.id, {
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
        images: { ...visit!.images, mapImage },
      });
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 pb-28">
      <div className="mx-auto max-w-xl">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            C+
          </div>
          <h1 className="text-lg font-bold text-gray-900">แบบกรอกข้อมูลก่อนเยี่ยมบ้าน</h1>
          <p className="text-sm text-gray-500">{visit.studentName}</p>
          <p className="text-xs text-gray-400">กรอกเฉพาะข้อมูลส่วนตัวและครอบครัวเบื้องต้น</p>
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
              <Field label="สถานภาพบิดามารดา">
                <Select value={familyInfo.fatherStatus} onChange={(e) => setFamilyInfo({ ...familyInfo, fatherStatus: e.target.value })}>
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
