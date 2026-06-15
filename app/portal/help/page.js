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

        See also: [Section 2.2: Updating student information and records](#update-student-info) for instructions on how to update a student's information and records after enrollment.`,
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
        Step 2: Click the "+ New Curriculum" button to open the curriculum form.
        
        Step 3: Fill out the subjects by their name, separated by commas. For example, if the curriculum has three subjects: Math, Science, and English, enter "Math, Science, English" in the subjects field. After filling out the required fields, click the "Save Curriculum" button to add the new curriculum to the system.[[IMG_1]]
        Step 4: After creating a curriculum, it can be edited or deleted later by clicking on the "Edit" or "Delete" buttons in the curriculum list.
        Tip: If you cannot find the curriculum you want to edit, use the search bar to filter the list by curriculum name or ID.[[IMG_2]]
        Assigning a grade level to a curriculum:

        Step 5: Navigate to the Grade Curriculums page under the Academics section.[[IMG_3]]
        Step 6: Click the "+ New Assignment" button to open the assignment form. Select the curriculum and grade level to assign them together. Click "Save Assignment" to complete the process. After creating a curriculum assignment, it can be edited or deleted later by clicking on the "Edit" or "Delete" buttons in the curriculum assignment list.[[IMG_4]][[IMG_5]]
        Tip: A curriculum can be assigned to multiple grade levels if needed. For example, if a curriculum is used for both Grade 1 and Grade 2, simply create two separate assignments for each grade level with the same curriculum.
        
        After completing these steps, the curriculum will now be assigned to the grade level, and students enrolled in that grade level will follow the defined curriculum for their classes.
        
        Next steps: [Section 2.4: Creating sections and schedules](#create-sections-schedules) for further instructions on setting up classes and schedules before enrolling a student.`,
        images: [
          "/manual-section-2-3-step-1.png",
          "/manual-section-2-3-step-3.png",
          "/manual-section-2-3-step-4.png",
          "/manual-section-2-3-step-5.png",
          "/manual-section-2-3-step-6.png",
        ],
        captions: [
          "Curriculum Management page in the sidebar",
          "Adding a new curriculum record",
          "Edit, print, or delete curriculum records",
          "Grade Curriculums page in the sidebar",
          "Assign curriculum to a grade level",
        ],
        imageSizes: [
          "25%",
          { width: "80%", maxHeight: "480px" },
          { width: "80%", maxHeight: "480px" },
          "25%",
          "50%",
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
        [[IMG_1]]
        Step 3: After creating a schedule, you can edit or delete the schedule timetable later by clicking on the "Edit" or "Delete" buttons.
        Tip: If you cannot find the schedule you want to edit, use the search bar to filter the list by schedule name or ID.
        Creating a section:
        Step 1: Navigate to the Section Management page under the Academics section.
        [[IMG_2]]
        Step 2: Click the "+ Add New Section" button to open the section form. Fill in the required information and click "Add Section".
        [[IMG_3]]
        Step 3: After creating a section, the list of enrolled students in that section can be viewed by clicking the button in the "students" column. You can edit or delete the section information later by clicking on the "Edit" or "Delete" buttons.
        Tip: If you cannot find the section you want to edit, use the search bar to filter the list by section name or ID.
        Assigning a schedule to a section:
        Step 1: Navigate to the Class Assignments page under the Academics section.
        [[IMG_4]]
        Step 2: Click the "+ New Assignment" button. Select the schedule, section, and teacher to assign them together. Click "Save Assignment" to complete the process. After creating a class assignment, it can be edited or deleted later by clicking on the "Edit" or "Delete" buttons.
        [[IMG_5]]
        Tip: A schedule can be assigned to multiple sections if needed. For example, if a schedule is used for both Section A and Section B, simply create two separate assignments for each section with the same schedule.
        
        After completing these steps, the section will now have a schedule assigned to it, and students enrolled in that section will follow the defined timetable for their classes.`,
        images: [
          "/manual-section-2-4-1-step-1.png",
          "/manual-section-2-4-1-step-2.png",
          "/manual-section-2-4-2-step-1.png",
          "/manual-section-2-4-2-step-2.png",
          "/manual-section-2-4-3-step-1.png",
          "/manual-section-2-4-3-step-2.png",
        ],
        captions: [
          "Schedule Management page in the sidebar",
          "Schedule editor page with sample timetable",
          "Section Management page in the sidebar",
          "Adding a new section",
          "Class Assignments page in the sidebar",
          "Adding a new class assignment",
        ],
        imageSizes: [
          "25%",
          { width: "80%", maxHeight: "480px" },
          "25%",
          "50%",
          "25%",
          "50%",
        ],
      },
      {
        id: "manage-teachers",
        number: "2.5",
        title: "Managing teachers",
        body: `This section outlines the steps for managing teachers in the system, including adding new teachers and updating teacher information.
        
        Step 1: Navigate to the Teacher Management page under the Faculty section.[[IMG_0]]
        Step 2: Click the "+ Add New Teacher" button to open the teacher form. Fill out the required fields (marked with a red asterisk) and any additional information as needed. Once all necessary information is entered, click the "Create Teacher" button to add the new teacher to the system. The new teacher will now be added to the system and can be found in the teacher list.[[IMG_1]]
        Step 3: After creating a teacher, you can edit or delete the teacher information later by clicking on the "Edit" or "Delete" buttons in the teacher list.
        Tip: If you cannot find the teacher you want to edit, use the search bar to filter the list by teacher name or ID.
        
        After adding teachers to the system, they can be assigned to sections and subjects in the Class Assignments page under the Academics section.
        
        See also: [Section 2.4: Creating Sections and Schedules](#create-sections-schedules) for assigning teachers to classes.`,
        images: [
          "/manual-section-2-5-step-1.png",
          "/manual-section-2-5-step-2.png",
        ],
        captions: [
          "Teacher Management page in the sidebar",
          "Adding a new teacher",
        ],
        imageSizes: ["25%", "50%"],
      },
      {
        id: "record-tuition-payments",
        number: "2.6",
        title: "Recording tuition payments",
        body: `Managing student financial records is crucial for maintaining accurate tuition and payment information. This includes recording new payments, updating existing payment records, and ensuring that all transactions are properly documented in the system.

        Important Note: All payment transactions must be recorded in order for it to be reflected in the student's financial records. Failure to record a payment will result in inaccurate financial data and may affect the student's outstanding balance and tuition reports.
        
        Quick process summary: Record new payment -> Fill out payment details -> Save payment record -> (Optional) Print receipt

        Step 1: Navigate to the Financials page.[[IMG_0]]
        Step 2: Click the "+ Record New Payment" button to open the payment form.
        Step 3: Fill out the required fields (marked with a red asterisk) and any additional information as needed. Once all necessary information is entered, click the "Record Payment" button to save. The new payment will now be added to the system and can be found in the payment list along with a printable receipt.[[IMG_1]]
        Upon recording a payment, the student's financial records will be updated to reflect the new transaction. This includes adjustments to the total payments made, outstanding balance, and any relevant financial reports. It is important to ensure that all payment details are accurately entered to maintain correct financial records for each student.
        
        See also: [Section 2.9: Printing records](#print-records) for instructions on how to print payment receipts and other financial documents.`,
        images: [
          "/manual-section-2-6-step-1.png",
          "/manual-section-2-6-step-2.png",
        ],
        captions: [
          "Financials page in the sidebar",
          "Adding a new payment record",
        ],
        imageSizes: ["25%", { width: "80%", maxHeight: "480px" }],
      },
      {
        id: "adding-discounts",
        number: "2.7",
        title: "Adding discounts to student accounts",
        body: `This section outlines the steps to add discounts to a student's account in order to reduce their tuition fees.
        
        Step 1: Navigate to the Student Management page under the Enrollments & Students section.[[IMG_0]]
        Step 2: Click the "5% Discount" button. A confirmation dialog will appear, click "Ok" to apply the discount.
        
        Upon applying a discount, the student's outstanding balance will be automatically updated to reflect the new transaction.
        `,
        images: [
          "/manual-section-2-7-step-1.png",
          "/manual-section-2-7-step-2.png",
        ],
        captions: [
          "Student Management page in the sidebar",
          "Discount buttons",
        ],
        imageSizes: ["25%", { width: "80%", maxHeight: "480px" }],
      },
      {
        id: "encode-gwa",
        number: "2.8",
        title: "Encoding student GWA (general weighted average)",
        body: `This section outlines the steps to encode a student's General Weighted Average (GWA) in the system, which is used as a basis for promotion when transitioning to the next school year.
        
        Quick process summary: Search for student -> Enter GWA -> Save GWA record
        
        Step 1: Navigate to the Enrollments/Admission page under the Enrollments & Students section.[[IMG_0]]
        Step 2: Select a grade level and section (highlighted green) to view the class roster. Upon selecting a specific section, the page will display a list of students and their GWA.[[IMG_1]]
        Step 3: Enter the GWA and click the "Save section grades" button to save your changes.
        
        After saving, the student's GWA will now be recorded in the system. Students with a passing grade will be automatically promoted to the next grade level upon a school year rollover. It is important to ensure that the GWA is accurately entered for each student, as it may affect their promotion status.
        
        See also: [Section 4.3: Transitioning to the next school year](#school-year-transition) for instructions on how to transition to the next school year for the automatic migration of relevant records.`,
        images: [
          "/manual-section-2-8-step-1.png",
          "/manual-section-2-8-step-2.png",
        ],
        captions: [
          "Enrollments/Admission Page in the sidebar",
          "Filter by grade level and section to view students and GWA records",
        ],
        imageSizes: ["25%", { width: "80%", maxHeight: "480px" }],
      },
      {
        id: "print-records",
        number: "2.9",
        title: "Printing records (reports, forms, etc.)",
        body: `The system can generate printable documents of records for viewing or offline use, such as payment receipts, curriculum subjects, and schedule timetables. This section outlines the steps to access and print these records from the portal.
        
        The following records can be printed from the system:
        1. Payment Receipts: After recording a payment, a printable receipt will be available in the payment list. To print the receipt, simply click the "Receipt" button to the corresponding payment record.[[IMG_0]]
        2. Curriculum Subjects: To print the list of subjects under a specific curriculum, navigate to the Curriculum Management page under the Academics section. Find the curriculum you want to print and click the "Print" button.[[IMG_1]]
        3. Schedule Timetables: To print the timetable for a specific schedule, navigate to the Schedule Management page under the Academics section. Find the schedule you want to print and click the three dots to open the schedule editor. A print button can be found at the top-right corner of the editor.[[IMG_2]]
        After clicking the corresponding print button for the record you wish to print, a print preview will open, where you can press the "Print" button at the top-right corner of the page to open the print dialog.`,
      },
      {
        id: "archive-students",
        number: "2.10",
        title: "Archiving inactive students",
        body: `Archiving students who are no longer actively enrolled is essential for maintaining an organized student portal, while preserving historical records for reference. organizing the student database.  as those who have graduated, transferred, or withdrawn. This section outlines the steps to archive inactive students in the system, which helps keep the student management interface organized while preserving historical records for reference.
        
        Archiving a student:
        Step 1: Navigate to the Student Management page under the Enrollments & Students section.[[IMG_0]]
        Step 2: Click the student ID to open the student profile of the student you wish to archive.
        Step 3: Press the archive button at the bottom of the form. A confirmation dialog will appear, click "Ok" to archive the student.[[IMG_1]]
        
        Restoring an archived student:
        Step 1: Navigate to the Archived Students page under the Enrollments & Students section.[[IMG_2]]
        Step 2: Find the archived student you wish to restore and click the restore button. A confirmation dialog will appear, click "Ok" to restore the student back to active status.`,
        images: [
          "/manual-section-2-10-step-1.png",
          "/manual-section-2-10-step-3.png",
          "/manual-section-2-10-step-1-2.png",
        ],
        captions: ["Student Management page in the sidebar", "Archive button in the student profile", "Archived Students page in the sidebar"],
        imageSizes: ["30%", { width: "60%", maxHeight: "480px" }, "30%"],
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
        
        Step 3: Enter the recovery code provided by the admin user and follow the prompts to create a new password for your account.
        [[IMG_1]]
        After successfully resetting your password, you can now log in to the portal using your new password. Please note that you cannot use the same recovery code twice. If you need to change your password again in the future, you must generate a new recovery code.
        
        Security Tip: Always have a valid recovery code available in case you forget your password. Contact an admin user to generate a new recovery code if needed. Keep your recovery codes secure and do not share them with unauthorized individuals.`,
        images: [
          "/manual-section-3-1-step-2.png",
          "/manual-section-3-1-step-3.png",
        ],
        captions: [
          "The 'Forgot Password?' link on the login page.",
          "Enter the recovery code to set a new password.",
        ],
        imageSizes: ["50%", "40%"],
      },
      {
        id: "logging-out",
        number: "3.2",
        title: "Logging out",
        body: `To avoid unauthorized access to your account, it is important to log out of the portal when you are finished using it. To log out, click the "Log Out" link in the bottom-left corner of the page.
        For added security, the system also has an automatic logout feature that will log you out after 15 minutes of inactivity. If you are logged out due to inactivity, simply log back in to continue using the portal.[[IMG_1]]`,
        images: ["/manual-section-3-2-1.png", "/manual-section-3-2-2.png"],
        captions: [
          "The 'Log Out' button, located in the bottom-left corner of the page.",
          "Inactivity notification.",
        ],
        imageSizes: ["25%", "50%"],
      },
    ],
  },
  {
    id: "admin-operations",
    number: "4",
    title: "Administrator Operations",
    description: "Admin Features - Visible only to administrator users.",
    adminOnly: true,
    items: [
      {
        id: "manage-users",
        number: "4.1",
        title: "Managing users",
        body: `This section outlines the steps for managing user accounts in the system, including creating new users, deactivating existing users, and generating one-time recovery codes.

        All user management actions can be performed in the Account Management page under the Administration and Support section. You can navigate to the page using the sidebar menu.[[IMG_0]]
        Adding a new user:
        Step 1: Click the "+ Create Account" button.
        Step 2: Fill out the required fields (marked with a red asterisk) and click the "Create Account" button to add the new user to the system.[[IMG_1]]
        Deactivating an existing user:
        Step 1: Find the user you want to deactivate in the user list.
        Step 2: Click the "Deactivate" button to flag the account as deactivated. Once a user is deactivated, they will no longer be able to log in to the portal. If you need to reactivate the user in the future, simply click the "Activate" button to restore their access.
        
        Generating a one-time recovery code:
        Step 1: Find the user you want to generate a recovery code for in the user list.
        Step 2: Click the "Generate Code" or "Regenerate" button to create a new one-time recovery code for that user. The generated recovery code will be displayed in a pop-up modal. Make sure to copy and provide the recovery code to the user, as it will only be shown once and cannot be retrieved again after closing the modal.
        `,
        images: [
          "/manual-section-4-1-step-1.png",
          "/manual-section-4-1-step-2.png",
          "/manual-section-4-1-step-3.png",
          "/manual-section-4-1-step-4.png",
        ],
        captions: [
          "Account Management page in the sidebar",
          "Creating a new user",
          "Deactivating a user",
          "Generating a recovery code",
        ],
        imageSizes: ["35%", "35%"],
      },
      {
        id: "configure-tuition-plans",
        number: "4.2",
        title: "Configuring tuition plans",
        body: `This section outlines the steps to configure tuition plans for the school year, including creating new tuition plans, defining payment schedules, and assigning tuition plans to grade levels.
        
        All tuition configuration actions can be performed in the System Settings page under the Administration and Support section. You can navigate to the page using the sidebar menu.[[IMG_0]]
        
        Managing tuition plans:
        Step 1: Click the "Edit Tuition Plans" button to start editing.
        Step 2: When adding a new grade block, click the "Add Grade Block" button at the bottom of the page and enter all necessary information. When updating an existing grade block, simply update the fields.[[IMG_3]]
        Step 3: After filing out the form, click the "Save Changes" button at the top of the page. A password confirmation prompt will appear to confirm the changes. Enter your password and click "Confirm" to finalize the changes.
        `,
        images: [
          "/manual-settings-page.png",
          "/manual-section-4-2-step-1.png",
          "/manual-section-4-2-step-2-1.png",
          "/manual-section-4-2-step-2-2.png",
          "/manual-section-4-2-step-3.png",
        ],
        captions: [
          "System Settings page in the sidebar",
          "Editing tuition plans",
          "Adding a new grade block",
          "Sample tuition plan form",
          "Saving changes to tuition plans",
        ],
        imageSizes: ["35%", "25%", "25%", "45%"],
      },
      {
        id: "school-year-transition",
        number: "4.3",
        title: "Transitioning to the next school year",
        body: `This section outlines the steps to transition to the next school year, which includes rolling over student records.
        
        Step 1: Navigate to the System Settings page under the Administration and Support section.[[IMG_0]]
        Step 2: Click the "Open School Year Rollover" button to open the school year transition page.[[IMG_2]]
        Step 3: Click the "Execute Rollover" button to start the transition process. After the process is complete, you will be automatically redirected to the new school year dashboard.
        `,
        images: [
          "/manual-settings-page.png",
          "/manual-section-4-3-step-2.png",
          "/manual-section-4-3-step-3.png",
          "/manual-section-4-3-step-4.png",
        ],
        captions: [
          "System Settings page in the sidebar",
          "Opening the school year transition page",
          "School year transition page, with summary of student outcomes",
          "Executing the school year transition",
        ],
        imageSizes: ["35%", "25%", { width: "90%", maxHeight: "480px" }, "45%"],
      },
      {
        id: "data-backup",
        number: "4.5",
        title: "Data backup and export",
        body: `This section outlines the steps to create and restore backups of all data from the system, including creating manual backups, scheduling automatic backups, and restoring data from an exported backup of the system.
       
        Data and backup management features can be found in the System Settings page under the Administration and Support section. Click the "Backup & Restore" button to open the backup page.[[IMG_0]]
        To create a manual backup, click the "Download file" to save a local copy. To save a copy directly to the server, click the "Back up to server now" button.
        
        To restore data from a backup, click the "Choose file" button to select the backup file, select a restore mode (Replace or Merge), then click the "Restore" button to start the restore process.
        • Replace mode: This will replace all existing data in the system with the data from the backup file. Use this option if you want to completely overwrite the current data with the backup data.
        • Merge mode: This will merge the data from the backup file with the existing data in the system. Use this option if you want to add the backup data to the current data without deleting any existing records.

        To schedule automatic backups, select the frequency (Off, Biweekly, Monthly) and the amount of copies to keep, then click the "Save schedule" button to set up a backup schedule.
        `,
        images: [
          "/manual-section-4-5-step-1-1.png",
          "/manual-section-4-5-step-1-2.png",
        ],
        captions: [
          "Navigating to the Backup & Restore page",
          "Backup & Restore page",
        ],
      },
    ],
  },
  {
    id: "troubleshooting",
    number: "5",
    title: "Troubleshooting",
    description: "Use these notes to resolve the most common support issues.",
    items: [
      {
        id: "page-wont-load",
        number: "5.1",
        title: "Page won’t load",
        body: `If a page appears blank, fails to render, or loads very slowly, try these steps in order:

        1. Refresh the page: Press Ctrl+F5 (Windows) or Cmd+Shift+R (Mac) to force a full reload.
        2. Clear browser cache: Open your browser settings and clear cached images and files, then reload.
        3. Try a private/incognito window: This disables most extensions and cached state.
        4. Supported browsers: Use the latest stable version of Chrome, Edge, or Firefox for the best compatibility.
        5. Check network: Confirm you have a stable internet connection and no VPN or firewall is blocking requests.
        6. Check the console: Open DevTools (F12) and look for errors. Take a screenshot or copy the error text when reaching out for technical help.`,
      },
      {
        id: "form-wont-save",
        number: "5.2",
        title: "Form won’t save",
        body: `When a form fails to save, it may be caused by several factors. Check the following:

        - Required fields: Fields marked with a red asterisk must be filled in.
        - Field formats: Ensure emails, phone numbers, dates, and numeric fields match the expected format.
        - Attachments: Make sure any attached files meet the size and type limits (see [Section 5.3: File upload](#file-upload-fails)).
        - Special characters: Unsupported characters can sometimes cause errors. When encoding special symbols, try exploring for alternatives first.

        Troubleshooting steps:
        1. Fix the highlighted form errors and retry saving.
        2. Open DevTools (F12) and check the Network tab for the failing request.Take a screenshot or copy the response body when reaching out for technical help.
        3. Try logging in to a different browser or an incognito window.
        `,
      },
      {
        id: "file-upload-fails",
        number: "5.3",
        title: "File upload fails (size or type issues)",
        body: `For problems with file uploads, consult this section for information on supported formats, limits, and common workarounds.

        Supported formats: PDF, JPG, PNG
        Maximum file size: 16MB

        Q: I have a Microsoft Word (.doc or .docx) document I need to upload. What should I do?
        A: Convert the document to PDF before uploading. In Microsoft Word choose "Save As" or "Export" → PDF. Most word processors offer the same export option.

        Q: My file is larger than 16MB, but I need to upload it. What are my options?
        A: Reduce the file size using an external tool or website. After reducing the size, try uploading again.
        
        Q: I tried uploading but received a "file type not allowed" error. What now?
        A: Convert the file to PDF, JPG, or PNG if applicable.

        Q: Uploads fail intermittently or time out.
        A: Intermittent upload errors or timeouts are usually caused by an unstable network connection. Check your network connection and try uploading again.`
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
