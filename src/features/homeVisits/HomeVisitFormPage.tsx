import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchStudentByStudentId, studentDisplayName, studentSubtitle } from '../students/api';
import { fetchHomeVisitById, createHomeVisit, updateHomeVisit } from './api';
import { uploadHomeVisitImage } from '../../lib/storage';
import type { BehaviorInfo, FamilyInfo, StudentInfo } from '../../types';
import { LoadingState, ErrorState, Spinner } from '../../components/ui/States';
import { Section, Field, Input, Textarea, Button } from '../../components/ui/Form';
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
 * The teacher's part of a home visit: when it happened, photos/map, and
 * opinions. Personal/family/behavior info lives in the same HomeVisit
 * document but is edited from the ข้อมูลนักเรียน page (StudentInfoFormPage)
 * instead — this form never touches those fields, so it never overwrites
 * them either (Firestore's updateDoc only writes the keys it's given).
 */
export default function HomeVisitFormPage() {
  const { studentId, visitId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const isEdit = !!visitId;

  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
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
      setParentOpinion(v.parentOpinion);
      setAdvisorOpinion(v.advisorOpinion);
      setHomeVisitPhotos(v.images.homeVisitPhotos);
      setMapImage(v.images.mapImage);
    }
  }, [data]);

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
      if (isEdit && visitId) {
        // Only the visit-owned fields — leaves studentInfo/familyInfo/behaviorInfo untouched.
        await updateHomeVisit(visitId, {
          visitDate,
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
          behaviorInfo: emptyBehaviorInfo,
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
    <div className="space-y-5 pb-24">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">แบบบันทึกการเยี่ยมบ้านผู้เรียน</p>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{displayName}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {infoStudentId && (
          <Link
            to={`/student-info/${infoStudentId}`}
            className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            ข้อมูลนักเรียน
          </Link>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white px-4 sm:px-5">
        <Section title="วันที่เยี่ยมบ้าน">
          <Field label="วัน เดือน ปี ที่เยี่ยมบ้าน" required>
            <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="max-w-xs" />
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
