import { formatThaiDate } from '../../utils/thaiDate';
import { PROBLEM_LABEL, PROBLEM_ORDER, TARGET_WORK_LABEL, TARGET_WORK_PURPOSE, type Referral } from '../../types';

function describeProblems(referral: Referral) {
  const parts = PROBLEM_ORDER.filter((key) => referral.problems?.[key]).map((key) => PROBLEM_LABEL[key]);
  if (referral.problems?.other) parts.push(referral.problems.otherDetail ? `อื่นๆ (${referral.problems.otherDetail})` : 'อื่นๆ');
  return parts.length > 0 ? parts.join(', ') : 'ไม่มีข้อมูล';
}

/**
 * The official บันทึกข้อความ (memo) referring a single student to the
 * responsible work unit — no outer wrapper, so callers control whether it's
 * print-only or always visible.
 */
export function ReferralPrintDocument({ referral }: { referral: Referral }) {
  return (
    <>
      <div className="relative flex items-center justify-center">
        <img src={`${import.meta.env.BASE_URL}300px-Thai_government_Garuda.jpg`} alt="ครุฑ" className="absolute left-0 h-16 w-auto" />
        <h2 className="text-lg font-bold">บันทึกข้อความ</h2>
      </div>

      <div className="mt-[1cm] flex items-baseline gap-1">
        <span className="shrink-0 font-bold">ส่วนราชการ</span>
        <span className="flex-1 border-b border-black">
          {referral.departmentName ? `แผนกวิชา${referral.departmentName}` : ''} วิทยาลัยเทคนิคระยอง
        </span>
      </div>
      <div className="mt-1 flex items-end gap-1">
        <span className="shrink-0">ที่</span>
        <span className="flex-1 border-b border-black">{' '}</span>
        <span className="shrink-0">วันที่</span>
        <span className="flex-1 border-b border-black">{formatThaiDate(referral.referredDate)}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="shrink-0 font-bold">เรื่อง</span>
        <span className="flex-1 border-b border-black">
          ขอส่งต่อผู้เรียน{TARGET_WORK_PURPOSE[referral.targetWork]} กรณี {referral.studentName || ' '}
        </span>
      </div>

      <hr className="mt-[0.5cm] border-t-2 border-black" />

      <p className="mt-3">
        <span className="font-bold">เรียน</span> หัวหน้า{TARGET_WORK_LABEL[referral.targetWork]}
      </p>

      <p className="mt-3 indent-8 text-justify">
        ด้วยข้าพเจ้าครูที่ปรึกษาได้ติดตามดูแลผู้เรียนชื่อ {referral.studentName || '.....................'} ระดับชั้น{' '}
        {referral.className || '.....................'} สาขาวิชา{referral.departmentName || '.....................'} พบว่าผู้เรียนมีปัญหา{' '}
        {describeProblems(referral)} จึงขอส่งต่อผู้เรียนไปยัง{TARGET_WORK_LABEL[referral.targetWork]}{' '}
        {TARGET_WORK_PURPOSE[referral.targetWork]} นั้น
      </p>
      {referral.problemSummary && (
        <p className="mt-3 indent-8 text-justify">สรุปปัญหาพอสังเขป {referral.problemSummary}</p>
      )}

      <p className="mt-3 indent-8 text-justify">จึงเรียนมาเพื่อโปรดพิจารณา</p>

      <div className="mt-10 flex justify-end">
        <div className="w-64 text-center">
          <p>ลงชื่อ.............................................</p>
          <p className="mt-1">({referral.referredByName || '.............................................'})</p>
          <p>ครูที่ปรึกษา</p>
        </div>
      </div>
    </>
  );
}
