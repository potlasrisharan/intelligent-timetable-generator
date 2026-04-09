# Product Requirements Document

## TimeTable X

Version: 1.0  
Date: 2026-04-09  
Project: Smart Campus Hackathon / South Asian University  
Product Type: Intelligent timetable generation and scheduling workspace

## 1. Product Summary

TimeTable X is a web-based academic scheduling platform for South Asian University that helps administrators configure academic resources, generate feasible timetables, review conflicts, edit draft schedules, and publish role-specific timetable views for faculty and students.

The product combines a premium Next.js frontend with a FastAPI backend and an OR-Tools CP-SAT scheduling engine. The current repository already supports core demo flows for authentication, timetable generation, conflict review, CSV/manual data import, explainable scheduling output, and PDF/CSV export.

## 2. Problem Statement

University timetable creation is high effort, repetitive, and error-prone when handled manually in spreadsheets. Administrators must align:

- Courses with theory and lab hour requirements
- Faculty workload and daily availability
- Room capacity and room type constraints
- Section size and semester grouping
- Lunch breaks, working hours, and holidays
- Combined sections and shared delivery blocks
- Conflict-free schedules for rooms, faculty, and student cohorts

Manual planning slows down academic operations, creates avoidable clashes, and makes last-minute updates hard to manage. The university needs a system that can generate a valid starting schedule quickly, explain its decisions, and still allow admins to make controlled manual adjustments.

## 3. Product Vision

Deliver a scheduling command center that makes timetable generation fast, understandable, and operationally safe for admins, while giving teachers and students a simple role-based timetable experience.

## 4. Goals

- Reduce timetable preparation time from days of manual coordination to minutes.
- Generate a conflict-aware draft schedule automatically from configured academic data.
- Give admins a clear workflow for reviewing versions, locked slots, conflicts, and exports.
- Provide teachers and students with filtered timetable views based on their role.
- Support hackathon-ready demo deployment with graceful fallback to seeded mock data.

## 5. Success Metrics

- Admin can sign in and reach a working dashboard in under 10 seconds.
- Admin can trigger schedule generation and receive a completed result with progress feedback.
- Generated timetable avoids room, faculty, and section double-booking.
- Generated timetable respects room type and room capacity constraints.
- Admin can export the generated schedule as PDF and CSV.
- Teacher and student accounts can see only their relevant timetable views.
- The product remains usable even if the live backend is unavailable by falling back to seeded data.

## 6. Primary Users

### Admin

- Configures courses, faculty, rooms, sections, timeslots, holidays, and combined sections
- Triggers timetable generation
- Reviews conflicts and draft schedules
- Adds manual entries and preserves locked slots
- Exports reports and published schedules

### Teacher

- Signs in to a teacher portal
- Views assigned teaching schedule
- Checks timetable conflicts that affect assigned classes

### Student

- Signs in to a student portal
- Views section-specific class timetable

## 7. Scope

### In Scope for the Current Project

- Role-based sign-in flow for admin, teacher, and student personas
- Admin dashboard with system metrics and generation controls
- Resource management views for courses, faculty, rooms, sections, combined sections, timeslots, and holidays
- Background timetable generation job with progress polling
- Conflict listing and resolution flow
- Timetable editor with locked slots and manual entry support
- Explainable AI view for generated timetable entries
- Reporting, version history, and export capabilities
- CSV import and manual data injection endpoints
- Demo-ready seeded data and API fallback behavior

### Out of Scope for the Current MVP

- Production-grade identity management and enterprise SSO
- Multi-tenant institutional administration
- Fully persistent audit, scheduling, and version history across environments
- Advanced optimization scoring beyond the current solver implementation
- Native mobile applications

## 8. Core User Journeys

### Admin Journey

1. Admin signs in and lands on the dashboard.
2. Admin reviews current system metrics, quality score, conflicts, and active version status.
3. Admin configures or imports rooms, courses, sections, faculty, timeslots, and holidays.
4. Admin starts schedule generation and monitors solver progress.
5. Admin reviews generated entries, conflict items, and explainability traces.
6. Admin adds manual entries or preserves important decisions via locked slots.
7. Admin exports the timetable and shares the published outcome.

### Teacher Journey

1. Teacher signs in through the teacher account flow.
2. Teacher lands on a personal schedule view filtered by faculty identity.
3. Teacher reviews assigned classes, periods, rooms, and affected conflicts.

### Student Journey

1. Student signs in through the student account flow.
2. Student lands on a personal timetable filtered by section.
3. Student reviews weekly class timing, room, and faculty information.

## 9. Functional Requirements

### FR-1 Authentication and Session Handling

- The system shall support sign-in and forgot-password flows.
- The system shall expose role-specific experiences for `ADMIN`, `TEACHER`, and `STUDENT`.
- The frontend shall persist session state locally for demo use.
- Unauthenticated users shall be redirected to the login page before accessing protected routes.

### FR-2 Admin Navigation and Workspace

- The system shall provide an admin workspace with pages for dashboard, courses, faculty, rooms, sections, combined sections, timeslots, holidays, editor, conflicts, reports, history, and settings.
- The workspace shall keep teacher and student navigation limited to role-relevant views.

### FR-3 Resource Configuration

- The system shall allow retrieval of departments, courses, faculty, rooms, sections, combined sections, timeslots, and holidays from backend endpoints.
- The backend shall support generic create, update, and delete operations for supported resource collections.
- Resource data shall include academic and scheduling fields required by the solver, including theory hours, practical hours, room type, room capacity, and section size.

### FR-4 Timetable Generation

- The system shall allow admins to trigger timetable generation from the UI.
- The backend shall queue a generation job and provide a `job_id` immediately.
- The frontend shall poll generation status and display progress until completion or error.
- The solver shall write generated timetable entries back into the in-memory store.

### FR-5 Scheduling Constraints

The solver shall enforce the following core constraints in the current implementation:

- Each class request must be scheduled exactly once.
- A room cannot host more than one class in the same period.
- A faculty member cannot teach more than one class in the same period.
- A section cannot attend more than one class in the same period.
- Room capacity must meet or exceed section size.
- Lab requests must be placed only in lab rooms.
- Theory requests must be placed only in classroom rooms.
- Faculty daily load must not exceed `maxPeriodsPerDay`.
- Lab sessions must be scheduled in consecutive periods on the same day.

### FR-6 Timetable Editing and Locked Slots

- The system shall display a timetable editor for draft schedules.
- Locked entries shall remain preserved during regeneration.
- Admins shall be able to create manual timetable entries through the backend.
- The editor shall surface section context and locked-slot counts.

### FR-7 Explainability

- The system shall provide plain-language explanations for why a generated slot was assigned.
- Explanations shall reference room availability, room type, room capacity, faculty availability, and section non-conflict status.
- The editor shall make explainability visible as part of the schedule review flow.

### FR-8 Conflict Management

- The system shall expose a conflict list with severity, rule code, affected entities, suggested fixes, and quality impact.
- Admins shall be able to resolve conflicts through the backend resolution endpoint.
- The conflict page shall communicate the difference between hard-constraint and soft-constraint outcomes.

### FR-9 Reports, History, and Exports

- The system shall provide reports for room utilization, faculty gaps, and compactness summary.
- The system shall expose timetable version history.
- The backend shall support export to PDF and CSV.
- Export output shall include core timetable fields such as day, time, course, section, faculty, room, and type.

### FR-10 Data Import

- The system shall support CSV import through a backend endpoint.
- The current CSV import flow shall infer payload type from headers for rooms and courses.
- The backend shall support manual injection of room, section, and course data from form input.

### FR-11 Resilience and Demo Fallback

- If the live API is unavailable, the frontend shall fall back to seeded mock data rather than failing the entire experience.
- The product shall remain demoable without a fully provisioned database.

## 10. Non-Functional Requirements

### Performance

- Initial protected page load should feel responsive on standard laptop hardware.
- Solver progress feedback should begin quickly after generation is triggered.
- API requests should degrade gracefully under timeout or failure conditions.

### Reliability

- Core flows should continue operating with seeded fallback data.
- Generation jobs should return explicit success or error payloads.

### Usability

- The UI should make scheduling state easy to scan using dashboards, cards, badges, tables, and board views.
- Role-specific portals should minimize confusion by restricting what each user sees.

### Transparency

- Generated scheduling decisions should be explainable in plain language.
- Conflict severity and quality impact should be visible before final acceptance.

### Maintainability

- Frontend and backend should stay decoupled through typed service contracts.
- API routes should remain modular by domain: auth, dashboard, resources, schedule, reports, export, import, and explain.

## 11. Technical Alignment

### Frontend

- Next.js 15
- React 19
- Tailwind CSS
- Role-based protected app shell
- Service-layer API adapters with fallback support

### Backend

- FastAPI
- OR-Tools CP-SAT solver
- Background threaded job execution for generation
- ReportLab PDF export
- CSV export for spreadsheet workflows

### Data Strategy

- Current primary runtime mode uses seeded in-memory data for consistency and demos.
- The codebase is structured to later support Supabase/Postgres-backed persistence.

## 12. Release Definition for MVP

The MVP is considered complete when:

- Admin can configure or import scheduling inputs.
- Admin can generate a timetable and view progress.
- Admin can inspect the resulting timetable in the editor.
- Admin can review conflicts and export the timetable.
- Teacher and student users can access their own filtered timetable views.
- The product works in both live API and fallback demo modes.

## 13. Risks and Gaps

- Current persistence is primarily in-memory, so long-term version durability is limited.
- Authentication is demo-oriented and not yet production hardened.
- Holiday handling is simplified in the solver and should be expanded before production use.
- CSV import currently recognizes a narrow set of input shapes.
- Advanced optimization and publish workflows are not yet fully implemented end-to-end.

## 14. Recommended Next Phase

- Add durable database persistence for generated schedules, versions, and audit events.
- Expand solver constraints to cover a broader academic policy set.
- Introduce real publish and restore actions for timetable versions.
- Strengthen authentication, authorization, and audit logging.
- Improve CSV import mapping and validation for all resource types.
- Add richer report generation and export formatting.

## 15. Final Product Positioning

TimeTable X should be presented as a smart academic scheduling platform that already demonstrates the full product loop:

- resource setup
- solver-driven generation
- explainable schedule review
- conflict handling
- export and reporting
- role-based consumption for admins, teachers, and students

That makes it strong as both a hackathon demo and a foundation for a more production-ready campus scheduling system.
