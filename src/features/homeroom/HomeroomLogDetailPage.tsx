import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAsync } from '../../hooks/useAsync';
import { fetchHomeroomLogById } from './api';
import { LoadingState, ErrorState } from '../../components/ui/States';
import { Button } from '../../components/ui/Form';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

/** Parse an `<input type="date">` value (`YYYY-MM-DD`) as a local-time Date, avoiding UTC day-shift. */
function parseDateInputValue(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatThaiDate(value: string) {
  if (!value) return '.....................';
  const date = parseDateInputValue(value);
  return `${date.getDate()} ${THAI_MONTHS[date.getMonth()]} ${date.getFullYear() + 543}`;
}

export default function HomeroomLogDetailPage() {
  const { logId } = useParams();
  const [printing, setPrinting] = useState(false);

  const { data: log, loading, error, refetch } = useAsync(() => fetchHomeroomLogById(logId!), [logId]);

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
  if (error || !log) return <ErrorState onRetry={refetch} title="ไม่พบบันทึกกิจกรรมโฮมรูมนี้" />;

  const presentCount = log.totalStudents - log.absentStudents.length;

  return (
    <div className="space-y-5 print:space-y-0">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">รายงานการพบนักเรียน นักศึกษา ครั้งที่ {log.sessionNumber}</h1>
          <p className="text-sm text-gray-500">
            {log.className} · ภาคเรียนที่ {log.semester} ปีการศึกษา {log.academicYear} · {formatThaiDate(log.sessionDate)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/homeroom/${log.id}/edit`}
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            แก้ไข
          </Link>
          <Button variant="secondary" onClick={() => setPrinting(true)}>
            พิมพ์บันทึกข้อความ
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 print:hidden">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">นักเรียนทั้งหมด</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{log.totalStudents}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">มาพบ</p>
          <p className="mt-2 text-3xl font-bold text-trust-700">{presentCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">ขาด</p>
          <p className="mt-2 text-3xl font-bold text-close-700">{log.absentStudents.length}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 print:hidden">
        <h2 className="text-sm font-semibold text-gray-900">รายละเอียดการดูแลและให้คำปรึกษา</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{log.detail || '—'}</p>

        {log.absentStudents.length > 0 && (
          <>
            <h2 className="mt-4 text-sm font-semibold text-gray-900">รายชื่อนักเรียนที่ขาด</h2>
            <ul className="mt-2 list-inside list-decimal text-sm text-gray-700">
              {log.absentStudents.map((s) => (
                <li key={s.studentId}>{s.studentName}</li>
              ))}
            </ul>
          </>
        )}

        {log.images.length > 0 && (
          <>
            <h2 className="mt-4 text-sm font-semibold text-gray-900">ภาพประกอบ</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {log.images.map((url) => (
                <img key={url} src={url} alt="" className="h-24 w-24 rounded-lg border border-gray-200 object-cover" />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Print-only: official บันทึกข้อความ (memo) mirroring the college's paper form. */}
      {printing && (
        <div className="hidden print:block text-sm leading-relaxed">
          <div className="relative flex items-center justify-center">
            <img
              src={`${import.meta.env.BASE_URL}300px-Thai_government_Garuda.jpg`}
              alt="ครุฑ"
              className="absolute left-0 h-16 w-auto"
            />
            <h2 className="text-lg font-bold">บันทึกข้อความ</h2>
          </div>

          <div className="mt-[1cm] flex items-baseline gap-1">
            <span className="shrink-0 font-bold">ส่วนราชการ</span>
            <span className="flex-1 border-b border-black">
              {log.departmentName ? `แผนกวิชา${log.departmentName}` : ''} วิทยาลัยเทคนิคระยอง
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="shrink-0">ที่</span>
            <span className="flex-1 border-b border-black">{log.docNumber || ' '}</span>
            <span className="shrink-0">วันที่</span>
            <span className="flex-1 border-b border-black">{formatThaiDate(log.sessionDate)}</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="shrink-0 font-bold">เรื่อง</span>
            <span className="flex-1 border-b border-black">
              รายงานการพบนักเรียน นักศึกษา ครั้งที่ {log.sessionNumber} ภาคเรียนที่ {log.semester} ปีการศึกษา {log.academicYear}
            </span>
          </div>

          <hr className="mt-[0.5cm] border-t-2 border-black" />

          <p className="mt-3">
            <span className="font-bold">เรียน</span> ผู้อำนวยการวิทยาลัยเทคนิคระยอง
          </p>

          <p className="mt-3 indent-8 text-justify">
            ตามที่วิทยาลัยเทคนิคระยอง ได้มอบหมายให้ข้าพเจ้าทำหน้าที่ครูที่ปรึกษาชั้น {log.className} มีนักเรียน นักศึกษาในความดูแลจำนวน{' '}
            {log.totalStudents} คน กำหนดพบนักเรียนนักศึกษา ครั้งที่ {log.sessionNumber} ของภาคเรียนนี้ในวันที่{' '}
            {formatThaiDate(log.sessionDate)} นั้น
          </p>
          <p className="mt-3 indent-8 text-justify">
            ข้าพเจ้าได้ปฏิบัติหน้าที่เรียบร้อยแล้ว มีนักเรียนมาพบครั้งนี้จำนวน {presentCount} คน ขาด {log.absentStudents.length} คน
            มีรายละเอียดการดูแลนักเรียน และการให้คำปรึกษา ดังนี้
          </p>

          <p className="mt-3">1. เรื่องที่ปรึกษา / คำแนะนำ / ปัญหาที่พบและการแก้ไข การแต่งกาย การมาเรียน</p>
          <p className="indent-8 text-justify">{log.detail || '-'}</p>

          <p className="mt-3">2. รายชื่อนักเรียนที่ขาด</p>
          <p className="indent-8 text-justify">
            {log.absentStudents.length > 0 ? log.absentStudents.map((s) => s.studentName).join(', ') : '-ไม่มี-'}
          </p>

          <p className="mt-3">จึงเรียนมาเพื่อโปรดพิจารณา</p>

          <div className="mt-10 flex justify-end">
            <div className="text-center">
              <p>ลงชื่อ.............................................</p>
              <p className="mt-1">({log.advisorTeacherName || '.............................................'})</p>
              <p>ครูที่ปรึกษา</p>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <div className="text-center">
              <p>ลงชื่อ.............................................</p>
              <p className="mt-1">({log.deptHeadName || '.............................................'})</p>
              <p>หัวหน้าแผนกวิชา</p>
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <div className="text-center">
              <p>ลงชื่อ.............................................</p>
              <p className="mt-1">({log.advisorHeadName || '.............................................'})</p>
              <p>หัวหน้างานครูที่ปรึกษา</p>
            </div>
            <div className="text-center">
              <p>ลงชื่อ.............................................</p>
              <p className="mt-1">({log.deputyDirectorName || '.............................................'})</p>
              <p>รองผู้อำนวยการฝ่ายพัฒนากิจการนักเรียน</p>
            </div>
          </div>

          {log.images.length > 0 && (
            <div className="break-before-page">
              <h2 className="text-center text-base font-bold">ภาพประกอบการพบนักเรียน นักศึกษา</h2>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {log.images.map((url) => (
                  <div key={url} className="border border-black p-1">
                    <img src={url} alt="" className="h-64 w-auto object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
