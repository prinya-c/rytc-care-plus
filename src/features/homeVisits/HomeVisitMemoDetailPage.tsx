import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAsync } from '../../hooks/useAsync';
import { fetchHomeVisitMemoById } from './memoApi';
import { formatThaiDate } from '../../utils/thaiDate';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { Button } from '../../components/ui/Form';

export default function HomeVisitMemoDetailPage() {
  const { memoId } = useParams();
  const [printing, setPrinting] = useState(false);

  const { data: memo, loading, error, refetch } = useAsync(() => fetchHomeVisitMemoById(memoId!), [memoId]);

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
  if (error || !memo) return <ErrorState onRetry={refetch} title="ไม่พบบันทึกข้อความนี้" />;

  return (
    <div className="space-y-5 print:space-y-0">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">บันทึกข้อความ ครั้งที่ {memo.roundNumber || '-'}</h1>
          <p className="text-sm text-gray-500">
            ระดับชั้น {memo.level || '-'} · {memo.memoDate ? formatThaiDate(memo.memoDate) : 'ไม่ระบุวันที่'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/home-visits/memo/${memo.id}/edit`}
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            แก้ไข
          </Link>
          <Button variant="secondary" onClick={() => setPrinting(true)}>
            พิมพ์บันทึกข้อความ
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 print:hidden">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">นักเรียนในความดูแล</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{memo.totalStudents}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">เยี่ยมบ้านแล้ว</p>
          <p className="mt-2 text-3xl font-bold text-trust-700">{memo.visitedCount}</p>
        </div>
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
              {memo.departmentName ? `แผนกวิชา${memo.departmentName}` : ''} วิทยาลัยเทคนิคระยอง
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="shrink-0">ที่</span>
            <span className="flex-1 border-b border-black">{memo.orderNumber || ' '}</span>
            <span className="shrink-0">วันที่</span>
            <span className="flex-1 border-b border-black">{formatThaiDate(memo.memoDate)}</span>
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
            ตามคำสั่งวิทยาลัยเทคนิคระยองที่ {memo.orderNumber || '.....................'} เรื่องแต่งตั้งคณะกรรมการดำเนินงานโครงการเยี่ยมบ้านสานสัมพันธ์
            ครู - ศิษย์ วิทยาลัยเทคนิคระยอง ได้แต่งตั้งครูที่ปรึกษาดำเนินการออกเยี่ยมบ้านผู้เรียนประจำปีการศึกษา{' '}
            {memo.memoDate ? String(new Date(memo.memoDate).getFullYear() + 543) : '.....................'}
          </p>
          <p className="mt-3 indent-8 text-justify">
            ข้าพเจ้าครูที่ปรึกษาระดับชั้น {memo.level || '.....................'} สาขาวิชา{memo.departmentName || '.....................'}{' '}
            มีนักเรียน นักศึกษาในความดูแลจำนวน {memo.totalStudents} คน ได้ดำเนินการออกเยี่ยมบ้านผู้เรียนเป็นครั้งที่{' '}
            {memo.roundNumber || '.....................'} จำนวน {memo.visitedCount} คน
          </p>
          <p className="mt-3 indent-8 text-justify">
            บัดนี้ การออกเยี่ยมบ้านผู้เรียนตามโครงการสานสัมพันธ์ ครู - ศิษย์ วิทยาลัยเทคนิคระยองได้ดำเนินการเสร็จสิ้นแล้ว
            ข้าพเจ้าจึงขอสรุปรายงานผลการดำเนินงาน ดังรายละเอียดที่แนบมาพร้อมนี้
          </p>

          <p className="mt-3">จึงเรียนมาเพื่อโปรดพิจารณา</p>

          <div className="mt-10 flex justify-end">
            <div className="text-center">
              <p>ลงชื่อ.............................................</p>
              <p className="mt-1">({memo.advisorTeacherName || '.............................................'})</p>
              <p>ครูที่ปรึกษา</p>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <div className="text-center">
              <p>ลงชื่อ.............................................</p>
              <p className="mt-1">({memo.deptHeadName || '.............................................'})</p>
              <p>หัวหน้าแผนกวิชา</p>
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <div className="text-center">
              <p>ลงชื่อ.............................................</p>
              <p className="mt-1">({memo.advisorHeadName || '.............................................'})</p>
              <p>หัวหน้างานครูที่ปรึกษา</p>
            </div>
            <div className="text-center">
              <p>ลงชื่อ.............................................</p>
              <p className="mt-1">({memo.deputyDirectorName || '.............................................'})</p>
              <p>รองผู้อำนวยการฝ่ายพัฒนากิจการนักเรียน นักศึกษา</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
