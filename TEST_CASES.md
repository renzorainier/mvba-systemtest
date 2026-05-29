# MVBA System Test Cases

## Scope

These test cases cover the main user-facing and API-backed workflows in the MVBA school management system:

- Authentication, logout, and role-based access
- Students, archived students, and document uploads
- Enrollments, sections, teachers, schedules, curriculums, and class assignments
- Financial records, receipts, balances, and proof-of-payment files
- Dashboard, school year selection, historical read-only mode, system settings, and rollover

## Test Data

Use at least these seeded accounts:

| Role | Username | Expected Access |
| --- | --- | --- |
| Admin | admin user | All portal modules, system settings, rollover |
| Registrar | registrar user | Students, enrollments, academics, sections, teachers, classes; no financials or system settings |
| Cashier | cashier user | Dashboard and financials; no students, teachers, classes, or system settings |

Use these baseline records:

- Current school year: `2025-2026`
- Historical school year: one archived year such as `2024-2025`
- Student A: Kinder 1 student with generated 6-digit LRN
- Student B: Grade 1 student with valid 12-digit LRN
- Student C and D: two students with `TBA` LRN for ambiguity checks
- Section A: Grade 1 section with capacity below 15
- Section B: Grade 1 section with exactly 15 enrolled students
- One curriculum and one grade-level curriculum assignment for each tested grade

## Authentication And Access Control

| ID | Test Case | Steps | Expected Result |
| --- | --- | --- | --- |
| AUTH-001 | Successful login | Open `/`, enter valid Admin credentials, submit. | User is redirected to `/portal/dashboard`; auth cookie is set; role is shown or applied in navigation. |
| AUTH-002 | Missing credentials | Submit login form with blank username or password. | Login is rejected with a required-fields message; user stays on login page. |
| AUTH-003 | Invalid credentials | Submit valid username with wrong password. | Login is rejected with `Invalid credentials`; no portal access is granted. |
| AUTH-004 | Disabled account | Login with an account where `isActive=false`. | Login returns disabled-account message and HTTP 403 from API. |
| AUTH-005 | Account lockout | Attempt five wrong passwords for the same real account, then try the correct password. | Account is temporarily locked; correct password is rejected until lockout expires. |
| AUTH-006 | Rate limiting | Send more than 8 failed attempts for one username or more than 15 from one IP inside 10 minutes. | API returns HTTP 429 with too-many-attempts message. |
| AUTH-007 | Logout | Login, then use logout action. | Auth cookie is cleared and portal URLs redirect to `/`. |
| AUTH-008 | Authenticated login page redirect | Visit `/` while already logged in. | User is redirected to `/portal/dashboard`. |
| AUTH-009 | Unauthenticated portal redirect | Clear cookie and visit `/portal/dashboard`. | User is redirected to `/`. |
| AUTH-010 | Cashier route restrictions | Login as Cashier and visit `/portal/students`, `/portal/teachers`, `/portal/classes`, `/portal/system`. | User is redirected to dashboard for restricted pages. |
| AUTH-011 | Registrar route restrictions | Login as Registrar and visit `/portal/financials` and `/portal/system`. | User is redirected to dashboard for restricted pages. |
| AUTH-012 | Admin route access | Login as Admin and open every portal module. | All modules load without RBAC redirects. |

## School Year And Historical Mode

| ID | Test Case | Steps | Expected Result |
| --- | --- | --- | --- |
| SY-001 | Current school year loads | Login and open dashboard. | Current school year from system settings is displayed; data queries use the selected current year. |
| SY-002 | Switch to historical year | Select an archived school year. | Portal context changes to the selected year; historical records load from archived collections. |
| SY-003 | Historical mode is read-only | In historical mode, open students, enrollments, sections, teachers, curriculums, financials, academics, and system pages. | Create, edit, delete, upload, and save controls are disabled or blocked. |
| SY-004 | API rejects historical writes | With selected historical year cookie/context, call POST/PUT/PATCH/DELETE endpoints for students, enrollments, financials, sections, teachers, schedules, classes, curriculums. | API returns HTTP 403 and no data changes. |
| SY-005 | Return to current year | Switch back to current school year. | Write controls are enabled according to role; current-year data is displayed again. |

## Students

| ID | Test Case | Steps | Expected Result |
| --- | --- | --- | --- |
| STU-001 | Create Kinder 1 student | As Admin or Registrar, add required student details with grade `Kinder 1`. | Student is created; system generates a unique 6-digit LRN; tuition and remaining balance are initialized from grade tuition plan. |
| STU-002 | Create Grade 1 student with valid LRN | Add Grade 1 student using a 12-digit LRN. | Student is created with provided LRN. |
| STU-003 | Create Grade 1 student without LRN | Add Grade 1 student with no LRN. | Student is created with LRN `TBA`. |
| STU-004 | Reject invalid grade-level LRN | Add Kinder 2 to Grade 6 student with non-12-digit LRN. | Save fails with validation error. |
| STU-005 | Reject duplicate concrete LRN | Add two students using the same valid 12-digit LRN. | Second create fails with duplicate LRN error. |
| STU-006 | Allow multiple TBA LRNs | Add two Grade 1 students without LRN. | Both records are created with `TBA`. |
| STU-007 | Required field validation | Try saving a student without first name, last name, gender, birth date, address, or admission date. | Save fails and missing required field is communicated. |
| STU-008 | GWA validation | Save GWA as text, below 0, above 100, and valid numeric value. | Invalid values fail; valid value persists. |
| STU-009 | Search and pagination | Create more than 10 students, search by name or LRN, move between pages. | Matching students display; pagination count and page records are correct. |
| STU-010 | Edit student profile | Open profile, edit address, guardian info, grade, GWA, and save. | Changes persist after refresh. |
| STU-011 | Upload profile picture | Upload a supported image while creating or editing a student. | Image is compressed/stored in GridFS and renders through download endpoint. |
| STU-012 | Upload student documents | Upload Birth Certificate, Report Card, and Form 137. | Files are stored, associated with correct fixed document fields, and show uploader/date metadata. |
| STU-013 | Replace and remove documents | Replace one uploaded document and remove another. | New file is linked; removed file no longer appears on the student profile. |
| STU-014 | Archive student | Archive an active student with related enrollment/payment data. | Student moves to archived list; active list no longer includes them; related archive data remains accessible. |
| STU-015 | Prevent duplicate archive | Archive an already archived student through UI or API. | Request is blocked or treated as already archived without duplicating archive records. |
| STU-016 | Restore archived student | Restore a previously archived student. | Student returns to active list and can be edited in current school year. |

## Enrollments

| ID | Test Case | Steps | Expected Result |
| --- | --- | --- | --- |
| ENR-001 | Create enrollment with explicit student | Select a student, section, date, and status. | Enrollment is created for selected school year and displays student/section names. |
| ENR-002 | Reject missing LRN | Submit enrollment without learner reference number. | API returns required LRN error. |
| ENR-003 | Resolve unambiguous LRN | Create enrollment by entering an LRN that belongs to exactly one student. | Enrollment links to that student. |
| ENR-004 | Reject ambiguous TBA LRN | Attempt enrollment using `TBA` when multiple students have `TBA` and no studentId is provided. | Save fails and asks for specific student selection. |
| ENR-005 | Reject mismatched studentId and LRN | Submit a studentId that does not match the entered LRN. | API rejects the request. |
| ENR-006 | Prevent duplicate yearly enrollment | Enroll the same student twice in the same school year. | Second enrollment is rejected. |
| ENR-007 | Allow separate school-year enrollment | Enroll same student in a different school year after rollover or context change. | Enrollment is allowed for the new year. |
| ENR-008 | Section capacity limit | Enroll into a section that already has 15 students. | Save fails with section-full message. |
| ENR-009 | Update enrollment status | Change status from Pending to Enrolled/Completed/Cancelled. | Status persists and UI badge updates. |
| ENR-010 | Update enrollment section | Move student to another section with matching grade level. | Section change persists and displayed section name updates. |
| ENR-011 | Section options filtered by grade | Open section selector for an enrollment. | Only compatible grade-level sections plus current section are offered. |

## Curriculums, Sections, Schedules, Teachers, And Classes

| ID | Test Case | Steps | Expected Result |
| --- | --- | --- | --- |
| CUR-001 | Create curriculum | Add curriculum ID, name, dates, school year, and subjects. | Curriculum is saved and appears in list/search. |
| CUR-002 | Reject duplicate curriculum ID in same year | Create another curriculum with same ID and selected school year. | API rejects duplicate. |
| CUR-003 | Edit/delete curriculum | Edit curriculum details, then delete it. | Edits persist; deleted curriculum is removed. |
| CUR-004 | Print curriculum | Use print action for a curriculum with multiple subjects. | Print preview/window contains curriculum metadata and subject list. |
| GLC-001 | Assign curriculum to grade level | Create grade-level curriculum assignment for a school year and grade. | Assignment appears and is selectable when creating sections. |
| SEC-001 | Create section | Add section name, grade level, school year, curriculum assignment, and room. | Section is created with generated/entered section ID. |
| SEC-002 | Reject incomplete section | Omit grade level, school year, curriculum assignment, or room. | Save fails with validation error. |
| SEC-003 | Reject mismatched curriculum assignment | Select a curriculum assignment from another grade/year through API. | API rejects mismatch. |
| SEC-004 | Edit section | Change room or section name. | Changes persist after refresh. |
| SEC-005 | Section enrollment count | View sections after enrollments exist. | Student count reflects active enrollments per section. |
| TCH-001 | Create teacher | Add teacher with required identity/contact fields. | Teacher appears in teacher list and class assignment options. |
| TCH-002 | Edit/delete teacher | Update teacher info, then delete. | Changes persist; deleted teacher is removed from options. |
| SCH-001 | Create schedule | Add schedule name/ID and schedule items. | Schedule is saved and appears in list. |
| SCH-002 | Reject duplicate schedule ID | Edit or create schedule with an existing schedule ID. | API rejects duplicate schedule ID. |
| CLS-001 | Create class assignment | Select section, teacher, and schedule. | Class assignment is created and displays section, teacher, curriculum, and schedule details. |
| CLS-002 | Edit class assignment | Change teacher or schedule. | Assignment updates after refresh. |
| CLS-003 | Delete class assignment | Delete an assignment after confirmation. | Assignment is removed from list. |
| CLS-004 | Search class assignments | Search by section, teacher, schedule, or curriculum. | Matching assignments are displayed. |

## Financials

| ID | Test Case | Steps | Expected Result |
| --- | --- | --- | --- |
| FIN-001 | Create completed payment | As Admin or Cashier, select student, amount, date, method, reference number, status `Completed`, and receiver. | Payment is created; student remaining balance decreases by amount, not below zero. |
| FIN-002 | Create non-completed payment | Create payment with Pending/Failed status. | Payment is saved; student remaining balance is unchanged. |
| FIN-003 | Reject invalid studentId | Submit payment with missing, non-ObjectId, or nonexistent studentId. | API returns validation error. |
| FIN-004 | Required payment fields | Omit amount, date, method, reference number, status, or receiver. | Save fails with required-field error. |
| FIN-005 | Proof of payment upload | Attach a proof-of-payment file before creating a payment. | File uploads to GridFS and is linked in payment documents. |
| FIN-006 | Search financial records | Search by student name, payment ID, reference number, or method. | Matching records display. |
| FIN-007 | Receipt/download permissions | Attempt to download files as Admin, uploader role, and unrelated role. | Admin can download; allowed/uploader roles can download; unauthorized roles are blocked. |
| FIN-008 | Monthly balance view | Open a student monthly balance modal. | Monthly entries are generated from tuition plan and current school year start. |
| FIN-009 | Historical financial read-only | View financials in archived year. | Archived payments display, but add/update actions are disabled and API writes return 403. |

## System Settings And Rollover

| ID | Test Case | Steps | Expected Result |
| --- | --- | --- | --- |
| SYS-001 | Load settings defaults | With empty settings collection, open system settings or call GET. | Default tuition settings are created/returned. |
| SYS-002 | Admin updates settings with password | As Admin, change title, currency, school year, and tuition plans; provide correct current password. | Settings save and recalculated total is returned. |
| SYS-003 | Reject non-admin settings update | Try PUT settings as Registrar or Cashier. | API returns HTTP 403. |
| SYS-004 | Reject missing/wrong password | As Admin, save settings without password or with wrong password. | Missing password returns 400; wrong password returns 401. |
| SYS-005 | Reject invalid school year | Save current school year not matching `YYYY-YYYY` or where end year is not start year + 1. | API returns validation error. |
| SYS-006 | Reject empty tuition plans | Save system settings with no tuition plan blocks. | API returns validation error. |
| ROL-001 | Rollover preview | As Admin, open rollover screen. | Current year, next year, students, and available curriculum assignments load. |
| ROL-002 | Reject non-admin rollover | Call rollover GET/POST as Registrar, Cashier, or unauthenticated user. | API returns HTTP 403. |
| ROL-003 | Perform school-year rollover | Select promoted students and submit current/next year. | Current-year active data is archived; promoted students and applicable records are created for next school year; settings current year advances as designed. |
| ROL-004 | Rollover data integrity | After rollover, compare active and archived collections. | Archived students, enrollments, payments/receipts, sections, schedules, class assignments, curriculums, and grade-level assignments retain source school year and source IDs. |
| ROL-005 | Historical year after rollover | Switch to the rolled-over source year. | Archived data appears read-only and matches pre-rollover current-year state. |

## Dashboard, Navigation, And Usability

| ID | Test Case | Steps | Expected Result |
| --- | --- | --- | --- |
| UI-001 | Portal navigation | Visit each sidebar item allowed for the role. | Page loads without console/runtime error; active navigation state is correct. |
| UI-002 | Dashboard metrics | Seed students, enrollments, payments, and sections; open dashboard. | Counts, financial summaries, and month filters reflect seeded data. |
| UI-003 | Loading and empty states | Open pages with empty collections or slow API responses. | Loading indicators and empty states display without layout breakage. |
| UI-004 | Search reset behavior | Search on a paginated page while on page 2+. | Current page resets or displays valid results without blank stale page. |
| UI-005 | Responsive layout | Test login and major portal pages at mobile, tablet, and desktop widths. | Content remains readable; tables/actions are usable; no overlapping controls. |
| UI-006 | Error handling | Force API 400/403/500 responses for common actions. | User sees actionable error messages and forms remain recoverable. |

## File Handling And Compression

| ID | Test Case | Steps | Expected Result |
| --- | --- | --- | --- |
| FILE-001 | Compress image | Upload a large image through student profile. | `/api/compress` returns a compressed image file with expected content type. |
| FILE-002 | Compress PDF/document | Upload a supported document. | Compression route returns a valid file or cleanly preserves unsupported format. |
| FILE-003 | Reject missing upload file | Call upload endpoint with no `file` field. | API returns validation error. |
| FILE-004 | Upload role enforcement | Upload file for student, student-document, student-profile, and financial/proof record types under each role. | Only permitted roles can upload for each record type. |
| FILE-005 | Download nonexistent file | Request `/api/download-file/{invalidId}`. | API returns not found or validation error without server crash. |

## Regression Checklist

Run this short checklist before release:

- `npm run lint`
- Login works for Admin, Registrar, and Cashier
- Current school year writes work; historical school year writes are blocked
- Student creation covers Kinder 1 generated LRN, 12-digit LRN, and `TBA`
- Enrollment blocks duplicates and full sections
- Completed payments reduce balances exactly once
- Rollover archives source-year records and allows historical read-only review
- Role restrictions work in both UI routes and API endpoints
