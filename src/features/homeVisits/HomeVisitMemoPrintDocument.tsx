import { formatThaiDate } from '../../utils/thaiDate';
import type { HomeVisitMemo } from '../../types';

/**
 * The official บันทึกข้อความ (memo) body, filled in from a saved
 * HomeVisitMemo record. No outer wrapper — callers control whether it's
 * always visible (the detail page's on-screen preview) or print-only
 * (the list page's in-place printing).
 */
export function HomeVisitMemoPrintDocument({ memo }: { memo: HomeVisitMemo }) {
  return (
    <>
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
      <div className="mt-1 flex items-end gap-1">
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
          <p>หัวหน้างานครูที่ปรึกษาและการแนะแนว</p>
        </div>
        <div className="text-center">
          <p>ลงชื่อ.............................................</p>
          <p className="mt-1">({memo.deputyDirectorName || '.............................................'})</p>
          <p>รองผู้อำนวยการฝ่ายกิจการนักเรียนนักศึกษา</p>
        </div>
      </div>
    </>
  );
}
