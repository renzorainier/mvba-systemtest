import { cookies } from 'next/headers';

const sections = [
  {
    id: 'quick-start',
    number: '1',
    title: 'Quick Start',
    description: 'Get oriented before you begin using the portal.',
    items: [
      {
        id: 'system-requirements',
        number: '1.1',
        title: 'System requirements & supported browsers',
        body: 'List supported browsers, minimum screen size, internet expectations, and any device notes here.',
      },
      {
        id: 'dashboard-overview',
        number: '1.2',
        title: 'Understanding your dashboard',
        body: 'Describe where announcements, shortcuts, school-year status, and key indicators appear.',
      },
    ],
  },
  {
    id: 'everyday-tasks',
    number: '2',
    title: 'Everyday Tasks',
    description: 'Repeatable workflows that most users perform day to day.',
    items: [
      {
        id: 'enrolling-student',
        number: '2.1',
        title: 'Enrolling a student',
        body: 'Add the step-by-step enrollment flow, required fields, and any validation notes.',
      },
      {
        id: 'update-student-info',
        number: '2.2',
        title: 'Updating student information and records',
        body: 'Explain how to edit profile data, save changes, and handle archived records safely.',
      },
      {
        id: 'create-sections-schedules',
        number: '2.3',
        title: 'Creating sections and schedules',
        body: 'Document section creation, schedule assignment, conflict checking, and follow-up review.',
      },
      {
        id: 'manage-subjects-curriculum',
        number: '2.4',
        title: 'Managing subjects and curriculum',
        body: 'Describe curriculum setup, subject assignment, and grade-level mapping practices.',
      },
      {
        id: 'record-tuition-payments',
        number: '2.5',
        title: 'Recording tuition payments',
        body: 'Outline how to encode payments, verify balances, and issue receipts or confirmations.',
      },
      {
        id: 'encode-gwa',
        number: '2.6',
        title: 'Encoding student GWA (general weighted average)',
        body: 'Note where to enter GWA values, required reference data, and when updates should be reviewed.',
      },
      {
        id: 'print-records',
        number: '2.7',
        title: 'Printing records (reports, forms, etc.)',
        body: 'List the available printouts, the filters to apply, and any browser print tips.',
      },
      {
        id: 'archive-students',
        number: '2.8',
        title: 'Archiving inactive students',
        body: 'Explain when archiving is appropriate, what data is preserved, and how to restore records if needed.',
      },
    ],
  },
  {
    id: 'account-preferences',
    number: '3',
    title: 'Account & Preferences',
    description: 'Basic account actions every user should know.',
    items: [
      {
        id: 'reset-password',
        number: '3.1',
        title: 'Resetting account password',
        body: 'Describe the password reset flow, verification steps, and password requirements.',
      },
      {
        id: 'logging-out',
        number: '3.2',
        title: 'Logging out',
        body: 'Document how to safely end a session, especially on shared devices.',
      },
    ],
  },
  {
    id: 'admin-operations',
    number: '4',
    title: 'Administrator Operations',
    description: 'Visible only to administrator users.',
    adminOnly: true,
    items: [
      {
        id: 'add-new-users',
        number: '4.1',
        title: 'Adding new users',
        body: 'Document account creation, role assignment, access checks, and initial password handling.',
      },
      {
        id: 'configure-tuition-plans',
        number: '4.2',
        title: 'Configuring tuition plans',
        body: 'Describe where tuition settings are maintained, what each field controls, and how changes affect billing.',
      },
      {
        id: 'school-year-transition',
        number: '4.3',
        title: 'Transitioning to the next school year',
        body: 'Explain the rollover workflow, pre-checks, and validation steps before activating the next year.',
      },
    ],
  },
  {
    id: 'troubleshooting',
    number: '5',
    title: 'Troubleshooting & Common Errors',
    description: 'Use these notes to resolve the most common support issues.',
    items: [
      {
        id: 'page-wont-load',
        number: '5.1',
        title: 'Page won’t load (clear cache, check browser)',
        body: 'Add browser refresh, cache clearing, and supported browser steps here.',
      },
      {
        id: 'session-expired',
        number: '5.2',
        title: 'Session expired message',
        body: 'Describe what the message means, how to sign back in, and when to contact support.',
      },
      {
        id: 'form-wont-save',
        number: '5.3',
        title: 'Form won’t save (validation errors)',
        body: 'List validation checks, required fields, and how to interpret error messages.',
      },
      {
        id: 'file-upload-fails',
        number: '5.4',
        title: 'File upload fails (size or type issues)',
        body: 'Document file size limits, allowed file types, and recommended retry steps.',
      },
    ],
  },
];

function SectionNavItem({ item, level = 0 }) {
  return (
    <li>
      <a
        href={`#${item.id}`}
        className={`block rounded-xl border border-transparent px-3 py-2 text-sm transition-colors hover:border-blue-100 hover:bg-blue-50 hover:text-blue-900 ${
          level === 0 ? 'font-medium text-slate-800' : 'text-slate-600'
        }`}
      >
        <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{item.number}</span>
        <span className="mt-1 block leading-snug">{item.title}</span>
      </a>
    </li>
  );
}

export default async function UserManualPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  let userRole = 'Admin';

  if (token) {
    try {
      const parsedToken = JSON.parse(token);
      userRole = parsedToken.role || userRole;
    } catch (error) {
      console.error('Failed to parse auth token:', error);
    }
  }

  const isAdmin = userRole === 'Admin';
  const visibleSections = sections.filter((section) => !section.adminOnly || isAdmin);

  return (
    <div className="mx-auto max-w-6xl space-y-8 text-slate-900">
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">User Manual</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Reference guide for common portal tasks, account actions, administrator operations, and troubleshooting.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <main className="space-y-10 lg:order-1">
          {visibleSections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-8 border-b border-slate-200 pb-8">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Section {section.number}</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{section.title}</h2>
                </div>
                {section.adminOnly && (
                  <span className="inline-flex w-fit rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600">
                    Admin only
                  </span>
                )}
              </div>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{section.description}</p>

              <div className="mt-6 space-y-6">
                {section.items.map((item) => (
                  <article key={item.id} id={item.id} className="scroll-mt-8 border-l-2 border-slate-200 pl-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{item.number}</p>
                    <h3 className="mt-1 text-base font-semibold text-slate-950">{item.title}</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{item.body}</p>
                  </article>
                ))}
              </div>
            </section>
          ))}

          <section className="border-t border-slate-200 pt-6">
            <h2 className="text-xl font-semibold text-slate-950">Next steps</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Replace the placeholder guidance in each subsection with finalized workflow steps, screenshots, and policy notes.
            </p>
          </section>
        </main>

        <aside className="lg:sticky lg:top-8 lg:self-start lg:order-2">
          <div className="space-y-4">
            <div className="sticky top-4 z-10 border-b border-slate-200 bg-white pb-4">
              <label htmlFor="manual-search" className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Search manual
              </label>
              <input
                id="manual-search"
                type="search"
                placeholder="Search sections, tasks, or errors"
                className="mt-2 w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-0"
              />
            </div>

            <div className="mt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Contents</p>
              <nav aria-label="User manual sections" className="space-y-2">
                {visibleSections.map((section, index) => (
                  <details key={section.id} className="group border-b border-slate-200 pb-2" open={index === 0}>
                    <summary className="cursor-pointer list-none py-1 outline-none transition hover:text-slate-950">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{section.number}</span>
                          <span className="mt-1 block text-sm font-medium text-slate-800">{section.title}</span>
                        </div>
                        <span className="mt-1 text-slate-400 transition-transform group-open:rotate-180">⌄</span>
                      </div>
                    </summary>

                    <div className="mt-2 space-y-2 pl-0">
                      <p className="text-xs leading-5 text-slate-500">{section.description}</p>
                      <ol className="space-y-1">
                        {section.items.map((item) => (
                          <SectionNavItem key={item.id} item={item} />
                        ))}
                      </ol>
                    </div>
                  </details>
                ))}
              </nav>

              {!isAdmin && (
                <div className="mt-4 border-t border-slate-200 pt-3 text-sm text-slate-600">
                  Admin-only operations are hidden for your current role.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
