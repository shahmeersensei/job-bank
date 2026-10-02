**FINAL PRD**  
**Job Bank Management & Employment Matchmaking Platform**  
**Version 3.0 – Implementation Ready**  
**Target:** Full-stack Next.js (App Router) + TypeScript + Tailwind + Atomic Design + Domain Driven  
**Delivery:** Responsive Web Application + PWA only

---

### 1. Document Information

| Field                    | Value                                                                 |
|--------------------------|-----------------------------------------------------------------------|
| Project Name             | Job Bank Management & Employment Matchmaking Platform                |
| Version                  | 3.0 Final                                                            |
| Status                   | Implementation Ready                                                 |
| Primary Architecture     | Modular Monolith (Next.js Full-stack)                                |
| Frontend                 | Next.js 15 + TypeScript + Tailwind CSS + Atomic Design               |
| Backend                  | Next.js API Routes (Domain Driven)                                   |
| Database                 | PostgreSQL + PostGIS                                                 |
| Cache / Queue            | Redis (optional in Phase 1)                                          |
| File Storage             | S3 Compatible (MinIO / Cloudflare R2 / AWS S3)                       |
| Auth                     | NextAuth.js / Lucia + Custom RBAC + Branch Scoping                   |
| Interview Model          | Physical / In-person only                                            |

---

### 2. Product Vision

Create a trusted, multi-branch digital employment platform where applicants, employers, verification officers, branch staff, and central management can complete the full employment journey paperlessly — while preserving mandatory physical interviews and strict privacy controls.

**Vision Statement:**  
One verified profile → One traceable Match Case → One auditable workflow — from registration to sustainable placement — across every Job Bank branch.

---

### 3. Non-Negotiable Rules

1. Multi-branch from day one with Super Admin oversight
2. **Verifier-first** company approval
3. Strict employer masking of applicant PII
4. Configurable geodesic matching (default ≤8 km preferred, ≤10 km max)
5. Actor-owned decisions: Employer = Hold/Select/Reject | Applicant = Refuse/Counteroffer
6. Evidence required for every Employer Reject
7. Branch Admin has final blacklist authority
8. Full immutable audit trail
9. Physical interviews only
10. Web responsive + PWA only (no native apps)

---

### 4. User Roles

| Role                      | Scope              | Primary Responsibilities |
|--------------------------|--------------------|--------------------------|
| Super Admin              | All branches       | System governance, policies, cross-branch visibility |
| Branch Admin             | One branch         | Operations + Blacklist final decisions |
| Verification Officer     | Assigned branch    | Company verification only |
| Job Bank Staff           | Branch / cases     | Matching, Job Bank interviews, referrals, follow-ups |
| Employer                 | Own company        | Jobs, referred candidates, physical interviews, decisions |
| Applicant                | Own profile        | Profile, documents, interviews, Refuse/Counteroffer |

---

### 5. High-Level Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    Client (Browser / PWA)                   │
│         Next.js Frontend (App Router + Atomic UI)           │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                 Next.js Application Layer                   │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  App Router │  │  API Routes  │  │  Middleware      │   │
│  │  (UI)       │  │  (Domain)    │  │  (Auth + Scope)  │   │
│  └─────────────┘  └──────┬───────┘  └──────────────────┘   │
│                          │                                  │
│  ┌───────────────────────▼──────────────────────────────┐  │
│  │              Domain Services (DDD)                    │  │
│  │  Auth | Branch | Company | Applicant | Job | Match   │  │
│  │  Interview | Decision | Placement | Notification     │  │
│  └───────────────────────┬──────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   PostgreSQL+PostGIS    Redis          S3 Compatible
   (Primary Data)     (Cache/Queue)   (Documents)
```

**Architecture Style:** Modular Monolith with clear domain boundaries.

---

### 6. High-Level System Flows

#### 6.1 Company Verification Flow
```
Employer Registers → Assigned to Branch → Verification Officer Queue
→ Under Verification → (Request Info ↔️ Resubmit) → Verified / Rejected
→ Only after Verified → Appears in Branch Admin + Can post jobs
```

#### 6.2 Applicant → Placement Flow
```
Applicant Registers + Profile + Location Pin
→ System suggests location-eligible jobs
→ Job Bank Staff reviews → Schedules Physical Job Bank Interview
→ Eligible for Referral → Masked profile sent to Employer
→ Employer schedules Physical Interview
→ Employer: Hold / Select / Reject (with evidence)
→ Applicant: Refuse / Counteroffer
→ Joining Confirmation → Placement
→ Day 7 / 30 / 90 / 180 Follow-ups
```

#### 6.3 Match Case Lifecycle
```
Suggested → Reviewed → Job Bank Interview → Eligible → Referred
→ Employer Interview → Decision Pending → Hold / Selected / Rejected
→ Applicant Response → Placement Pending → Placed → Follow-up
```

---

### 7. Database Design (Core Schema)

#### 7.1 Key Tables

**Identity & Access**
- `users`
- `roles`
- `permissions`
- `user_roles` (with branch_id)
- `branches`
- `branch_staff`

**Applicant Domain**
- `applicants`
- `applicant_addresses` (with geography point)
- `applicant_education`
- `applicant_experience`
- `applicant_skills`
- `applicant_languages`
- `applicant_certifications`
- `applicant_preferences`
- `applicant_documents`
- `identity_verifications`

**Company Domain**
- `companies`
- `company_contacts`
- `company_locations` (with geography point)
- `company_documents`
- `company_verifications`
- `verification_history`
- `company_document_requirements`

**Job & Matching**
- `jobs`
- `job_locations`
- `job_requirements`
- `job_skills`
- `match_cases`
- `match_factors`
- `match_radius_policies`
- `referrals`

**Interviews & Decisions**
- `interviews`
- `interview_attendance`
- `interview_feedback`
- `employer_decisions` (append-only)
- `applicant_decisions` (append-only)
- `counteroffers`
- `rejection_evidence`

**Blacklist & Placement**
- `blacklist_requests`
- `blacklist_evidence`
- `blacklist_reviews`
- `restrictions`
- `placements`
- `followups`

**System**
- `notifications`
- `audit_logs` (append-only)
- `system_settings`
- `master_data`

#### 7.2 Critical Design Rules

- Every branch-scoped table has `branch_id`
- Decision tables are **append-only** (never update previous decisions)
- Geospatial columns use PostGIS `geography(Point, 4326)`
- Employer-facing queries use dedicated masked views/DTOs
- Soft deletes + status fields preferred over hard deletes
- All sensitive actions write to `audit_logs`

---

### 8. API Structure (Domain Driven)

Base path: `/api/v1`

#### Auth
- `POST /auth/otp/request`
- `POST /auth/otp/verify`
- `POST /auth/login`
- `POST /auth/logout`

#### Branches & Users
- `GET/POST/PATCH /branches`
- `GET/POST /users`
- `POST /users/{id}/roles`

#### Companies & Verification
- `POST /companies/register`
- `GET /companies/me`
- `GET /verifications/queue`
- `POST /verifications/{id}/request-info`
- `POST /verifications/{id}/verify`
- `POST /verifications/{id}/reject`

#### Applicants
- `POST /applicants/register`
- `GET/PATCH /applicants/me`
- `POST /applicants/me/documents`
- `POST /applicants/me/location`

#### Jobs
- `POST /jobs`
- `GET /jobs`
- `PATCH /jobs/{id}/status`

#### Matching & Referral
- `GET /jobs/{id}/matches`
- `POST /match-cases`
- `POST /match-cases/{id}/refer`

#### Interviews
- `POST /interviews`
- `PATCH /interviews/{id}/attendance`
- `PATCH /interviews/{id}/result`

#### Decisions
- `POST /match-cases/{id}/employer-decisions/hold`
- `POST /match-cases/{id}/employer-decisions/select`
- `POST /match-cases/{id}/employer-decisions/reject`
- `POST /match-cases/{id}/applicant-decisions/refuse`

#### Blacklist
- `POST /blacklist-requests`
- `POST /blacklist-requests/{id}/review`

#### Placements
- `POST /placements`
- `POST /placements/{id}/followups`

#### Common Patterns
- All endpoints enforce RBAC + Branch scope
- Idempotency keys on write operations
- Consistent error format with `correlation_id`
- Pagination + filtering standards

---

### 9. Folder Structure (Final Recommended)

```text
apps/web/src/
├── app/                          # App Router
│   ├── (auth)/
│   ├── (dashboard)/
│   │   ├── super-admin/
│   │   ├── branch-admin/
│   │   ├── verifier/
│   │   ├── staff/
│   │   ├── employer/
│   │   └── applicant/
│   └── api/v1/                   # Domain APIs
├── domains/                      # Business Logic (DDD)
│   ├── auth/
│   ├── branch/
│   ├── company/
│   ├── applicant/
│   ├── job/
│   ├── matching/
│   ├── interview/
│   ├── decision/
│   ├── placement/
│   └── shared/
├── components/                   # Atomic Design
│   ├── atoms/
│   │   └── Button/
│   │       ├── Button.tsx
│   │       ├── button.types.ts
│   │       └── index.ts
│   ├── molecules/
│   ├── organisms/
│   └── templates/
├── design-system/
│   ├── global.css
│   ├── theme.css
│   ├── utilities.css
│   └── tokens.ts
├── lib/
│   ├── db/
│   ├── s3/
│   ├── redis/
│   ├── geospatial/
│   └── auth/
└── middleware.ts
```

---

### 10. Development Phases

**Phase 1 – Foundation**
- Auth + RBAC + Branch scoping
- Design System + Atomic components
- Applicant registration & profile
- Company registration + Verification workflow
- Basic Super Admin & Branch Admin dashboards

**Phase 2 – Core Matching**
- Job posting with job-site location
- Geospatial matching engine
- Match Case + Job Bank physical interview
- Referral + Masked candidate view

**Phase 3 – Hiring Loop**
- Employer physical interview
- Hold / Select / Reject + Evidence
- Applicant Refuse / Counteroffer
- Placement creation

**Phase 4 – Governance & Scale**
- Blacklist workflow
- Full audit logs
- Follow-ups (Day 7/30/90/180)
- Notifications + Reporting
- Redis + advanced performance

---

### 11. Out of Scope

- Native mobile applications
- Video interviews
- Payroll / post-hire HR features
- Autonomous AI decisions
- Employer access to global applicant pool
- Public job board scraping

---

### 12. Success Metrics

- ≥ 95% digital registration
- Verification SLA ≤ 2 working days
- 100% referrals within configured max radius
- 0 PII leakage incidents to employers
- ≥ 95% placement confirmation
- ≥ 90% Day-90 sustainable placement coverage
- 100% audit completeness on sensitive actions
