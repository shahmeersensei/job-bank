# Job Bank Platform — Module-wise Implementation Plan

## Context

The repo currently holds only `project_PRD.md` (v3.0, "Implementation Ready"). It describes a **multi-branch Job Bank** (Saylani). Applicants, employers, verification officers, branch staff and central admins run the whole employment journey on one platform, from registration through verified company, geo-matched job, physical interviews, decisions and placement to Day 7/30/90/180 follow-ups. Two things hold everywhere: **strict PII masking toward employers** and a **full immutable audit trail**.

This plan turns the PRD into a buildable, module-by-module roadmap for a greenfield codebase.

**Confirmed stack decisions**
- pnpm + Turborepo monorepo (`apps/web` plus shared `packages/*`)
- Next.js 15 (App Router) + TypeScript (strict) + Tailwind v4 + Atomic Design
- PostgreSQL 16 + PostGIS through **Drizzle ORM**, with custom `geography(Point,4326)` types and raw SQL for geo queries
- **Better Auth**: phone/email OTP, sessions, plus our own RBAC and branch-scope layer on top
- S3-compatible storage (SeaweedFS locally — MinIO images were discontinued — R2/S3 in production) using presigned uploads
- Redis is optional in Phase 1. It is introduced in Phase 4 for cache, queues (BullMQ), rate limits and the follow-up scheduler.
- Zod for every input/output contract, Vitest for unit/integration tests, Playwright for E2E

---

## 1. PRD Analysis — what the document really requires

### 1.1 Core invariants (these drive the design)
| # | Rule | Engineering consequence |
|---|------|------------------------|
| 1 | Multi-branch from day one | `branch_id` on every branch-scoped table. A scope guard in **every** repository query. Super Admin bypasses scope only by explicit, audited choice. |
| 2 | Verifier-first company approval | A company is invisible to Branch Admin, and blocked from posting jobs, until its status is `VERIFIED`. This is enforced in the service layer **and** by a DB check on job insert. |
| 3 | Employer PII masking | Employers read applicants **only** through `employer_candidate_view` (a Postgres view) and an `EmployerCandidateDTO`. No raw applicant repository is reachable from employer routes. Tests confirm the masked fields never appear in the payload. |
| 4 | Geodesic matching (≤8 km preferred, ≤10 km max, configurable) | PostGIS `ST_DWithin(geography, geography, m)` plus `ST_Distance`. Radius comes from `match_radius_policies`, resolved in this order: job, then category, then branch, then global. A hard guard stops any referral outside the max radius. |
| 5 | Actor-owned decisions | Employer: Hold/Select/Reject. Applicant: Refuse/Counteroffer. Staff **cannot** decide for them. This is enforced by a policy check per action. |
| 6 | Evidence for every Reject | A reject transaction fails without at least one `rejection_evidence` row (a reason code plus a note or file). |
| 7 | Branch Admin owns the final blacklist decision | Anyone may *request* a blacklist entry. Only Branch Admin of the subject's branch can *approve* it, and approval creates a `restriction`. |
| 8 | Immutable audit | `audit_logs`, `employer_decisions` and `applicant_decisions` are append-only. DB triggers reject UPDATE/DELETE, and the app DB role has no UPDATE/DELETE grant on them. |
| 9 | Physical interviews only | The interview entity holds venue, address and time. No video links exist anywhere. |
| 10 | Web + PWA only | Responsive UI, manifest, service worker, installable, offline shell, web push. |

### 1.2 Gaps and ambiguities in the PRD, with the assumption this plan makes
1. **Counteroffer API is missing.** The PRD lists only `refuse`. Add `POST /match-cases/{id}/applicant-decisions/counteroffer` and `POST /counteroffers/{id}/respond`, where the employer accepts, rejects or counters.
2. **Hold has no expiry.** Add `hold_until` (default 14 days, configurable). A job auto-flags the case to staff when it expires.
3. **Branch assignment.** For applicants and companies, the system suggests the nearest branch from the pin and the user may choose. Staff can transfer, and each transfer is audited.
4. **Job approval.** The PRD gives no staff approval step. Assume jobs from VERIFIED companies go live directly, with a `system_settings` flag to require staff review.
5. **Who can request a blacklist entry?** Staff, Verifier, Employer (about an applicant) and Branch Admin. Subjects can be an applicant or a company.
6. **When are masked details unmasked?** Never automatically. After `PLACED`, the employer sees only the name and the Job Bank contact, which staff coordinate. Making this configurable is left as an open item.
7. **Identity documents.** Applicants are identified by CNIC, with a Job Bank staff check in `identity_verifications`.
8. **Match Case lifecycle.** The PRD's list gets an explicit state machine (§4 Module 10), including the terminal states `WITHDRAWN`, `NOT_ELIGIBLE` and `CLOSED`.

### 1.3 Success metrics → instrumentation the code must produce
- Verification SLA (≤2 working days): store `submitted_at` and `decided_at`, and use a working-day calendar from `master_data.holidays`.
- 100% referrals within radius: `referrals.distance_m` is stored, and a DB CHECK compares it against `max_radius_m` at referral time.
- 0 PII leaks: masked view, DTO contract tests and a log-redaction middleware.
- Placement and Day-90 coverage: computed from `placements` and `followups`.
- Audit completeness: one `withAudit()` wrapper handles every sensitive command, and a test asserts that each command writes an audit row.

---

## 2. Monorepo & Code Architecture

```
saylani-job-bank/
├── apps/web/                      # Next.js app (UI + /api/v1)
│   └── src/ (exact PRD §9 structure)
├── packages/
│   ├── db/            # Drizzle schema, migrations, views, triggers, seed
│   ├── config/        # eslint, tsconfig, tailwind preset, prettier
│   └── shared/        # zod schemas, enums, DTO types shared UI↔API
├── docker-compose.yml  # postgis/postgis:16, seaweedfs, redis, mailpit
├── turbo.json, pnpm-workspace.yaml, .env.example
```

**Internal shape of each domain** (`apps/web/src/domains/<name>/`):
```
entities/      # types + invariants (pure)
schemas/       # zod input/output
repository.ts  # Drizzle queries — always takes ScopeContext
service.ts     # use cases (commands/queries), transactional
policies.ts    # who can do what (RBAC + ownership + branch)
state-machine.ts (where applicable)
dto/           # role-specific projections (esp. masked)
events.ts      # domain events → notifications/audit
index.ts       # public API of the domain (only import from here)
```
Rules: route handlers stay thin (parse, then `service`, then DTO). Domains import each other only through `index.ts`. An ESLint `no-restricted-imports` rule enforces this.

**Shared API pipeline** (`domains/shared/http/handler.ts`): `apiHandler({ auth, permission, scope, idempotent, input, handler })`, which wraps:
correlation-id, then session, then permission check, then branch scope, then idempotency-key lookup, then zod parse, then service, then uniform error `{ error: { code, message, details, correlation_id } }`, then pagination envelope `{ data, meta: { page, pageSize, total } }`.

---

## 3. Delivery Phases → Modules

| Phase | Modules |
|------|---------|
| **Phase 0 – Setup** (pre-req) | M0 Infrastructure, M1 Design System, M2 Shared Kernel |
| **Phase 1 – Foundation** | M3 Auth/RBAC/Scope, M4 Branch & Users, M5 Master Data & Settings, M6 Applicant, M7 Company & Verification, M18 Dashboards (basic SA/BA) |
| **Phase 2 – Core Matching** | M8 Job, M9 Matching Engine, M10 Match Case & Referral, M11 Interviews (Job Bank interview) |
| **Phase 3 – Hiring Loop** | M11 (Employer interview), M12 Decisions & Counteroffer, M13 Placement |
| **Phase 4 – Governance & Scale** | M14 Blacklist, M15 Audit (full UI), M13 Follow-ups, M16 Notifications, M17 Reporting, M19 PWA polish, Redis/perf |

---

## 4. Modules in Detail

### M0 — Infrastructure & Tooling
- pnpm workspace and Turborepo pipelines (`dev`, `build`, `lint`, `typecheck`, `test`, `db:*`).
- `docker-compose`: `postgis/postgis:16-3.4`, SeaweedFS S3 (with an idempotent bucket init), Redis, Mailpit for local email.
- Env validation with `@t3-oss/env-nextjs` and zod (`apps/web/src/lib/env.ts`).
- Drizzle setup (`packages/db`): `drizzle.config.ts`, migration folder, a custom `geography` column type, `CREATE EXTENSION postgis, pgcrypto, citext`.
- Two DB roles: `app_rw`, which has no UPDATE/DELETE on append-only tables, and `migrator`.
- CI with GitHub Actions: lint, typecheck, unit tests, integration tests against a postgis service container, Playwright smoke.
- Husky, lint-staged, commitlint, Prettier.
- **Done when:** `pnpm dev` boots the app with the DB, S3 storage and Redis up, and `pnpm db:migrate && pnpm db:seed` succeed.

### M1 — Design System & Atomic Components
- `design-system/tokens.ts`: color (brand, semantic and status colors per match-case state), spacing, radius, typography, shadows, z-index, breakpoints.
- `theme.css` (CSS variables plus dark mode), `global.css`, `utilities.css`, and a Tailwind preset in `packages/config`.
- **Atoms:** Button, Input, Textarea, Select, Checkbox, Radio, Switch, Badge, StatusPill, Avatar, Icon, Spinner, Label, Link, Skeleton, Tooltip.
- **Molecules:** FormField, SearchBar, DateTimePicker, FileUploader (presigned, with progress), PhoneInput (+92), CNICInput (masked), OTPInput, Pagination, EmptyState, ConfirmDialog, Toast, DistanceBadge, KeyValue, Tabs.
- **Organisms:** DataTable (server pagination, filters, sorting), AppSidebar (role-aware nav), TopBar (branch switcher for Super Admin), MapPinPicker (Leaflet + OSM, draggable pin plus geolocate), Timeline (audit and case history), Stepper (multi-step forms), KanbanBoard (match-case pipeline).
- **Domain organisms built with their data (decided during M1):** DocumentList → M6/M7, MaskedCandidateCard → M10, InterviewCard → M11, DecisionPanel → M12.
- **Templates:** AuthLayout, DashboardLayout, DetailPageLayout, WizardLayout.
- File convention follows PRD: `Button/Button.tsx`, `button.types.ts`, `index.ts`.
- Accessibility: WCAG AA, keyboard nav, focus rings. Urdu/RTL is optional through `next-intl`. The layer is ready, with English shipping first.
- **Done when:** a `/dev/components` gallery route (dev-only) renders every component in both themes at mobile and desktop widths.

### M2 — Shared Kernel (`domains/shared`, `lib/*`)
- `lib/db`: Drizzle client and a `withTransaction()` helper.
- `lib/s3`: presign PUT/GET, a key strategy of `branch/{id}/{entity}/{uuid}`, MIME/size whitelist, and a virus-scan hook (stubbed).
- `lib/geospatial`: `toPoint(lat,lng)`, `distanceMeters()`, `withinRadius()` SQL fragments, and a haversine fallback for tests.
- `lib/redis`: lazy client that becomes a no-op when `REDIS_URL` is unset.
- `shared/errors`: `DomainError` subclasses (`NotFound`, `Forbidden`, `Conflict`, `InvalidTransition`, `ValidationFailed`, `ScopeViolation`), mapped to HTTP codes.
- `shared/audit`: `audit.record({ actor, action, entity, entityId, branchId, before, after, ip, ua, correlationId })`, plus a `withAudit(action, fn)` decorator.
- `shared/idempotency`: `idempotency_keys` table storing (key, user, route, response hash, expires).
- `shared/state-machine`: a small typed FSM helper, with transitions declared as data and guards as functions.
- `shared/pagination`, `shared/filters` (a whitelisted filter parser), `shared/events` (an in-process event bus, swapped to BullMQ in Phase 4).
- `shared/masking`: PII redaction for logs, plus helpers such as `maskPhone`, `maskCNIC` and `ageBand`.
- **Done when:** unit tests cover the FSM, error mapping, idempotency replay and masking helpers.

### M3 — Auth, RBAC & Branch Scoping (`domains/auth`, `lib/auth`, `middleware.ts`)
**Tables:** `users`, `roles`, `permissions`, `role_permissions`, `user_roles(user_id, role_id, branch_id nullable)`, plus Better Auth's `session`, `account` and `verification` tables.
**Roles:** `SUPER_ADMIN`, `BRANCH_ADMIN`, `VERIFIER`, `STAFF`, `EMPLOYER`, `APPLICANT`.
**Permissions:** `resource:action` strings (for example `company:verify`, `match_case:refer`, `blacklist:decide`), seeded from a single TypeScript constant file.
**Flows:**
- Applicants use phone OTP (`/auth/otp/request`, `/auth/otp/verify`). Employers use email OTP or password. Internal staff use email and password, with optional TOTP 2FA for admin roles.
- Rate limiting on OTP requests by IP and by phone. OTPs are hashed and expire after 5 minutes.
**Scope layer:** `getScopeContext(session)` returns `{ userId, roles, branchIds, companyId?, applicantId?, isSuperAdmin }`. Every repository method requires a `ScopeContext` and applies `branch_id IN (...)`, plus ownership filters for employer and applicant.
**Middleware:** route-group guards (`/(dashboard)/verifier/*` requires the VERIFIER role, and so on), redirect to `/login`, and correlation-id header injection.
**APIs:** `POST /auth/otp/request|verify`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
**UI:** login (tabbed by user type), OTP screen, role-based post-login redirect, account-disabled screen.
**Done when:** a matrix test (role × endpoint) asserts allow or deny, and a cross-branch access attempt returns 403 and writes an audit row.

### M4 — Branch & User Management (`domains/branch`)
> Built early in M3: the `branches` table (role assignments are branch-scoped) and read-only `GET /branches` and `GET /branches/{id}`, both scoped. M4 adds create and edit, staff invitations and the management UI. TOTP 2FA for admin roles and email-OTP sign-in for employers also moved to M4: M3 ships password sign-in for staff and employers, and phone OTP for applicants.

**Tables:** `branches` (code, name, address, `location geography`, service radius, active), `branch_staff` (user, branch, designation).
**Rules:** only Super Admin creates or edits branches. Branch Admin manages staff and verifiers in their own branch. A role assignment must include `branch_id`, except for SUPER_ADMIN, EMPLOYER and APPLICANT, whose branch comes from their entity.
**APIs:** `GET/POST/PATCH /branches`, `GET/POST /users`, `POST /users/{id}/roles`, `PATCH /users/{id}/status`.
**UI:** Super Admin gets a branches list, branch form with map pin, and a cross-branch users table. Branch Admin gets staff management (invite, assign role, deactivate).
**Done when:** invited staff get an email link, set a password, and land on the correct dashboard scoped to their branch.

> **M4 as built (decisions from 2026-10-01):**
> - **Two-factor:** authenticator-app 2FA is **required for Super Admin and Branch Admin** (blocked until enrolled) and optional for everyone else. Admins can reset it for someone who lost their phone.
> - **Employer email codes:** employers can **sign in with an emailed one-time code**, as well as with a password. Accounts with 2FA turned on must use password + authenticator.
> - **Added:** forgot/reset password, with single-use links stored as hashes.
> - **Job titles:** staff designation is `users.title` instead of a separate `branch_staff` table, since branch membership already lives in `user_roles`.

### M5 — Master Data & System Settings (`domains/shared/settings`)
**Tables:** `master_data(type, code, label, meta, active)` and `system_settings(key, value jsonb, branch_id nullable)`.
- Master data types: job categories, skills, education levels, languages, cities and areas, document types, rejection reason codes, blacklist reason codes, refusal reasons, holidays.
- Settings: default and max match radius, hold expiry days, follow-up schedule `[7,30,90,180]`, verification SLA days, job-review-required flag.
- `match_radius_policies(scope: global|branch|category|job, ref_id, preferred_m, max_m)` has the CHECK `max_m <= 10000` unless a Super Admin override is set.
**UI:** Super Admin manages master data CRUD and global settings. Branch Admin can override branch settings within global limits.
**Done when:** settings resolve in the order job, category, branch, global, with tests.

> **M5 decisions (owner, 2026-10-02):**
> - **One radius source:** `branches.service_radius_m` is merged into `match_radius_policies` (BRANCH scope) and the column is dropped. The branch form's radius field writes the branch policy.
> - **Hard 10 km cap:** `max_m ≤ 10000` is a DB CHECK with no override.
> - **Branch Admin overrides radius only** (preferred/max, each ≤ the global max). Every other setting is global.
> - **Weekend for working-day SLAs:** Sunday only, stored as the setting `calendar.weekend_days`.
> - **Proposed with these decisions:** holidays get their own `holidays` table, not a `master_data` type. Radius lives only in `match_radius_policies`, not in `system_settings`. The most specific policy wins (job → category → branch → global), and the result never exceeds the global max.
>
> **M5 as built (2026-10-02):**
> - **Code:** `domains/settings` (master data, holidays, typed settings, radius policies, working-day calendar). The shared contracts live in `packages/shared` (`master-data.ts`, `settings.ts`).
> - **Migrations `0006`–`0008`:** the new tables; triggers, the global policy row (8/10 km) and the copy of non-default branch radii; then dropping `branches.service_radius_m`.
> - **Master data:** 12 types with per-type `meta` schemas. Added `VERIFICATION_REJECTION_REASON` (M7) and `WITHDRAWAL_REASON` (M10). Codes are permanent; items are deactivated, never deleted. Any signed-in user can read active lists.
> - **Holidays:** only fixed-date federal holidays are seeded for 2026–27. Islamic holidays are added by Super Admin when announced.
> - **Settings:** global only for now, but reads already honour branch rows. `JOB` radius scope gets its `job_id` column in M8.
> - **SLA helpers:** `slaDueDate` / `addWorkingDays` use Pakistan time (UTC+5).
> - **UI:** Super Admin gets Master data and Settings pages (with a "which radius applies?" preview). Branch Admin gets Branch settings. The branch form now edits the branch radius policy.

### M6 — Applicant Domain (`domains/applicant`)
**Tables:** `applicants` (user_id, branch_id, full_name, cnic unique, dob, gender, phone, email, status, profile_completeness), `applicant_addresses` (geography point plus text), `applicant_education`, `applicant_experience`, `applicant_skills` (skill code, level, years), `applicant_languages`, `applicant_certifications`, `applicant_preferences` (categories, min salary, shift, willing radius ≤ max, job type), `applicant_documents` (type, s3 key, status), `identity_verifications` (cnic, method, verified_by, status, notes).
**Statuses:** `DRAFT → ACTIVE → (RESTRICTED | INACTIVE)`. Only ACTIVE applicants with a location pin can be matched.
**Flows:**
1. Register with phone OTP and CNIC (a duplicate check gives a clear error and offers recovery through branch).
2. Profile wizard: personal, then location pin (MapPinPicker), then education, experience, skills, languages, preferences, then documents (CNIC front/back, CV, certificates).
3. The branch is auto-suggested from the pin as the nearest active branch, and the applicant confirms it.
4. Staff run identity verification.
**APIs:** `POST /applicants/register`, `GET/PATCH /applicants/me`, `POST /applicants/me/documents` (presign plus confirm), `POST /applicants/me/location`, `GET /applicants` (staff, scoped), `GET /applicants/{id}` (staff), `POST /applicants/{id}/identity-verification`.
**UI:**
- Applicant: onboarding wizard, profile view/edit, documents, "My Applications" (match cases), interviews, and decisions inbox.
- Staff: applicant search (filters for skills, area, status), full profile, and a verify-identity action.
**Done when:** completeness % is computed, location is stored as a geography point, and every document upload uses a presigned URL with no file passing through the server.

### M7 — Company & Verification (`domains/company`)
**Tables:** `companies` (legal name, NTN/registration no., industry, size, branch_id, status), `company_contacts`, `company_locations` (geography, HQ or site), `company_documents`, `company_document_requirements` (by company type), `company_verifications` (current state, assigned verifier, SLA due), `verification_history` (append-only transitions plus notes).
**State machine:** `SUBMITTED → UNDER_VERIFICATION → INFO_REQUESTED ⇄ RESUBMITTED → VERIFIED | REJECTED`. `VERIFIED → SUSPENDED` is available through blacklist or Branch Admin.
**Rules:**
- A verifier works only their branch queue and cannot verify a company they are linked to (conflict check).
- Verifying requires every required document to be marked accepted.
- Rejecting requires a reason code and a note.
- Branch Admin lists show **only VERIFIED** companies. Earlier statuses appear only in the verifier queue and to Super Admin.
- SLA due date = submitted + 2 working days, with a breach flag on the queue.
**APIs:** `POST /companies/register`, `GET/PATCH /companies/me`, `POST /companies/me/documents`, `POST /companies/me/resubmit`, `GET /verifications/queue`, `POST /verifications/{id}/claim`, `POST /verifications/{id}/request-info`, `POST /verifications/{id}/verify`, `POST /verifications/{id}/reject`.
**UI:**
- Employer: a registration wizard (company info, contacts, locations, docs), a status tracker page, and a resubmission form when info is requested.
- Verifier: the queue (SLA colors, claim), a review screen (document viewer with per-doc accept/reject, notes, actions), and history.
- Branch Admin: the verified companies list.
**Done when:** an unverified company calling `POST /jobs` gets 403, and every transition writes `verification_history` plus `audit_logs`.

### M8 — Job Domain (`domains/job`)
**Tables:** `jobs` (company_id, branch_id, title, category, description, vacancies, salary min/max, shift, job type, gender preference *(policy-checked)*, status, closes_at), `job_locations` (geography job site, which must be one of the company's locations or a new site), `job_requirements` (education, min experience, languages, other), `job_skills` (skill code, required or preferred, min level).
**Statuses:** `DRAFT → OPEN → PAUSED ⇄ OPEN → FILLED | CLOSED | EXPIRED`.
**Rules:**
- Only VERIFIED and non-restricted companies may post.
- The job's branch defaults to the branch nearest the job site.
- When vacancies are filled by placements, the job moves to FILLED automatically.
**APIs:** `POST /jobs`, `GET /jobs` (role-scoped: employer sees their own, staff see the branch, applicant sees jobs suggested to them), `GET /jobs/{id}`, `PATCH /jobs/{id}`, `PATCH /jobs/{id}/status`.
**UI:** Employer gets a job wizard (with a job-site map pin), a jobs list, and job detail with a referred-candidates tab. Staff get a branch jobs board.
**Done when:** a job site is stored as a geography point and status transitions are validated by the FSM.

### M9 — Geospatial Matching Engine (`domains/matching`)
**Tables:** `match_radius_policies` (from M5), `match_factors` (match_case_id, factor, score, weight, detail jsonb).
**Algorithm** (deterministic and explainable, with no AI decisions; PRD §11):
1. **Hard filters (SQL):** applicant ACTIVE, not restricted, has a location; `ST_DWithin(applicant.point, job.point, max_m)`; distance within the applicant's own willing radius; no existing open match case for the same pair.
2. **Scoring (weights live in settings):** distance (full score up to preferred radius, linear decay to max), skills overlap (required skills are hard, preferred skills are soft), experience years, education level, languages, salary expectation fit, shift and job-type preference, and category preference.
3. The query returns ranked candidates with `distance_m`, `score` and a factor breakdown.
4. GiST indexes cover `applicant_addresses.location` and `job_locations.location`.
**Two directions:**
- Job → candidates: `GET /jobs/{id}/matches`, used by staff.
- Applicant → jobs: "suggested jobs" on the applicant dashboard and staff view.
**Done when:** fixture tests place points at 7.9 km (preferred), 9.5 km (allowed, lower score) and 10.1 km (excluded), and an EXPLAIN plan uses the GiST index.

### M10 — Match Case & Referral (`domains/matching` case aggregate)
**Tables:** `match_cases` (applicant_id, job_id, branch_id, state, distance_m, score, assigned_staff, timestamps per stage), `match_case_transitions` (append-only), `referrals` (match_case_id, referred_by, distance_m, max_radius_m, masked_snapshot jsonb, referred_at, with the CHECK `distance_m <= max_radius_m`).
**State machine (central to the product):**
```
SUGGESTED → REVIEWED → JB_INTERVIEW_SCHEDULED → JB_INTERVIEW_DONE
  → ELIGIBLE | NOT_ELIGIBLE(terminal)
ELIGIBLE → REFERRED → EMP_INTERVIEW_SCHEDULED → DECISION_PENDING
DECISION_PENDING → ON_HOLD | SELECTED | REJECTED(terminal)
ON_HOLD → SELECTED | REJECTED | (hold expiry → flagged)
SELECTED → APPLICANT_REFUSED(terminal) | COUNTEROFFERED | PLACEMENT_PENDING
COUNTEROFFERED → PLACEMENT_PENDING | REJECTED/WITHDRAWN
PLACEMENT_PENDING → PLACED → (follow-ups) → CLOSED
Any non-terminal → WITHDRAWN (staff, reason required)
```
Each transition declares: allowed actor role(s), guard (for example, a referral needs ELIGIBLE, radius OK, no restriction, and company VERIFIED), side effects (audit, notification), and a timestamp column.
**Masked candidate view:**
- `employer_candidate_view` exposes the candidate code (`JB-<branch>-<seq>`), first name or initials only, age band, gender (if allowed), area name (not coordinates), distance band (`<5 km`, `5–8 km`, `8–10 km`), education, experience, skills, languages and the Job Bank interview summary.
- It **never** exposes phone, email, CNIC, exact address, DOB, coordinates or documents.
- The masked snapshot is frozen into `referrals.masked_snapshot` at referral time.
**APIs:** `POST /match-cases` (from a suggestion), `GET /match-cases` (scoped plus filters), `GET /match-cases/{id}` (role-specific DTO), `POST /match-cases/{id}/review`, `POST /match-cases/{id}/eligibility`, `POST /match-cases/{id}/refer`, `POST /match-cases/{id}/withdraw`, `GET /match-cases/{id}/timeline`.
**UI:**
- Staff: a pipeline Kanban per job, case detail with timeline, and a "Refer to Employer" confirm dialog showing a preview of exactly what the employer will see.
- Employer: a referred-candidates list of MaskedCandidateCards.
**Done when:** a contract test (zod `.strict()` on `EmployerCandidateDTO`) fails if a PII key is added, and a snapshot test of the employer API payload is checked against a PII key denylist.

### M11 — Interviews (physical only) (`domains/interview`)
**Tables:** `interviews` (match_case_id, type `JOB_BANK|EMPLOYER`, scheduled_at, venue name, venue address, venue point, contact person *(Job Bank side for employer interviews)*, status, created_by), `interview_attendance` (status `PRESENT|NO_SHOW|RESCHEDULED|CANCELLED`, marked_by, at), `interview_feedback` (scores per criterion, recommendation, notes, by).
**Rules:**
- Staff schedule `JOB_BANK` interviews. The employer schedules `EMPLOYER` interviews, which are allowed only when the case is REFERRED.
- Rescheduling creates a new row linked by `rescheduled_from`.
- Two NO_SHOWs notify staff and may suggest a blacklist request, without creating one automatically.
- The `JOB_BANK` interview result drives ELIGIBLE or NOT_ELIGIBLE. The `EMPLOYER` interview being completed moves the case to DECISION_PENDING.
- Applicants receive an SMS or notification with date, venue and map link. Employers get no applicant contact; logistics run through the Job Bank.
**APIs:** `POST /interviews`, `PATCH /interviews/{id}` (reschedule or cancel), `PATCH /interviews/{id}/attendance`, `PATCH /interviews/{id}/result`, `GET /interviews?mine=true`.
**UI:** Staff and Employer get an interview calendar (list plus calendar view) and a feedback form. Applicants see an "My Interviews" list with venue map and add-to-calendar (.ics).
**Done when:** a result cannot be submitted unless attendance is PRESENT, and every state change triggers the FSM transition on the case.

### M12 — Decisions & Counteroffers (`domains/decision`)
**Tables (append-only):**
- `employer_decisions` (match_case_id, type `HOLD|SELECT|REJECT`, offered_salary, joining_date, hold_until, reason_code, notes, decided_by, decided_at)
- `rejection_evidence` (decision_id, kind `NOTE|FILE|INTERVIEW_FEEDBACK_REF`, reason_code, s3 key or text)
- `applicant_decisions` (type `ACCEPT|REFUSE|COUNTEROFFER`, reason_code, notes)
- `counteroffers` (match_case_id, from_party, salary, joining_date, other_terms, status `OPEN|ACCEPTED|DECLINED|SUPERSEDED`, parent_id)

**Rules:**
- **Actor ownership:** only the job's employer user can create employer decisions, and only the case's applicant can create applicant decisions. Staff may *record on behalf* only with the `decision:proxy` permission, which is off by default, and must attach a reason and a flag in the audit row.
- **Current decision** = the latest row by `decided_at`. Rows are never updated, so a change of mind appends a new row.
- **Reject** runs in one transaction that requires at least 1 evidence item, or the insert fails. Evidence is visible to staff and Branch Admin and hidden from the applicant except the reason category.
- **Hold** requires `hold_until` (at most the configured maximum).
- **Select** requires offered salary and an expected joining date, and moves the case to SELECTED and notifies the applicant.
- **Applicant Accept** moves the case to PLACEMENT_PENDING. **Refuse** needs a reason code. **Counteroffer** moves the case to COUNTEROFFERED, and the employer responds with accept (PLACEMENT_PENDING), decline, or counter (a new row).
- A counteroffer chain has a configurable cap (default 3 rounds).

**APIs:** `POST /match-cases/{id}/employer-decisions/{hold|select|reject}`, `POST /match-cases/{id}/applicant-decisions/{accept|refuse|counteroffer}`, `POST /counteroffers/{id}/respond`, `GET /match-cases/{id}/decisions`.
**UI:** an employer DecisionPanel (reject requires evidence upload or note, with a reason picker), an applicant Offer screen (accept, refuse, counter), and a staff read-only decision history.
**Done when:** a DB trigger blocks UPDATE/DELETE on decision tables, and a reject without evidence returns 422 and leaves no partial row.

### M13 — Placement & Follow-ups (`domains/placement`)
**Tables:** `placements` (match_case_id, applicant_id, company_id, job_id, branch_id, final_salary, joining_date, confirmed_by_employer_at, confirmed_by_applicant_at, status `PENDING|CONFIRMED|NOT_JOINED|ENDED`), `followups` (placement_id, day_offset 7/30/90/180, due_date, status `PENDING|DONE|MISSED|UNREACHABLE`, still_employed, satisfaction (applicant and employer), issues, notes, done_by).
**Rules:**
- A placement is created from PLACEMENT_PENDING (`POST /placements`).
- **Joining confirmation** needs both employer and applicant confirmation, or staff confirmation with proof. The case then moves to PLACED, the job's vacancy count drops, and FILLED is set automatically.
- On CONFIRMED, follow-up rows are generated at joining_date + 7/30/90/180 (taken from settings).
- A daily job marks overdue follow-ups as MISSED and alerts staff. A Vercel cron or route-triggered job works in Phase 1–3, and BullMQ repeatable jobs in Phase 4.
- `still_employed = false` ends the placement with a reason, which feeds the Day-90 sustainability metric.
**APIs:** `POST /placements`, `POST /placements/{id}/confirm`, `GET /placements`, `GET /followups?due=…`, `POST /placements/{id}/followups` (record an outcome).
**UI:** Staff get a follow-up worklist (due today, overdue) with a call-outcome form and a placements list. Applicants and employers get a joining-confirmation prompt.
**Done when:** confirming a placement creates exactly 4 follow-ups, and the overdue job is idempotent.

### M14 — Blacklist & Restrictions (`domains/blacklist`, under `domains/` per PRD Phase 4)
**Tables:** `blacklist_requests` (subject_type `APPLICANT|COMPANY`, subject_id, branch_id, reason_code, description, requested_by, status `OPEN|UNDER_REVIEW|APPROVED|DECLINED|WITHDRAWN`), `blacklist_evidence`, `blacklist_reviews` (reviewer, decision, notes; append-only), `restrictions` (subject, type `FULL|MATCHING|POSTING`, starts_at, ends_at nullable, source_request_id, lifted_by, lifted_at).
**Rules:**
- Allowed requesters are listed in §1.2. Evidence is required.
- **Only BRANCH_ADMIN of the subject's branch** can approve or decline (rule 7). Super Admin can see everything and can lift a restriction only with a recorded justification.
- An active restriction is checked in the guards of matching, referral, job posting and company verification.
- Approval cascades: open match cases are WITHDRAWN with a system reason, and a restricted company's jobs are PAUSED.
- Appeals and lifting create a new review row. The subject is notified with a generic message that includes no reporter identity.
**APIs:** `POST /blacklist-requests`, `GET /blacklist-requests`, `POST /blacklist-requests/{id}/evidence`, `POST /blacklist-requests/{id}/review`, `POST /restrictions/{id}/lift`.
**UI:** a "Report / Request blacklist" dialog on applicant, company and case pages; a Branch Admin review queue with an evidence viewer and decision; a restrictions registry.
**Done when:** a restricted applicant never appears in `/jobs/{id}/matches`, and a non-Branch-Admin review returns 403.

### M15 — Audit Logging (`domains/shared/audit` + UI)
> The `audit_logs` table, its append-only guards and the `runCommand`/`recordAudit` writers were built in M2 (the shared kernel needs them). M15 adds the coverage tests per action, monthly partitioning and the explorer UI.

**Table:** `audit_logs` (id, at, actor_user_id, actor_role, branch_id, action, entity_type, entity_id, before jsonb, after jsonb (PII-redacted), ip, user_agent, correlation_id, reason). It is append-only through a trigger and grants, partitioned by month in Phase 4.
**Coverage list** (each gets a test): auth events, role changes, branch and setting changes, company verification transitions, document access (viewing an applicant document is audited), match-case transitions, referral, interviews, every decision, placement, follow-up, blacklist, restriction, data export, and Super Admin scope overrides.
**UI:** Super Admin gets a global audit explorer. Branch Admin gets a branch-scoped explorer. Each entity has a Timeline tab. Export is to CSV and is itself audited.

### M16 — Notifications (`domains/notification`)
**Table:** `notifications` (user_id, channel `IN_APP|SMS|EMAIL|PUSH`, template, payload, status, read_at, sent_at, error). There is also a `notification_preferences` table.
- An event bus maps domain events to templates. Templates are bilingual-ready.
- Providers sit behind interfaces: SMS (e.g. Twilio or a local PK SMS gateway; to decide), email (Resend or SMTP, with Mailpit in dev), and web push (VAPID).
- Phase 1–3 sends synchronously in-process or through an outbox table. Phase 4 moves sending to a BullMQ worker with retries and the outbox pattern.
- Key triggers:
  - Verification: info requested, verified, rejected.
  - Matching and interviews: interview scheduled or rescheduled, referral made, interview reminder 24h before.
  - Decisions: made, counteroffer, hold expiring.
  - Placement and follow-up: placement confirmation needed, follow-up due.
  - Blacklist: outcome.
- **UI:** a notification bell with dropdown, a notifications page, and a preferences screen.

### M17 — Reporting & Analytics (`domains/reporting`)
- SQL views or materialized views (refreshed nightly in Phase 4): funnel by stage (registrations, verified, matched, referred, interviewed, selected, placed), verification SLA compliance, referral radius compliance, placements by branch, category and month, follow-up coverage (Day-90 retention), employer responsiveness, and no-show rate.
- Super Admin gets a cross-branch comparison. Branch Admin gets their own branch.
- Charts use Recharts, with CSV export.
- The PRD §12 success-metric KPIs appear as top tiles.

### M18 — Role Dashboards (`app/(dashboard)/*`)
| Role | Dashboard essentials |
|------|----------------------|
| Super Admin | KPI tiles, branch comparison, branches/users, settings, master data, audit, reports |
| Branch Admin | Branch KPIs, verified companies, staff, blacklist queue, restrictions, reports, audit |
| Verifier | SLA-sorted queue, my claimed items, history |
| Staff | Applicants, jobs board, match pipeline (Kanban), interviews calendar, referrals, follow-up worklist |
| Employer | Company status, jobs, referred candidates (masked), interviews, decisions, placements |
| Applicant | Profile completeness, suggested jobs, my cases/timeline, interviews, offers, notifications |
Basic Super Admin and Branch Admin dashboards ship in Phase 1. Each later module adds its widgets.

### M19 — PWA & Performance
- `app/manifest.ts`, icons, and a theme color.
- Service worker via Serwist: app-shell caching, offline fallback page, stale-while-revalidate for master data, and no caching of PII API responses.
- Web push subscription (ties into M16), plus an install prompt.
- Performance: RSC by default, server-side pagination, DB indexes (GiST on geo, composite `(branch_id, state)` on match_cases, and so on), Redis caching of master data and settings, and rate limits.
- Lighthouse targets: PWA installable, performance ≥ 85 on mobile.

---

## 5. Cross-cutting Security & Privacy Checklist
- Every repository method takes `ScopeContext`. There are no unscoped queries outside `packages/db/seed` and Super Admin-specific services.
- Employer routes import only `dto/employer.*`. An ESLint rule blocks `applicant/repository` imports under `app/api/v1/**/employer`.
- Document downloads use presigned GET links (60 s TTL) issued only after a policy check, and each access is audited.
- CSP headers, CSRF handled by Better Auth, secure cookies, and input sanitisation for rich-text descriptions.
- Logs are redacted (phone, CNIC, email) through the masking helpers.
- Backups and PITR for Postgres, and S3 bucket versioning.

## 6. Testing Strategy
- **Unit (Vitest):** state machines (cases, verification, job, placement), scoring function, radius policy resolution, masking, and policies.
- **Integration (Vitest + Testcontainers postgis):** repositories with scope, append-only triggers, geo queries at the 7.9/9.5/10.1 km fixtures, reject-without-evidence rollback, and the restriction cascade.
- **Contract:** every API response is validated against its zod output schema, and the employer DTO is checked against a PII denylist.
- **E2E (Playwright), "golden path"** (each role logs in through a seeded account):
  1. The employer registers.
  2. The verifier requests info, the employer resubmits, and the verifier verifies.
  3. The employer posts a job.
  4. The applicant registers and pins a location at 6 km.
  5. Staff see the match and run the JB interview, marking it PRESENT and ELIGIBLE, then refer.
  6. The employer sees the masked card and schedules an interview, which ends PRESENT.
  7. The employer selects, the applicant counteroffers, and the employer accepts.
  8. The placement is confirmed and 4 follow-ups exist.
  9. The audit timeline shows every step.
- **Negative E2E:** a reject without evidence, a referral at 10.5 km, an employer trying to read the raw applicant API, a cross-branch staff access, and a non-Branch-Admin blacklist approval.

## 7. Verification (how to confirm the build end-to-end)
1. `docker compose up -d && pnpm i && pnpm db:migrate && pnpm db:seed`, which seeds 2 branches, one user per role, master data, and sample geo points.
2. `pnpm dev`. Log in as each seeded role and walk the golden path manually in the browser pane.
3. `pnpm test` (unit plus integration) and `pnpm test:e2e` (Playwright golden path plus negatives).
4. SQL spot checks: `UPDATE employer_decisions …` must error, and `EXPLAIN` on the match query must show a GiST index scan.
5. Lighthouse PWA audit on `/` and `/applicant`. Install the PWA and check the offline fallback.

## 8. Open Items to confirm with stakeholders (non-blocking; defaults chosen above)
- SMS gateway provider for Pakistan, and its OTP cost limits.
- Whether employers ever see applicant contact after PLACED (default: no).
- Whether job postings need staff approval (default: off, with a settings flag).
- Hold expiry default (14 days) and counteroffer round cap (3).
- Urdu localisation in v1 or later.
