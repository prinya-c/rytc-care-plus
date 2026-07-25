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
import { LoadingState, ErrorState, EmptyState, Spinner } from '../../components/ui/States';
import { Button } from '../../components/ui/Form';
import { Icon } from '../../components/ui/Icon';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import type { HomeVisit, Student } from '../../types';

const currentAcademicYear = String(new Date().getFullYear() + 543);

function selfReportUrl(visitId: string, token: string) {
  return `${window.location.origin}${import.meta.env.BASE_URL}home-visits/self-report/${visitId}/${token}`;
}

export default function HomeVisitListPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const overview = canViewCollegeOverview(profile?.role);
  const teacherId = profile?.teacherId ?? profile?.uid ?? '';
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sharingSid, setSharingSid] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<{ url: string; dataUrl: string } | null>(null);

  const { data, loading, error, refetch } = useAsync(async () => {
    const [visits, students] = await Promise.all([
      overview ? fetchAllHomeVisits() : fetchHomeVisitsByTeacher(teacherId),
      overview ? fetchAllStudents() : fetchStudentsByClasses(profile?.classIds ?? []),
    ]);
    const visitByStudent = new Map<string, HomeVisit>();
    for (const v of visits) if (!visitByStudent.has(v.studentId)) visitByStudent.set(v.studentId, v);
    return { students, visitByStudent };
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

  /** Creates a draft visit if none exists yet, ensures it has a share token, then shows the QR. */
  async function handleShareQr(student: Student, existingVisit?: HomeVisit) {
    if (!profile) return;
    setSharingSid(student.sid);
    try {
      let visitId = existingVisit?.id;
      let token = existingVisit?.shareToken;

      if (!token) token = crypto.randomUUID();

      if (!visitId) {
        visitId = await createHomeVisit({
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
          status: 'draft',
          createdBy: profile.uid,
        });
        refetch();
      } else if (!existingVisit?.shareToken) {
        await updateHomeVisit(visitId, { shareToken: token });
        refetch();
      }

      const url = selfReportUrl(visitId, token);
      const dataUrl = await QRCode.toDataURL(url, { width: 240, margin: 1 });
      setQrModal({ url, dataUrl });
    } catch {
      showToast('สร้างลิงก์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setSharingSid(null);
    }
  }

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">เยี่ยมบ้าน</h1>
        <p className="text-sm text-gray-500">ทั้งหมด {data.students.length} คน</p>
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
            // A record created just to carry the QR share token (or saved as
            // a draft) is not a completed visit — only a submitted one is.
            const visited = visit?.status === 'submitted';
            return (
              <div
                key={s.sid}
                className={`relative rounded-2xl border p-4 shadow-sm transition-colors ${
                  visited ? 'border-trust-100 bg-trust-50' : 'border-close-100 bg-close-50'
                }`}
              >
                {visit && (
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
                  <p className={`mt-3 text-sm font-semibold ${visited ? 'text-trust-700' : 'text-close-700'}`}>
                    {visited
                      ? `เยี่ยมบ้านแล้ว · ${visit!.visitDate || 'ยังไม่ระบุวันที่'}`
                      : visit
                        ? 'ยังไม่ได้เยี่ยมบ้าน · มีแบบร่าง'
                        : 'ยังไม่ได้เยี่ยมบ้าน'}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={sharingSid === s.sid}
                  onClick={() => handleShareQr(s, visit)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  {sharingSid === s.sid ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="document" className="h-3.5 w-3.5" />}
                  แชร์ QR ให้นักเรียนกรอกข้อมูล
                </button>
              </div>
            );
          })}
        </div>
      )}

      {qrModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">ให้นักเรียนสแกน QR เพื่อกรอกข้อมูล</h3>
            <p className="mt-1 text-xs text-gray-500">เฉพาะข้อมูลส่วนตัวและครอบครัวเบื้องต้น ไม่รวมส่วนที่ครูต้องประเมิน</p>
            <img src={qrModal.dataUrl} alt="QR code" className="mx-auto mt-4 h-56 w-56" />
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5">
              <input readOnly value={qrModal.url} className="min-w-0 flex-1 truncate bg-transparent text-xs text-gray-600" />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(qrModal.url);
                  showToast('คัดลอกลิงก์แล้ว');
                }}
                className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                คัดลอก
              </button>
            </div>
            <Button variant="secondary" onClick={() => setQrModal(null)} className="mt-4 w-full">
              ปิด
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
