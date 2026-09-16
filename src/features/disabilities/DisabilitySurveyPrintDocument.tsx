import { formatThaiDate } from '../../utils/thaiDate';
import { DISABILITY_TYPE_LABEL, DISABILITY_TYPE_ORDER } from '../../types';
import type { DisabilitySurvey } from '../../types';

const DOCTOR_VISIT_LABEL: Record<string, string> = {
  monthly: 'พบแพทย์ทุกเดือน',
  as_appointed: 'พบแพทย์ตามนัด (มากกว่า 2 เดือน)',
  none: 'ไม่ได้พบแพทย์ประจำ',
};

const SUBSIDY_WAIVE_LABEL: Record<string, string> = {
  self_pay: 'สละสิทธิ์การขอรับเงินอุดหนุนและยินดีชำระค่าใช้จ่ายด้วยตนเอง',
  other_welfare: 'สละสิทธิ์การขอรับเงินอุดหนุนโดยขอใช้สิทธิสวัสดิการอื่นๆ',
};

function Check({ checked, label }: { checked: boolean; label: string }) {
  return (
    <span className="mr-4 inline-block">
      {checked ? '☑' : '☐'} {label}
    </span>
  );
}

function Blank({ value }: { value?: string }) {
  return <span className="border-b border-black px-1">{value || ' '}</span>;
}

function SectionTitle({ children }: { children: string }) {
  return <h3 className="mt-4 font-bold">{children}</h3>;
}

/**
 * The 10-section แบบสำรวจข้อมูลผู้เรียนพิการ paper form, filled in from a
 * saved DisabilitySurvey record — no outer wrapper, so callers control
 * whether it's print-only or always visible (see DropoutFollowUpPrintDocument
 * for the same convention).
 */
export function DisabilitySurveyPrintDocument({ record }: { record: DisabilitySurvey }) {
  const disabilityTypes = DISABILITY_TYPE_ORDER.filter((key) => record.disabilityTypes?.[key]).map((key) => DISABILITY_TYPE_LABEL[key]);
  const needs = record.assistiveNeeds;

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 text-center">
          <h2 className="text-lg font-bold">แบบสำรวจข้อมูลผู้เรียนพิการ</h2>
          <p>วิทยาลัยเทคนิคระยอง</p>
          <p>ภาคเรียนที่ {record.semester || '.....'} ปีการศึกษา {record.academicYear || '.....'}</p>
        </div>
        <div className="flex h-24 w-20 shrink-0 items-center justify-center border border-black text-center text-xs text-gray-500">
          {record.photoUrl ? <img src={record.photoUrl} alt="" className="h-full w-full object-cover" /> : 'รูปถ่าย 1 นิ้ว'}
        </div>
      </div>

      <p className="mt-3">
        ชื่อ-นามสกุล <Blank value={record.studentName} /> ระดับชั้น <Blank value={record.className} /> สาขาวิชา{' '}
        <Blank value={record.departmentName} />
      </p>
      <p className="mt-1">ครูที่ปรึกษา <Blank value={record.advisorTeacherName} /></p>

      <SectionTitle>1. ข้อมูลทั่วไป</SectionTitle>
      <p className="mt-1">
        เลขบัตรประจำตัวประชาชน 13 หลัก <Blank value={record.citizenId} /> ศาสนา <Blank value={record.religion} />
      </p>
      <p className="mt-1">
        วันเดือนปีเกิด <Blank value={formatThaiDate(record.birthDate)} /> อายุ <Blank value={record.age} /> ปี
      </p>
      <p className="mt-2">ที่อยู่ปัจจุบันที่ติดต่อได้</p>
      <p className="ml-4">
        บ้านเลขที่ <Blank value={record.houseNumber} /> หมู่ที่ <Blank value={record.moo} /> หมู่บ้าน{' '}
        <Blank value={record.villageName} /> ซอย <Blank value={record.soi} /> ถนน <Blank value={record.road} />
      </p>
      <p className="ml-4">
        ตำบล/แขวง <Blank value={record.subdistrict} /> อำเภอ/เขต <Blank value={record.district} /> จังหวัด{' '}
        <Blank value={record.province} /> รหัสไปรษณีย์ <Blank value={record.postalCode} />
      </p>
      <p className="ml-4">
        โทรศัพท์ <Blank value={record.phone} /> มือถือ <Blank value={record.mobile} /> โทรสาร <Blank value={record.fax} /> E-Mail{' '}
        <Blank value={record.email} />
      </p>
      <p className="mt-2">
        บิดา/มารดา/ผู้ปกครอง/ผู้ดูแล <Blank value={record.guardianName} />
      </p>
      <p className="ml-4">
        ที่อยู่ปัจจุบัน <Blank value={record.guardianAddress} /> โทรศัพท์ <Blank value={record.guardianPhone} />
      </p>

      <SectionTitle>2. ข้อมูลความพิการ</SectionTitle>
      <p className="mt-1">
        ทะเบียนคนพิการเลขที่ <Blank value={record.disabilityRegistrationNumber} /> หมดอายุวันที่{' '}
        <Blank value={formatThaiDate(record.disabilityExpiryDate)} />
      </p>
      <p className="mt-2">ประเภทความพิการ</p>
      <p className="ml-4">{disabilityTypes.length > 0 ? disabilityTypes.join(', ') : 'ไม่ได้ระบุ'}</p>

      <SectionTitle>3. ประวัติการศึกษา (เดิม)</SectionTitle>
      <p className="mt-1">
        วุฒิการศึกษาที่ใช้ในการสมัคร{' '}
        {['ม.3', 'ม.6', 'ปวช.', 'ปวส.'].map((opt) => (
          <Check key={opt} checked={record.priorEducationLevel === opt} label={opt} />
        ))}
      </p>
      <p className="mt-1">
        ชื่อสถานศึกษา <Blank value={record.priorSchoolName} /> จังหวัด <Blank value={record.priorSchoolProvince} /> เขต/อำเภอ{' '}
        <Blank value={record.priorSchoolDistrict} />
      </p>

      <SectionTitle>4. ครู/อาจารย์ที่อ้างอิงได้ (สถานศึกษาเดิม)</SectionTitle>
      <p className="mt-1">
        ชื่อ-นามสกุล <Blank value={record.referenceTeacherName} /> ตำแหน่ง <Blank value={record.referenceTeacherPosition} /> โทรศัพท์{' '}
        <Blank value={record.referenceTeacherPhone} />
      </p>

      <div className="break-before-page">
        <SectionTitle>5. สถานศึกษาปัจจุบัน</SectionTitle>
        <p className="mt-1">
          รูปแบบการจัดการศึกษา{' '}
          {['ในเวลาปกติ', 'นอกเวลา (ภาคสมทบ)', 'ทวิภาคี'].map((opt) => (
            <Check key={opt} checked={record.studyFormat === opt} label={opt} />
          ))}
        </p>
        <p className="mt-1">
          ระดับชั้น{' '}
          {['ปวช.', 'ปวส.', 'ปริญญาตรีสายเทคโนโลยีหรือสายปฏิบัติการ'].map((opt) => (
            <Check key={opt} checked={record.currentLevel === opt} label={opt} />
          ))}
          ปีที่ <Blank value={record.currentLevelYear} />
        </p>
        <p className="mt-1">
          สาขาวิชา <Blank value={record.major} /> หลักสูตร <Blank value={record.curriculum} />
        </p>

        <SectionTitle>6. ประวัติสุขภาพ</SectionTitle>
        <p className="mt-1">
          <Check checked={record.hasChronicDisease} label="มีโรคประจำตัว" />
          <Check checked={!record.hasChronicDisease} label="ไม่มีโรคประจำตัว" />
          {record.hasChronicDisease && (
            <>
              ระบุ <Blank value={record.chronicDiseaseDetail} />
            </>
          )}
        </p>
        <p className="mt-1">
          การพบแพทย์{' '}
          {Object.entries(DOCTOR_VISIT_LABEL).map(([value, label]) => (
            <Check key={value} checked={record.doctorVisitFrequency === value} label={label} />
          ))}
        </p>

        <SectionTitle>7. ความสามารถในการศึกษาและการใช้อุปกรณ์ช่วยศึกษา</SectionTitle>
        <p className="mt-1">
          <Check checked={needs.sameAsRegular} label="เช่นเดียวกับนักศึกษาทั่วไป" />
          <Check checked={needs.brailleNote} label="ใช้เบรลล์โน้ต" />
          <Check checked={needs.hearingAid} label="ใช้เครื่องช่วยฟัง" />
          <Check checked={needs.signLanguage} label="ใช้ภาษามือ" />
        </p>
        <p className="mt-1">
          <Check checked={needs.audioReaderOrTabPlayer} label="ใช้เครื่องอ่านหนังสือเสียง/โปรแกรม TAB Player" />
          <Check checked={needs.mp3Player} label="ใช้เครื่องเล่น MP3 Mp4" />
          <Check checked={needs.portableCctv} label="ใช้เครื่องขยายจอภาพ CCTV พกพา" />
          <Check checked={needs.zoomText} label="ใช้โปรแกรม ZoomText" />
        </p>
        <p className="mt-1">
          <Check checked={needs.brailleLevel} label="ใช้อักษรเบรลล์ (ระบุระดับ)" />
          {needs.brailleLevel && <Blank value={needs.brailleLevelDetail} />}
        </p>
        <p className="mt-1">
          <Check checked={needs.computerProgram} label="ใช้โปรแกรมคอมพิวเตอร์ (ระบุโปรแกรมที่ใช้)" />
          {needs.computerProgram && <Blank value={needs.computerProgramDetail} />}
        </p>
        <p className="mt-1">
          <Check checked={needs.other} label="อื่นๆ ระบุ" />
          {needs.other && <Blank value={needs.otherDetail} />}
        </p>
      </div>

      <div className="break-before-page">
        <SectionTitle>8. การขอรับความช่วยเหลือหรือบริการทางการศึกษาที่ต้องการ</SectionTitle>
        <p className="ml-4 min-h-[3em] whitespace-pre-wrap border-b border-black">{record.neededSupportDetail || ' '}</p>

        <SectionTitle>9. ทุนการศึกษา</SectionTitle>
        <p className="mt-1">
          <Check checked={record.hasOtherScholarship} label="ได้รับทุน (โปรดระบุ)" />
          {record.hasOtherScholarship && <Blank value={record.otherScholarshipDetail} />}
        </p>
        <p className="mt-1">
          <Check checked={!record.hasOtherScholarship} label="ไม่ได้รับทุนอื่นใดที่เกี่ยวข้องกับค่าเล่าเรียนหรือทำนองเดียวกัน" />
        </p>

        <SectionTitle>10. การขอรับเงินอุดหนุนทางการศึกษาสำหรับผู้เรียนพิการ</SectionTitle>
        <p className="mt-1">
          <Check checked={record.wantsSubsidy} label="มีความประสงค์" />
          <Check checked={!record.wantsSubsidy} label="ไม่มีความประสงค์" />
        </p>
        {!record.wantsSubsidy && record.subsidyWaiveOption && (
          <p className="ml-4">
            <Check checked={true} label={SUBSIDY_WAIVE_LABEL[record.subsidyWaiveOption] ?? record.subsidyWaiveOption} />
          </p>
        )}

        <div className="mt-10 flex justify-around">
          <div className="text-center">
            <p>ลงชื่อ.............................................</p>
            <p className="mt-1">({record.studentName || '.............................................'})</p>
            <p>ผู้เรียน / ผู้ปกครอง</p>
          </div>
          <div className="text-center">
            <p>ลงชื่อ.............................................</p>
            <p className="mt-1">({record.advisorTeacherName || '.............................................'})</p>
            <p>ครูที่ปรึกษา</p>
          </div>
        </div>
      </div>
    </>
  );
}
