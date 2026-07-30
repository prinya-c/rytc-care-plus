# RYC Care+ — สรุปงานที่ทำไปแล้ว

> ไฟล์นี้สรุปงานทั้งหมดที่ทำใน session นี้ (ทั้งช่วงที่ context ถูกสรุปย่อไปแล้ว และช่วงล่าสุด) เพื่อให้ทำงานต่อใน VS Code ได้โดยไม่ต้องย้อนอ่าน chat ทั้งหมด
>
> Repo: `prinya-c/rytc-care-plus` — deploy อัตโนมัติผ่าน GitHub Actions ไปที่ `prinya-c.github.io/rytc-care-plus` เมื่อ merge เข้า `main`

---

## 1. ภาพรวมโปรเจกต์

- **Stack**: Vite + React 19 + TypeScript + react-router-dom v7 + Tailwind CSS v4 + Firebase (Firestore + Storage) + vite-plugin-pwa
- **Deploy**: GitHub Pages, base path `/rytc-care-plus/`, deploy อัตโนมัติทุกครั้งที่ push เข้า `main`
- **Auth**: ใช้ custom citizenId+password auth (ไม่ใช่ Firebase Authentication) เพราะยังไม่เปิดใช้ Firebase Auth — มี 2 ระบบ auth แยกกัน:
  - `src/lib/customAuth.ts` + `src/features/auth/AuthContext.tsx` — ครู/เจ้าหน้าที่ (citizenId+password)
  - `src/features/studentAuth/StudentAuthContext.tsx` — นักเรียน (studentId+citizenId, login แยกหน้า `/login` tab นักเรียน)
- **Firestore**: 2 databases แยกกัน
  - `care-plus` — ข้อมูลที่แอปเป็นเจ้าของ (users, screenings, home-visits, home-visit-memos, homeroom-logs, dropout-follow-ups, referrals, interventions, follow-up-results)
  - `out-of` — mirror ข้อมูลนักเรียน/ครู/แผนกจากระบบเดิมของวิทยาลัย (อ่านอย่างเดียว ห้ามเขียน)

### ⚠️ สิ่งสำคัญที่ต้องจำ: Firestore/Storage Rules ต้อง publish เองทุกครั้ง

**แก้ไฟล์ `firestore.care-plus.rules` / `storage.rules` ในโค้ด repo ไม่มีผลกับฐานข้อมูลจริง!** GitHub Actions deploy แค่ frontend เท่านั้น ทุกครั้งที่เพิ่ม collection ใหม่ ต้อง copy บล็อกกฎไปวางใน **Firebase Console → Firestore/Storage → Rules → Publish** เอง (ห้ามลบของเดิมที่มีอยู่)

กฎปัจจุบันในไฟล์ repo (`firestore.care-plus.rules`) เปิดกว้างทั้งหมด (`allow read, write: if true`) เป็นการชั่วคราว เพราะใช้ custom auth ไม่ใช่ Firebase Auth (`request.auth` เป็น null เสมอ) — มีไฟล์ `firestore.care-plus.rules.future` เก็บกฎแบบ role-based ไว้สำหรับตอนเปิด Firebase Auth จริงในอนาคต

---

## 2. โครงสร้าง Data / รูปแบบการออกแบบสำคัญ

### Data-ownership-by-save-path
เอกสาร `HomeVisit` ตัวเดียวถูกแก้จาก 3 หน้าจอต่างกัน (ฟอร์มเยี่ยมบ้านของครู, ฟอร์มข้อมูลผู้เรียนของครู, หน้ารายงานตัวเองของนักเรียน) — แต่ละหน้าจะ `updateDoc` เฉพาะ field ที่ตัวเอง "เป็นเจ้าของ" เท่านั้น เพื่อไม่ให้ทับข้อมูลของหน้าอื่น (Firestore's `updateDoc` overwrite เฉพาะ key ที่ส่งไป)

### Print pattern (ใช้ทุกฟีเจอร์ที่พิมพ์ได้)
```
const [printing, setPrinting] = useState(false);
useEffect(() => {
  if (!printing) return;
  const timer = setTimeout(() => window.print(), 50);
  return () => clearTimeout(timer);
}, [printing]);
useEffect(() => {
  function handleAfterPrint() { setPrinting(false); }
  window.addEventListener('afterprint', handleAfterPrint);
  return () => window.removeEventListener('afterprint', handleAfterPrint);
}, []);
```
- คลิกไอคอน **เครื่องพิมพ์** (ไม่ใช่ตาแล้ว — เปลี่ยนจากไอคอนตาเป็นเครื่องพิมพ์ทุกจุดแล้ว) → set state ไว้ว่าจะพิมพ์อะไร → เปิด native print dialog ของเบราว์เซอร์ทันที **โดยไม่เปลี่ยนหน้า** (พิมพ์จากในหน้า list เลย)
- เนื้อหาที่จะพิมพ์อยู่ใน `<div className="hidden print:block">...</div>` —ซ่อนบนจอปกติ โชว์เฉพาะตอนพิมพ์
- แต่ละฟีเจอร์แยก layout เอกสารพิมพ์ออกเป็นไฟล์ component ต่างหาก (เช่น `HomeVisitPrintDocument.tsx`, `HomeVisitMemoPrintDocument.tsx`, `DropoutFollowUpPrintDocument.tsx`) เพื่อไม่ให้โค้ดซ้ำระหว่างหน้า list กับหน้า detail/form
- ครุฑ: `` `${import.meta.env.BASE_URL}300px-Thai_government_Garuda.jpg` ``
- แบ่งหน้ากระดาษ: class `break-before-page`

### ⚠️ ปัญหาที่ยังไม่ได้แก้ (แจ้งไว้แล้วแต่ user บอกให้วิเคราะห์ก่อน ยังไม่ให้แก้)
พรีวิวก่อนพิมพ์บน **มือถือ Android Chrome** ("Save as PDF") บางครั้งขึ้นเป็นหน้าว่างเปล่า (จำนวนหน้าถูกแต่ไม่มีเนื้อหา) — สาเหตุที่วิเคราะห์ไว้:
1. **Race condition**: `setTimeout(() => window.print(), 50)` — 50ms อาจไม่พอให้มือถือ render เนื้อหาที่เพิ่งโชว์ (`hidden print:block`) เสร็จก่อนจะเรียก print จริง
2. รูปภาพ (ครุฑ / รูปหลักฐานจาก Firebase Storage) โหลดแบบ async — ถ้า print ทำงานก่อนรูปโหลดเสร็จ มือถือมีโอกาสเห็นหน้าว่างมากกว่าเดสก์ท็อป
3. ปัญหานี้น่าจะกระทบ**ทุกหน้า**ที่ใช้ print pattern ข้างบน เพราะโค้ดเหมือนกันหมด — **ยังไม่ได้แก้**, แนวทางที่คุยไว้คือเพิ่ม delay, ใช้ `requestAnimationFrame` แทน `setTimeout`, หรือ preload รูปก่อนพิมพ์

---

## 3. ฟีเจอร์หลักที่มีอยู่ (แต่ละเมนู)

| เมนู | เส้นทาง | หน้าที่เกี่ยวข้อง |
|---|---|---|
| แดชบอร์ด | `/dashboard` | `DashboardPage.tsx` |
| กลุ่มเรียนของฉัน | `/my-classes` | `MyClassesPage.tsx` |
| รายชื่อผู้เรียน | `/students` | `StudentListPage.tsx` |
| ข้อมูลผู้เรียน | `/student-info`, `/student-info/:studentId` | `StudentInfoListPage.tsx`, `StudentInfoFormPage.tsx` — แก้ studentInfo/familyInfo/behaviorInfo |
| คัดกรองผู้เรียน | `/screenings`, `/screenings/:year/:semester`, `/screenings/summary` | `ScreeningRoundListPage.tsx` (มีไอคอนพิมพ์บันทึกข้อความ+พิมพ์สรุป **ในการ์ดแต่ละรอบ**, พิมพ์ในหน้าเดิมไม่เปลี่ยนหน้า), `BulkScreeningPage.tsx`, `ScreeningSummaryPage.tsx` (แดชบอร์ดกราฟ ไม่มีปุ่มพิมพ์แล้ว — ย้ายไปอยู่การ์ดแทน) |
| กิจกรรมโฮมรูม | `/homeroom`, `/homeroom/new`, `/homeroom/:logId`, `/homeroom/:logId/edit` | `HomeroomLogListPage.tsx` (ไอคอนเครื่องพิมพ์ พิมพ์ในหน้าเดิม), `HomeroomLogFormPage.tsx`, `HomeroomLogDetailPage.tsx` (หน้า landing หลังบันทึก ยังมีปุ่มพิมพ์ของตัวเอง) |
| เยี่ยมบ้าน | `/home-visits`, `/home-visits/new/:studentId`, `/home-visits/:visitId/edit` | `HomeVisitListPage.tsx` (ไอคอนเครื่องพิมพ์ พิมพ์ในหน้าเดิม), `HomeVisitFormPage.tsx` (ฟอร์มวันที่เยี่ยม+พฤติกรรม 6 ข้อที่ครูสังเกต+รูปภาพ), ใช้ `HomeVisitPrintDocument.tsx` ร่วมกัน — พิมพ์แบบบันทึกการเยี่ยมบ้านผู้เรียน 2-3 หน้า (มีหน้าภาพประกอบถ้ามีรูป) |
| บันทึกข้อความเยี่ยมบ้าน | `/home-visits/memo`, `/home-visits/memo/new`, `/home-visits/memo/:memoId`, `/home-visits/memo/:memoId/edit` | `HomeVisitMemoListPage.tsx` (list+ไอคอนพิมพ์ในหน้าเดิม), `HomeVisitMemoFormPage.tsx`, `HomeVisitMemoDetailPage.tsx` (landing หลังบันทึก มี preview + ปุ่มพิมพ์เอง), ใช้ `HomeVisitMemoPrintDocument.tsx` ร่วมกัน — เดิมชื่อ "บันทึกข้อความ" เฉยๆ **เปลี่ยนเป็น "บันทึกข้อความเยี่ยมบ้าน" แล้วทุกจุด** กันสับสนกับโฮมรูม |
| ติดตามออกกลางคัน | `/dropout-follow-up`, `/dropout-follow-up/new`, `/dropout-follow-up/:id/edit` | `DropoutFollowUpListPage.tsx` (ไอคอนเครื่องพิมพ์ พิมพ์ในหน้าเดิม — มีบันทึกข้อความรายงานผลการติดตามผู้เรียนที่สร้างขึ้นใหม่ ไม่มีฟอร์มกระดาษต้นแบบ), `DropoutFollowUpFormPage.tsx` (มี 8 ข้อ ดูหัวข้อ 4 ด้านล่าง), ใช้ `DropoutFollowUpPrintDocument.tsx` |
| ส่งต่อผู้เรียน | `/referrals/*`, `/referral-inbox` | `ReferralFormPage.tsx`, `ReferralInboxPage.tsx`, `ReferralDetailPage.tsx` |
| สรุปคัดกรองผู้เรียน | `/screenings/summary` | (อยู่ในตารางข้างบนแล้ว) |
| สรุปเยี่ยมบ้าน | `/home-visits/summary` | `HomeVisitSummaryPage.tsx` |
| รายงาน / จัดการผู้ใช้งาน | `/reports`, `/users` | เฉพาะ admin/advisor_staff |

---

## 4. ฟอร์ม "ติดตามออกกลางคัน" — รายละเอียด 8 ข้อ (ล่าสุด)

หน้า `DropoutFollowUpFormPage.tsx` ตอนนี้มีครบ 8 ข้อ:

1. ผู้เรียนขาดเรียนทั้งสิ้น (จำนวนวัน)
2. สาเหตุที่ขาดเรียน (Textarea)
3. ครูที่ปรึกษาได้ติดตามผู้เรียนผ่านช่องทาง — checkbox หลายข้อ (โทรศัพท์/Line/ไปพบที่บ้าน/อื่นๆ+ช่องกรอก)
4. หลักฐานในการติดตามผู้เรียน — แนบรูปภาพ
5. ครูที่ปรึกษาได้ติดต่อผู้ปกครองผ่านช่องทาง — checkbox หลายข้อ (เหมือนข้อ 3)
6. หลักฐานในการติดต่อผู้ปกครอง — แนบรูปภาพ
7. **สรุปผลการติดตามผู้เรียน** — Textarea ข้อความอิสระ (เพิ่งเพิ่ม)
8. **ผลการติดตาม** — Radio เลือก 1 ข้อ: "ติดตามผู้เรียนสำเร็จ" / "ติดตามผู้เรียนไม่สำเร็จ" (เพิ่งเพิ่ม)

Type `DropoutFollowUp` (`src/types/index.ts`) มี field: `followUpSummary: string`, `followUpResult: string` เพิ่มใหม่

มีปุ่มพิมพ์ (ไอคอนเครื่องพิมพ์ที่หน้า list) สร้าง "บันทึกข้อความ รายงานผลการติดตามผู้เรียน" อัตโนมัติจากข้อมูลทั้ง 8 ข้อ

---

## 5. Components / Utilities สำคัญที่เพิ่มใหม่

- **`src/components/ui/Form.tsx`**
  - `SelectWithOther` — `<Select>` ที่ตัวเลือกสุดท้ายคือ "อื่นๆ" พอเลือกจะโชว์ช่องกรอกข้อความ
  - `Radio` — ปุ่มตัวเลือกเดียว (เพิ่งเพิ่ม มิเรอร์จาก `Checkbox`)
- **`src/components/ui/Icon.tsx`** — เพิ่มไอคอน `id-card`, `user-minus`, `printer`
- **`src/utils/thaiDate.ts`** — `formatThaiDate(value)`, `parseDateInputValue(value)` ใช้ร่วมกันทุกหน้า (แทนโค้ดซ้ำ)
- **`src/utils/age.ts`** — `calculateAge(birthDateIso)` คำนวณอายุปี/เดือนจากวันเกิด (read-only, คำนวณใหม่ทุกครั้งที่โหลด)
- **`src/lib/thaiAddress.ts` + `ThaiAddressFields.tsx`** — dropdown จังหวัด/อำเภอ/ตำบล cascading

---

## 6. Nav menu (`src/components/layout/nav.ts`)

ลำดับปัจจุบัน: แดชบอร์ด → กลุ่มเรียนของฉัน → รายชื่อผู้เรียน → ข้อมูลผู้เรียน → คัดกรองผู้เรียน → กิจกรรมโฮมรูม → เยี่ยมบ้าน → ติดตามออกกลางคัน → ส่งต่อผู้เรียน → สรุปคัดกรองผู้เรียน → สรุปเยี่ยมบ้าน → กล่องรับเรื่อง → รายงาน → จัดการผู้ใช้งาน

**บั๊กที่เพิ่งแก้**: เมนูไฮไลท์ผิด 2 จุดพร้อมกัน (เช่น "คัดกรองผู้เรียน" ค้างไฮไลท์ตอนอยู่หน้า "สรุปคัดกรองผู้เรียน" เพราะ `/screenings/summary` ขึ้นต้นด้วย `/screenings`) — แก้โดยเพิ่ม prop `end` ให้ `NavLink` ทั้ง 3 จุด (desktop sidebar, mobile drawer, mobile bottom nav) ใน `AppLayout.tsx`

---

## 7. Git workflow ที่ใช้ตลอด session นี้

ทุกครั้งที่แก้โค้ด:
1. `npx tsc -b --noEmit` (ต้องผ่านไม่มี error)
2. `npm run build` (ต้องผ่าน)
3. `npm run lint` (oxlint — ต้องไม่มี error ใหม่ มี warning เดิมบางไฟล์เกี่ยวกับ Fast Refresh ที่ไม่ต้องแก้)
4. commit → push ขึ้น branch `claude/repo-visibility-kn6kne`
5. สร้าง PR → squash merge เข้า `main` ทันที
6. poll GitHub Actions จนกว่า deploy จะ "completed"/"success"

**หมายเหตุสำคัญ**: ทุกครั้งก่อน commit ใหม่ ต้อง `git fetch origin main` แล้ว `git checkout -B claude/repo-visibility-kn6kne origin/main` ก่อน (reset branch ไปตาม main ล่าสุดที่เพิ่ง squash-merge) ไม่งั้น GitHub จะ merge conflict ปลอม (เพราะ branch เก่ายังมี commit ที่ถูก squash ไปแล้วค้างอยู่)

---

## 8. งานที่ยังค้างอยู่ / ต้องทำต่อ

1. **ปัญหาพรีวิวก่อนพิมพ์ว่างเปล่าบนมือถือ Android** (ดูหัวข้อ 2) — วิเคราะห์แล้ว ยังไม่ได้แก้ รอ confirm จาก user
2. Firestore/Storage rules — ต้องเช็คว่า publish ครบทุก collection แล้วหรือยัง (โดยเฉพาะ `home-visit-memos`, `dropout-follow-ups`) เพราะแก้ในโค้ดอย่างเดียวไม่พอ
3. ไม่มี TODO อื่นที่ user ค้างไว้ ณ ตอนที่เขียนไฟล์นี้ — งานล่าสุดทุกอย่าง merge + deploy สำเร็จหมดแล้ว (PR ล่าสุด #55)

---

## 9. รายการ PR ทั้งหมดใน session นี้ (ล่าสุดก่อน #55)

#26–#41: ปรับฟอร์มเยี่ยมบ้าน/ข้อมูลผู้เรียนให้ตรงกับฟอร์มกระดาษ, เพิ่ม SelectWithOther, จัดเรียง nav, เพิ่มหน้าพิมพ์ 2-3 หน้าของเยี่ยมบ้าน

- **#42** Add ติดตามออกกลางคัน (dropout follow-up) feature
- **#43** Turn บันทึกข้อความ into a saved list, matching บันทึกกิจกรรมโฮมรูม
- **#44** Make the eye icon on บันทึกข้อความ show a print preview
- **#45** Auto-open the print dialog from the บันทึกข้อความ eye icon
- **#46** Restore print actions on the screening summary page as two icons
- **#47** Move the screening summary's print icons onto the round cards
- **#48** Print a screening round in place, without leaving the list page
- **#49** Print homeroom logs from the list without leaving the page
- **#50** Print a home visit from the list without leaving the page
- **#51** Rename to บันทึกข้อความเยี่ยมบ้าน, print it from the list in place
- **#52** Add item 7 สรุปผลการติดตามผู้เรียน to the dropout follow-up form
- **#53** Add item 8 ผลการติดตาม as a radio choice
- **#54** Add a print action for ติดตามออกกลางคัน records
- **#55** Fix double-highlighted nav items by matching routes exactly

ทั้งหมด merge เข้า `main` และ deploy สำเร็จแล้ว
