# Task List — RYC Care+

Tracks progress against the original spec (13 sections) plus features added
since. Update checkboxes as work continues; keep this in sync with
`Implementation_Plan.md` and `.claude/RYC_CARE_PLUS_PROGRESS.md` (the
session-by-session activity log — check there first for anything not
reflected here yet).

Last updated: 2026-07-30 (second pass — huge amount of work landed in one
session after the first rewrite of this doc; see `RYC_CARE_PLUS_PROGRESS.md`
§ "Session 2" for the detailed blow-by-blow)

## 1. Technology stack

- [x] Vite + React 19 + TypeScript
- [x] Tailwind CSS (v4, green/white theme + trust/concern/close status colors)
- [x] React Router v7
- [x] Firestore + Storage SDK. Firebase Authentication SDK present but **not wired up** — see §3
- [x] PWA (installable, `vite-plugin-pwa`)
- [x] Responsive / mobile-first layout
- [x] **Deploy target: GitHub Pages** (`base: '/rytc-care-plus/'` in `vite.config.ts`, `.github/workflows/deploy.yml` auto-deploys on every push to `main`, live at `prinya-c.github.io/rytc-care-plus`) — **not** Cloudflare Pages. `README.md`'s "Deploy to Cloudflare Pages" section is still stale.

## 2. App identity

- [x] App name / branding (RYC Care+, C+ mark, green theme) in login, sidebar, manifest, favicon

## 3. Authentication & User roles & RBAC

- [x] **Firebase Authentication temporarily disabled** by explicit project owner decision — see `Implementation_Plan.md` §3.4
- [x] Login/registration by 13-digit citizen ID (`src/lib/customAuth.ts`, `src/lib/passwordHash.ts`)
- [x] `RegisterPage` (`/register`): citizenId → lookup `out-of/teachers` → confirm → set password → creates `care-plus/users/{citizenId}`
- [x] `LoginPage`: citizenId + password → PBKDF2 hash check → session = citizenId in `localStorage`
- [x] Separate student auth (`src/features/studentAuth/StudentAuthContext.tsx`) — studentId + citizenId, gates `/student/home-visit`
- [x] **6 roles + `admin` modeled** (`src/types/index.ts`, `src/utils/rbac.ts`): `admin`, `advisor_teacher`, `advisor_staff`, `guidance_staff`, `scholarship_staff`, **`discipline_staff` (new — เจ้าหน้าที่งานปกครอง)**, `rehabilitation_staff`
- [x] Route-level protection (`src/routes/ProtectedRoute.tsx`)
- [ ] **Firestore-level enforcement is still OFF** (`firestore.care-plus.rules` = `allow read, write: if true` for every collection). Real ruleset in `firestore.care-plus.rules.future`.
- [x] **`out-of` database not managed by this project** — read-only, owned by another app
- [x] **`TEACHER_ID_CARD_FIELD = 'tidcard'`** confirmed
- [x] **Permission model reshuffled this session** (previously `admin` and `advisor_staff` were near-identical):
  - "จัดการผู้ใช้งาน" (`/users`) and "ตั้งค่า" (`/settings/signatories`) — now **admin-only**, `advisor_staff` lost access
  - "กล่องรับเรื่องส่งต่อ" (`/referral-inbox`, `/referrals/:id` detail) — moved from `admin` to **`advisor_staff`**; `admin` lost access
  - "รายงาน" (`/reports`) — unchanged, still `admin` + `advisor_staff`
  - `canManageUsers()` in `rbac.ts` updated to admin-only for consistency (still not wired to any actual guard — route-level `ADMIN_ONLY_ROLES` in `App.tsx` is what actually enforces this)
  - `canViewCollegeOverview()` (drives the "college-wide filter gate" pattern, §7) is untouched — still `admin` + `advisor_staff`

## 4. Firestore structure

- [x] Two separate named databases (`care-plus`, `out-of`) confirmed
- [x] `care-plus` database — **now 10 top-level collections**: `users`, `screenings`, `home-visits`, `home-visit-memos`, `homeroom-logs`, `dropout-follow-ups`, `referrals`, `interventions`, `follow-up-results`, **`signatory-settings` (new this session)**
- [x] `out-of` database (read-only): `department`, `students`, `teachers`, `std_class`
- [x] TypeScript types for every collection, including this session's additions: `SignatorySettings`, `StudentProblems` (+ `PROBLEM_LABEL`/`PROBLEM_ORDER`)
- [x] **`Referral` schema changed this session**: `reason: string` + `priority: ReferralPriority` **removed entirely**; replaced with `problems: StudentProblems` (12 checkboxes + "อื่นๆ" free text) + `problemSummary: string`. `ReferralPriority` type and `REFERRAL_PRIORITY_LABEL` deleted — priority as a concept no longer exists anywhere in the app.
- [x] **`TargetWork` expanded from 3 to 4 values**: `guidance` / `scholarship` / **`discipline` (new)** / `rehabilitation`. `rehabilitation`'s label changed from "งานบำบัดผู้เรียน" → "งานส่งต่อไปยังสถานพยาบาล". New `TARGET_WORK_PURPOSE` record added (the "เพื่อ..." clause shown next to each choice).
- [ ] No "level" (ระดับชั้น) field confirmed on `students`/`std_class` — still using `class_name`/`class_code` as substitute everywhere
- [ ] Add `firestore.indexes.json` once real query patterns are exercised
- [x] `care-plus` database live in the real Firebase project

## 5. Forms

- [x] แบบคัดกรองผู้เรียน — bulk grid, unchanged this session except print-doc fixes (§7)
- [x] แบบบันทึกการเยี่ยมบ้านผู้เรียน — unchanged this session except: submit now redirects to `/home-visits` instead of `/students`
- [x] บันทึกข้อความเยี่ยมบ้าน — button relabeled "บันทึก" (was "บันทึกและดูตัวอย่างเพื่อพิมพ์"), submit redirects to the list (`/home-visits/memo`) instead of the now-orphaned detail page; หัวหน้าแผนกวิชา is now a searchable teacher combobox instead of free text
- [x] กิจกรรมโฮมรูม — same relabel/redirect treatment as the memo form; หัวหน้าแผนกวิชา also a searchable combobox now; หัวหน้างานครูที่ปรึกษาและการแนะแนว / รองผู้อำนวยการฯ fields are now **read-only, auto-filled from Signatory Settings** (§6) instead of manually typed
- [x] ติดตามออกกลางคัน — unchanged fields, but fixed a real bug: edit mode showed the *first* student in the roster instead of the actual record's student (classic "two effects racing to set the same state" bug — same shape as the one fixed in the Referral form this session, see §12)
- [x] **ส่งต่อผู้เรียน — completely redesigned this session.** Was previously reachable only via `/referrals/new/:studentId` (no list, no student picker, free-text reason + priority select). Now:
  - Self-contained student picker in the form itself (`/referrals/new`), still supports `/referrals/new/:studentId` pre-fill from the student list's "ส่งต่อ" action
  - 12-item ปัญหาที่เกิดขึ้นกับผู้เรียน checkboxes + "อื่นๆ" + สรุปปัญหาพอสังเขป replace the old free-text reason
  - 4-choice target-work radio (see §4) replaces the old target-work + priority selects
  - Edit mode added (`/referrals/:id/edit`)
  - Fixed a real Firestore bug: creating a referral for a student with no home-visit record on file threw silently, because `screeningId`/`homeVisitId` were passed as `undefined` — Firestore rejects `undefined` field values outright. Fixed by omitting the key entirely instead of setting it to `undefined`. **Worth auditing other forms for the same `field: obj?.prop` footgun** — checked once this session (found one occurrence in `RegisterPage.tsx`, judged not actually risky there since the referenced object is guaranteed non-null by that point in the flow).
- [x] Draft vs. submitted status unchanged from before

## 6. Main pages

- [x] 1–3, 4 (screening), 5 (screening summary) — unchanged in structure this session, print-doc fixes only (§7)
- [x] 6–7c (home visit / memo / homeroom / dropout follow-up) — see §5 for the redirect/relabel/combobox changes
- [x] 8. Referral Page — now `ReferralListPage.tsx` (`/referrals`, list + "+ บันทึกใหม่") → `ReferralFormPage.tsx` (create/edit) — previously this route didn't have a working list at all (dead nav link, since fixed)
- [x] 9. Referral Inbox Page (`/referral-inbox`) — **role moved from `admin` to `advisor_staff`** (§3)
- [x] 10–11. Intervention / Follow-up — unchanged, still inline in Referral Detail Page
- [x] 12. Reports Page — unchanged
- [x] 13. User Management Page — **now admin-only** (§3)
- [x] **14. NEW: Signatory Settings Page** (`/settings/signatories`, admin-only) — lets admin set the names of two positions that appear on every printed memo (หัวหน้างานครูที่ปรึกษาและการแนะแนว, รองผู้อำนวยการฝ่ายกิจการนักเรียนนักศึกษา), versioned per (ปีการศึกษา, ภาคเรียน) since these people change often. Consumed automatically by: บันทึกข้อความสรุปคัดกรอง, บันทึกข้อความกิจกรรมโฮมรูม, บันทึกข้อความเยี่ยมบ้าน. Backing collection: `signatory-settings` (§4).
- [ ] **`HomeroomLogDetailPage.tsx` (`/homeroom/:logId`) and `HomeVisitMemoDetailPage.tsx` (`/home-visits/memo/:memoId`) are now unreachable from anywhere in the UI** — routes still exist and still work if you type the URL, but nothing links to them anymore since their respective forms now redirect to the list page (which already has inline print) instead of the detail page after saving. Flagged to the project owner but not yet resolved — candidates for deletion if confirmed genuinely unused.

## 7. UI/UX requirements

- [x] Mobile-first, sidebar (desktop) + bottom nav/drawer (mobile)
- [x] Card-based layout, large dashboard numbers, status badges, sectioned forms, loading/empty/error states, toasts, confirm dialogs — all unchanged
- [x] Nav highlight bug — fixed previously, still fine
- [x] **Sidebar profile block bug fixed this session**: on long pages (many list rows), the `<aside>` sidebar wasn't pinned to the viewport — it just stretched to match the height of the (much taller) main-content column in the shared flex layout, so the user-profile/logout block at the bottom of the sidebar drifted far below the visible screen and needed scrolling all the way down to reach. Fixed with `sticky top-0 h-screen` on the `<aside>` in `AppLayout.tsx`.
- [x] **Print signature-alignment bugs fixed this session** (screening summary memo, homeroom memo, dropout-follow-up memo, home-visit memo): "ลงชื่อ....." lines and "ที่ / วันที่" underlines were drifting out of alignment because signature boxes had no fixed width (grew to fit whichever position label was longest) and `items-baseline` was used instead of `items-end` for empty-vs-filled underline rows. Fixed with `w-64` fixed-width signature boxes and `items-end` alignment everywhere this pattern appears.
- [x] **Print paragraph structure fixed this session** (dropout-follow-up memo, homeroom memo): consolidated into cleaner paragraph counts per project-owner spec, with numbered headings at normal indent and the actual user-entered content on its own line at a deeper indent.
- [x] **Dropout-follow-up memo gained a page 2**: "ภาพประกอบการติดตามผู้เรียน" showing the evidence photos (หลักฐานในการติดตามผู้เรียน / หลักฐานในการติดต่อผู้ปกครอง), `break-before-page`, only rendered when at least one photo exists.
- [x] **Print blank-page race condition — partially fixed this session.** Root cause confirmed: `setTimeout(() => window.print(), 50)` fired regardless of whether `<img>` elements (from Firebase Storage) had finished loading, so slow connections got blank photo pages. Fixed with a new shared `src/utils/waitForImages.ts` (resolves once every `<img>` in the print container has fired `load`/`error`) — **applied to the 3 features with real uploaded photos in their prints**: เยี่ยมบ้าน (`HomeVisitFormPage`, `HomeVisitListPage`), กิจกรรมโฮมรูม (`HomeroomLogListPage`, `HomeroomLogDetailPage`), ติดตามออกกลางคัน (`DropoutFollowUpListPage`). **Not applied** to คัดกรอง/บันทึกข้อความเยี่ยมบ้าน/ส่งต่อผู้เรียน prints since those only render the static bundled ครุฑ logo (near-zero real risk) — left on the old fixed-timer pattern.
- [x] **NEW: shared `TeacherCombobox.tsx`** (`src/components/ui/TeacherCombobox.tsx`) — searchable teacher-name dropdown, extracted from a one-off in the screening print modal, now reused for "หัวหน้าแผนกวิชา" fields in homeroom and home-visit-memo forms.
- [x] **NEW: shared `SearchableSelect.tsx`** (`src/components/ui/SearchableSelect.tsx`) — generic typeahead dropdown over `{value, label}` pairs with a distinct "all" sentinel value (`allValue` prop). **Bug fixed mid-session**: the "ทุกสาขาวิชา"/"ทุกกลุ่มเรียน" reset option originally emitted the same empty string used for "nothing chosen yet", so deliberately picking "all" collapsed back into the un-selected gate state and could never actually show all data. Now takes a caller-supplied non-empty sentinel (`"__all__"`) so the three states (unselected / all / specific) are distinguishable.
- [x] **NEW: college-wide filter gating, applied to 7 pages this session** — `admin`/`advisor_staff` used to eagerly fetch *every* student/record in the whole college the instant these pages opened (observed: 5,773 students dumped into one unfiltered list/chart). Now these roles must pick a สาขาวิชา or กลุ่มเรียน filter (or explicitly choose "ทั้งหมด") before any heavy fetch runs; the filter dropdowns themselves populate from lightweight `out-of/department`/`out-of/std_class` queries so they're available before the heavy data loads. Applied to: รายชื่อผู้เรียน, ข้อมูลผู้เรียน, เยี่ยมบ้าน, บันทึกข้อความเยี่ยมบ้าน, กิจกรรมโฮมรูม, ติดตามออกกลางคัน, ส่งต่อผู้เรียน. (สรุปเยี่ยมบ้าน got the same "must choose before loading" treatment slightly earlier in the session, independently, via a local `ALL` sentinel rather than the shared component.) `advisor_teacher` is unaffected — their own class list is always small, no gate.
- [x] **NEW: admin/advisor_staff turned view+print-only on 5 pages** — "+ บันทึกใหม่" button and the pencil (edit) / trash (delete) icons are now hidden for `admin`/`advisor_staff` on: กิจกรรมโฮมรูม, เยี่ยมบ้าน, บันทึกข้อความเยี่ยมบ้าน, ติดตามออกกลางคัน, ส่งต่อผู้เรียน — only the printer icon remains for them. `advisor_teacher` keeps full create/edit/delete on all of these. On เยี่ยมบ้าน specifically, the "สร้างบันทึกข้อความ" button also relabels to "ดูบันทึกข้อความ" for these two roles. On รายชื่อผู้เรียน, the "เยี่ยมบ้าน" quick-action link is hidden for them too.
- [ ] Manual cross-browser / real-device pass — still recommended
- [ ] Android Chrome blank-print-preview bug — see above, **now mostly addressed** for photo-bearing prints; not yet re-verified on an actual Android device

## 8. Security rules

- [ ] **`firestore.care-plus.rules` is wide open (`if true`)** — still the single most important open item
- [x] `storage.rules` matches (no `request.auth` check)
- [x] `firebase.json` scoped only to `care-plus`
- [x] Rules file now covers all **10** `care-plus` collections including `signatory-settings` (added this session, both in the deployed-open file and the role-based `.future` file, which grants `signatory-settings` read to any active user and write to admin/advisor_staff only)
- [ ] **Reminder: editing the rules files in this repo has no effect on the live database** — must be copy-pasted into Firebase Console → Publish by hand every time. Not confirmed whether the console is in sync, including the newly-added `signatory-settings` block from this session.
- [ ] **When Firebase Auth is re-enabled:** restore `firestore.care-plus.rules.future`, re-add storage auth check, rewire `AuthContext.tsx` to `src/lib/auth.ts`. The `.future` file's `isOfficerFor()` helper was updated this session to include the new `discipline` target-work case — verify it still matches whatever the role model looks like by the time this is restored.

## 9. PWA

- [x] Unchanged this session — manifest, icons, service worker all as before
- [ ] Verify "Add to Home Screen" on a real device — still not done

## 10. Project structure

- [x] Feature dirs unchanged except a new `settings/` feature (`SignatorySettingsPage.tsx`, `api.ts`) and new shared UI components (`TeacherCombobox.tsx`, `SearchableSelect.tsx`)

## 11. Data types

- [x] Core types unchanged except: `Referral` (see §4), `TargetWork`/`TARGET_WORK_LABEL`/`TARGET_WORK_PURPOSE` (see §4), new `SignatorySettings` + `StudentProblems`/`PROBLEM_LABEL`/`PROBLEM_ORDER`
- [x] `ReferralPriority` type and `REFERRAL_PRIORITY_LABEL` **deleted** — no longer exist anywhere

## 12. Implementation notes

- [x] No writes to `out-of`, all new data under `care-plus`
- [x] Firebase config via env vars, `.env.example` provided
- [x] Shared utils: `thaiDate.ts`, `age.ts`, `thaiAddress.ts`, plus this session's `waitForImages.ts`
- [x] **Recurring bug pattern found and fixed twice this session, worth remembering**: two `useEffect`s that both guard on `!someState` and each call `setState(...)` will race when their shared dependency (`data`) resolves — the second effect can read a stale (pre-update) value of `someState` and overwrite what the first effect just set. Fixed in `DropoutFollowUpFormPage.tsx` (edit mode showed the wrong student) and pre-empted in `ReferralFormPage.tsx` by merging the two effects into one from the start. **Check any future form with an "edit mode pre-fill" effect + a separate "default to first option" effect for this shape.**
- [x] **Recurring bug pattern #2**: `field: obj?.prop` written straight into a Firestore payload crashes the write outright if `obj` is null/the value is legitimately absent — Firestore rejects `undefined` field values, it doesn't silently drop them. Any optional reference field must be spread in conditionally (`...(x ? { field: x } : {})`) rather than assigned with a bare `?.`.

## 13. Expected output

- [x] Working Vite/React/TS project, builds clean
- [ ] `README.md` — still needs the Cloudflare→GitHub Pages fix and the collections-table update (unresolved from last pass, now also missing `signatory-settings` as a 4th gap)
- [x] `.env.example`, rules files, `firebase.json` all present and current in-repo
- [x] Deployed and live on GitHub Pages

## Outstanding / open items

1. **Re-enable Firebase Authentication** and restore role-based rules — still the biggest open item (§3, §8).
2. **Verify Firebase Console rules are in sync**, especially the newly-added `signatory-settings` block from this session (§8).
3. **Decide the fate of `HomeroomLogDetailPage.tsx` / `HomeVisitMemoDetailPage.tsx`** — orphaned by this session's redirect changes, flagged but not deleted (§6).
4. Update `README.md` — deploy section + collections table, now 4 gaps instead of 3.
5. Manual device/browser QA pass — still not done, now also worth specifically re-checking the print-image-loading fix on an actual slow Android connection.
6. Custom domain decision (`care.rytc.ac.th`) — still open, unrelated to this session's work.
7. **This session's ~30+ file changes landed in a single commit (`271faad`) directly on `main`**, not through the PR-per-feature + CI-poll workflow documented in `RYC_CARE_PLUS_PROGRESS.md` § "Git workflow" — worth confirming with the project owner whether that workflow is still the intended process going forward, or whether direct-to-main is now acceptable for this kind of iterative session.
</content>
