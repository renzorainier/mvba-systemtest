// import Sidebar from '@/components/Sidebar';

// export default function DashboardLayout({ children }) {
//   return (
//     <div className="flex bg-gray-100 min-h-screen">
//       {/* The Sidebar is fixed on the left */}
//       <Sidebar />

//       {/* The Page Content is pushed to the right */}
//       <main className="flex-1 ml-64">
//         {children}
//       </main>
//     </div>
//   );
// }
import Sidebar from '@/components/Sidebar';
import { SchoolYearProvider } from '@/components/SchoolYearContext';
import dbConnect from '@/lib/mongodb';
import SystemSettings from '@/models/SystemSettings';
import { cookies } from 'next/headers'; // 1. Import cookies from Next.js

// 2. Make the layout async so it can read cookies securely
export default async function DashboardLayout({ children }) {

  // 3. Read the secure 'auth_token' cookie
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  // 4. Extract the role (Default to Admin just in case)
  let userRole = 'Admin';

  if (token) {
    try {
      const parsedToken = JSON.parse(token);
      userRole = parsedToken.role; // This gets 'Admin', 'Registrar', or 'Cashier'
    } catch (error) {
      console.error("Failed to parse token:", error);
    }
  }

  await dbConnect();
  const settings = await SystemSettings.findOne({ key: 'tuition-breakdown' }).lean();
  const currentSchoolYear = String(settings?.currentSchoolYear || '2025-2026').trim();
  const rawDraftSchoolYear = settings?.draftSchoolYear ? String(settings.draftSchoolYear).trim() : null;
  // A draft equal to the active year is an invalid/legacy state — ignore it.
  const draftSchoolYear = rawDraftSchoolYear && rawDraftSchoolYear !== currentSchoolYear ? rawDraftSchoolYear : null;
  const selectedSchoolYear = String(cookieStore.get('selected_school_year')?.value || currentSchoolYear).trim();
  const isDraft = Boolean(draftSchoolYear) && selectedSchoolYear === draftSchoolYear;
  const isHistorical = selectedSchoolYear !== currentSchoolYear && !isDraft;

  return (
    <SchoolYearProvider value={{ currentSchoolYear, draftSchoolYear, selectedSchoolYear, isDraft, isHistorical }}>
      <div className="flex bg-white min-h-screen">

      {/* 5. Pass the userRole directly into the Sidebar as a prop! */}
      <Sidebar userRole={userRole} />

      {/* The Page Content is pushed to the right */}
      <main className="flex-1 ml-72 p-4 md:p-10">
        {isHistorical && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 shadow-sm">
            Historical school year selected: {selectedSchoolYear}. The portal is in read-only mode until you switch back to {currentSchoolYear}.
          </div>
        )}
        {isDraft && (
          <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-900 shadow-sm">
            You are editing the <span className="font-semibold">DRAFT</span> school year {selectedSchoolYear}. Changes here are isolated and do not affect the active school year {currentSchoolYear}.
          </div>
        )}
        {children}
      </main>
      </div>
    </SchoolYearProvider>
  );
}
