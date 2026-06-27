# Goal

To build a production-grade internal CRM for Defence Overseas to manage their student pipeline from initial inquiry to final arrival, incorporating Leads, Students, Payments, Applications, Tasks, Follow-ups, and more. The project uses a pnpm monorepo structure with React (Frontend), Express (Backend), Supabase (Database/Storage), and shared Zod/Types.

As the Technical Project Planner, I have reviewed the comprehensive project documentation (PRD, Database Design, API Specification, Folder Architecture, and UI/UX Specification) and verified their internal consistency. The following is the detailed implementation roadmap designed for Claude Code to execute.

## User Review Required

Please review the refined, granular implementation phases. I need your sign-off on the phasing and strategy before Claude Code takes over the actual implementation.

> [!IMPORTANT]
> Since this is a very large undertaking, strict adherence to the **Feature-Based Folder Architecture** and the **Shared Package Contract** will be critical for success. This plan front-loads these shared contracts to prevent drift between the database, backend, and frontend.

## Proposed Changes

We have divided the project into highly granular, independently testable implementation milestones. This ensures steady progress, easier testing, and clean git commits.

### Milestone 1: Monorepo & Infrastructure Setup

- Initialize the `pnpm` monorepo workspace.
- Setup `packages/shared` with TS config.
- Setup `apps/api` with Express, TypeScript, and basic linting.
- Setup `apps/web` with Vite, React, Tailwind CSS, and shadcn/ui.
- Configure `.prettierrc`, `.eslintrc.cjs`, and Husky for pre-commit hooks.
- Setup Supabase project and environment variables.

### Milestone 2: Database & Shared Contracts

- Create the 21 PostgreSQL Enums in Supabase and mirror them in `packages/shared/enums`.
- Create all 15 Database Tables (Students, Leads, Student Fees, Payments, etc.) using versioned SQL migrations in `apps/api/database/migrations/`.
- Set up Database Triggers (e.g., Fee Recalculation) and Row Level Security (RLS).
- Define shared TypeScript interfaces and Zod schemas in `packages/shared/`.
- Establish API endpoint contracts in `packages/shared/contracts/endpoints.ts`.

### Milestone 3: Backend Core Infrastructure

- Implement environment variable validation (`config/env.ts`).
- Set up Supabase Admin Client.
- Implement cross-cutting middleware: Auth (JWT verification), RBAC guard, Zod request validation, centralized error handling, and rate limiting.
- Set up Winston/Pino logger and `activityLogger.ts`.
- Set up Supabase Storage abstraction for document uploads.

### Milestone 4: Backend - Auth & Employee Management

- Implement Routes, Controllers, Services, and Repositories for Auth & Employee Management.
- Provide endpoints for creating users, updating roles, and fetching employee profiles.

### Milestone 5: Backend - Lead Management

- Implement Routes, Controllers, Services, and Repositories for Leads.
- Include lead creation, assignment, stage updates, and conversion logic.

### Milestone 6: Backend - Student Management

- Implement Routes, Controllers, Services, and Repositories for Students.
- Provide endpoints for student profiles, journey stages, and timeline histories.

### Milestone 7: Backend - Applications & Documents

- Implement Routes, Controllers, Services, and Repositories for University Applications and Documents.
- Secure document upload and signed-URL download routes.

### Milestone 8: Backend - Payments

- Implement Routes, Controllers, Services, and Repositories for Payments (Student Fees, Installments, Receipts).
- Implement endpoint for dues reminders.

### Milestone 9: Backend - Tasks, Follow-ups, Dashboard & Reports

- Implement Routes, Controllers, Services, and Repositories for Tasks and Follow-ups.
- Implement background jobs (pg_cron or node schedule) for overdue follow-ups and reminders.
- Build aggregated endpoints for the Dashboard and Analytics Reports.

### Milestone 10: Frontend Design System & Architecture

- Implement the Design System (`styles/themes.css` with CSS variables for Light/Dark mode).
- Set up `shadcn/ui` and build the foundational UI components (Buttons, Inputs, Dialogs, Cards).
- Create the global Canonical Table component with pagination, sorting, and filtering.
- Establish global state using Zustand (`useUIStore`, `useAuthStore`) and React Context (`AuthProvider`, `ThemeProvider`).
- Configure TanStack Query and Axios interceptors for standard error handling.

### Milestone 11: Frontend - Auth, App Shell & Dashboard

- Implement Login & Authentication flow.
- Build the App Shell (Sidebar, Topbar, Breadcrumbs, Notifications drawer).
- Implement the Dashboard (KPIs, Charts, Recent Activity).

### Milestone 12: Frontend - Employee Management

- Build the Employee Management module (User creation, assignments, editing profiles).

### Milestone 13: Frontend - Lead Management

- Build the Leads module.
- Implement Table and Kanban views, Create/Edit forms, Detail View, and Convert to Student flow.

### Milestone 14: Frontend - Student Management

- Build the Students module List View.
- Build the core Student Profile page (Overview and Timeline tabs).

### Milestone 15: Frontend - Applications & Documents

- Implement the Applications tab inside the Student Profile.
- Implement the Documents tab inside the Student Profile (Uploads and Downloads).

### Milestone 16: Frontend - Payments

- Implement the Payments module.
- Handle Assigning Fees, Recording Installments, and Downloading Receipts.

### Milestone 17: Frontend - Tasks & Follow-ups

- Implement Tasks, Follow-ups, and Calendar views.
- Link Tasks & Follow-ups seamlessly within the Lead and Student profiles.

### Milestone 18: Frontend - Reports & Notifications

- Implement the Reports module (Exporting to Excel/CSV/PDF).
- Implement global search and notification systems.

### Milestone 19: QA, Polish & Handoff

- End-to-end testing of critical flows (Lead Capture -> Conversion -> Payment).
- Verify responsive design (Mobile/Tablet/Desktop).
- Confirm WCAG AA accessibility compliance.
- Final review of activity logs and data immutability.

## Verification Plan

### Automated Tests

- Unit tests for Backend Services (Business Rules).
- Shared Zod Schema validation testing.

### Manual Verification

- Testing the full user journey: Ad click -> Lead Creation -> CRM Dashboard -> Counseling -> Student Conversion -> Fee Assignment -> Payment Processing -> Case Closure.
