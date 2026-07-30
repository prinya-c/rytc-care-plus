# Task List — RYC Care+

Tracks progress against the original spec (13 sections) plus features added
since. Update checkboxes as work continues; keep this in sync with
`Implementation_Plan.md` and `.claude/RYC_CARE_PLUS_PROGRESS.md` (the
session-by-session activity log — check there first for anything not
reflected here yet).

Last updated: 2026-07-30 (rewritten to match actual repo state — see
`RYC_CARE_PLUS_PROGRESS.md` for the PR-by-PR history that led here)

## 1. Technology stack

- [x] Vite + React 19 + TypeScript
- [x] Tailwind CSS (v4, green/white theme + trust/concern/close status colors)
- [x] React Router v7
- [x] Firestore + Storage SDK. Firebase Authentication SDK present but **not wired up** — see §3
- [x] PWA (installable, `vite-plugin-pwa`)
- [x] Responsive / mobile-first layout
- [x] **Deploy target: GitHub Pages** (`base: '/rytc-care-plus/'` in `vite.config.ts`, `.github/workflows/deploy.yml` auto-deploys on every push to `main`, live at `prinya-c.github.io/rytc-care-plus`) — **not** Cloudflare Pages; the plan changed after this doc was first written. `README.md`'s "Deploy to Cloudflare Pages" section is stale and should be corrected to match.

## 2. App identity

- [x] App name / branding (RYC Care+, C+ mark, green theme) in login, sidebar, manifest, favicon

## 3. Authentication & User roles & RBAC

- [x] **Firebase Authentication temporarily disabled** by explicit project owner decision — see `Implementation_Plan.md` §3.4 for the full history (rejected: hidden-Firebase-Auth-with-synthetic-email compromise; accepted: citizenId+password custom auth with known security trade-offs)
- [x] Login/registration by 13-digit citizen ID (`src/lib/customAuth.ts`, `src/lib/passwordHash.ts`)
- [x] `RegisterPage` (`/register`): citizenId → lookup `out-of/teachers` → confirm `tname`/`position`/`dep_name` → set password → creates `care-plus/users/{citizenId}` with `isActive: false`, `departmentId`/`departmentName`/`classIds` auto-populated
- [x] `LoginPage`: citizenId + password → verifies PBKDF2 hash → session = citizenId in `localStorage` (`src/features/auth/AuthContext.tsx`)
- [x] **A second, separate auth system for students** (added after this doc was last written): `src/features/studentAuth/StudentAuthContext.tsx`, login by studentId + citizenId, own tab on `/login`, own route guard `src/routes/StudentProtectedRoute.tsx`, gates only `/student/home-visit` (students self-report their own home-visit info)
- [x] 5 roles + `admin` modeled (`src/types/index.ts`, `src/utils/rbac.ts`): `admin`, `advisor_teacher`, `advisor_staff`, `guidance_staff`, `scholarship_staff`, `rehabilitation_staff`
- [x] Route-level protection (`src/routes/ProtectedRoute.tsx`) — checks custom `AuthContext` profile
- [ ] **Firestore-level enforcement is currently OFF** (`firestore.care-plus.rules` = `allow read, write: if true` for every collection) because there is no Firebase Auth session to check. This is accepted-but-unresolved — the real ruleset is saved in `firestore.care-plus.rules.future`, restore it when Firebase Auth returns.
- [x] **`out-of` database is not managed by this project at all** — owned by a separate existing application that also writes to it. No `firestore.out-of.rules` file exists here; `firebase.json` only references `care-plus`.
- [x] **`TEACHER_ID_CARD_FIELD = 'tidcard'`** (`src/features/students/api.ts`) — confirmed against real data.

## 4. Firestore structure

- [x] Confirmed with project owner: `care-plus` and `out-of` are two separate named Firestore databases in the same Firebase project (not `(default)`)
- [x] `care-plus` database, plain top-level collections — **grew from 6 to 9** since the doc was first written: `users`, `screenings`, `home-visits`, `home-visit-memos`, `homeroom-logs`, `dropout-follow-ups`, `referrals`, `interventions`, `follow-up-results`
- [x] `out-of` database (owned by another app), plain top-level collections: `department`, `students`, `teachers`, `std_class` — this app only ever reads
- [x] TypeScript types for every collection (`src/types/index.ts`), including newer ones: `HomeVisitMemo`, `HomeroomLog`, `AbsentStudentEntry`, `DropoutFollowUp`, `ContactChannels`, plus `StudentInfo`/`FamilyInfo`/`BehaviorInfo` sub-shapes on `HomeVisit`
- [x] **`out-of` field names confirmed against real Firestore console data** — see table in `README.md` § "out-of collections & fields" and `Implementation_Plan.md` §3.3
- [x] Collections & fields documented — see tables in `README.md` § "care-plus collections & fields" (note: that table is also stale, missing `home-visit-memos`/`homeroom-logs`/`dropout-follow-ups` — worth a follow-up pass) and § "out-of collections & fields"
- [ ] **No "level" (ระดับชั้น) field confirmed on `students`/`std_class`.** Every "by level" filter/grouping across the app uses `class_name` (กลุ่มเรียน) instead as the closest real substitute
- [ ] Add `firestore.indexes.json` once real query patterns are exercised against production data
- [x] `care-plus` database exists and is live in the real Firebase project — app has been in active use across many merged/deployed PRs (see `RYC_CARE_PLUS_PROGRESS.md`)

## 5. Forms

- [x] แบบคัดกรองผู้เรียน — bulk grid, 9 categories, auto risk-group rollup (`features/screenings/BulkScreeningPage.tsx`, `checklist.ts`)
- [x] แบบบันทึกการเยี่ยมบ้านผู้เรียน — full field set incl. student/family/behavior info, 6 teacher-observed behavior questions, photo + map upload (`features/homeVisits/HomeVisitFormPage.tsx`)
- [x] **บันทึกข้อความเยี่ยมบ้าน** (added later, its own saved list — not just a print output) — `features/homeVisits/HomeVisitMemoFormPage.tsx` / `HomeVisitMemoListPage.tsx` / `HomeVisitMemoDetailPage.tsx`
- [x] **กิจกรรมโฮมรูม** (homeroom log, added later) — `features/homeroom/HomeroomLogFormPage.tsx` / `HomeroomLogListPage.tsx` / `HomeroomLogDetailPage.tsx`, tracks absent students per session (`AbsentStudentEntry[]`)
- [x] **ติดตามออกกลางคัน** (dropout follow-up, added later) — `features/dropoutFollowUp/DropoutFollowUpFormPage.tsx`, 8 fields: absence days, reason, contact-student channels + evidence photo, contact-parent channels + evidence photo, follow-up summary, follow-up result (radio)
- [x] **ข้อมูลผู้เรียน** (student info, split out of the home-visit form into its own page) — `features/homeVisits/StudentInfoListPage.tsx` / `StudentInfoFormPage.tsx`
- [x] **นักเรียนรายงานตัวเอง** (`/student/home-visit`, student-facing self-report form, separate student auth) — `features/homeVisits/StudentHomeVisitPage.tsx`
- [x] Draft vs. submitted status on forms that use it (bulk screening no longer has a draft/submitted distinction — every checkbox write is immediate, see `Implementation_Plan.md` §6)

## 6. Main pages

- [x] 1. Login Page (citizenId + password tab, studentId + citizenId tab)
- [x] 1b. Register Page (`/register`)
- [x] 1c. My Classes Page (`/my-classes`)
- [x] 2. Dashboard Page (role-specific)
- [x] 3. Student List Page (`/students`)
- [x] 4. Screening — **round-based now**: `ScreeningRoundListPage` (`/screenings`, picks a year/semester round, has print-memo/print-summary icons per round card) → `BulkScreeningPage` (`/screenings/:academicYear/:semester`, the spreadsheet-style bulk grid)
- [x] Screening docs use a deterministic id (`screeningDocId()` = `{academicYear}_{semester}_{studentId}`)
- [x] 5. Screening Summary Page (`/screenings/summary` — charts + filters; print actions moved off this page onto the round cards in `ScreeningRoundListPage`)
- [x] 6. Home Visit Form Page + list (`/home-visits`, printable in place from the list)
- [x] 6b. Home Visit Memo (`/home-visits/memo/*`, printable in place)
- [x] 7. Home Visit Summary Page (`/home-visits/summary`)
- [x] 7b. Homeroom Log (`/homeroom/*`, printable in place)
- [x] 7c. Dropout Follow-up (`/dropout-follow-up/*`, printable — generates a formal บันทึกข้อความ from the 8 fields)
- [x] 8. Referral Page (`/referrals/new/:studentId`)
- [x] 9. Referral Inbox Page (`/referral-inbox`)
- [x] 10. Intervention Form — inline within Referral Detail Page
- [x] 11. Follow-up Result Page — inline in Referral Detail Page, with case-close action
- [x] 12. Reports Page (`/reports`, tabbed, print-friendly)
- [x] 13. User Management Page (`/users`)

All print flows follow one shared pattern now (see `RYC_CARE_PLUS_PROGRESS.md`
§ "Print pattern"): click the printer icon → native print dialog opens
directly from the list page, no navigation, no eye/preview icon anymore
anywhere in the app.

## 7. UI/UX requirements

- [x] Mobile-first, sidebar (desktop) + bottom nav/drawer (mobile)
- [x] Card-based layout, large dashboard numbers
- [x] Status color coding (green/yellow/red badges)
- [x] Sectioned long forms
- [x] Loading / empty / error states (`components/ui/States.tsx`)
- [x] Toast notifications (`components/ui/Toast.tsx`)
- [x] Confirm dialogs before destructive/status-changing actions (`components/ui/ConfirmDialog.tsx`)
- [x] Nav highlight bug (two menu items highlighted at once, e.g. คัดกรองผู้เรียน staying highlighted on the สรุปคัดกรองผู้เรียน page) fixed via `NavLink`'s `end` prop
- [ ] Manual cross-browser / real-device pass — still recommended before/alongside launch
- [ ] **Known unresolved bug**: print preview ("Save as PDF") on Android Chrome sometimes renders a blank page (right page count, no content) — likely a race between `window.print()` firing and async content/image render. Affects every page using the shared print pattern. Analyzed, not yet fixed — user asked to hold off until they confirm. See `RYC_CARE_PLUS_PROGRESS.md` § "ปัญหาที่ยังไม่ได้แก้"

## 8. Security rules

- [ ] **`firestore.care-plus.rules` is wide open (`if true`), not role-based, by accepted temporary trade-off.** Still the single most important open item in the whole project. Real ruleset preserved in `firestore.care-plus.rules.future`.
- [x] `storage.rules` updated to match (no `request.auth` check)
- [x] No rules files for `out-of` in this repo, by design
- [x] `firebase.json` scoped only to `care-plus` database's rules + Storage rules
- [x] Rules file in-repo now covers all 9 `care-plus` collections including the newer `home-visit-memos`, `homeroom-logs`, `dropout-follow-ups`
- [ ] **Reminder: editing the rules files in this repo has no effect on the live database.** GitHub Actions only deploys the frontend — there is no `firebase deploy` step in `.github/workflows/deploy.yml`. Every time a collection is added/changed, the matching rules block must be copy-pasted into **Firebase Console → Firestore/Storage → Rules → Publish** by hand. Not confirmed whether the console is currently in sync with the rules committed here — verify before assuming any collection is protected/open as documented.
- [ ] **When Firebase Auth is re-enabled:** restore `firestore.care-plus.rules.future` → `firestore.care-plus.rules` (publish it in the console too), re-add the `request.auth != null` check to `storage.rules`, rewire `AuthContext.tsx` to `src/lib/auth.ts`

## 9. PWA

- [x] `manifest.json` via `vite-plugin-pwa` config
- [x] Icons generated (192/512 + maskable variants + apple-touch-icon)
- [x] Service worker (Workbox, autoUpdate, NetworkFirst for Firestore calls)
- [ ] Verify "Add to Home Screen" install flow on a real Android/iOS device once deployed

## 10. Project structure

- [x] `src/{app,components,features,hooks,lib,routes,types,utils}` layout, feature dirs now: `auth`, `studentAuth`, `dashboard`, `students`, `screenings`, `homeVisits`, `homeroom`, `dropoutFollowUp`, `referrals`, `interventions`, `reports`, `users`

## 11. Data types

- [x] Core: `UserProfile`, `Screening`, `HomeVisit`, `Referral`, `Intervention`, `FollowUpResult`, `DashboardSummary` — plus legacy `Student`, `Teacher`, `Department`, `StdClass`
- [x] Added since original spec: `HomeVisitMemo`, `HomeroomLog`, `AbsentStudentEntry`, `DropoutFollowUp`, `ContactChannels`, and `StudentInfo`/`FamilyInfo`/`BehaviorInfo` (nested on `HomeVisit`, also editable standalone via `StudentInfoFormPage`)
- [x] `Teacher` extended with confirmed field names `tname`, `position`, `dep_name`, `tidcard`

## 12. Implementation notes

- [x] No writes anywhere to `out-of` database (only `listLegacy`/`getLegacyById`, both read-only)
- [x] All new data under the `care-plus` database
- [x] Firebase config via `VITE_FIREBASE_*` env vars — locally via `.env` (gitignored); in CI via GitHub Actions repo secrets (`.github/workflows/deploy.yml`), **not** Cloudflare env vars
- [x] `.env.example` provided, `.env*` gitignored
- [x] Shared utils added since original spec: `src/utils/thaiDate.ts` (`formatThaiDate`/`parseDateInputValue`), `src/utils/age.ts` (`calculateAge`), `src/lib/thaiAddress.ts` + `ThaiAddressFields.tsx` (cascading จังหวัด/อำเภอ/ตำบล dropdowns)

## 13. Expected output

- [x] Working Vite/React/TS project, builds clean (`npm run build`)
- [ ] `README.md` — mostly accurate but **needs a pass**: still describes Cloudflare Pages as the deploy target and is missing 3 of the 9 `care-plus` collections in its data-model table
- [x] `.env.example`
- [x] `firestore.care-plus.rules` (open, temporary), `firestore.care-plus.rules.future` (real, for restoration), `storage.rules`, `firebase.json`
- [x] **Deployed and live**: GitHub Pages via `.github/workflows/deploy.yml`, auto-deploy on push to `main` — not the originally-planned Cloudflare Pages manual deploy

## Outstanding / open items

1. **Decide when to re-enable Firebase Authentication** and restore `firestore.care-plus.rules.future` — until then, `care-plus` has no real database-level access control (§3, §8).
2. **Verify Firebase Console rules are actually in sync** with `firestore.care-plus.rules` in this repo, especially for the newer collections (`home-visit-memos`, `dropout-follow-ups`, `homeroom-logs`) — console publishing is a manual step, easy to forget (§8).
3. **Fix the Android Chrome blank-print-preview bug** once the project owner confirms they want it addressed (§7).
4. Update `README.md`'s deploy section (Cloudflare → GitHub Pages) and its `care-plus` collections table (add the 3 missing collections).
5. Manual device/browser QA pass (forms, PWA install, charts, register→activate→login flow, student self-report flow end to end) — not yet done in this environment.
6. Custom domain: original plan was `care.rytc.ac.th` on Cloudflare Pages; deploy target has since moved to GitHub Pages at `prinya-c.github.io/rytc-care-plus` — confirm with project owner whether a custom domain is still wanted and, if so, point it at GitHub Pages instead.
</content>
