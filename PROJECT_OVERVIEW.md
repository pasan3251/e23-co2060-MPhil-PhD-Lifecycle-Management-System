# Project Overview

## 1. What This Project Is

This project is a **Postgraduate Lifecycle Management System** for managing the full MPhil/PhD student journey in one platform.

It is built to handle the major academic and administrative workflows around:

- public programme applications
- admissions and student creation
- registrations and renewal tracking
- research proposal submission and review
- progress report submission and supervisor sign-off
- thesis submission and versioning
- viva scheduling and outcome recording
- correction upload and approval
- user management and administrative reporting
- notifications and operational monitoring

In short, this system is not just a student portal. It is a **multi-role academic workflow platform** that supports students, supervisors, examiners, and administrators from the first application all the way to thesis archiving.

---

## 2. Main Technology Stack

The project is built with the following main technologies:

- **Next.js 14 App Router** for pages, layouts, and API routes
- **React 18** for UI rendering
- **TypeScript** for type safety across frontend and backend
- **Tailwind CSS** for styling
- **Prisma** as the ORM
- **PostgreSQL** as the main database
- **Firebase Auth** for authentication and session identity
- **Firebase Admin SDK** for secure server-side auth verification
- **Supabase Storage** for storing uploaded files and documents
- **Zod** for shared validation
- **Nodemailer** for email delivery
- **SWR** for live dashboard data refresh on the client
- **Vitest / Testing Library / Playwright** for testing
- **Sentry** for monitoring and error reporting support

---

## 3. High-Level System Purpose

The system is designed to cover the full academic lifecycle of postgraduate students.

The flow generally looks like this:

1. A public applicant submits an application.
2. Administrators review the application.
3. Once admitted, the student enters the research lifecycle.
4. The student submits proposals, progress reports, and thesis documents.
5. Supervisors evaluate and sign off on student work.
6. Examiners and administrators manage thesis and viva workflows.
7. Corrections are uploaded and reviewed.
8. Final records are archived and tracked.

This makes the project a combination of:

- a public-facing application portal
- a role-based internal academic dashboard
- a workflow engine for research milestones
- a document handling and review platform

---

## 4. User Roles in the System

The application supports **four main roles**.

### Student

Student users can:

- submit proposals
- submit progress reports
- view progress dashboards
- submit thesis documents
- upload thesis corrections
- follow status updates on their academic journey

### Supervisor

Supervisor users can:

- view assigned students
- review and evaluate proposals
- sign off progress reports
- monitor supervised student activity

### Examiner

Examiner users can:

- access assigned viva/thesis workspaces
- review examination-related information
- participate in viva-related workflows

### Administrator

Administrator users can:

- manage users
- review applications
- review and approve proposals
- assign supervisors and examiners
- schedule vivas
- finalize thesis workflows
- access reports, logs, and operational oversight features

---

## 5. Top-Level Folder Structure

At a high level, the codebase is mainly organized like this:

```text
src/
  app/
  components/
  lib/
  types/

prisma/
tests/
.github/
```

### `src/app`

This is the **App Router** area of the project. It contains:

- public pages
- dashboard pages
- route layouts
- server API endpoints under `app/api`

### `src/components`

This contains the reusable UI and feature-level React components, grouped by domain such as:

- `admin`
- `application`
- `auth`
- `dashboard`
- `examiner`
- `progress-reports`
- `proposals`
- `student`
- `supervisor`
- `ui`

### `src/lib`

This contains business logic and service modules, including:

- validation
- database access helpers
- dashboard summary logic
- application workflows
- proposal workflows
- thesis workflows
- progress-report workflows
- viva workflows
- security and monitoring helpers

### `src/types`

This contains shared TypeScript types used across the app.

### `prisma`

This contains the Prisma schema, which defines the database models and relationships.

### `tests`

This contains unit and integration tests, with end-to-end tests prepared separately.

### `.github`

This contains GitHub workflow automation such as sync or CI-related support files.

---

## 6. Frontend Page Structure

The main user-facing areas of the application are:

### Public Pages

- `/` landing page
- `/apply` public application form
- `/apply/success` application success page
- `/login` sign-in page

### Dashboard Pages

Role-based dashboards live under `/dashboard`.

Examples include:

- `/dashboard/student`
- `/dashboard/supervisor`
- `/dashboard/examiner`
- `/dashboard/admin`

There are also role-specific subpages, for example:

- student proposal pages
- student progress report pages
- student thesis submission/correction pages
- supervisor student and sign-off pages
- admin application review pages
- admin proposal approval pages
- admin assignment pages
- admin viva scheduling pages

### Shared Dashboard Layout

The project uses a shared dashboard shell through:

- `src/components/dashboard/dashboard-role-layout.tsx`

This layout controls:

- sidebar navigation
- active navigation state
- common dashboard look and feel
- shared typography and page framing

Because student, supervisor, examiner, and admin dashboards all flow through this shared layout, dashboard-wide UI updates can often be applied in one place.

---

## 7. API Layer

The backend HTTP logic lives under:

- `src/app/api`

This project uses **Next.js route handlers** instead of a separate Express or Nest server.

The API layer covers many domains, including:

- `auth`
- `applications`
- `admin`
- `assignments`
- `dashboard`
- `documents`
- `notifications`
- `progress-reports`
- `proposals`
- `registrations`
- `review-panels`
- `students`
- `supervisor`
- `theses`
- `vivas`

This means the app is built as a **full-stack Next.js application**, where the frontend pages and backend endpoints live in the same repository and framework.

---

## 8. Core Domain Modules

Below is the practical meaning of the major business areas in this project.

### Applications

This is the public admissions entry point.

It includes:

- public application form
- multi-step validation
- supporting document upload
- application review state changes
- applicant-to-student lifecycle transition support

### Authentication

Authentication is handled using Firebase.

The system supports:

- login with institutional credentials
- session cookie creation
- role claim handling
- authenticated dashboard access
- inactivity/session tracking

### Dashboard

The dashboard layer provides:

- role-based summaries
- KPI cards
- quick actions
- route-based role access
- server/client separation for summary rendering

### Proposals

This is one of the most important workflow areas.

It includes:

- proposal submission
- version handling
- supervisor evaluations
- administrator approval/rejection
- evaluation aggregation
- workflow state transitions like `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, and `REJECTED`

### Progress Reports

This area handles:

- student progress report submission
- reporting cycles
- supervisor sign-off
- overdue tracking
- possible review panel interaction

### Theses

This area supports:

- thesis submission
- versioned document management
- examiner assignment
- correction handling
- archival/final status progression

### Vivas

This area handles:

- viva scheduling
- venues and dates
- outcome recording
- post-viva transition states

### User Administration

The administrator area manages:

- role-based user creation
- deactivation
- filtering and listing
- management of system accounts

### Notifications

The system stores notification records and delivery logs, allowing:

- user notifications
- administrative operational monitoring
- failed delivery auditing

---

## 9. Database Model Overview

The database schema is defined in:

- `prisma/schema.prisma`

The schema models the project around a central academic lifecycle.

### Main Entities

- `User`
- `Student`
- `Supervisor`
- `Examiner`
- `Administrator`
- `Application`
- `Registration`
- `ResearchProposal`
- `EvaluationForm`
- `ProgressReport`
- `ReviewPanel`
- `PanelMembership`
- `PanelEvaluation`
- `Thesis`
- `ThesisExaminerAssignment`
- `Viva`
- `CorrectionDocument`
- `Document`
- `Notification`
- `NotificationLog`

### Key Relationship Pattern

The structure works roughly like this:

- A `User` may be linked to one academic/administrative role record.
- A `Student` may have an `Application`, multiple `Registrations`, multiple `ResearchProposals`, multiple `ProgressReports`, and multiple `Theses`.
- A `ResearchProposal` can receive multiple `EvaluationForm` entries from supervisors.
- A `Thesis` can have examiner assignments, a viva, correction documents, and uploaded document versions.
- Many workflow states are modeled as enums so transitions are explicit and type-safe.

### Important Enums

The schema uses many enums to keep workflows consistent, including:

- `UserRole`
- `ProgramType`
- `ApplicationStatus`
- `ProposalStatus`
- `RegistrationStatus`
- `ThesisStatus`
- `VivaOutcome`
- `AcademicStatus`
- `DocumentType`
- `NotificationEvent`
- `NotificationDeliveryStatus`
- `CorrectionType`
- `PanelEvaluationOutcome`

This makes the lifecycle rules easier to enforce both in the UI and in backend logic.

---

## 10. Document Handling

This project has a strong document workflow layer.

Document handling includes:

- application attachments
- proposal documents
- progress report files
- thesis files
- correction documents
- version tracking
- logical delete flags
- current-version flags

Supabase Storage is used for file storage, while database records track metadata such as:

- file name
- storage path
- document type
- MIME type
- version
- ownership relation

---

## 11. Validation Strategy

A major strength of this project is that it uses **shared validation rules** across frontend and backend.

Validation is primarily handled with **Zod**.

This means:

- the browser can reject bad inputs early
- the server still validates the exact same rules
- important workflows stay consistent end-to-end

Shared validation is used for areas such as:

- login
- applications
- proposals
- proposal evaluations
- progress reports
- theses
- corrections
- viva scheduling

---

## 12. Security and Access Control

Security is handled in multiple layers.

### Authentication Layer

Firebase provides:

- identity verification
- role-aware access setup
- token/session handling

### Route Protection

Dashboard routes and APIs use authenticated context and role checks to make sure users only reach allowed workflows.

### Role-Based Access

Examples:

- only administrators can access admin operations
- supervisors can only evaluate students assigned to them
- examiners only see their examination areas
- students only access their own academic workflows

### Session Handling

The app also includes session activity tracking and cookie-based authenticated server access.

---

## 13. Monitoring and Reliability

The project includes support for Sentry and operational logging.

This includes:

- Sentry config files
- monitoring helpers
- notification logs
- workflow/reporting endpoints for admin oversight

This is important because the system is not just transactional. It also supports operational follow-up and issue auditing.

---

## 14. Testing Coverage

The repository includes strong automated test support.

Testing tools include:

- `Vitest`
- `@testing-library/react`
- `@testing-library/user-event`
- `jsdom`
- `Playwright`

The test suite covers multiple domains such as:

- authentication
- applications
- proposals
- dashboards
- registrations
- progress reports
- theses
- vivas
- storage helpers

This suggests the project is built with a fairly serious quality and regression-prevention mindset.

---

## 15. Development and Runtime Characteristics

This is a **Node-backed full-stack application**, not a static site.

It depends on:

- a running database
- Firebase configuration
- storage credentials
- email credentials
- optional monitoring credentials

Typical development flow:

1. install dependencies
2. generate Prisma client
3. run Prisma migrations
4. configure environment variables
5. run the Next.js dev server

---

## 16. Main Project Strengths

From the structure of the repository, the strongest qualities of the project are:

- clear role-based architecture
- shared validation strategy
- strong workflow coverage across the whole postgraduate lifecycle
- integrated document handling
- practical administrative reporting
- test coverage across major features
- full-stack implementation in one framework

---

## 17. In One Sentence

This project is a **role-based full-stack postgraduate academic workflow system** built with Next.js, Prisma, Firebase, and Supabase to manage the complete lifecycle from application to final thesis completion.

---

## 18. Key Files to Read First

If someone is new to the repository, the best starting points are:

- `README.md`
- `package.json`
- `prisma/schema.prisma`
- `src/app/layout.tsx`
- `src/components/dashboard/dashboard-role-layout.tsx`
- `src/lib/dashboard/summary.ts`
- `src/lib/applications/*`
- `src/lib/proposals/*`
- `src/lib/theses/*`
- `src/app/api/*`

These files give the fastest understanding of:

- what the system does
- how the app is structured
- what the main workflows are
- how the data model supports those workflows

