import { cookies } from "next/headers";
import HelpManualBrowser from "@/components/HelpManualBrowser";

const sections = [
  {
    id: "quick-start",
    number: "1",
    title: "Quick Start",
    description: "Get oriented before you begin using the portal.",
    items: [
      {
        id: "account-roles-overview",
        number: "1.1",
        title: "Account roles",
        body: `The portal has three main account roles, each with different access levels:
        
        1. Admin: Full access to all features, including user management, tuition configuration, and school year transitions. Admins can view and edit all data across the portal.
        
        2. Registrar: Access to everyday tasks like enrolling students, managing schedules, and recording payments. Registrars can view most data but cannot access admin settings.
        
        3. Cashier: Limited access focused on payment recording and accounts receivable. Cashiers can view student financial data but cannot edit student records or access admin settings.
        
        Note: Some of the images shown in this manual will look different based on your account role, but all functional steps outlined in each section will be the same process, regardless of role.`,
      },
      {
        id: "dashboard-overview",
        number: "1.2",
        title: "Understanding your dashboard",
        body: `[[IMG_0]]The dashboard serves as the central hub of the portal, providing an immediate high-level overview of school metrics, financials, and enrollment breakdowns for the selected school year.
        
        The interface is divided into four primary sections:

        1. Navigation Sidebar (Green, Left): A collapsible menu that allows users to easily jump between different sections of the portal.

        2. Selected School Year (Top Right, Red): Displays the currently selected school year context.

        3. Overview of Key Metrics (Center, Orange): Quick-glance summaries showing crucial school totals:
        • Total Students: The overall count of registered students for the school year.
        • Total Tuition: The total tuition amount due alongside outstanding balances.
        • Total Payments: The accumulated payments recorded for the current semester.
        • Student Breakdown: A detailed visual breakdown of student enrollment grouped by individual grade levels (Kinder 1 through Grade 6), making it easy to track student distribution.

        4. Accounts Receivable: A report of unpaid students viewable on a monthly basis.
        `,
        images: ["/manual-section-1-2.png"],
        captions: ["A quick overview of the dashboard interface."],
      },
    ],
  },
  {
    id: "everyday-tasks",
    number: "2",
    title: "Everyday Tasks",
    description: "Repeatable workflows that most users perform day to day.",
    items: [
      {
        id: "enrolling-student",
        number: "2.1",
        title: "Enrolling a student",
        body: `This section outlines the steps to enroll a new student into the system, including adding their information, assigning them to a section, and updating their enrollment status as needed.
        
        Note: Before enrolling a student, the user must create a schedule, section, and subjects first. Please refer to [Section 2.3: Managing subjects and curriculum](#manage-subjects-curriculum) and [Section 2.4: Creating sections and schedules](#create-sections-schedules) on this manual for guidance on setting up these prerequisites. Once those are in place, you can proceed to the enrollment process.
        
        Quick process summary: Add a student -> Assign student to section -> Update section and status later if needed

        Adding a student to the portal:

        Step 1: Add the student to the system. To add a student, navigate into the Student Management page under the Enrollments & Students section.[[IMG_0]]
        Step 2: Click the "+ Add New Student" button to open the student enrollment form.[[IMG_1]]
        Step 3: Fill out the required fields (marked with a red asterisk) and any additional information as needed. Once all necessary information is entered, click the "Create Student" button to complete the enrollment process. The new student will now be added to the system and can be found in the student list.
        
        Enrolling a student:

        Step 4: After adding a student, navigate to the Enrollments/Admission page to assign the student to a section and schedule.[[IMG_2]]
        Step 5: Click the "+ Add New Enrollment" button to open the enrollment form. Fill out the required fields and click the "Add Enrollment" button save. After saving the student's enrollment information, the section and status can be edited later if needed.[[IMG_3]]
        After completing step 5, the student is finally enrolled. Once a student is added to the system, his/her records can all be managed throughout the portal, including his/her documents, tuition balance, payment records, and GWA.

        See also: [Section 2.2: Updating student information and records](#update-student-info)
        `,
        images: [
          "/manual-section-2-1-step-1.png",
          "/manual-section-2-1-step-2.png",
          "/manual-section-2-1-step-4.png",
          "/manual-section-2-1-step-5-1.png",
        ],
        captions: [
          "Student Management Page in the sidebar",
          "The student management page with important sections highlighted.",
          "Enrollments/Admission Page in the sidebar",
          "Enrollment Management Page",
        ],
        imageSizes: ["25%", { width: "95%", maxHeight: "600px" }, "25%"],
      },
      {
        id: "update-student-info",
        number: "2.2",
        title: "Updating student information and records",
        body: `All student information can be updated at any time. This section outlines the steps to update a student's information and records within the system.
        
        Quick process summary: Search for the student -> Open student profile -> Click edit -> Make changes -> Save changes
        
        Step 1: Navigate to the Student Management page under the Enrollments & Students section.[[IMG_0]]
        Step 2: Click the student ID to open the student profile.
        Tip: If the student is not visible, use the search bar to find the student by name or ID/LRN.[[IMG_1]]
        Step 3: Click the "Edit Profile" button at the bottom of the form to enable editing of the student's information. After making the necessary updates, click the "Save Changes" button to apply the changes.
        
        Important Note: Changes must be saved in order for it to take effect. Closing the form before saving will undo any changes and student information will not be updated.[[IMG_2]][[IMG_3]]
        Note: For file documents, the timestamp and name of the uploader will be recorded for each upload. When updating file documents, the old file will be replaced with the new one, and the previous file will no longer be accessible.`,
        images: [
          "/manual-section-2-1-step-1.png",
          "/manual-section-2-2-step-2.png",
          "/manual-section-2-2-step-3-1.png",
          "/manual-section-2-2-step-3-2.png",
        ],
        captions: [
          "Student Management Page in the sidebar",
          "Click the student ID (highlighted green) or use the search bar (highlighted yellow)",
          "Edit profile to start making changes",
          "After editing, save changes to apply updates",
        ],
        imageSizes: [
          "25%",
          { width: "95%", maxHeight: "600px" },
          { width: "80%", maxHeight: "480px" },
          { width: "80%", maxHeight: "480px" },
        ],
      },
      {
        id: "manage-subjects-curriculum",
        number: "2.3",
        title: "Managing subjects and curriculum",
        body: `Managing curriculum and subjects is essential to ensure the correct academic structure is in place for scheduling and enrollment. This section outlines the steps for managing curriculum and subjects, including creating and editing curriculum records, defining subjects under each curriculum, and assigning grade levels to the curriculum.
        
        Quick process summary: Create new curriculum -> Assign a grade level to the curriculum

        Creating a new curriculum:

        Step 1: Navigate to the Curriculum Management page under the Academics section.[[IMG_0]]
        Step 2: Click the "+ New Curriculum" button to open the curriculum form.[[IMG_1]]
        Step 3: Fill out the subjects by their name, separated by commas. For example, if the curriculum has three subjects: Math, Science, and English, enter "Math, Science, English" in the subjects field. After filling out the required fields, click the "Save Curriculum" button to add the new curriculum to the system.[[IMG_2]]
        Step 4: After creating a curriculum, it can be edited or deleted later by clicking on the "Edit" or "Delete" buttons in the curriculum list.
        Tip: If you cannot find the curriculum you want to edit, use the search bar to filter the list by curriculum name or ID.[[IMG_3]]
        

        Assigning a grade level to a curriculum:

        Step 5: Navigate to the Grade Curriculums page under the Academics section.[[IMG_4]]
        Step 6: Click the "+ New Assignment" button to open the assignment form. Select the curriculum and grade level to assign them together. Click "Save Assignment" to complete the process. After creating a curriculum assignment, it can be edited or deleted later by clicking on the "Edit" or "Delete" buttons in the curriculum assignment list.[[IMG_5]][[IMG_6]]
        Tip: A curriculum can be assigned to multiple grade levels if needed. For example, if a curriculum is used for both Grade 1 and Grade 2, simply create two separate assignments for each grade level with the same curriculum.
        
        After completing these steps, the curriculum will now be assigned to the grade level, and students enrolled in that grade level will follow the defined curriculum for their classes.
        
        Next steps: [Section 2.4: Creating sections and schedules](#create-sections-schedules)`,
        images: [
          "/manual-section-2-3-step-1.png",
          "/manual-section-2-3-step-2.png",
          "/manual-section-2-3-step-3.png",
          "/manual-section-2-3-step-4.png",
          "/manual-section-2-3-step-5.png",
          "/manual-section-2-3-step-6-1.png",
          "/manual-section-2-3-step-6-2.png",
        ],
        captions: [
          "Curriculum Management page in the sidebar",
          "",
          "Curriculum form",
          "",
          "Grade Curriculums page in the sidebar",
          "pic: grade cur page with New assignment button highlighted",
          "Assign curriculum to a grade level (pic: form example)",
        ],
        imageSizes: [
          "25%",
          { width: "80%", maxHeight: "480px" },
          { width: "80%", maxHeight: "480px" },
          { width: "80%", maxHeight: "480px" },
          { width: "80%", maxHeight: "480px" },
          { width: "80%", maxHeight: "480px" },
          { width: "80%", maxHeight: "480px" },
        ],
      },
      {
        id: "create-sections-schedules",
        number: "2.4",
        title: "Creating sections and schedules",
        body: `This section outlines the steps to create sections and schedules, which are essential for organizing students into classes and defining their academic timetables. The process includes creating a schedule with subject timetables, creating a section for student enrollment, and assigning the schedule to the section.
        
        Note: Before creating any sections, the user must first set up the curriculum, subjects, and teachers. Please refer to [Section 2.3: Managing subjects and curriculum](#manage-subjects-curriculum) and [Section 2.5: Managing teachers](#manage-teachers) on this manual for guidance on setting up these prerequisites. Once those are in place, you can proceed to create sections and schedules.
        
        Quick process summary: Create a schedule -> Create a section -> Assign schedule to section
        
        Creating a schedule:
        Step 1: Navigate to the Schedule Management page under the Academics section.
        [[IMG_0]]
        
        Step 2: Click the "+ Create New Schedule" button to open the schedule editor page. Name the schedule and create a timetable of the subjects. After finishing the timetable, click the "Save Schedule" button.
        [[IMG_1]][]
        [[IMG_2]][Image: Schedule Editor Page, key fields highlighted]
        [[IMG_3]][Image: Schedule Management Page, key fields highlighted]
        Step 3: After creating a schedule, you can edit or delete the schedule timetable later by clicking on the "Edit" or "Delete" buttons.

        Tip: If you cannot find the schedule you want to edit, use the search bar to filter the list by schedule name or ID.

        Creating a section:
        Step 1: Navigate to the Section Management page under the Academics section.
        [[IMG_0]][Image: Sidebar, Section Management highlighted]
        
        Step 2: Click the "+ Add New Section" button to open the section form. Fill in the required information and click "Add Section".
        [[IMG_1]][Image: Section Management Page, new section button highlighted]
        [[IMG_2]][Image: Section form modal]
        
        Step 3: After creating a section, the list of enrolled students in that section can be viewed by clicking the button in the "students" column. You can edit or delete the section information later by clicking on the "Edit" or "Delete" buttons.
        [[IMG_3]][Image: Section Management Page, key fields highlighted]

        Tip: If you cannot find the section you want to edit, use the search bar to filter the list by section name or ID.
        
        Assigning a schedule to a section:
        Step 1: Navigate to the Class Assignments page under the Academics section.
        [[IMG_0]][Image: Sidebar, Class Assignments highlighted]

        Step 2: Click the "+ New Assignment" button. Select the schedule, section, and teacher to assign them together. Click "Save Assignment" to complete the process. After creating a class assignment, it can be edited or deleted later by clicking on the "Edit" or "Delete" buttons.
        [[IMG_1]][Image: Class Assignments Page, new assignment button highlighted]
        
        Tip: A schedule can be assigned to multiple sections if needed. For example, if a schedule is used for both Section A and Section B, simply create two separate assignments for each section with the same schedule.
        
        After completing these steps, the section will now have a schedule assigned to it, and students enrolled in that section will follow the defined timetable for their classes.`,
        images: [
          "manual-section-2-4-step-1.png",
          "manual-section-2-4-step-2.png",
          "manual-section-2-4-step-3.png",
          "manual-section-2-4-step-4.png",
        ],
        captions: ["Image: Sidebar, Schedule Management highlighted", "Image: Schedule Management Page, create schedule button highlighted"],
        imageSizes: [],
      },
      {
        id: "manage-teachers",
        number: "2.5",
        title: "Managing teachers",
        body: `This section outlines the steps for managing teachers in the system, including adding new teachers and updating teacher information.
        
        Step 1: Navigate to the Teacher Management page under the Academics section.[[IMG_0]]
        Step 2: Click the "+ Add New Teacher" button to open the teacher form. Fill out the required fields (marked with a red asterisk) and any additional information as needed. Once all necessary information is entered, click the "Create Teacher" button to add the new teacher to the system. The new teacher will now be added to the system and can be found in the teacher list.
        Step 3: After creating a teacher, you can edit or delete the teacher information later by clicking on the "Edit" or "Delete" buttons in the teacher list.
        Tip: If you cannot find the teacher you want to edit, use the search bar to filter the list by teacher name or ID.[[IMG_1]]
        
        After adding teachers to the system, they can be assigned to sections and subjects in the Class Assignments page under the Academics section.
        
        See also: [Section 2.4: Class Assignments](#create-sections-schedules).`,
        images: ["/manual-section-2-5-step-1.png", "/manual-section-2-5-step-2.png"],
        captions: ["Teacher Management page in the sidebar", "Teacher Management Page with key sections highlighted"],
      },
      {
        id: "record-tuition-payments",
        number: "2.6",
        title: "Recording tuition payments",
        body: `Managing student financial records is crucial for maintaining accurate tuition and payment information. This includes recording new payments, updating existing payment records, and ensuring that all transactions are properly documented in the system.

        Important Note: All payment transactions must be recorded in order for it to be reflected in the student's financial records. Failure to record a payment will result in inaccurate financial data and may affect the student's outstanding balance and tuition reports.
        
        Quick process summary: Record new payment -> Fill out payment details -> Save payment record -> (Optional) Print receipt

        Step 1: Navigate to the Financials page.
        Step 2: Click the "+ Record New Payment" button to open the payment form.
        Step 3: Fill out the required fields (marked with a red asterisk) and any additional information as needed. Once all necessary information is entered, click the "Record Payment" button to save. The new payment will now be added to the system and can be found in the payment list along with a printable receipt.`,
      },
      {
        id: "encode-gwa",
        number: "2.7",
        title: "Encoding student GWA (general weighted average)",
        body: "Note where to enter GWA values, required reference data, and when updates should be reviewed.",
      },
      {
        id: "print-records",
        number: "2.8",
        title: "Printing records (reports, forms, etc.)",
        body: `Various records can be printed out for viewing or offline use, such as payment receipts, student lists, and enrollment reports. This section outlines the steps to access and print these records from the portal.

        Quick process summary: Navigate to the relevant page -> Use filters/search to find the record -> Click the print button/icon -> Follow browser print dialog instructions`,
      },
      {
        id: "archive-students",
        number: "2.9",
        title: "Archiving inactive students",
        body: "Explain when archiving is appropriate, what data is preserved, and how to restore records if needed.",
      },
    ],
  },
  {
    id: "account-preferences",
    number: "3",
    title: "Account & Preferences",
    description: "Basic account actions every user should know.",
    items: [
      {
        id: "reset-password",
        number: "3.1",
        title: "Resetting account password",
        body: `The portal provides one-time recovery codes for resetting passwords. Follow the steps below to reset your account password using a recovery code.

        Step 1: If you do not have a recovery code, kindly request an admin user to generate one for you.
        Note: Recovery codes are single-use and will expire after being used once. If you have already used a recovery code, you must request a new one from an admin user to reset your password again in the future.

        Step 2: On the login page, click the "Forgot Password?" link to initiate the password reset process.
        [[IMG_0]]
        Step 3: Enter the recovery code provided by the admin user and follow the prompts to create a new password for your account.
        [[IMG_1]]
        After successfully resetting your password, you can now log in to the portal using your new password. Please note that you cannot use the same recovery code twice. If you need to change your password again in the future, you must generate a new recovery code.
        
        Security Tip: Always have a valid recovery code available in case you forget your password. Contact an admin user to generate a new recovery code if needed. Keep your recovery codes secure and do not share them with unauthorized individuals.`,
        images: ["/manual-section-3-1-step-2.png", "/manual-section-3-1-step-3.png"],
        captions: ["The 'Forgot Password?' link on the login page.", "Enter the recovery code to set a new password."],
        
      },
      {
        id: "logging-out",
        number: "3.2",
        title: "Logging out",
        body: "Document how to safely end a session, especially on shared devices.",
      },
    ],
  },
  {
    id: "admin-operations",
    number: "4",
    title: "Administrator Operations",
    description: "Visible only to administrator users.",
    adminOnly: true,
    items: [
      {
        id: "add-new-users",
        number: "4.1",
        title: "Adding new users",
        body: "Document account creation, role assignment, access checks, and initial password handling.",
      },
      {
        id: "configure-tuition-plans",
        number: "4.2",
        title: "Configuring tuition plans",
        body: "Describe where tuition settings are maintained, what each field controls, and how changes affect billing.",
      },
      {
        id: "school-year-transition",
        number: "4.3",
        title: "Transitioning to the next school year",
        body: "Explain the rollover workflow, pre-checks, and validation steps before activating the next year.",
      },
    ],
  },
  {
    id: "troubleshooting",
    number: "5",
    title: "Troubleshooting & Common Errors",
    description: "Use these notes to resolve the most common support issues.",
    items: [
      {
        id: "page-wont-load",
        number: "5.1",
        title: "Page won’t load (clear cache, check browser)",
        body: "Add browser refresh, cache clearing, and supported browser steps here.",
      },
      {
        id: "session-expired",
        number: "5.2",
        title: "Session expired message",
        body: "Describe what the message means, how to sign back in, and when to contact support.",
      },
      {
        id: "form-wont-save",
        number: "5.3",
        title: "Form won’t save (validation errors)",
        body: "List validation checks, required fields, and how to interpret error messages.",
      },
      {
        id: "file-upload-fails",
        number: "5.4",
        title: "File upload fails (size or type issues)",
        body: `For problems with file uploads, consult this section for information on file size limits, supported formats, and step-by-step guide on troubleshooting.
        
        File formats: PDF, JPG, and PNG formats only.
        File size: Files larger than 16MB are not supported.
        
        Q: I have a Microsoft Word (.doc or .docx) document I need to upload. What should I do?
        A: Please convert your Word document to a PDF format before uploading. You can do this by opening the document in Microsoft Word and selecting "Save As" or "Export" and choosing PDF as the file format. Once you have the PDF version of your document, you can now upload it to the portal.
        
        Q: My file is larger than 16MB, but I need to upload it. What are my options?
        A: `,
      },
    ],
  },
];

export default async function UserManualPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  let userRole = "Admin";

  if (token) {
    try {
      const parsedToken = JSON.parse(token);
      userRole = parsedToken.role || userRole;
    } catch (error) {
      console.error("Failed to parse auth token:", error);
    }
  }

  const isAdmin = userRole === "Admin";
  const visibleSections = sections.filter(
    (section) => !section.adminOnly || isAdmin,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 text-slate-900">
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          User Manual
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Reference guide for common portal tasks, account actions, and
          troubleshooting.
        </p>
      </header>

      <HelpManualBrowser sections={visibleSections} isAdmin={isAdmin} />
    </div>
  );
}
