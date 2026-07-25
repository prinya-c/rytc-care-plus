import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchStudentByStudentId, studentDisplayName, studentSubtitle } from '../students/api';
import { fetchHomeVisitsByStudent, createHomeVisit, updateStudentInfoSection } from './api';
import { calculateAge } from '../../utils/age';
import { ThaiAddressFields } from './ThaiAddressFields';
import { emptyStudentInfo, emptyFamilyInfo, emptyBehaviorInfo } from './HomeVisitFormPage';
import type { BehaviorInfo, FamilyInfo, StudentInfo } from '../../types';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { Section, Field, Input, Select, Button } from '../../components/ui/Form';
import { useToast } from '../../components/ui/Toast';

const currentAcademicYear = String(new Date().getFullYear() + 543);

/**
 * ครูดูและแก้ไขข้อมูลส่วนตัว/ครอบครัว/พฤติกรรมของนักเรียน — แยกออกจากฟอร์มเยี่ยมบ้าน
 * (HomeVisitFormPage) เพื่อให้ครูปรับข้อมูลได้โดยไม่ต้องรอวันไปเยี่ยมบ้านจริง ข้อมูลยังคงอยู่ใน
 * เอกสาร HomeVisit ชิ้นเดียวกัน แค่แก้จากหน้าจอนี้แทน.
 */
export default function StudentInfoFormPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { showToast } = useToast();

  const { data, loading, error } = useAsync(async () => {
    const student = await fetchStudentByStudentId(studentId!);
    if (!student) return null;
    const visits = await fetchHomeVisitsByStudent(studentId!);
    return { student, existing: visits[0] ?? null };
  }, [studentId]);

  const [studentInfo, setStudentInfo] = useState<StudentInfo>(emptyStudentInfo);
  const [familyInfo, setFamilyInfo] = useState<FamilyInfo>(emptyFamilyInfo);
  const [behaviorInfo, setBehaviorInfo] = useState<BehaviorInfo>(emptyBehaviorInfo);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    if (data.existing) {
      const age = calculateAge(data.existing.studentInfo.birthDate);
      setStudentInfo({
        ...data.existing.studentInfo,
        age: age.years,
        ageMonths: age.months,
        citizenId: data.existing.studentInfo.citizenId || data.student.sidcard || '',
      });
      setFamilyInfo(data.existing.familyInfo);
      setBehaviorInfo(data.existing.behaviorInfo);
    } else if (data.student.sidcard) {
      setStudentInfo((prev) => ({ ...prev, citizenId: data.student.sidcard! }));
    }
  }, [data]);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState title="ไม่พบข้อมูลผู้เรียน" description="" />;

  const { student, existing } = data;
  const subtitle = studentSubtitle(student);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      if (existing) {
        await updateStudentInfoSection(existing.id, { studentInfo, familyInfo, behaviorInfo });
      } else {
        await createHomeVisit({
          studentId: student.sid,
          studentName: studentDisplayName(student),
          classId: student.class_code,
          className: student.class_name ?? '',
          departmentId: student.dep_id ?? '',
          departmentName: student.dep_name ?? '',
          level: '',
          advisorTeacherId: profile.teacherId ?? profile.uid,
          advisorTeacherName: profile.displayName,
          academicYear: currentAcademicYear,
          semester: '1',
          visitDate: '',
          studentInfo,
          familyInfo,
          behaviorInfo,
          studentInfoUpdatedAt: new Date().toISOString(),
          parentOpinion: '',
          advisorOpinion: '',
          images: { homeVisitPhotos: [], mapImage: '' },
          status: 'draft',
          createdBy: profile.uid,
        });
      }
      showToast('บันทึกข้อมูลนักเรียนเรียบร้อยแล้ว');
      navigate('/student-info');
    } catch {
      showToast('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 pb-24">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">ข้อมูลนักเรียน</p>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{studentDisplayName(student)}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
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
              <Select value={behaviorInfo.alcoholOrDrugUse} onChange={(e) => setBehaviorInfo({ ...behaviorInfo, alcoholOrDrugUse: e.target.value })}>
                <option value="">เลือกคำตอบ</option>
                <option value="ดื่มบ่อยๆ">ดื่มบ่อยๆ</option>
                <option value="ดื่มแต่ไม่บ่อย">ดื่มแต่ไม่บ่อย</option>
                <option value="เคยดื่ม">เคยดื่ม</option>
                <option value="ไม่เคยดื่ม">ไม่เคยดื่ม</option>
              </Select>
            </Field>
            <Field label="การออกเที่ยวกลางคืน">
              <Select value={behaviorInfo.nightOut} onChange={(e) => setBehaviorInfo({ ...behaviorInfo, nightOut: e.target.value })}>
                <option value="">เลือกคำตอบ</option>
                <option value="บ่อยๆ">บ่อยๆ</option>
                <option value="ออกแต่ไม่บ่อย">ออกแต่ไม่บ่อย</option>
                <option value="นานๆครั้ง">นานๆครั้ง</option>
                <option value="ไม่มี">ไม่มี</option>
              </Select>
            </Field>
            <Field label="เพื่อนต่างเพศ">
              <Select value={behaviorInfo.oppositeSexFriend} onChange={(e) => setBehaviorInfo({ ...behaviorInfo, oppositeSexFriend: e.target.value })}>
                <option value="">เลือกคำตอบ</option>
                <option value="บ่อยๆ">บ่อยๆ</option>
                <option value="ไม่บ่อย">ไม่บ่อย</option>
                <option value="นานๆครั้ง">นานๆครั้ง</option>
                <option value="ไม่มี">ไม่มี</option>
              </Select>
            </Field>
            <Field label="การสูบบุหรี่">
              <Select value={behaviorInfo.smoking} onChange={(e) => setBehaviorInfo({ ...behaviorInfo, smoking: e.target.value })}>
                <option value="">เลือกคำตอบ</option>
                <option value="สูบบ่อยๆ">สูบบ่อยๆ</option>
                <option value="สูบไม่บ่อย">สูบไม่บ่อย</option>
                <option value="นานๆครั้ง">นานๆครั้ง</option>
                <option value="ไม่สูบ">ไม่สูบ</option>
              </Select>
            </Field>
            <Field label="การพนัน">
              <Select value={behaviorInfo.gambling} onChange={(e) => setBehaviorInfo({ ...behaviorInfo, gambling: e.target.value })}>
                <option value="">เลือกคำตอบ</option>
                <option value="เล่นบ่อยๆ">เล่นบ่อยๆ</option>
                <option value="เล่นแต่ไม่บ่อย">เล่นแต่ไม่บ่อย</option>
                <option value="นานๆครั้ง">นานๆครั้ง</option>
                <option value="ไม่เล่น">ไม่เล่น</option>
              </Select>
            </Field>
            <Field label="ภารกิจที่ได้รับมอบหมายจากครอบครัว">
              <Input value={behaviorInfo.familyResponsibility} onChange={(e) => setBehaviorInfo({ ...behaviorInfo, familyResponsibility: e.target.value })} />
            </Field>
            <Field label="ความสัมพันธ์กับสมาชิกในครอบครัว">
              <Select value={behaviorInfo.familyRelationship} onChange={(e) => setBehaviorInfo({ ...behaviorInfo, familyRelationship: e.target.value })}>
                <option value="">เลือกคำตอบ</option>
                <option value="ดีมาก">ดีมาก</option>
                <option value="ดี">ดี</option>
                <option value="ปานกลาง">ปานกลาง</option>
                <option value="น้อย">น้อย</option>
              </Select>
            </Field>
          </div>
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-6xl justify-end">
          <Button variant="primary" loading={saving} onClick={handleSave}>
            บันทึกข้อมูล
          </Button>
        </div>
      </div>
    </div>
  );
}
