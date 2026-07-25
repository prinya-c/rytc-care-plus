import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchHomeVisitsByTeacher, fetchAllHomeVisits, createHomeVisit, updateHomeVisit, deleteHomeVisit } from './api';
import { fetchAllStudents, fetchStudentsByClasses, studentDisplayName } from '../students/api';
import { emptyStudentInfo, emptyFamilyInfo, emptyBehaviorInfo } from './HomeVisitFormPage';
import { deleteImageByUrl } from '../../lib/storage';
import { canViewCollegeOverview } from '../../utils/rbac';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Icon } from '../../components/ui/Icon';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import type { HomeVisit, Student, UserProfile } from '../../types';

const currentAcademicYear = String(new Date().getFullYear() + 543);

function selfReportUrl(visitId: string, token: string) {
  return `${window.location.origin}${import.meta.env.BASE_URL}home-visits/self-report/${visitId}/${token}`;
}

/**
 * Guarantees the student has a HomeVisit doc carrying a shareToken, creating
 * a draft (or back-filling a missing token) if needed, so the card can show
 * the self-report QR immediately without the teacher pressing anything.
 */
async function ensureShareableVisit(student: Student, existing: HomeVisit | undefined, profile: UserProfile, teacherId: string): Promise<HomeVisit> {
  if (existing?.shareToken) return existing;
  const token = crypto.randomUUID();
  if (existing) {
    await updateHomeVisit(existing.id, { shareToken: token });
    return { ...existing, shareToken: token };
  }
  const payload = {
    studentId: student.sid,
    studentName: studentDisplayName(student),
    classId: student.class_code,
    className: student.class_name ?? '',
    departmentId: student.dep_id ?? '',
    departmentName: student.dep_name ?? '',
    level: '',
    advisorTeacherId: teacherId,
    advisorTeacherName: profile.displayName,
    academicYear: currentAcademicYear,
    semester: '1',
    visitDate: '',
    studentInfo: emptyStudentInfo,
    familyInfo: emptyFamilyInfo,
    behaviorInfo: emptyBehaviorInfo,
    parentOpinion: '',
    advisorOpinion: '',
    images: { homeVisitPhotos: [], mapImage: '' },
    shareToken: token,
    status: 'draft' as const,
    createdBy: profile.uid,
  };
  const id = await createHomeVisit(payload);
  return { id, ...payload, createdAt: null, updatedAt: null };
}

export default function HomeVisitListPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const overview = canViewCollegeOverview(profile?.role);
  const teacherId = profile?.teacherId ?? profile?.uid ?? '';
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useAsync(async () => {
    const [visits, students] = await Promise.all([
      overview ? fetchAllHomeVisits() : fetchHomeVisitsByTeacher(teacherId),
      overview ? fetchAllStudents() : fetchStudentsByClasses(profile?.classIds ?? []),
    ]);
    const visitByStudent = new Map<string, HomeVisit>();
    for (const v of visits) if (!visitByStudent.has(v.studentId)) visitByStudent.set(v.studentId, v);

    // Advisor teachers see a ready-to-scan QR on every card, which needs a
    // token-carrying doc per student. Overview roles (admin/advisor_staff)
    // browse the whole college — auto-creating drafts for every student in
    // the college would flood the collection, so for them QRs appear only
    // where a shareable doc already exists.
    if (!overview && profile) {
      await Promise.all(
        students.map(async (s) => {
          const ensured = await ensureShareableVisit(s, visitByStudent.get(s.sid), profile, teacherId);
          visitByStudent.set(s.sid, ensured);
        }),
      );
    }

    const qrByStudent = new Map<string, string>();
    await Promise.all(
      students.map(async (s) => {
        const v = visitByStudent.get(s.sid);
        if (!v?.shareToken) return;
        qrByStudent.set(s.sid, await QRCode.toDataURL(selfReportUrl(v.id, v.shareToken), { width: 320, margin: 1 }));
      }),
    );

    return { students, visitByStudent, qrByStudent };
  }, [overview, teacherId, JSON.stringify(profile?.classIds)]);

  async function handleDelete(visit: HomeVisit) {
    const ok = await confirm({
      title: 'ลบบันทึกการเยี่ยมบ้านนี้?',
      description: `${visit.studentName} — ลบแล้วไม่สามารถกู้คืนได้`,
      confirmText: 'ลบ',
      tone: 'danger',
    });
    if (!ok) return;
    setDeletingId(visit.id);
    try {
      await deleteHomeVisit(visit.id);
      const images = [...visit.images.homeVisitPhotos, ...(visit.images.mapImage ? [visit.images.mapImage] : [])];
      await Promise.all(images.map((url) => deleteImageByUrl(url)));
      showToast('ลบบันทึกเรียบร้อยแล้ว');
      refetch();
    } catch {
      showToast('ลบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">เยี่ยมบ้าน</h1>
        <p className="text-sm text-gray-500">
          ทั้งหมด {data.students.length} คน · ให้นักเรียนสแกน QR บนการ์ดเพื่อกรอกข้อมูลส่วนตัวล่วงหน้า
        </p>
      </div>

      {data.students.length === 0 ? (
        <EmptyState
          title="ไม่พบผู้เรียนในกลุ่มเรียนที่รับผิดชอบ"
          description='ตรวจสอบกลุ่มเรียนได้ที่เมนู "กลุ่มเรียนของฉัน"'
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.students.map((s) => {
            const visit = data.visitByStudent.get(s.sid);
            // Auto-created draft shells (QR carriers) don't count as a visit.
            const visited = visit?.status === 'submitted';
            const qr = data.qrByStudent.get(s.sid);
            return (
              <div
                key={s.sid}
                className={`relative rounded-2xl border p-4 shadow-sm transition-colors ${
                  visited ? 'border-trust-100 bg-trust-50' : 'border-close-100 bg-close-50'
                }`}
              >
                {visited && (
                  <button
                    type="button"
                    title="ลบ"
                    disabled={deletingId === visit.id}
                    onClick={() => handleDelete(visit)}
                    className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-close-700 shadow-sm hover:bg-close-100 disabled:opacity-50"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                )}

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(visit ? `/home-visits/${visit.id}/edit` : `/home-visits/new/${s.sid}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate(visit ? `/home-visits/${visit.id}/edit` : `/home-visits/new/${s.sid}`);
                  }}
                  className="cursor-pointer"
                >
                  <p className="pr-8 text-sm font-bold leading-snug text-gray-900">{studentDisplayName(s)}</p>
                  <p className="mt-1 text-xs text-gray-500">{s.class_name}</p>
                  <p className={`mt-2 text-sm font-semibold ${visited ? 'text-trust-700' : 'text-close-700'}`}>
                    {visited ? `เยี่ยมบ้านแล้ว · ${visit!.visitDate || 'ยังไม่ระบุวันที่'}` : 'ยังไม่ได้เยี่ยมบ้าน'}
                  </p>
                </div>

                {qr && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-2">
                    <img src={qr} alt="QR ให้นักเรียนกรอกข้อมูล" className="h-24 w-24 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-700">ให้นักเรียนสแกนเพื่อกรอกข้อมูลส่วนตัว</p>
                      <button
                        type="button"
                        onClick={() => {
                          const v = data.visitByStudent.get(s.sid)!;
                          navigator.clipboard.writeText(selfReportUrl(v.id, v.shareToken!));
                          showToast('คัดลอกลิงก์แล้ว');
                        }}
                        className="mt-1.5 rounded-md bg-white px-2 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                      >
                        คัดลอกลิงก์
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
