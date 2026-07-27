import { formatThaiDate } from '../../utils/thaiDate';
import type { HomeVisit, Student } from '../../types';

/**
 * The 2-3 page แบบบันทึกการเยี่ยมบ้านผู้เรียน paper form, filled in from a
 * saved HomeVisit record. Shared by HomeVisitFormPage (printed after
 * editing) and HomeVisitListPage (printed directly from the card, without
 * navigating to the edit form).
 */
export function HomeVisitPrintDocument({ visit: existing, student }: { visit: HomeVisit; student?: Student | null }) {
  return (
    <div className="hidden print:block text-sm leading-relaxed">
      <h2 className="text-center text-lg font-bold">แบบบันทึกการเยี่ยมบ้านผู้เรียน</h2>
      <p className="mt-1 text-right">วัน/เดือน/ปี {formatThaiDate(existing.visitDate)}</p>

      <p className="mt-3">
        ๑. ชื่อ-สกุล <span className="border-b border-black">{existing.studentName}</span> ชื่อเล่น{' '}
        <span className="border-b border-black">{existing.studentInfo.nickname || ' '}</span> เลขประจำตัวประชาชน{' '}
        <span className="border-b border-black">{existing.studentInfo.citizenId || ' '}</span>
      </p>
      <p className="mt-2">
        ๒. ระดับชั้น <span className="border-b border-black">{student?.short_name || existing.className || ' '}</span> แผนกวิชา{' '}
        <span className="border-b border-black">{student?.dep_name || existing.departmentName || ' '}</span> ปีการศึกษาที่เข้าเรียน{' '}
        <span className="border-b border-black">{existing.studentInfo.enrollmentYear || ' '}</span>
      </p>
      <p className="mt-2">
        ๓. เกิดวันที่ <span className="border-b border-black">{formatThaiDate(existing.studentInfo.birthDate)}</span> อายุ{' '}
        <span className="border-b border-black">{existing.studentInfo.age || ' '}</span> ปี{' '}
        <span className="border-b border-black">{existing.studentInfo.ageMonths || ' '}</span> เดือน
      </p>
      <p className="mt-2">
        ๔. ที่อยู่ เลขที่ <span className="border-b border-black">{existing.studentInfo.houseNumber || ' '}</span> หมู่{' '}
        <span className="border-b border-black">{existing.studentInfo.moo || ' '}</span> ซอย{' '}
        <span className="border-b border-black">{existing.studentInfo.soi || ' '}</span> ถนน{' '}
        <span className="border-b border-black">{existing.studentInfo.road || ' '}</span> ตำบล/แขวง{' '}
        <span className="border-b border-black">{existing.studentInfo.subdistrict || ' '}</span>
      </p>
      <p className="ml-4">
        อำเภอ/เขต <span className="border-b border-black">{existing.studentInfo.district || ' '}</span> จังหวัด{' '}
        <span className="border-b border-black">{existing.studentInfo.province || ' '}</span> รหัสไปรษณีย์{' '}
        <span className="border-b border-black">{existing.studentInfo.postalCode || ' '}</span>
      </p>
      <p className="ml-4">
        หมายเลขโทรศัพท์ติดต่อ <span className="border-b border-black">{existing.studentInfo.phone || ' '}</span> E-mail{' '}
        <span className="border-b border-black">{existing.studentInfo.email || ' '}</span>
      </p>

      <p className="mt-2">
        ๕. ชื่อ-สกุลบิดา <span className="border-b border-black">{existing.familyInfo.fatherName || ' '}</span> อาชีพ{' '}
        <span className="border-b border-black">{existing.familyInfo.fatherOccupation || ' '}</span>
      </p>
      <p className="ml-4">
        หมายเลขโทรศัพท์ติดต่อ <span className="border-b border-black">{existing.familyInfo.fatherPhone || ' '}</span> E-mail{' '}
        <span className="border-b border-black">{existing.familyInfo.fatherEmail || ' '}</span>
      </p>
      <p className="ml-4">
        {['มีชีวิตอยู่', 'เสียชีวิตแล้ว', 'อยู่ด้วยกัน', 'แยกกันอยู่'].map((opt) => (
          <span key={opt} className="mr-4">
            {existing.familyInfo.fatherStatus === opt ? '☑' : '☐'} {opt}
          </span>
        ))}
      </p>

      <p className="mt-2">
        ๖. ชื่อ-นามสกุลมารดา <span className="border-b border-black">{existing.familyInfo.motherName || ' '}</span> อาชีพ{' '}
        <span className="border-b border-black">{existing.familyInfo.motherOccupation || ' '}</span>
      </p>
      <p className="ml-4">
        หมายเลขโทรศัพท์ติดต่อ <span className="border-b border-black">{existing.familyInfo.motherPhone || ' '}</span> E-mail{' '}
        <span className="border-b border-black">{existing.familyInfo.motherEmail || ' '}</span>
      </p>
      <p className="ml-4">
        {['มีชีวิตอยู่', 'เสียชีวิตแล้ว', 'อยู่ด้วยกัน', 'แยกกันอยู่'].map((opt) => (
          <span key={opt} className="mr-4">
            {existing.familyInfo.motherStatus === opt ? '☑' : '☐'} {opt}
          </span>
        ))}
      </p>

      <p className="mt-2">
        ๗. จำนวนพี่น้องในครอบครัวทั้งหมด <span className="border-b border-black">{existing.familyInfo.siblingsTotal || ' '}</span> คน ชาย{' '}
        <span className="border-b border-black">{existing.familyInfo.maleSiblings || ' '}</span> คน หญิง{' '}
        <span className="border-b border-black">{existing.familyInfo.femaleSiblings || ' '}</span> คน ผู้เรียนเป็นบุตรคนที่{' '}
        <span className="border-b border-black">{existing.familyInfo.birthOrder || ' '}</span> ของครอบครัว
      </p>
      <p className="mt-2">
        ๘. ปัจจุบันอาศัยอยู่กับ <span className="border-b border-black">{existing.familyInfo.currentGuardian || ' '}</span> เกี่ยวข้องเป็น{' '}
        <span className="border-b border-black">{existing.familyInfo.guardianRelationship || ' '}</span> กับผู้เรียน
      </p>
      <p className="ml-4">
        บุคคลที่สามารถติดต่อได้ <span className="border-b border-black">{existing.familyInfo.emergencyContactName || ' '}</span> เบอร์โทรศัพท์{' '}
        <span className="border-b border-black">{existing.familyInfo.emergencyContactPhone || ' '}</span>
      </p>
      <p className="mt-2">
        ๙. รายได้ของบิดา <span className="border-b border-black">{existing.familyInfo.fatherIncome || ' '}</span> บาท/เดือน มารดา{' '}
        <span className="border-b border-black">{existing.familyInfo.motherIncome || ' '}</span> บาท/เดือน
      </p>
      <p className="mt-2">
        ๑๐. บ้านที่อยู่เป็นของ{' '}
        {['บ้านพ่อแม่', 'บ้านเช่า', 'บ้านญาติ', 'หอพัก', 'อื่นๆ'].map((opt) => (
          <span key={opt} className="mr-4">
            {existing.familyInfo.houseType === opt ? '☑' : '☐'} {opt}
          </span>
        ))}
      </p>
      <p className="mt-2">
        ๑๑. ผู้เรียนมีโรคประจำตัว {existing.behaviorInfo.chronicDisease ? '☑ มี' : '☐ ไม่มี'} ระบุ{' '}
        <span className="border-b border-black">{existing.behaviorInfo.chronicDiseaseDetail || ' '}</span>
      </p>
      <p className="mt-2">
        ๑๒. เพื่อนสนิทของผู้เรียน คือ <span className="border-b border-black">{existing.behaviorInfo.closeFriendName || ' '}</span>{' '}
        หมายเลขโทรศัพท์ <span className="border-b border-black">{existing.behaviorInfo.closeFriendPhone || ' '}</span>
      </p>
      <p className="mt-2">๑๓. ผู้เรียนดื่มเครื่องดื่มที่มีแอลกอฮอล์หรือสารเสพติดหรือไม่</p>
      <p className="ml-4">
        {['ดื่มบ่อยๆ', 'ดื่มแต่ไม่บ่อย', 'เคยดื่ม', 'ไม่เคยดื่ม'].map((opt) => (
          <span key={opt} className="mr-4">
            {existing.behaviorInfo.alcoholOrDrugUse === opt ? '☑' : '☐'} {opt}
          </span>
        ))}
      </p>
      <p className="mt-2">๑๔. ผู้เรียนออกเที่ยวกลางคืน</p>
      <p className="ml-4">
        {['บ่อยๆ', 'ออกแต่ไม่บ่อย', 'นานๆครั้ง', 'ไม่มี'].map((opt) => (
          <span key={opt} className="mr-4">
            {existing.behaviorInfo.nightOut === opt ? '☑' : '☐'} {opt}
          </span>
        ))}
      </p>
      <p className="mt-2">๑๕. ผู้เรียนมีเพื่อนต่างเพศคบหาหรือไปด้วยกัน</p>
      <p className="ml-4">
        {['บ่อยๆ', 'ไม่บ่อย', 'นานๆครั้ง', 'ไม่มี'].map((opt) => (
          <span key={opt} className="mr-4">
            {existing.behaviorInfo.oppositeSexFriend === opt ? '☑' : '☐'} {opt}
          </span>
        ))}
      </p>
      <p className="mt-2">๑๖. ผู้เรียนสูบบุหรี่หรือไม่</p>
      <p className="ml-4">
        {['สูบบ่อยๆ', 'สูบไม่บ่อย', 'นานๆครั้ง', 'ไม่สูบ'].map((opt) => (
          <span key={opt} className="mr-4">
            {existing.behaviorInfo.smoking === opt ? '☑' : '☐'} {opt}
          </span>
        ))}
      </p>

      <div className="break-before-page">
        <p className="mt-2">๑๗. ผู้เรียนเล่นการพนัน</p>
        <p className="ml-4">
          {['เล่นบ่อยๆ', 'เล่นแต่ไม่บ่อย', 'นานๆครั้ง', 'ไม่เล่น'].map((opt) => (
            <span key={opt} className="mr-4">
              {existing.behaviorInfo.gambling === opt ? '☑' : '☐'} {opt}
            </span>
          ))}
        </p>
        <p className="mt-3">
          ๑๘. ภารกิจที่ได้รับมอบหมายจากครอบครัว{' '}
          <span className="border-b border-black">{existing.behaviorInfo.familyResponsibility || ' '}</span>
        </p>
        <p className="mt-3">๑๙. ความสัมพันธ์กับสมาชิกในครอบครัว</p>
        <p className="ml-4">
          {['ดีมาก', 'ดี', 'ปานกลาง', 'น้อย'].map((opt) => (
            <span key={opt} className="mr-4">
              {existing.behaviorInfo.familyRelationship === opt ? '☑' : '☐'} {opt}
            </span>
          ))}
        </p>

        <p className="mt-4">๒๐. ความคิดเห็นของผู้ปกครองที่มีต่อผู้เรียน</p>
        <p className="ml-4 min-h-[3em] whitespace-pre-wrap border-b border-black">{existing.parentOpinion || ' '}</p>

        <p className="mt-4">๒๑. ความคิดเห็นและข้อเสนอแนะของครูที่ปรึกษาในการออกเยี่ยมบ้านครั้งนี้</p>
        <p className="ml-4 min-h-[3em] whitespace-pre-wrap border-b border-black">{existing.advisorOpinion || ' '}</p>

        <div className="mt-10 flex justify-end">
          <div className="text-center">
            <p>ลงชื่อ.............................................</p>
            <p className="mt-1">({existing.advisorTeacherName || '.............................................'})</p>
            <p>ครูที่ปรึกษา</p>
          </div>
        </div>
      </div>

      {existing.images.homeVisitPhotos.length > 0 && (
        <div className="break-before-page">
          <h2 className="text-center text-base font-bold">ภาพประกอบ</h2>
          <h2 className="text-center text-base font-bold">บันทึกการเยี่ยมบ้านผู้เรียน</h2>
          <div className="mt-6 space-y-4">
            {existing.images.homeVisitPhotos.map((url) => (
              <img key={url} src={url} alt="" className="mx-auto w-full max-w-md rounded border border-gray-300" />
            ))}
          </div>
          <div className="mt-10 flex justify-end">
            <div className="text-center">
              <p>ลงชื่อ.............................................</p>
              <p className="mt-1">({existing.advisorTeacherName || '.............................................'})</p>
              <p>ครูที่ปรึกษา</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
