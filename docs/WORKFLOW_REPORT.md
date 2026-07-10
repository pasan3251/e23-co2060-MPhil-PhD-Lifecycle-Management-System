# PGLMS Workflow Report

Generated from the current repository state on 2026-07-05.

## Platform Split

- Authentication and role identity are handled by Firebase Authentication.
- Application data is stored in Supabase Postgres and accessed through Prisma.
- Uploaded documents are stored in Supabase Storage.
- Email and in-app notification workflows are driven by `src/lib/email.ts` and `src/lib/notifications.ts`.
- Role-protected API access is enforced through Firebase-aware route wrappers in `src/lib/firebase`.

## Main Actors

| Actor | Main responsibilities |
| --- | --- |
| Student | Apply, renew registration, submit proposals, submit progress reports, submit theses and corrections, view lifecycle state. |
| Supervisor | Review assigned students, evaluate proposals, sign off progress reports, participate in review panels. |
| Examiner | Access assigned thesis/viva work and submit examination decisions. |
| Administrator | Manage users, applications, assignments, vivas, thesis finalization, archives, reports, and maintenance workflows. |

## Workflow Inventory

| Workflow | Trigger | Main state/data changes | Notifications |
| --- | --- | --- | --- |
| Authentication and session | Login/session creation with Firebase token | Firebase user is mapped to local `User` and role claims | None directly |
| Application intake | Applicant submits application and PDFs | `Application` created with `APPLICATION_ATTACHMENT` documents | Administrators receive application-submitted email |
| Application review/admission | Administrator changes application status | Status moves through `SUBMITTED`, `UNDER_REVIEW`, `ADMITTED`, or `REJECTED`; admitted students receive local user/student/registration records and Firebase claims | Applicant/student receives application status or welcome account notification |
| Supervisor assignment | Administrator assigns supervisor to student | `SupervisorAssignment` is created or updated | Assigned supervisor is emailed |
| Registration renewal | Student or administrator renews registration | Existing active registration can be archived; new one-year active registration is created | None directly |
| Registration maintenance | Cron route runs registration checks | Expired registrations become `LAPSED`; 14-day reminders are selected | Students receive `REGISTRATION_EXPIRY_APPROACHING` email and in-app notification |
| Proposal submission/versioning | Student submits a proposal PDF | `ResearchProposal` is created or updated; prior proposal documents are superseded by a new version | None directly on submit |
| Proposal evaluation/status | Supervisor/admin evaluates or changes proposal status | Proposal status and feedback are recorded | Student or administrators receive proposal status/evaluation notifications |
| Progress report submission | Student submits period narrative and optional PDF | `ProgressReport` is created; optional `PROGRESS_REPORT` document metadata is saved; PDF is uploaded through Supabase signed URL | Primary supervisor receives `PROGRESS_REPORT_SUBMITTED` email and in-app notification |
| Progress report overdue maintenance | Cron route runs progress report checks | Unsigned, unarchived reports older than the configured overdue window are marked `isOverdue` | None directly |
| Progress report sign-off | Primary supervisor signs off a pending report | Report is marked signed off, sign-off timestamp and supervisor are stored, `isOverdue` is cleared | Review panel members are notified if a panel is assigned |
| Review panel evaluation | Panel member evaluates signed-off report | `PanelEvaluation` outcome and comments are stored | Covered by sign-off forwarding notifications |
| Thesis submission/versioning | Student submits thesis PDF after approved proposal and active registration | `Thesis` is created or updated; current thesis document version is tracked | Administrators receive thesis-submitted email |
| Examiner assignment | Administrator assigns examiner to thesis | Examiner assignment record is stored | Examiner receives assignment email |
| Viva scheduling | Administrator schedules viva | `Viva` record is created or updated with date, venue, and thesis linkage | Student and examiners receive viva-scheduled email |
| Viva outcome | Examiner/admin records outcome | Viva outcome and comments are stored | None directly in current code |
| Thesis corrections | Student uploads correction package after corrections are required | Correction document is stored and linked to thesis | Administrators receive correction-submitted email |
| Thesis final archive | Administrator finalizes thesis | Thesis status moves to final archive/closed state and archive metadata is updated | Student receives `THESIS_ARCHIVED` notification |
| Document repository | User opens, uploads, downloads, or deletes documents | `Document` records link files to applications, proposals, theses, progress reports, or corrections; downloads can be logged | `THESIS_DOWNLOADED` is logged for thesis access |
| Admin reporting and monitoring | Administrator opens dashboards/reports | Aggregated counts, overdue reports, registration state, thesis state, and archive state are read | None directly |

## Notification Workflows

| Event | Typical trigger | Recipient | Delivery path |
| --- | --- | --- | --- |
| `APPLICATION_STATUS_CHANGED` | Application status changes or welcome account is created | Applicant/student, supervisor, examiner, or administrator depending on action | Email; some paths also use centralized in-app notification |
| `PROPOSAL_STATUS_CHANGED` | Proposal status changes or proposal evaluation is submitted | Student or administrators | Email; centralized proposal status changes also create in-app notification |
| `PROGRESS_REPORT_SUBMITTED` | Student submits a progress report | Primary supervisor | Email plus in-app notification through `notifyInBackground` |
| `PROGRESS_REPORT_SIGNED_OFF` | Supervisor signs off and forwards report to review panel | Review panel members | Email through review-panel workflow |
| `REGISTRATION_EXPIRY_APPROACHING` | Cron finds active registration expiring in 14 days | Student | Email plus in-app notification |
| `VIVA_SCHEDULED` | Administrator schedules viva | Student and examiners | Email |
| `CORRECTIONS_REQUIRED` | Corrections are submitted or required | Administrators/student depending on workflow path | Email |
| `THESIS_ARCHIVED` | Administrator archives/finalizes thesis | Student | Email plus in-app notification |
| `THESIS_DOWNLOADED` | Thesis document is downloaded | Audit/log recipient context | Notification log entry |

## Progress Report Workflow Detail

1. Student opens the progress-report submission form.
2. Client validates period label, narrative length, and optional PDF metadata with shared Zod schemas.
3. Student posts the report payload to `/api/student/progress-reports`.
4. Server verifies the requester is a student with an active registration.
5. Server creates the `ProgressReport`.
6. If a PDF was attached, server creates a `Document` record with `DocumentType.PROGRESS_REPORT` and returns a Supabase signed upload URL.
7. Client uploads the PDF to Supabase Storage with `PUT`.
8. Server triggers a background `PROGRESS_REPORT_SUBMITTED` notification to the primary supervisor after the upload URL is prepared.
9. Supervisor sees pending reports, including attached PDF names, in the supervisor progress-report list.
10. Supervisor signs off through the shared sign-off service.
11. The sign-off service clears overdue state, records sign-off metadata, and forwards the report to the assigned review panel when one exists.
12. Review panel members receive sign-off/forwarding notifications and can complete panel evaluations.

## Maintenance Workflows

The cron endpoint at `/api/cron/check-registrations` currently runs both recurring maintenance tasks:

- registration lapse and 14-day registration reminder checks
- progress-report overdue marking

Production deployments should schedule this endpoint and protect it with `CRON_SECRET` when exposed outside trusted infrastructure.

## Key Implementation Touchpoints

| Area | Files |
| --- | --- |
| Firebase auth/session | `src/lib/firebase/*`, `src/app/api/auth/*` |
| Prisma/Supabase database | `prisma/schema.prisma`, `src/lib/prisma/client.ts` |
| Supabase Storage | `src/lib/storage.ts` |
| Applications | `src/lib/applications/submission.ts`, `src/app/api/applications/*` |
| Registrations | `src/lib/registrations.ts`, `src/app/api/registrations/*` |
| Proposals | `src/lib/proposals/*`, `src/app/api/proposals/*` |
| Progress reports | `src/lib/progress-reports/*`, `src/app/api/student/progress-reports/route.ts`, `src/app/api/supervisor/progress-reports/*` |
| Review panels | `src/lib/review-panels/*`, `src/app/api/progress-reports/[id]/panel-evaluation/route.ts` |
| Theses/corrections | `src/lib/theses/*`, `src/app/api/theses/*` |
| Viva | `src/lib/vivas.ts`, `src/app/api/vivas/*` |
| Notifications | `src/lib/notifications.ts`, `src/lib/email.ts`, `src/lib/admin/notification-log.ts` |
| Admin monitoring/archive | `src/lib/admin/*`, `src/app/api/admin/*` |

## Current Operational Notes

- The codebase now reflects Firebase for authentication and Supabase for storage/database.
- `.env.example` has been removed from version-control requirements because the project uses a complete local `.env`.
- Supabase service-role credentials and bucket configuration are required for signed upload/download flows.
- Notification logging is implemented for delivery attempts, but some direct email helper flows do not also create in-app notifications.
- Recurring maintenance depends on an external scheduler invoking the cron route.
