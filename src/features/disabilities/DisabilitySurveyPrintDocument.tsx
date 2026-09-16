import type { ReactNode } from 'react';
import { formatThaiDate } from '../../utils/thaiDate';
import type { DisabilitySurvey } from '../../types';

const PRIOR_EDUCATION_LABEL: Record<string, string> = {
  'ม.3': 'มัธยมศึกษาตอนต้น (ม.3)',
  'ม.6': 'มัธยมศึกษาตอนปลาย (ม.6)',
  'ปวช.': 'ประกาศนียบัตรวิชาชีพ (ปวช.)',
  'ปวส.': 'ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)',
};

const CURRENT_LEVEL_LABEL: Record<string, string> = {
  'ปวช.': 'หลักสูตรประกาศนียบัตรวิชาชีพ (ปวช.)',
  'ปวส.': 'หลักสูตรประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)',
  'ปริญญาตรีสายเทคโนโลยีหรือสายปฏิบัติการ': 'หลักสูตรปริญญาตรีสายเทคโนโลยีหรือสายปฏิบัติการ',
};

const DOCTOR_VISIT_LABEL: Record<string, string> = {
  monthly: 'พบแพทย์ทุกเดือน',
  as_appointed: 'พบแพทย์ตามนัด (มากกว่า 2 เดือน)',
  none: 'ไม่ได้พบแพทย์ประจำ',
};

/** ☐ / ☑ — used for independently-selectable options. */
function Check({ checked, label, children }: { checked: boolean; label?: string; children?: ReactNode }) {
  return (
    <span className="mr-4 inline-flex items-baseline gap-1">
      <span>{checked ? '☑' : '☐'}</span>
      <span>{label}{children}</span>
    </span>
  );
}

/** ○ / ● — used for mutually-exclusive sub-choices under a parent checkbox. */
function Radio({ checked, label }: { checked: boolean; label: string }) {
  return (
    <span className="mr-4 inline-flex items-baseline gap-1">
      <span>{checked ? '●' : '○'}</span>
      <span>{label}</span>
    </span>
  );
}

/** A dotted fill-in-the-blank line, matching the paper form's "...................." style. */
function Blank({ value, className = '' }: { value?: string; className?: string }) {
  return <span className={`border-b border-dotted border-black px-1 ${className}`}>{value || ' '}</span>;
}

/** A row of single-character boxes, grouped and dash-separated (e.g. citizen ID 1-4-5-2-1). */
function DigitBoxes({ value, groups }: { value?: string; groups: number[] }) {
  const digits = (value || '').replace(/\D/g, '').split('');
  let idx = 0;
  return (
    <span className="mx-1 inline-flex items-center align-middle">
      {groups.map((size, gi) => (
        <span key={gi} className="inline-flex items-center">
          {gi > 0 && <span className="mx-0.5">-</span>}
          {Array.from({ length: size }).map((_, i) => {
            const ch = digits[idx];
            idx += 1;
            return (
              <span key={i} className="ml-0.5 inline-flex h-5 w-4 items-center justify-center border border-black text-[10px] leading-none first:ml-0">
                {ch || ''}
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mt-4 font-bold">{children}</h3>;
}

/**
 * A pixel-close replica of the 2-page "แบบสำรวจข้อมูลผู้เรียนพิการ" paper form
 * (VEC — วิทยาลัยเทคนิคระยอง), filled in from a saved DisabilitySurvey record.
 * No outer wrapper — callers control whether it's print-only or always
 * visible (see DropoutFollowUpPrintDocument for the same convention).
 */
export function DisabilitySurveyPrintDocument({ record }: { record: DisabilitySurvey }) {
  const needs = record.assistiveNeeds;

  return (
    <>
      <div className="flex items-start gap-3">
        <img src={`${import.meta.env.BASE_URL}vec-logo-300x300.png`} alt="ตราวิทยาลัย" className="h-20 w-20 shrink-0 object-contain" />
        <div className="flex-1 text-center">
          <h2 className="text-lg font-bold">แบบสำรวจข้อมูลผู้เรียนพิการ</h2>
          <p>วิทยาลัย<Blank value="เทคนิคระยอง" className="ml-1" /></p>
          <p>
            ภาคเรียนที่ <Blank value={record.semester} /> ประจำปีการศึกษา <Blank value={record.academicYear} />
          </p>
        </div>
        <div className="flex h-24 w-20 shrink-0 flex-col items-center justify-center border border-black text-center text-[10px] leading-tight text-gray-600">
          {record.photoUrl ? (
            <img src={record.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <>
              <span>ติดรูป</span>
              <span>ขนาด</span>
              <span>1 นิ้ว</span>
            </>
          )}
        </div>
      </div>

      <p className="mt-3 indent-8 text-justify">
        วิทยาลัยเทคนิคระยอง จัดทำแบบสำรวจข้อมูล ผู้เรียนพิการ เพื่อรวบรวมข้อมูลสำหรับกำหนดแนวทางการจัดการศึกษาที่สอดคล้องกับความต้องการของผู้เรียนพิการ
        เพื่อจัดบริการการศึกษาให้แก่นักเรียน นักศึกษาได้อย่างเหมาะสม จึงขอความร่วมมือจากท่านโปรดกรอกข้อมูลให้ครบทุกประเด็นตามความเป็นจริง
      </p>

      <SectionTitle>1. ข้อมูลทั่วไป</SectionTitle>
      <p className="mt-1">
        ชื่อนักศึกษา<Blank value={record.studentName} className="ml-1 flex-1" />
      </p>
      <p className="mt-1">
        เลขประจำตัวนักเรียน นักศึกษา (11 หลัก)
        <DigitBoxes value={record.studentId} groups={[11]} />
      </p>
      <p className="mt-1">
        เลขบัตรประจำตัวประชาชน (13 หลัก)
        <DigitBoxes value={record.citizenId} groups={[1, 4, 5, 2, 1]} />
      </p>
      <p className="mt-1">
        ศาสนา<Blank value={record.religion} /> วัน เดือน ปี เกิด<Blank value={formatThaiDate(record.birthDate)} /> อายุ{' '}
        <Blank value={record.age} /> ปี
      </p>
      <p className="mt-2">ที่อยู่ปัจจุบันที่ติดต่อได้</p>
      <p className="ml-4">
        บ้านเลขที่<Blank value={record.houseNumber} /> หมู่ที่<Blank value={record.moo} /> หมู่บ้าน<Blank value={record.villageName} />{' '}
        ซอย<Blank value={record.soi} />
      </p>
      <p className="ml-4">
        ถนน<Blank value={record.road} /> ตำบล<Blank value={record.subdistrict} /> อำเภอ<Blank value={record.district} />
      </p>
      <p className="ml-4">
        จังหวัด<Blank value={record.province} /> รหัสไปรษณีย์<Blank value={record.postalCode} /> โทรศัพท์<Blank value={record.phone} />
      </p>
      <p className="ml-4">
        โทรศัพท์มือถือ<Blank value={record.mobile} /> โทรสาร<Blank value={record.fax} /> E-Mail : <Blank value={record.email} />
      </p>
      <p className="mt-2">
        ชื่อบิดา / มารดา / ผู้ปกครอง / ผู้ดูแล<Blank value={record.guardianName} className="ml-1 flex-1" />
      </p>
      <p className="mt-1">
        ที่อยู่ปัจจุบัน<Blank value={record.guardianAddress} className="ml-1" /> โทรศัพท์<Blank value={record.guardianPhone} />
      </p>

      <SectionTitle>2. ข้อมูลความพิการ</SectionTitle>
      <p className="mt-1 flex flex-wrap items-baseline">
        ทะเบียนคนพิการเลขที่
        <DigitBoxes value={record.disabilityRegistrationNumber} groups={[8, 2, 1]} />
        หมดอายุวันที่<Blank value={formatThaiDate(record.disabilityExpiryDate)} />
      </p>
      <p className="mt-2 font-medium">ประเภทความพิการ</p>
      <div className="mt-1 grid grid-cols-1 gap-y-1 sm:grid-cols-2">
        <Check checked={!!record.disabilityTypes?.visual} label="ประเภทที่ 1 ความพิการทางการเห็น" />
        <Check checked={!!record.disabilityTypes?.hearing} label="ประเภทที่ 2 ความพิการทางการได้ยินหรือสื่อความหมาย" />
        <Check checked={!!record.disabilityTypes?.physical} label="ประเภทที่ 3 ความพิการทางการเคลื่อนไหวหรือทางร่างกาย" />
        <Check checked={!!record.disabilityTypes?.mental} label="ประเภทที่ 4 ความพิการทางจิตใจหรือพฤติกรรม" />
        <Check checked={!!record.disabilityTypes?.intellectual} label="ประเภทที่ 5 ความพิการทางสติปัญญา" />
        <Check checked={!!record.disabilityTypes?.learning} label="ประเภทที่ 6 ความพิการทางการเรียนรู้" />
        <Check checked={!!record.disabilityTypes?.autism} label="ประเภทที่ 7 ความพิการทางออทิสติก" />
      </div>

      <SectionTitle>3. ประวัติการศึกษา (เดิม)</SectionTitle>
      <p className="mt-1">วุฒิการศึกษาที่ใช้ในการสมัคร</p>
      <div className="mt-1 grid grid-cols-1 gap-y-1 sm:grid-cols-2">
        {Object.entries(PRIOR_EDUCATION_LABEL).map(([value, label]) => (
          <Check key={value} checked={record.priorEducationLevel === value} label={label} />
        ))}
      </div>
      <p className="mt-1">
        ชื่อสถานศึกษา<Blank value={record.priorSchoolName} className="ml-1 flex-1" /> เขต/อำเภอ<Blank value={record.priorSchoolDistrict} />
      </p>
      <p className="mt-1">
        จังหวัด<Blank value={record.priorSchoolProvince} className="ml-1 flex-1" />
      </p>

      <SectionTitle>4. ครู/อาจารย์ที่อ้างอิงได้ (สถานศึกษาเดิม)</SectionTitle>
      <p className="mt-1">
        ชื่อ-นามสกุล<Blank value={record.referenceTeacherName} className="ml-1 flex-1" />
      </p>
      <p className="mt-1">
        ตำแหน่ง<Blank value={record.referenceTeacherPosition} className="ml-1" /> โทรศัพท์<Blank value={record.referenceTeacherPhone} />
      </p>
      <p className="mt-4 text-right">⇒ พลิกหน้าหลัง</p>

      <div className="break-before-page">
        <p className="text-center text-xs">2</p>

        <SectionTitle>5. สถานศึกษาปัจจุบัน วิทยาลัย<Blank value="เทคนิคระยอง" className="ml-1" /></SectionTitle>
        <p className="mt-1">
          รูปแบบการจัดการศึกษา{' '}
          <Check checked={record.studyFormat === 'ในเวลาปกติ' || record.studyFormat === 'นอกเวลา (ภาคสมทบ)'} label="ในระบบ" />
          โปรดระบุ <Radio checked={record.studyFormat === 'ในเวลาปกติ'} label="ในเวลาปกติ" />
          <Radio checked={record.studyFormat === 'นอกเวลา (ภาคสมทบ)'} label="นอกเวลา (ภาคสมทบ)" />
        </p>
        <p className="ml-4 mt-1">
          <Check checked={record.studyFormat === 'ทวิภาคี'} label="ทวิภาคี" />
        </p>
        <p className="mt-2">ระดับชั้น</p>
        {Object.entries(CURRENT_LEVEL_LABEL).map(([value, label]) => (
          <p key={value} className="ml-4 mt-1">
            <Check checked={record.currentLevel === value} label={label} /> ปีที่
            <Blank value={record.currentLevel === value ? record.currentLevelYear : ''} />
          </p>
        ))}
        <p className="mt-2">
          สาขาวิชา<Blank value={record.major} className="ml-1 flex-1" /> หลักสูตร<Blank value={record.curriculum} /> ปี
        </p>

        <SectionTitle>6. ประวัติสุขภาพ</SectionTitle>
        <p className="mt-1">
          <Check checked={record.hasChronicDisease} label="มีโรคประจำตัว (ระบุ)">
            {record.hasChronicDisease && <Blank value={record.chronicDiseaseDetail} />}
          </Check>
          <Check checked={!record.hasChronicDisease} label="ไม่มีโรคประจำตัว" />
        </p>
        <p className="mt-1">
          {Object.entries(DOCTOR_VISIT_LABEL).map(([value, label]) => (
            <Check key={value} checked={record.doctorVisitFrequency === value} label={label} />
          ))}
        </p>

        <SectionTitle>7. ความสามารถในการศึกษาและการใช้อุปกรณ์ช่วยศึกษา</SectionTitle>
        <div className="mt-1 grid grid-cols-1 gap-y-1 sm:grid-cols-3">
          <Check checked={needs.sameAsRegular} label="เช่นเดียวกับนักศึกษาทั่วไป" />
          <Check checked={needs.brailleNote} label="ใช้เบรลล์โน้ต" />
          <Check checked={needs.brailleLevel} label="ใช้อักษรเบรลล์ (ระดับ)">
            {needs.brailleLevel && <Blank value={needs.brailleLevelDetail} />}
          </Check>
          <Check checked={needs.hearingAid} label="ใช้เครื่องช่วยฟัง" />
          <Check checked={needs.signLanguage} label="ใช้ภาษามือ" />
          <Check checked={needs.audioReaderOrTabPlayer} label="ใช้เครื่องอ่านหนังสือเสียง/โปรแกรม TAB Player" />
          <Check checked={needs.mp3Player} label="ใช้เครื่องเล่น MP3 Mp4" />
          <Check checked={needs.portableCctv} label="ใช้เครื่องขยายจอภาพ CCTV พกพา" />
          <Check checked={needs.zoomText} label="ใช้โปรแกรม ZoomText" />
          <Check checked={needs.other} label="อื่นๆ ระบุ">
            {needs.other && <Blank value={needs.otherDetail} />}
          </Check>
          <Check checked={needs.computerProgram} label="ใช้โปรแกรมคอมพิวเตอร์ (ระบุโปรแกรมที่ใช้)">
            {needs.computerProgram && <Blank value={needs.computerProgramDetail} />}
          </Check>
        </div>

        <SectionTitle>8. การขอรับความช่วยเหลือหรือบริการทางการศึกษาที่ต้องการ (วิทยาลัยจะพิจารณาตามความเหมาะสม)</SectionTitle>
        <p className="mt-1">สิ่งอำนวยความสะดวกในการเรียนและการสอบ (ระบุความต้องการจำเป็นและเหตุผล)</p>
        <p className="ml-4 min-h-[3em] whitespace-pre-wrap border-b border-dotted border-black">{record.neededSupportDetail || ' '}</p>

        <SectionTitle>
          9. ข้าพเจ้าไม่ได้รับทุนอื่นใดที่เกี่ยวข้องกับค่าเล่าเรียน ค่าบำรุง ค่าธรรมเนียม และค่าใช้จ่ายอื่นในทำนองเดียวกันกับค่าเล่าเรียน
          (หากได้รับทุนการศึกษาทำนองเดียวกันกับค่าเล่าเรียน จะไม่สามารถขอรับเงินอุดหนุนทางการศึกษาได้ และโปรดระบุทุน)
        </SectionTitle>
        <p className="mt-1">
          <Check checked={record.hasOtherScholarship} label="ได้รับทุน (โปรดระบุ)">
            {record.hasOtherScholarship && <Blank value={record.otherScholarshipDetail} />}
          </Check>
        </p>
        <p className="mt-1">
          <Check checked={!record.hasOtherScholarship} label="ไม่ได้รับทุนอื่นใดที่เกี่ยวข้องกับค่าเล่าเรียนหรือทำนองเดียวกัน" />
        </p>

        <SectionTitle>10. การขอรับเงินอุดหนุนทางการศึกษาสำหรับผู้เรียนพิการ</SectionTitle>
        <p className="mt-1">
          <Check checked={record.wantsSubsidy} label="มีความประสงค์" />
        </p>
        <p className="mt-1">
          <Check checked={!record.wantsSubsidy} label="ไม่มีความประสงค์" />
        </p>
        <p className="ml-8 mt-1">
          <Check checked={record.subsidyWaiveOption === 'self_pay'} label="สละสิทธิ์การขอรับเงินอุดหนุนและยินดีชำระค่าใช้จ่ายด้วยตนเอง" />
        </p>
        <p className="ml-8 mt-1">
          <Check checked={record.subsidyWaiveOption === 'other_welfare'} label="สละสิทธิ์การขอรับเงินอุดหนุนโดยขอใช้สิทธิสวัสดิการอื่นๆ" />
        </p>

        <p className="mt-4">
          ข้าพเจ้าขอรับรองว่า ข้อมูลที่ข้าพเจ้าให้ไว้กับวิทยาลัย<Blank value="เทคนิคระยอง" className="ml-1 flex-1" />
        </p>
        <p>เป็นจริงตามที่ระบุไว้ข้างต้นทุกประการ</p>

        <div className="mt-8 flex justify-end">
          <div className="text-center">
            <p>ลงชื่อ.............................................ผู้เรียนพิการ</p>
            <p className="mt-1">({record.studentName || '.............................................'})</p>
            <p className="mt-1">วันที่....................................</p>
          </div>
        </div>

        <p className="mt-6 text-xs">หมายเหตุ ให้ผู้เรียนพิการกรอกข้อมูลให้ครบถ้วนตามความเป็นจริง</p>
      </div>
    </>
  );
}
