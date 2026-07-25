import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { fetchHomeVisitsByTeacher, fetchAllHomeVisits } from './api';
import { fetchAllStudents, fetchStudentsByClasses } from '../students/api';
import { canViewCollegeOverview } from '../../utils/rbac';
import { formatThaiDate } from '../../utils/thaiDate';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { Field, Input, Button } from '../../components/ui/Form';

const SIGNER_STORAGE_KEY = 'rytc-care-plus:home-visit-memo-signers';

interface SignerNames {
  deptHeadName: string;
  advisorHeadName: string;
  deputyDirectorName: string;
}

function loadStoredSigners(): SignerNames {
  try {
    const raw = localStorage.getItem(SIGNER_STORAGE_KEY);
    if (!raw) return { deptHeadName: '', advisorHeadName: '', deputyDirectorName: '' };
    return { deptHeadName: '', advisorHeadName: '', deputyDirectorName: '', ...JSON.parse(raw) };
  } catch {
    return { deptHeadName: '', advisorHeadName: '', deputyDirectorName: '' };
  }
}

/**
 * Round-summary "บันทึกข้อความ" memo — a teacher-level report, not tied to
 * any one student's record, reached via a button outside the card grid on
 * the เยี่ยมบ้าน list. Order number / round number / signer names have no
 * natural home in the data model (they're print metadata, not app data),
 * so they're plain form state here; signer names persist in localStorage
 * as a convenience since the same people usually sign every round.
 */
export default function HomeVisitMemoPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const overview = canViewCollegeOverview(profile?.role);
  const teacherId = profile?.teacherId ?? profile?.uid ?? '';

  const { data, loading, error } = useAsync(async () => {
    const [visits, students] = await Promise.all([
      overview ? fetchAllHomeVisits() : fetchHomeVisitsByTeacher(teacherId),
      overview ? fetchAllStudents() : fetchStudentsByClasses(profile?.classIds ?? []),
    ]);
    const visitByStudent = new Map(visits.map((v) => [v.studentId, v]));
    const visitedCount = students.filter((s) => visitByStudent.get(s.sid)?.status === 'submitted').length;
    const classNames = Array.from(new Set(students.map((s) => s.class_name).filter(Boolean)));
    return { totalStudents: students.length, visitedCount, classNames };
  }, [overview, teacherId, JSON.stringify(profile?.classIds)]);

  const [orderNumber, setOrderNumber] = useState('');
  const [roundNumber, setRoundNumber] = useState('1');
  const [level, setLevel] = useState('');
  const [memoDate, setMemoDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [signers, setSigners] = useState<SignerNames>(loadStoredSigners);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (data && !level) setLevel(data.classNames.join(', '));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    localStorage.setItem(SIGNER_STORAGE_KEY, JSON.stringify(signers));
  }, [signers]);

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

  return (
    <div className="space-y-5 pb-24 print:space-y-0 print:pb-0">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">พิมพ์บันทึกข้อความ</h1>
          <p className="text-sm text-gray-500">รายงานผลการออกเยี่ยมบ้านผู้เรียน — กรอกรายละเอียดให้ครบก่อนพิมพ์</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/home-visits')}>
          กลับ
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2 print:hidden">
        <Field label="เลขที่คำสั่งแต่งตั้งคณะกรรมการ" hint="เช่น 1751/2568">
          <Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
        </Field>
        <Field label="วันที่ในบันทึกข้อความ">
          <Input type="date" value={memoDate} onChange={(e) => setMemoDate(e.target.value)} />
        </Field>
        <Field label="ระดับชั้น/กลุ่มเรียนที่ดูแล">
          <Input value={level} onChange={(e) => setLevel(e.target.value)} />
        </Field>
        <Field label="ออกเยี่ยมบ้านเป็นครั้งที่">
          <Input value={roundNumber} onChange={(e) => setRoundNumber(e.target.value)} className="max-w-[6rem]" />
        </Field>
        <Field label="หัวหน้าแผนกวิชา">
          <Input value={signers.deptHeadName} onChange={(e) => setSigners({ ...signers, deptHeadName: e.target.value })} />
        </Field>
        <Field label="หัวหน้างานครูที่ปรึกษา">
          <Input value={signers.advisorHeadName} onChange={(e) => setSigners({ ...signers, advisorHeadName: e.target.value })} />
        </Field>
        <Field label="รองผู้อำนวยการฝ่ายพัฒนากิจการนักเรียน นักศึกษา">
          <Input value={signers.deputyDirectorName} onChange={(e) => setSigners({ ...signers, deputyDirectorName: e.target.value })} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3 print:hidden">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">นักเรียนในความดูแล</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{data.totalStudents}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">เยี่ยมบ้านแล้ว</p>
          <p className="mt-2 text-3xl font-bold text-trust-700">{data.visitedCount}</p>
        </div>
      </div>

      <div className="flex justify-end print:hidden">
        <Button variant="primary" onClick={() => setPrinting(true)}>
          พิมพ์บันทึกข้อความ
        </Button>
      </div>

      {printing && (
        <div className="hidden print:block text-sm leading-relaxed">
          <div className="relative flex items-center justify-center">
            <img src={`${import.meta.env.BASE_URL}300px-Thai_government_Garuda.jpg`} alt="ครุฑ" className="absolute left-0 h-16 w-auto" />
            <h2 className="text-lg font-bold">บันทึกข้อความ</h2>
          </div>

          <div className="mt-[1cm] flex items-baseline gap-1">
            <span className="shrink-0 font-bold">ส่วนราชการ</span>
            <span className="flex-1 border-b border-black">
              {profile?.departmentName ? `แผนกวิชา${profile.departmentName}` : ''} วิทยาลัยเทคนิคระยอง
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="shrink-0">ที่</span>
            <span className="flex-1 border-b border-black">{orderNumber || ' '}</span>
            <span className="shrink-0">วันที่</span>
            <span className="flex-1 border-b border-black">{formatThaiDate(memoDate)}</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="shrink-0 font-bold">เรื่อง</span>
            <span className="flex-1 border-b border-black">
              รายงานผลการออกเยี่ยมบ้านผู้เรียนตามโครงการสานสัมพันธ์ ครู - ศิษย์ วิทยาลัยเทคนิคระยอง
            </span>
          </div>

          <hr className="mt-[0.5cm] border-t-2 border-black" />

          <p className="mt-3">
            <span className="font-bold">เรียน</span> ผู้อำนวยการวิทยาลัยเทคนิคระยอง
          </p>

          <p className="mt-3 indent-8 text-justify">
            ตามคำสั่งวิทยาลัยเทคนิคระยองที่ {orderNumber || '.....................'} เรื่องแต่งตั้งคณะกรรมการดำเนินงานโครงการเยี่ยมบ้านสานสัมพันธ์
            ครู - ศิษย์ วิทยาลัยเทคนิคระยอง ได้แต่งตั้งครูที่ปรึกษาดำเนินการออกเยี่ยมบ้านผู้เรียนประจำปีการศึกษา{' '}
            {String(new Date(memoDate).getFullYear() + 543)}
          </p>
          <p className="mt-3 indent-8 text-justify">
            ข้าพเจ้าครูที่ปรึกษาระดับชั้น {level || '.....................'} สาขาวิชา{profile?.departmentName || '.....................'}{' '}
            มีนักเรียน นักศึกษาในความดูแลจำนวน {data.totalStudents} คน ได้ดำเนินการออกเยี่ยมบ้านผู้เรียนเป็นครั้งที่ {roundNumber || '.....................'}{' '}
            จำนวน {data.visitedCount} คน
          </p>
          <p className="mt-3 indent-8 text-justify">
            บัดนี้ การออกเยี่ยมบ้านผู้เรียนตามโครงการสานสัมพันธ์ ครู - ศิษย์ วิทยาลัยเทคนิคระยองได้ดำเนินการเสร็จสิ้นแล้ว
            ข้าพเจ้าจึงขอสรุปรายงานผลการดำเนินงาน ดังรายละเอียดที่แนบมาพร้อมนี้
          </p>

          <p className="mt-3">จึงเรียนมาเพื่อโปรดพิจารณา</p>

          <div className="mt-10 flex justify-end">
            <div className="text-center">
              <p>ลงชื่อ.............................................</p>
              <p className="mt-1">({profile?.displayName || '.............................................'})</p>
              <p>ครูที่ปรึกษา</p>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <div className="text-center">
              <p>ลงชื่อ.............................................</p>
              <p className="mt-1">({signers.deptHeadName || '.............................................'})</p>
              <p>หัวหน้าแผนกวิชา</p>
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <div className="text-center">
              <p>ลงชื่อ.............................................</p>
              <p className="mt-1">({signers.advisorHeadName || '.............................................'})</p>
              <p>หัวหน้างานครูที่ปรึกษา</p>
            </div>
            <div className="text-center">
              <p>ลงชื่อ.............................................</p>
              <p className="mt-1">({signers.deputyDirectorName || '.............................................'})</p>
              <p>รองผู้อำนวยการฝ่ายพัฒนากิจการนักเรียน นักศึกษา</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
