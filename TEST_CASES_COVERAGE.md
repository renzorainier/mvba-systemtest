# TEST_CASES Coverage Checklist

This file maps each TEST_CASES.md ID to its current test coverage status in this repository.

Summary: Implemented = API/unit tests present; Partial = some tests exist but gaps remain; Missing = no tests found.

See original test plan: [TEST_CASES.md](TEST_CASES.md)

## Authentication And Access Control

| ID | Status | Tests / Notes |
|---|---:|---|
| AUTH-001 | Partial | [test/api/auth-settings.test.js](test/api/auth-settings.test.js) covers login API; E2E smoke only for basic flow. UI redirect not covered.
| AUTH-002 | Implemented | [test/api/auth-settings.test.js](test/api/auth-settings.test.js)
| AUTH-003 | Implemented | [test/api/auth-settings.test.js](test/api/auth-settings.test.js)
| AUTH-004 | Implemented | [test/api/auth-settings.test.js](test/api/auth-settings.test.js)
| AUTH-005 | Implemented | [test/lib/login-security.test.js](test/lib/login-security.test.js)
| AUTH-006 | Implemented | [test/lib/login-security.test.js](test/lib/login-security.test.js)
| AUTH-007 | Implemented | [test/api/auth-settings.test.js](test/api/auth-settings.test.js)
| AUTH-008 | Missing | No E2E/UI test asserting redirect from `/` when authenticated.
| AUTH-009 | Missing | No E2E/UI test asserting redirect to `/` when unauthenticated.
| AUTH-010 | Missing | RBAC route redirects for Cashier not covered by E2E.
| AUTH-011 | Missing | RBAC route redirects for Registrar not covered by E2E.
| AUTH-012 | Missing | Full admin route access (UI) not covered by E2E.

## School Year And Historical Mode

| ID | Status | Tests / Notes |
|---|---:|---|
| SY-001 | Implemented | [test/lib/school-year.test.js](test/lib/school-year.test.js) and API tests use seeded settings.
| SY-002 | Implemented | School-year context switching validated in tests and historical GETs (students/enrollments).
| SY-003 | Implemented | Historical read-only enforced in API tests (students/enrollments/sections/financials).
| SY-004 | Implemented | API 403 tests present (students/enrollments/financials).
| SY-005 | Implemented | Tests cover switching back via settings and rollover updates.

## Students

| ID | Status | Tests / Notes |
|---|---:|---|
| STU-001 | Implemented | [test/api/students.test.js](test/api/students.test.js)
| STU-002 | Implemented | [test/api/students.test.js](test/api/students.test.js)
| STU-003 | Implemented | [test/api/students.test.js](test/api/students.test.js)
| STU-004 | Implemented | [test/api/students.test.js](test/api/students.test.js)
| STU-005 | Implemented | [test/api/students.test.js](test/api/students.test.js)
| STU-006 | Implemented | [test/api/students.test.js](test/api/students.test.js)
| STU-007 | Implemented | [test/api/students.test.js](test/api/students.test.js)
| STU-008 | Implemented | [test/api/students.test.js](test/api/students.test.js)
| STU-009 | Partial | Search/pagination logic referenced but no explicit pagination stress tests found.
| STU-010 | Implemented | Profile edits tested in students PUT/PATCH tests.
| STU-011 | Missing | No GridFS/profile-picture upload tests located for students.
| STU-012 | Missing | Student document upload (birth cert/report card/Form137) tests not found.
| STU-013 | Missing | Replace/remove document tests not found.
| STU-014 | Implemented | Archive student flow in [test/lib/archive-rollover.test.js](test/lib/archive-rollover.test.js)
| STU-015 | Implemented | Duplicate archive rejection covered in archive tests.
| STU-016 | Implemented | Restore archived student tested in archive tests.

## Enrollments

| ID | Status | Tests / Notes |
|---|---:|---|
| ENR-001 | Implemented | [test/api/enrollments-sections.test.js](test/api/enrollments-sections.test.js)
| ENR-002 | Implemented | [test/api/enrollments-sections.test.js](test/api/enrollments-sections.test.js)
| ENR-003 | Implemented | [test/api/enrollments-sections.test.js](test/api/enrollments-sections.test.js)
| ENR-004 | Implemented | [test/api/enrollments-sections.test.js](test/api/enrollments-sections.test.js)
| ENR-005 | Implemented | [test/api/enrollments-sections.test.js](test/api/enrollments-sections.test.js)
| ENR-006 | Implemented | Duplicate-year enrollment rejection tested.
| ENR-007 | Implemented | Rollover and school-year separation tested in rollover suite.
| ENR-008 | Implemented | Section capacity/full tests present.
| ENR-009 | Implemented | Status update tests present.
| ENR-010 | Implemented | Section move tests present.
| ENR-011 | Implemented | Section options/grade filtering covered in section tests.

## Curriculums, Sections, Schedules, Teachers, And Classes

| ID | Status | Tests / Notes |
|---|---:|---|
| CUR-001 | Missing | No dedicated `curriculums.test.js` found.
| CUR-002 | Missing | Duplicate curriculum ID test missing.
| CUR-003 | Missing | Edit/delete curriculum tests missing.
| CUR-004 | Missing | Print curriculum UI test missing.
| GLC-001 | Partial | Grade-level curriculum seeding used; explicit assignment tests partial.
| SEC-001 | Implemented | Section create/update/validation tested in [test/api/enrollments-sections.test.js](test/api/enrollments-sections.test.js)
| SEC-002 | Implemented | Incomplete-section rejection tested.
| SEC-003 | Implemented | Curriculum assignment mismatch rejection tested.
| SEC-004 | Implemented | Edit section tested.
| SEC-005 | Implemented | Enrollment count via section listing tested in rollover/archive.
| TCH-001 | Missing | No `teachers.test.js` present for create flow.
| TCH-002 | Missing | Teacher edit/delete tests missing.
| SCH-001 | Missing | No `schedules.test.js` found.
| SCH-002 | Missing | Duplicate schedule ID test missing.
| CLS-001 | Missing | Class-assignment create tests absent.
| CLS-002 | Missing | Edit class assignment tests absent.
| CLS-003 | Missing | Delete class assignment tests absent.
| CLS-004 | Missing | Search class assignments tests absent.

## Financials

| ID | Status | Tests / Notes |
|---|---:|---|
| FIN-001 | Implemented | Completed payments and balance logic tested in [test/api/financials.test.js](test/api/financials.test.js)
| FIN-002 | Implemented | Non-completed status handling tested.
| FIN-003 | Implemented | Invalid/nonexistent studentId rejection tested.
| FIN-004 | Implemented | Required payment fields validation tested.
| FIN-005 | Partial | Proof-of-payment metadata is tested, but GridFS/file-storage integration tests limited.
| FIN-006 | Missing | Search/filter tests for financial records not present.
| FIN-007 | Missing | Receipt/download permission tests not found.
| FIN-008 | Missing | Monthly balance modal UI logic not covered by backend tests.
| FIN-009 | Implemented | Historical financial read-only behavior covered.

## System Settings And Rollover

| ID | Status | Tests / Notes |
|---|---:|---|
| SYS-001 | Implemented | Default settings creation in [test/api/auth-settings.test.js](test/api/auth-settings.test.js)
| SYS-002 | Implemented | Admin settings update validation tested.
| SYS-003 | Implemented | Non-admin update rejection tested.
| SYS-004 | Implemented | Missing/wrong password validation tested.
| SYS-005 | Implemented | Invalid school year validation tested.
| SYS-006 | Implemented | Empty tuition plan validation tested.
| ROL-001 | Implemented | Rollover preview/data loads in rollover tests.
| ROL-002 | Implemented | Non-admin rollover rejection enforced.
| ROL-003 | Implemented | Full rollover operation and promotion tested.
| ROL-004 | Implemented | Data integrity assertions in rollover tests.
| ROL-005 | Implemented | Historical view after rollover tested.

## Dashboard, Navigation, And Usability

| ID | Status | Tests / Notes |
|---|---:|---|
| UI-001 | Missing | No E2E navigation coverage beyond auth smoke.
| UI-002 | Missing | Dashboard metrics not covered by E2E.
| UI-003 | Missing | Loading/empty state visual tests not present.
| UI-004 | Missing | Search reset behavior UI tests missing.
| UI-005 | Missing | Responsive layout tests not present.
| UI-006 | Missing | Error handling UI tests missing.

## File Handling And Compression

| ID | Status | Tests / Notes |
|---|---:|---|
| FILE-001 | Missing | `/api/compress` image compression tests not found.
| FILE-002 | Missing | Document compression tests not found.
| FILE-003 | Implemented | Missing-upload validation exists in API logic but explicit tests limited.
| FILE-004 | Missing | Role enforcement for uploads not tested.
| FILE-005 | Missing | Download nonexistent file tests not found.

## Regression Checklist Mapping

- `npm run lint` : (manual) not executed here.
- Login works for Admin, Registrar, Cashier: Partial (API tests present; full E2E coverage limited).
- Current school year writes work; historical writes are blocked: Implemented (API tests).
- Student creation LRN cases: Implemented (API tests).
- Enrollment duplicates and section-full checks: Implemented.
- Completed payments reduce balances exactly once: Implemented.
- Rollover archives and historical read-only review: Implemented.
- Role restrictions in UI routes: Missing (needs E2E).

## Next steps

- Add E2E tests for UI/RBAC and dashboard flows.
- Add API tests for file upload/download (GridFS) for students and financials.
- Add API tests for curriculums, teachers, schedules, class assignments, and financial search/permission checks.

Generated by automation to track TEST_CASES.md coverage.
