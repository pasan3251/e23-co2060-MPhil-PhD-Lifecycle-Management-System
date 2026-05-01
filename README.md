# MPhil/PhD Lifecycle Management System

A Next.js-based lifecycle management platform for handling postgraduate research workflows across students, supervisors, examiners, and administrators.

## Overview

This branch contains the implemented foundation, student lifecycle, and proposal workflow work for:

- project scaffolding with Next.js App Router
- Prisma domain modeling for the postgraduate lifecycle
- Firebase authentication and role-based access control
- Firebase Storage utilities for protected document handling
- SMTP email integration and notification logging
- administrator user management
- role-specific dashboard home pages
- student application, admission, registration, and profile management
- proposal evaluation and version-history access control

## Tech Stack

- Frontend: Next.js 14, React 18, TypeScript
- Styling: Tailwind CSS
- Backend: Next.js Route Handlers
- Database ORM: Prisma
- Database: PostgreSQL
- Authentication: Firebase Auth, Firebase Admin SDK
- File Storage: Firebase Cloud Storage
- Email: Nodemailer (SMTP)
- Testing: Vitest, Testing Library, Playwright

## Project Structure

```text
src/
  app/
    (auth)/
    (dashboard)/
    api/
  components/
    admin/
    auth/
    dashboard/
    ui/
  lib/
    admin/
    dashboard/
    firebase/
    prisma/
  types/

prisma/
tests/
```

## Implementation Status
## Implementation Status

Implemented correctly:

- `PB-001` Project foundation and directory scaffolding
- `PB-002` Prisma ORM schema and domain model setup
- `PB-003` Firebase Auth integration and custom claims
- `PB-004` RBAC middleware for protected route handlers
- `PB-005` Firebase Storage utilities and rules
- `PB-006` SMTP email integration and notification logging
- `PB-010` Firebase login page and session management
- `PB-011` Administrator user management
- `PB-012` Role-specific dashboard home pages
- `PB-020` Application submission and status workflow
- `PB-021` Admission-driven student account/profile/registration creation
- `PB-022` Registration renewal, lapse checks, and reminder maintenance
- `PB-023` Student profile access control and admin edit restrictions
- `PB-031` Supervisor proposal evaluation flow
- `PB-032` Proposal version history, access control, and signed downloads

Partially implemented:

- `PB-030` Proposal submission and versioning are implemented, but the workflow does not yet fully auto-route a newly submitted proposal to `UNDER_REVIEW` when supervisors are assigned, so this item is not counted as fully complete.

Not yet fully implemented:

- `PB-040` onward
- `PB-043` onward
- thesis, viva, repository, audit, reporting, and broader hardening/mobile backlog items

## Environment Variables

Create a local `.env` file based on `.env.example`.

Important variables include:

- `DATABASE_URL`
- Firebase client credentials
- Firebase admin credentials
- `FIREBASE_STORAGE_BUCKET`
- SMTP credentials
- `SESSION_COOKIE_NAME`
- `APP_BASE_URL`

## Getting Started

Install dependencies:

```bash
npm install
```

Generate Prisma client:

```bash
npx prisma generate
```

Run database migrations:

```bash
npx prisma migrate dev --name init_schema
```

Start the development server:

```bash
npm run dev
```

Open the app at `http://localhost:3000`.

## Available Scripts

- `npm run dev` - start the development server
- `npm run build` - create a production build
- `npm run start` - start the production server
- `npm run lint` - run linting
- `npm test` - run Vitest
- `npm run test:unit` - run unit tests
- `npm run test:integration` - run integration tests
- `npm run prisma:generate` - generate Prisma client
- `npm run prisma:migrate` - run Prisma migrations

## Notes

- Firebase, PostgreSQL, and SMTP must be configured before auth, storage, and email flows can work end-to-end.
- Some tests and runtime flows depend on local database and Firebase setup.
- Playwright end-to-end tests should be run separately from Vitest.
- The README status reflects the code and automated test coverage in this branch rather than the original earlier milestone snapshot.

## Branch

This README was added on the `alternate` branch.
