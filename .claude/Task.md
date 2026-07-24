# Task List — RYC Care+

Tracks progress against the original spec (13 sections). Update checkboxes
as work continues; keep this in sync with `Implementation_Plan.md`.

Last updated: 2026-07-06 (rev. 6 — added "พิมพ์บันทึกข้อความ" print output to Screening Summary Page)

## 1. Technology stack

- [x] Vite + React + TypeScript
- [x] Tailwind CSS (v4, green/white theme + trust/concern/close status colors)
- [x] React Router
- [x] Firestore + Storage SDK. Firebase Authentication SDK present but **not wired up** — see §3
- [x] PWA (installable, `vite-plugin-pwa`)
- [x] Responsive / mobile-first layout
- [x] Cloudflare Pages build target (`dist/`)

## 2. App identity

- [x] App name / branding (RYC Care+, C+ mark, green theme) in login, sidebar, manifest, favicon

## 3. Authentication & User roles & RBAC

- [x] **Firebase Authentication temporarily disabled** by explicit project owner decision — see `Implementation_Plan.md` §3.4 for the full history (rejected: hidden-Firebase-Auth-with-synthetic-email compromise; accepted: citizenId+password custom auth with known security trade-offs)
- [x] Login/registration now by 13-digit citizen ID (`src/lib/customAuth.ts`, `src/lib/passwordHash.ts`)
- [x] `RegisterPage` (`/register`): citizenId → lookup `out-of/teachers` → confirm `tname`/`position`/`dep_name` → **select classIds (multi-select, auto-suggested from `out-of/std_class.advisor_name` matching the teacher's name, editable/addable)** → set password → creates `care-plus/users/{citizenId}` with `isActive: false` and `departmentId`/`departmentName`/`classIds` populated (fixed a bug where `departmentId` and `classIds` were previously never saved, leaving new teachers with an empty student roster)
- [x] `LoginPage`: citizenId + password → verifies PBKDF2 hash → session = citizenId in `localStorage`
- [x] 5 roles + `admin` modeled (`src/types/index.ts`, `src/utils/rbac.ts`) — unchanged by the auth pivot
- [x] Route-level protection (`src/routes/ProtectedRoute.tsx`) — now checks custom `AuthContext` profile instead of Firebase `firebaseUser`
- [ ] **Firestore-level enforcement is currently OFF** (`firestore.care-plus.rules` = `allow read, write: if true` for every collection) because there is no Firebase Auth session to check. This is accepted-but-unresolved — the real ruleset is saved in `firestore.care-plus.rules.future`, restore it when Firebase Auth returns.
- [x] **`out-of` database is not managed by this project at all** — owned by a separate existing application that also writes to it. No `firestore.out-of.rules` file exists here; `firebase.json` only references `care-plus`. (Earlier revisions of these docs incorrectly proposed managing `out-of` rules — corrected.)
- [x] **`TEACHER_ID_CARD_FIELD = 'tidcard'`** (`src/features/students/api.ts`) — confirmed against real data (first live registration attempt with the original `'id_card'` guess returned "not found"; project owner confirmed the real field is `tidcard`).

## 4. Firestore structure

- [x] Confirmed with project owner: `care-plus` and `out-of` are two separate named Firestore databases in the same Firebase project (not `(default)`)
- [x] `care-plus` database, plain top-level collections: `users`, `screenings`, `home-visits`, `referrals`, `interventions`, `follow-up-results`
- [x] `out-of` database (owned by another app), plain top-level collections: `department`, `students`, `teachers`, `std_class` — this app only ever reads
- [x] TypeScript types for every collection (`src/types/index.ts`) — `UserProfile` extended with `authProvider`, `citizenId`, `passwordHash`, `passwordSalt`, `position`, `departmentName`
- [x] **`out-of` field names confirmed against real Firestore console data and corrected everywhere** — see table in `README.md` § "out-of collections & fields" and `Implementation_Plan.md` §3.3. Every field name in `src/types/legacy.ts` had been guessed before this and was wrong (except `Teacher.tname`/`position`/`dep_name`, confirmed correct by luck earlier). Fixed across `students/api.ts`, `useStudentRoster.ts`, `StudentListPage.tsx`, `ScreeningFormPage.tsx`, `HomeVisitFormPage.tsx`, `ReferralFormPage.tsx`, `dashboard/api.ts`, `StaffDashboard.tsx`, `HomeVisitSummaryPage.tsx`, `UserManagementPage.tsx`.
- [x] Collections & fields documented — see tables in `README.md` § "care-plus collections & fields" and § "out-of collections & fields"
- [ ] **No "level" (ระดับชั้น) field confirmed on `students`/`std_class`.** Every "by level" filter/grouping across the app now uses `class_name` (กลุ่มเรียน) instead as the closest real substitute — `dashboard/api.ts`'s `fetchCollegeDashboard()`, and as of this pass `ScreeningSummaryPage.tsx`'s filter dropdown + print report header (was showing an unusable empty "ทุกระดับชั้น" dropdown with no options, since every screening doc's `level` field is always `''` — same root cause as the others). If a real level field is found later, this is the full list of call sites to switch back.
- [ ] Add `firestore.indexes.json` once real query patterns are exercised against production data
- [ ] **Create the `care-plus` database in the real Firebase project** if not already done (database ID must be exactly `care-plus`)

## 5. Forms

- [x] แบบคัดกรองผู้เรียน — 9 categories, checklist + note per category, auto risk-group rollup (`features/screenings/ScreeningFormPage.tsx`, `checklist.ts`)
- [x] แบบบันทึกการเยี่ยมบ้านผู้เรียน — full field set incl. student/family/behavior info, parent/advisor opinion, photo + map upload (`features/homeVisits/HomeVisitFormPage.tsx`)
- [x] Draft vs. submitted status on both forms

## 6. Main pages

- [x] 1. Login Page (now citizenId + password)
- [x] 1b. Register Page (`/register`, added — not in original 13-page list, required by the auth pivot). No class-picker UI here (removed after project owner review) — registration silently pre-fills `classIds` via `suggestClassesForTeacher()` (matching `out-of/std_class.advisor_name` to the teacher's name) with no checkbox/dropdown shown, so registration stays a minimal identity+password step and class assignment has exactly one editable UI surface.
- [x] 1c. My Classes Page (`/my-classes`, added — the *only* place `classIds` is edited by the teacher; self-service, immediate effect, no approval needed, per project owner decision). Uses shared `ClassMultiSelect` component + `suggestClassesForTeacher()` helper (also used silently by `RegisterPage`, see above).
- [x] 2. Dashboard Page (role-specific: teacher / staff overview / officer inbox)
- [x] 3. Student List Page (filters, search, screening/visit/referral status)
- [x] 4. Screening Form Page — **redesigned as a bulk grid** (`/screenings`, `BulkScreeningPage.tsx`), replacing the original one-student-at-a-time form entirely (project owner: the per-student form "ไม่ช่วยให้ครูที่ปรึกษาง่ายต่อการคัดกรอง"). Rows = every student in the teacher's classes, columns = checklist items for one category at a time (tabbed, 9 categories + a "สรุป" tab), checkbox cells, autosaves to Firestore immediately per click (queued per-student to avoid write races on rapid clicks), no manual "select a group" step — the group per category is fully auto-computed from which checklist column (ห่วงใย vs ใกล้ชิด) was ticked, per the source PDF's actual rule structure (`src/features/screenings/checklist.ts`, `SCREENING_CHECKLIST: Record<key, {concern, close}>`). Per-category notes were dropped in favor of one overall note per student (edited in the "สรุป" tab), per project owner decision.
- [x] Screening docs use a **deterministic id** (`screeningDocId()` = `{academicYear}_{semester}_{studentId}`, written via `upsertDocWithId`/`setDoc merge:true`) instead of Firestore's random `addDoc` id — considered and rejected a proposed deep `screenings/{year}/{semester}/{class}/{sid}` subcollection hierarchy first (see `Implementation_Plan.md` §6 for the full reasoning). Pre-existing screening docs keep their original id; only newly-created ones use the new scheme — no migration needed.
- [x] 5. Screening Summary Page (charts + filters + print). Two mutually-exclusive print outputs, gated by a `printMode: 'memo' | 'report' | null` state (triggers `window.print()` via effect, resets on the browser's `afterprint` event so only one section is ever in the print DOM at a time):
  - "พิมพ์รายงาน" — renders the official "แบบสรุปผลการคัดกรองผู้เรียน" paper form layout (per-category count of ใกล้ชิด/ห่วงใย/ไว้ใจ, signature lines for ครูที่ปรึกษา/หัวหน้าแผนก), matching the source form image the project owner attached.
  - "พิมพ์บันทึกข้อความ" — added later, positioned before "พิมพ์รายงาน" per project owner request. Renders a formal government-style บันทึกข้อความ addressed to the college director, referencing the "Vocational Education Zero Drop Out" project and the current academic year, with 4 signature blocks: ครูที่ปรึกษา and หัวหน้าแผนกวิชา left blank for hand-signing, but หัวหน้างานครูที่ปรึกษา (นางสาวสิริขวัญ นพสันเทียะ) and รองผู้อำนวยการฝ่ายกิจการนักเรียนนักศึกษา (นายชาคริต รุ่งรัตน์) are **hardcoded real staff names** per the attached reference image — update these if either person's role changes.
  Also fixed a pre-existing bug found while touching this file: the สาขาวิชา filter dropdown was passing department *names* as the filter value while the query compared against `departmentId` — filtering by department silently never matched. Now uses `[departmentId, departmentName]` pairs.
- [x] 6. Home Visit Form Page
- [x] 7. Home Visit Summary Page
- [x] 8. Referral Page
- [x] 9. Referral Inbox Page
- [x] 10. Intervention Form — implemented inline within Referral Detail Page rather than a standalone route (natural workflow: referral → intervention happens in context of one referral)
- [x] 11. Follow-up Result Page — same as above, inline in Referral Detail Page, with case-close action
- [x] 12. Reports Page (tabbed: overview / screenings / home-visits / referrals, print-friendly)
- [x] 13. User Management Page — now: activate self-registered teachers + assign role/classIds, and create non-teacher-role accounts directly (citizenId + temp password)

## 7. UI/UX requirements

- [x] Mobile-first, sidebar (desktop) + bottom nav/drawer (mobile)
- [x] Card-based layout, large dashboard numbers
- [x] Status color coding (green/yellow/red badges)
- [x] Sectioned long forms
- [x] Loading / empty / error states (`components/ui/States.tsx`)
- [x] Toast notifications (`components/ui/Toast.tsx`)
- [x] Confirm dialogs before destructive/status-changing actions (`components/ui/ConfirmDialog.tsx`)
- [ ] Manual cross-browser / real-device pass (no headless browser available in the dev sandbox to verify visually — recommend a manual pass before launch)

## 8. Security rules

- [ ] **`firestore.care-plus.rules` is wide open (`if true`), not role-based, by accepted temporary trade-off.** This is the single most important open item in the whole project — flag prominently to anyone touching this repo. Real ruleset preserved in `firestore.care-plus.rules.future`.
- [x] `storage.rules` updated to match (no `request.auth` check — would otherwise reject every home-visit photo upload)
- [x] No rules files for `out-of` in this repo, by design — it's owned by another application
- [x] `firebase.json` scoped only to `care-plus` database's rules + Storage rules
- [ ] Deploy `firestore.care-plus.rules` + `storage.rules` to the real Firebase project (`npx firebase-tools deploy --only firestore,storage`)
- [ ] **When Firebase Auth is re-enabled:** restore `firestore.care-plus.rules.future` → `firestore.care-plus.rules`, re-add the `request.auth != null` check to `storage.rules`, and rewire `AuthContext.tsx` to `src/lib/auth.ts` (already implemented, just unused)

## 9. PWA

- [x] `manifest.json` via `vite-plugin-pwa` config (name, short_name, theme/background color, standalone display)
- [x] Icons generated (192/512 + maskable variants + apple-touch-icon)
- [x] Service worker (Workbox, autoUpdate, NetworkFirst for Firestore calls)
- [ ] Verify "Add to Home Screen" install flow on a real Android/iOS device once deployed

## 10. Project structure

- [x] Matches the requested `src/{app,components,features,hooks,lib,routes,types,utils}` layout

## 11. Data types

- [x] `UserProfile`, `Student`, `Teacher`, `Department`, `StdClass`, `Screening`, `HomeVisit`, `Referral`, `Intervention`, `FollowUpResult`, `DashboardSummary` all defined
- [x] `Teacher` extended with confirmed field names `tname`, `position`, `dep_name`, `tidcard`

## 12. Implementation notes

- [x] No writes anywhere to `out-of` database (grep-verified — only `listLegacy`/`getLegacyById`, both read-only)
- [x] All new data under the `care-plus` database
- [x] Firebase config via `VITE_FIREBASE_*` env vars, no hardcoded secrets — real values already placed in local `.env` (gitignored) for project `rytc-app`
- [x] `.env.example` provided, `.env*` gitignored

## 13. Expected output

- [x] Working Vite/React/TS project, builds clean (`npm run build`)
- [x] `README.md` (install, Firebase setup, temporary-auth explanation, local dev, build, Cloudflare Pages deploy)
- [x] `.env.example`
- [x] `firestore.care-plus.rules` (open, temporary), `firestore.care-plus.rules.future` (real, for restoration), `storage.rules`, `firebase.json`
- [x] Deploy-ready for Cloudflare Pages (`npx wrangler pages deploy dist --project-name=care`)

## Outstanding before production launch

1. **Decide when to re-enable Firebase Authentication** and restore `firestore.care-plus.rules.future` — until then, `care-plus` has no real access control.
2. Create the `care-plus` Firestore database in the real project if not already done.
3. Deploy `firestore.care-plus.rules` / `storage.rules` (`npx firebase-tools deploy --only firestore,storage`) — never touch `out-of`'s rules.
4. Create the first `admin`/`advisor_staff` account manually (see README step 6), then have teachers self-register at `/register` and activate them via User Management.
5. Manual device/browser QA pass (forms, PWA install, charts, register→activate→login flow end to end) — not yet done in this environment.
6. Point `care.rytc.ac.th` at the Cloudflare Pages project once deployed.
