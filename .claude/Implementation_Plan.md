# Implementation Plan — RYC Care+

Status: **v1 scaffold complete and buildable**. This document reflects the
current implementation, not just an upfront design — update it whenever
architecture or scope changes.

Last updated: 2026-07-06 (rev. 5 — deterministic screening doc id instead of a proposed deep subcollection hierarchy; see §6)

## 1. Goal

ระบบติดตาม ดูแล ช่วยเหลือ และส่งต่อนักเรียน/นักศึกษา สำหรับงานครูที่ปรึกษา
วิทยาลัยเทคนิคระยอง ครอบคลุม: คัดกรองผู้เรียน → เยี่ยมบ้าน → ส่งต่องานที่
เกี่ยวข้อง → ติดตามผลหลังดำเนินการ → Dashboard สรุปภาพรวม

Deploy target: Cloudflare Pages at `care.rytc.ac.th`.

## 2. Tech stack (as implemented)

| Layer | Choice |
| --- | --- |
| Build tool | Vite 8 |
| UI | React 19 + TypeScript |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`, no postcss config needed) |
| Routing | React Router v7, route-level code splitting via `React.lazy` |
| Backend | Firestore + Storage. Firebase Authentication is built but **disabled** — see §3.4 |
| Charts | Recharts (Pie/Bar) |
| PWA | `vite-plugin-pwa` (autoUpdate, Workbox precache + NetworkFirst for Firestore) |
| Hosting | Cloudflare Pages (`dist/` output, `wrangler pages deploy`) |

## 3. Data architecture

**Two separate named Firestore databases in one Firebase project** (not
the `(default)` database) — confirmed with the project owner:

- **`out-of`** database — the college's existing student information
  system: `department`, `students`, `teachers`, `std_class`, as plain
  top-level collections. Read-only from this app.
- **`care-plus`** database — all data this app owns: `users`,
  `screenings`, `home-visits`, `referrals`, `interventions`,
  `follow-up-results`, also plain top-level collections.

This replaces an earlier v1 assumption (single default database +
namespace-doc/subcollection path nesting to avoid Firestore's
alternating-segment requirement) — the real setup makes that workaround
unnecessary, since the spec's collection names now map 1:1 to real
top-level collections in each database.

### 3.1 Connection setup

[src/lib/firebase.ts](../src/lib/firebase.ts) exports `outOfDb` and
`careDb` (`getFirestore(app, 'out-of')` / `getFirestore(app, 'care-plus')`).
[src/lib/firestore.ts](../src/lib/firestore.ts) wraps each with the same
small helper API (`legacyCollection`/`listLegacy`/`getLegacyById` for
`out-of`; `cpCollection`/`cpDoc`/`getById`/`listAll`/`createDoc`/
`patchDoc` for `care-plus`) so feature `api.ts` files never touch the
Firestore SDK directly.

### 3.2 `out-of` is not ours to manage

**Correction from an earlier revision of this doc:** `out-of` is not just
"another database this app reads" — it is actively read *and written* by
a separate, existing application. Confirmed with project owner: this
project must never touch `out-of`'s security rules at all, only ever read
its data. There is no `firestore.out-of.rules` file in this repo and
`firebase.json` does not reference that database. (An earlier revision of
this plan proposed deploying a read-only ruleset for `out-of` — that was
wrong and has been removed; the actual deployed rules for `out-of` are
owned by the other application's team.)

### 3.3 Types

All domain types live in [src/types/index.ts](../src/types/index.ts)
(`UserProfile`, `Screening`, `HomeVisit`, `Referral`, `Intervention`,
`FollowUpResult`, `DashboardSummary`, label maps for enums) and
[src/types/legacy.ts](../src/types/legacy.ts) (`Student`, `Teacher`,
`Department`, `StdClass`).

**Correction, confirmed against real data (Firestore console
screenshots, 2026-07-02):** every `out-of` field name in `legacy.ts` had
been guessed (invented plausible-sounding camelCase names like
`studentId`, `firstName`, `className`, `departmentName`) since no real
schema had ever been seen. All four collections turned out to use
different, snake_case field names. Corrected mapping:

| Collection | Doc ID | Real fields |
| --- | --- | --- |
| `department` | `dep_id` | `dep_id, dep_name, created_at, updated_at` |
| `teachers` | `tidcard` | `tidcard, tname, position, dep_id, dep_name, created_at, updated_at` |
| `students` | `sid` | `sid, sidcard, sname, class_code, class_name, short_name, dep_id, dep_name, created_at, updated_at` |
| `std_class` | `class_code` | `class_code, class_name, short_name, advisor_name, dep_id, dep_name, created_at, updated_at` |

This touched every file that reads `out-of` data or maps it into
`care-plus` documents: `src/types/legacy.ts`,
`src/features/students/api.ts`, `useStudentRoster.ts`,
`StudentListPage.tsx`, `ScreeningFormPage.tsx`, `HomeVisitFormPage.tsx`,
`ReferralFormPage.tsx`, `dashboard/api.ts`, `StaffDashboard.tsx`,
`HomeVisitSummaryPage.tsx`, `UserManagementPage.tsx`. Because doc IDs
equal the natural key (`sid`, `tidcard`, `class_code`, `dep_id`),
`fetchStudentByStudentId` and `findTeacherByCitizenId` were also
simplified from queries to direct `getDoc` lookups.

**No confirmed "level" (ระดับชั้น) field** exists on `students` or
`std_class`. Every place that used to group/filter by level (dashboard
"แยกตามระดับชั้น", student list level filter) now groups by `class_name`
instead — the closest real substitute. `care-plus` documents
(screenings/home-visits/referrals) still carry a `level` field for
forward-compatibility, but it's currently always written as `''` since
there's nothing to populate it from. Revisit `fetchCollegeDashboard()` in
`dashboard/api.ts` if a level field is found later (e.g. parsed out of
`class_code`).

### 3.4 Firebase Authentication is temporarily disabled

**Decision history:** the original design (rev. 1–2) used Firebase
Authentication with email/password. The project owner then asked to
switch teacher login to their 13-digit Thai citizen ID
(เลขบัตรประชาชน), looked up against `out-of/teachers`. The agent's first
proposal kept Firebase Auth running invisibly underneath (synthetic email
derived from citizenId) to preserve Firestore Security Rules' identity
checks. The project owner explicitly rejected that and asked to disable
Firebase Authentication entirely, temporarily, with a self-service
registration flow, planning to re-enable Firebase Auth once the system
stabilizes.

**What was built instead** (`src/lib/customAuth.ts`,
`src/lib/passwordHash.ts`):

- Registration (`/register`, `RegisterPage.tsx`): citizenId →
  `findTeacherByCitizenId()` looks up `out-of/teachers` by the field named
  in `TEACHER_ID_CARD_FIELD` (`src/features/students/api.ts`, confirmed as
  `'tidcard'` by the project owner) → shows `tname`/`position`/`dep_name`
  for the teacher to confirm → teacher sets a password →
  `care-plus/users/{citizenId}` is created with `isActive: false`.
- Login: citizenId + password → fetch `care-plus/users/{citizenId}` →
  verify password against a PBKDF2 hash (`passwordHash`/`passwordSalt`
  fields) → on success, store the citizenId in `localStorage` as the
  "session" (`AuthContext.tsx` re-fetches the profile from that on every
  page load).
- `UserManagementPage` still exists for provisioning non-teacher roles
  (advisor_staff, guidance_staff, scholarship_staff, rehabilitation_staff,
  admin) that don't have an `out-of/teachers` record, and for
  admins/advisor_staff to activate + assign role/classIds to newly
  self-registered teachers.
- `src/lib/auth.ts` (Firebase Auth wrapper) is left in the codebase,
  unused, with a comment explaining how to rewire `AuthContext.tsx` back
  to it later.

**Security consequence (accepted, not accidental):** with no Firebase
Auth, `request.auth` is always `null`, so Firestore Security Rules cannot
verify identity at all. `firestore.care-plus.rules` is therefore
currently **`allow read, write: if true`** for every collection — there is
no database-level protection right now for screening/home-visit/referral
data, only the app's own client-side session logic (which does not stop
anyone with the public Firebase config from calling the Firestore SDK
directly). The intended role-based ruleset is preserved in
`firestore.care-plus.rules.future` for restoration once Firebase Auth is
re-enabled. This trade-off was explained to and explicitly accepted by the
project owner twice before implementation.

## 4. Access control

- Role set: `admin`, `advisor_teacher`, `advisor_staff`, `guidance_staff`,
  `scholarship_staff`, `rehabilitation_staff`.
- UI-side gating: `src/utils/rbac.ts` (role → label, target-work mapping,
  capability checks) + `src/routes/ProtectedRoute.tsx` (redirects
  unauthenticated/inactive/unauthorized users).
- Server-side gating: **none right now** — `firestore.care-plus.rules` is
  wide open because Firebase Auth is disabled (§3.4). UI checks are
  currently the *only* enforcement, not a convenience layer on top of a
  real one. `firestore.care-plus.rules.future` has the real role-based
  version to restore later.
- Storage-side gating: `storage.rules` — updated in the same pass as
  `firestore.care-plus.rules` to not depend on `request.auth` (it would
  otherwise reject every upload, since Firebase Auth never populates it).
  Same temporary-open caveat applies; revert alongside the Firestore rules.
- Deploy config lives in `firebase.json`, scoped only to the `care-plus`
  database's rules + Storage rules. `out-of` is deliberately absent (§3.2).

## 5. Feature module map

| Feature dir | Responsibility |
| --- | --- |
| `features/auth` | `AuthContext` (custom citizenId session, backed by `lib/customAuth.ts`), `LoginPage`, `RegisterPage` (citizenId lookup → confirm → set password) |
| `features/dashboard` | Role-specific dashboards (`TeacherDashboard`, `StaffDashboard`, `OfficerDashboard`) + `api.ts` aggregation (client-side reduce over fetched collections) |
| `features/students` | Legacy student reads, roster join with screening/visit/referral status (`useStudentRoster`), `StudentListPage` |
| `features/screenings` | `BulkScreeningPage` (`/screenings`) — spreadsheet-style bulk entry, rows = students, columns = one category's checklist items at a time (tabbed), autosaves per checkbox click; fully replaced the earlier one-student-per-form page per project owner request. `checklist.ts` stores `{concern[], close[]}` per category (transcribed from the source screening-form PDF) so concern/close classification is automatic from ticked items. The source form *does* also have a standalone "กลุ่มไว้ใจ" checkbox per category (easy to miss on a scanned copy — the project owner caught this), so there's one manual checkbox per category (`ScreeningCategory.trustConfirmed`), mutually exclusive with the concern/close items, used only to explicitly record "reviewed, no issues" as distinct from "never looked at" (see §6 for why that distinction matters). `ScreeningSummaryPage` (charts + filters + print) unchanged. |
| `features/homeVisits` | Full home-visit form (student/family/behavior info, photo + map upload via Storage), `HomeVisitSummaryPage` |
| `features/referrals` | `ReferralFormPage` (create, attaches latest screening/visit), `ReferralInboxPage` (officer queue, receive action), `ReferralDetailPage` (status transitions + houses intervention/follow-up forms) |
| `features/interventions` | `api.ts` only — intervention & follow-up-result CRUD, consumed from `ReferralDetailPage` |
| `features/reports` | Tabbed cross-collection report (overview/screenings/home-visits/referrals), print-friendly |
| `features/users` | `UserManagementPage` — activate self-registered teachers + assign role/teacherId/classIds; also creates accounts directly (citizenId + temp password) for non-teacher roles |

Shared UI primitives: `components/ui/*` (Badge, Card, Form controls,
Toast, ConfirmDialog, loading/empty/error states, Icon, GroupSelector).
Shared layout: `components/layout/AppLayout.tsx` + `nav.ts` (desktop
sidebar, mobile bottom-nav + drawer, role-filtered nav items).

## 6. Known limitations / deferred work

- **Dashboard/report aggregation is client-side** (fetch collection(s),
  reduce in JS). Fine at current expected data volume; if it gets slow,
  precompute via a scheduled Cloud Function rather than changing the read
  pattern ad hoc.
- **Teacher onboarding is self-service + admin approval**: teacher
  registers at `/register` (citizenId + password), account starts
  `isActive: false`, an `admin`/`advisor_staff` must activate it and
  assign role/classIds via `UserManagementPage`. Non-teacher roles are
  still created directly by an admin through the same page (citizenId +
  temp password set by the admin).
- **No composite Firestore indexes committed.** Several `where` +
  `orderBy` combinations will prompt Firestore to request an index on
  first use — follow the console link when that happens, or add a
  `firestore.indexes.json` scoped to the `care-plus` database once real
  query patterns stabilize.
- **`care-plus` has no database-level access control at all right now**
  (§3.4) — this is the most significant open item, not a minor one.
  Revisit as soon as Firebase Authentication is re-enabled.
- **`TEACHER_ID_CARD_FIELD = 'tidcard'`** (§3.4) — confirmed against real
  `out-of/teachers` data after the first live registration attempt
  returned "not found" with the original guess (`'id_card'`).
- **`SCREENING_CHECKLIST` wording is a best-effort transcription** of the
  source screening-form PDF (`checklist.ts`), not copy-pasted from a text
  layer — verify exact phrasing against the real form if wording precision
  matters (the concern/close *structure*, i.e. which item counts toward
  which severity, is what actually drives auto-classification and should
  be correct; minor wording differences don't affect behavior).
- **Bulk screening has no draft/submitted distinction** — every checkbox
  toggle writes immediately with `status: 'submitted'`. The `DocStatus`
  field still exists on `Screening` for schema compatibility with reports,
  but nothing sets `'draft'` anymore since the old form (which had explicit
  "บันทึกแบบร่าง" / "ส่งข้อมูล" buttons) was removed.
- **Bulk screening write ordering**: to avoid two rapid clicks for the same
  student racing to both `createScreening()` a duplicate doc, writes are
  serialized per student via a promise chain in `BulkScreeningPage.tsx`
  (`chainsRef`), with a parallel `screeningsRef` mirror read synchronously
  inside that chain (not React state, which may not have re-rendered yet).
  Different students' writes still happen concurrently.
- **Deterministic screening doc id (rev. 5).** The project owner initially
  proposed nesting `screenings` into a
  `{academicYear}/{semester}/{class_code}/{sid}` subcollection hierarchy.
  Analyzed and talked out of it: this app's real read patterns
  (`fetchScreeningsByTeacher` — spans many classes; `fetchScreeningsByStudent`
  — spans many years; whole-college reports — spans everything) all cut
  *across* that proposed tree, so a deep hierarchy would have made every
  actual query need a collection-group query plus the same denormalized
  fields it has today, for no real benefit at this data scale. Agreed
  middle ground instead: keep the flat `screenings` collection, but new
  docs now get a deterministic id — `screeningDocId(academicYear, semester,
  studentId)` = `` `${academicYear}_${semester}_${studentId}` `` (see
  `features/screenings/api.ts`) — set via `setDoc(..., {merge: true})`
  (`lib/firestore.ts`'s `upsertDocWithId`) instead of `addDoc`'s random id.
  This gets the two benefits actually worth having (a student can't get two
  screening docs for the same period; existence is a direct `getDoc`, no
  query) without touching any existing read path. **Docs created before
  this change keep their original Firestore-assigned id** — `BulkScreeningPage.tsx`
  always prefers an already-loaded doc's own `existing.id` over recomputing
  the deterministic one, so there's no migration step and no risk of
  orphaning/duplicating old records; only screenings created from now on
  use the new scheme.
- **"ยังไม่ประเมิน" (not yet reviewed) vs. real "ไว้ใจ" — resolved.** Before
  `trustConfirmed` existed, a category/student that was never touched and
  one explicitly confirmed clean both computed to `group: 'trust'` with an
  empty `checkedItems`, so the grid displayed them identically — there was
  no way to tell "nobody has looked at this yet" from "looked at, no
  issues." Fixed by adding `ScreeningCategory.trustConfirmed` (an explicit
  checkbox matching the source form's own "กลุ่มไว้ใจ" checkbox, mutually
  exclusive with concern/close items — ticking any concern/close item
  resets it to `false`). `isCategoryReviewed()` in `checklist.ts` is the
  single source of truth for "has this category been looked at at all"
  (`checkedItems.length > 0 || trustConfirmed`); the UI shows a neutral
  "ยังไม่ประเมิน"/"-" badge instead of a green ไว้ใจ badge when that's false.
  One side effect worth knowing: **ticking a concern/close item and then
  unticking it no longer displays as a confirmed "ไว้ใจ"** the way it used
  to — it reverts to "ยังไม่ประเมิน" instead, since `trustConfirmed` isn't
  set just by clearing items. The teacher must explicitly tick "ไว้ใจ" to
  get a real confirmed-trust badge. The underlying `care-plus/screenings`
  document from the original tick is still there either way (nothing
  deletes documents) — only the badge shown changes.
- **Bundle size**: main chunk is ~850KB gzip ~256KB (mostly Firebase SDK +
  Recharts), acceptable for v1; route-level `React.lazy` already applied.
  Further splitting (e.g. lazy-loading Recharts itself) is a possible
  follow-up if mobile load time becomes an issue.
- **No automated tests** yet (no test runner configured). Build/typecheck
  are the current correctness gate.

## 7. Verification performed

- `npx tsc --noEmit` — passes.
- `npm run build` — passes, PWA manifest/service worker generated.
- `npm run dev` + smoke-fetch of entry modules and several feature pages —
  all transform/serve without error (no headless browser available in
  this environment for full visual verification).
