# RYC Care+

**Rayong Technical College Care Plus** — ระบบดูแลช่วยเหลือและติดตามนักเรียน นักศึกษา วิทยาลัยเทคนิคระยอง

ครอบคลุมงานคัดกรองผู้เรียน การเยี่ยมบ้าน การส่งต่อไปยังงานแนะแนว / งานทุนการศึกษา / งานบำบัดผู้เรียน การติดตามผลหลังดำเนินการ และแดชบอร์ดสรุปภาพรวมตามบทบาทผู้ใช้งาน

Production URL: **https://care.rytc.ac.th**

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS v4
- React Router v7
- Firestore + Storage (Firebase Authentication is currently **disabled** — see below)
- PWA (`vite-plugin-pwa`, installable on desktop / tablet / mobile)
- Recharts for dashboard/report charts
- Deploy target: Cloudflare Pages

## ⚠️ Temporary custom auth (Firebase Authentication is disabled)

Firebase Authentication is turned off for now, by explicit decision of the
project owner, so that teachers can log in with their **13-digit Thai
citizen ID** instead of an email/password — self-service, no per-account
setup needed before onboarding. The plan is to re-enable Firebase
Authentication once the system has stabilized (see
`.claude/Implementation_Plan.md` for the full history of this decision).

**How it works right now** (`src/lib/customAuth.ts`):

- **Register** (`/register`): teacher enters their citizen ID → app looks
  up `out-of/teachers` (field `tidcard`, see `TEACHER_ID_CARD_FIELD` in
  `src/features/students/api.ts`) → shows `tname` / `position` /
  `dep_name` for confirmation → teacher sets a password → a profile is
  created at `care-plus/users/{citizenId}` with `isActive: false`.
- **Activation**: an `admin`/`advisor_staff` must open **User
  Management** and activate the new account (assign role, `classIds`,
  etc.) before the teacher can actually log in — this is the only check
  against someone registering with a citizen ID that isn't theirs.
- **Login**: citizen ID + password → app fetches
  `care-plus/users/{citizenId}`, verifies the password against a
  PBKDF2-derived hash stored on that document (`src/lib/passwordHash.ts`),
  and if valid stores the citizen ID in `localStorage` as the "session".

**Why this is a real, accepted security trade-off, not just a UX change:**
there is no server component in this project (static Cloudflare Pages +
Firestore), so password verification has to happen in the browser, and
Firestore Security Rules have no `request.auth` to check without Firebase
Authentication. Concretely:

- The password hash is readable by anyone who can read the `users`
  collection (which right now is *everyone* — see next point), so it's
  vulnerable to offline brute-forcing in a way a real server-side auth
  system wouldn't be.
- `firestore.care-plus.rules` is currently **wide open**
  (`allow read, write: if true`) for every collection, because there is no
  identity for the rules to check. **Anyone with this app's public Firebase
  config (already in the deployed JS bundle) can read or write any
  document directly via the Firestore SDK, bypassing the login screen
  entirely.** The full role-based ruleset that depends on Firebase Auth is
  preserved in `firestore.care-plus.rules.future` — restore it (copy over
  `firestore.care-plus.rules` and redeploy) when Firebase Authentication
  comes back.
- `src/lib/auth.ts` (the Firebase Auth wrapper) is kept in the codebase,
  unused, for exactly that purpose — see the comment at the top of that
  file for how to switch `AuthContext.tsx` back to it.

**Do not touch `out-of`'s rules.** A separate, existing application also
reads from and writes to the `out-of` database — this project must only
ever *read* from it. There is no `firestore.out-of.rules` file in this
repo and `firebase.json` does not manage that database; don't add either.

## Two separate Firestore databases

This project uses **two named Firestore databases in the same Firebase
project** (not the `(default)` database):

- **`out-of`** — the college's existing student information system
  (`department`, `students`, `teachers`, `std_class`). Read-only from this
  app.
- **`care-plus`** — all data this app owns (`users`, `screenings`,
  `home-visits`, `referrals`, `interventions`, `follow-up-results`), as
  plain top-level collections.

Both database IDs must exist in your Firebase project before this app can
run (Firestore console → create additional database → set the database ID
to exactly `out-of` / `care-plus`). The connection is set up once in
[src/lib/firebase.ts](src/lib/firebase.ts) (`outOfDb`, `careDb`) and used
throughout [src/lib/firestore.ts](src/lib/firestore.ts).

**Why two databases instead of one:** it keeps the legacy system fully
isolated from this app (no accidental writes, independent rules/backup/
quota) and lets the spec's collection paths (e.g. `care-plus/users/{uid}`)
map directly to real top-level collections with no path-nesting workaround.

**`out-of` is owned by another application.** This project only ever
reads from it — it does not manage or deploy that database's security
rules (see the temporary-auth section above for why that matters right
now: `out-of`'s rules currently allow public read, which this app's
registration/login flow depends on to look up a teacher by citizen ID
before any session exists).

## Getting started

```bash
npm install
cp .env.example .env
# fill in your Firebase project values in .env
npm run dev
```

### Firebase setup

1. Create (or reuse) a Firebase project that already contains an
   `out-of` Firestore database with the legacy collections (`department`,
   `students`, `teachers`, `std_class`) — managed by another application;
   don't change its rules.
2. Create a second Firestore database in the same project with database
   ID exactly `care-plus` (Firestore console → "Create database" →
   choose a database ID other than `(default)`).
3. Enable **Storage**. (Authentication is not currently used — see the
   temporary-auth section above.)
4. Copy the web app config into `.env` (see `.env.example`):
   ```
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=
   ```
5. Deploy the `care-plus` database's rules plus Storage rules:
   ```bash
   npx firebase-tools deploy --only firestore,storage
   ```
   (`firebase.json` maps `firestore.care-plus.rules` → the `care-plus`
   database only. It intentionally does not reference `out-of` at all.)
6. Create your first `admin` or `advisor_staff` account: go to
   `/register`, but since you likely don't have a citizen ID in
   `out-of/teachers` for a test admin account, it's simplest to create the
   document directly in the Firestore console instead, at `users/{anyId}`
   **in the `care-plus` database** (not `(default)`) — use the same `anyId`
   as the document ID and as `citizenId`/`uid` below, and generate
   `passwordHash`/`passwordSalt` by temporarily calling
   `hashPassword()` from `src/lib/passwordHash.ts` in a browser console:
   ```json
   {
     "uid": "<same value as citizenId below>",
     "authProvider": "custom",
     "citizenId": "<pick any unused id, e.g. 0000000000001>",
     "passwordHash": "<output of hashPassword('yourpassword').hash>",
     "passwordSalt": "<output of hashPassword('yourpassword').salt>",
     "displayName": "ผู้ดูแลระบบ",
     "role": "admin",
     "classIds": [],
     "isActive": true
   }
   ```
   - After that, sign in at `/login` with that citizen ID + password, then
     use **User Management** inside the app to onboard the rest of the
     staff (real teachers register themselves at `/register`; you activate
     and assign their role/classes there).

### Local development

```bash
npm run dev
```

### Build

```bash
npm run build
```

Output is written to `dist/`.

### Deploy to Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist --project-name=care
```

Then map the custom domain `care.rytc.ac.th` to the Cloudflare Pages
project in the Cloudflare dashboard (Pages → your project → Custom
domains).

## User roles

| Role | Description |
| --- | --- |
| `admin` | Full access |
| `advisor_teacher` | ครูที่ปรึกษา — screens/visits/refers students in their own classes |
| `advisor_staff` | เจ้าหน้าที่งานครูที่ปรึกษา — college-wide overview, user management |
| `guidance_staff` | เจ้าหน้าที่งานแนะแนว — receives referrals with `targetWork = guidance` |
| `scholarship_staff` | เจ้าหน้าที่งานทุนการศึกษา — `targetWork = scholarship` |
| `rehabilitation_staff` | เจ้าหน้าที่งานบำบัดผู้เรียน — `targetWork = rehabilitation` |

Roles and per-user scoping (`teacherId`, `classIds`) live in the
`care-plus` database's `users/{uid}` document and are enforced in the UI
(`src/utils/rbac.ts`, `src/routes/ProtectedRoute.tsx`). **Not currently
enforced at the database level** — see the temporary-auth section above;
`firestore.care-plus.rules.future` has the intended role-based enforcement
for when Firebase Authentication is restored.

## Data model

- **Read-only legacy data** — `out-of` database: `department`, `students`,
  `teachers`, `std_class` — never written to by this app.
- **App-owned data** — `care-plus` database: `users`, `screenings`,
  `home-visits`, `referrals`, `interventions`, `follow-up-results`.

Full TypeScript types are in [src/types/index.ts](src/types/index.ts) and
[src/types/legacy.ts](src/types/legacy.ts).

### `care-plus` collections & fields

| Collection | Doc ID | Key fields |
| --- | --- | --- |
| `users` | `{citizenId}` (13-digit citizen ID; equals `uid`) | `uid, authProvider ('custom'), citizenId, passwordHash, passwordSalt, email?, displayName, position?, role, teacherId?, departmentId?, departmentName?, classIds[], isActive, createdAt, updatedAt` |
| `screenings` | auto | `studentId, studentName, classId, className, departmentId, departmentName, level, advisorTeacherId, advisorTeacherName, academicYear, semester, screeningDate, resultGroup, resultGroupLabel, categories{learning\|social\|sexual\|drugs\|violence\|economy\|games\|gambling\|health: {group, checkedItems[], note}}, status, createdBy, createdAt, updatedAt` |
| `home-visits` | auto | `studentId, studentName, classId, className, departmentId, departmentName, level, advisorTeacherId, advisorTeacherName, academicYear, semester, visitDate, studentInfo{...}, familyInfo{...}, behaviorInfo{...}, parentOpinion, advisorOpinion, images{homeVisitPhotos[], mapImage}, status, createdBy, createdAt, updatedAt` |
| `referrals` | auto | `studentId, studentName, classId, className, departmentId, departmentName, level, screeningId?, homeVisitId?, referredBy, referredByName, referredDate, targetWork, targetWorkLabel, reason, priority, status, receivedBy?, receivedAt?, createdAt, updatedAt` |
| `interventions` | auto | `referralId, studentId, targetWork, officerId, officerName, actionDate, actionType, actionDetail, result, nextAction, nextAppointmentDate?, status, createdAt, updatedAt` |
| `follow-up-results` | auto | `referralId, interventionId, studentId, targetWork, resultDate, finalResult, finalResultLabel, summary, recommendation, closedBy, closedAt, createdAt, updatedAt` |

See [src/types/index.ts](src/types/index.ts) for the exact TypeScript
shape of every field (enum values, nested object types, etc.).

### `out-of` collections & fields (read-only, confirmed against real data)

| Collection | Doc ID | Fields |
| --- | --- | --- |
| `department` | `dep_id` | `dep_id, dep_name, created_at, updated_at` |
| `teachers` | `tidcard` (13-digit citizen ID) | `tidcard, tname, position, dep_id, dep_name, created_at, updated_at` |
| `students` | `sid` | `sid, sidcard, sname, class_code, class_name, short_name, dep_id, dep_name, created_at, updated_at` |
| `std_class` | `class_code` | `class_code, class_name, short_name, advisor_name, dep_id, dep_name, created_at, updated_at` |

`out-of` also has `fcm_tokens`, `out_record`, and `staff` collections that
this app doesn't read or model — out of scope.

**No confirmed "ระดับชั้น" (level) field exists** on `students` or
`std_class`. Anywhere the original spec asked for level-based grouping/
filtering (e.g. dashboard "แยกตามระดับชั้น"), this app currently groups by
`class_name` (กลุ่มเรียน) instead, since that's the closest available real
field. If a level field turns up (e.g. parseable from `class_code`), wire
it in via `fetchCollegeDashboard()` in
[src/features/dashboard/api.ts](src/features/dashboard/api.ts).

## Project structure

```
src/
  app/                  # (reserved for app-level providers/config)
  components/
    layout/              # AppLayout, sidebar/bottom-nav, nav config
    ui/                  # Badge, Card, Form controls, Toast, ConfirmDialog, states
  features/
    auth/                # AuthContext (custom session), LoginPage, RegisterPage
    dashboard/           # role-specific dashboards + aggregation api
    students/             # StudentListPage, legacy student + teacher reads
    screenings/            # Bulk screening grid (BulkScreeningPage), checklist data, summary/report
    homeVisits/            # Home visit form, summary/report
    referrals/              # Referral form, inbox, detail (+ intervention/follow-up)
    interventions/          # intervention & follow-up-result api
    reports/                # Reports page
    users/                  # User management (create staff accounts, activate registrations)
  hooks/                  # useAsync
  lib/                    # firebase.ts, firestore.ts, storage.ts,
                          # customAuth.ts + passwordHash.ts (active),
                          # auth.ts (Firebase Auth wrapper, on standby)
  routes/                 # ProtectedRoute
  types/                   # shared TypeScript types
  utils/                   # rbac helpers
```

## Notes on data aggregation

Dashboards and reports currently aggregate by fetching the relevant
`care-plus` collections (scoped to the signed-in teacher where
appropriate) and reducing client-side. This is simple and correct for a
single college's dataset; if screenings/home-visits/referrals volume grows
large enough that this becomes slow, consider precomputing summaries with
a scheduled Cloud Function instead of changing the read pattern ad hoc.
