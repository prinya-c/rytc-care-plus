import { formatThaiDate } from '../../utils/thaiDate';
import type { ContactChannels, DropoutFollowUp } from '../../types';

function describeContactChannels(channels: ContactChannels) {
  const parts: string[] = [];
  if (channels.phone) parts.push('โทรศัพท์');
  if (channels.line) parts.push('Line');
  if (channels.homeVisit) parts.push('ไปพบที่บ้าน');
  if (channels.other) parts.push(channels.otherDetail ? `อื่นๆ (${channels.otherDetail})` : 'อื่นๆ');
  return parts.length > 0 ? parts.join(', ') : 'ไม่มีข้อมูล';
}

/**
 * The official บันทึกข้อความ (memo) reporting the follow-up outcome for a
 * single student — no outer wrapper, so callers control whether it's
 * print-only or always visible.
 */
export function DropoutFollowUpPrintDocument({ record }: { record: DropoutFollowUp }) {
  return (
    <>
      <div className="relative flex items-center justify-center">
        <img src={`${import.meta.env.BASE_URL}300px-Thai_government_Garuda.jpg`} alt="ครุฑ" className="absolute left-0 h-16 w-auto" />
        <h2 className="text-lg font-bold">บันทึกข้อความ</h2>
      </div>

      <div className="mt-[1cm] flex items-baseline gap-1">
        <span className="shrink-0 font-bold">ส่วนราชการ</span>
        <span className="flex-1 border-b border-black">
          {record.departmentName ? `แผนกวิชา${record.departmentName}` : ''} วิทยาลัยเทคนิคระยอง
        </span>
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="shrink-0">ที่</span>
        <span className="flex-1 border-b border-black">{' '}</span>
        <span className="shrink-0">วันที่</span>
        <span className="flex-1 border-b border-black">{formatThaiDate(record.recordDate)}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="shrink-0 font-bold">เรื่อง</span>
        <span className="flex-1 border-b border-black">
          รายงานผลการติดตามผู้เรียนเพื่อแก้ปัญหาออกกลางคัน กรณี{record.studentName || ' '}
        </span>
      </div>

      <hr className="mt-[0.5cm] border-t-2 border-black" />

      <p className="mt-3">
        <span className="font-bold">เรียน</span> ผู้อำนวยการวิทยาลัยเทคนิคระยอง
      </p>

      <p className="mt-3 indent-8 text-justify">
        ด้วยผู้เรียนชื่อ {record.studentName || '.....................'} ระดับชั้น {record.className || '.....................'}{' '}
        สาขาวิชา{record.departmentName || '.....................'} ได้ขาดเรียนเป็นจำนวน{' '}
        {record.absentDays || '.....................'} วัน เนื่องจาก {record.absentReason || '.....................'} นั้น
      </p>
      <p className="mt-3 indent-8 text-justify">
        ข้าพเจ้าครูที่ปรึกษาได้ดำเนินการติดตามผู้เรียนผ่านช่องทาง {describeContactChannels(record.studentContactChannels)} และได้ติดต่อผู้ปกครองผ่านช่องทาง{' '}
        {describeContactChannels(record.parentContactChannels)} พร้อมแนบหลักฐานประกอบการติดตามไว้แล้ว
      </p>
      <p className="mt-3 indent-8 text-justify">
        สรุปผลการติดตามผู้เรียน {record.followUpSummary || '-'}
      </p>
      <p className="mt-3">
        ผลการติดตาม{' '}
        {['ติดตามผู้เรียนสำเร็จ', 'ติดตามผู้เรียนไม่สำเร็จ'].map((opt) => (
          <span key={opt} className="mr-4">
            {record.followUpResult === opt ? '☑' : '☐'} {opt}
          </span>
        ))}
      </p>

      <p className="mt-3">จึงเรียนมาเพื่อโปรดทราบ</p>

      <div className="mt-10 flex justify-end">
        <div className="text-center">
          <p>ลงชื่อ.............................................</p>
          <p className="mt-1">({record.advisorTeacherName || '.............................................'})</p>
          <p>ครูที่ปรึกษา</p>
        </div>
      </div>
    </>
  );
}
