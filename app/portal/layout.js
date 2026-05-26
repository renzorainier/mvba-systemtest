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
  const selectedSchoolYear = String(cookieStore.get('selected_school_year')?.value || currentSchoolYear).trim();
  const isHistorical = selectedSchoolYear !== currentSchoolYear;

  return (
    <SchoolYearProvider value={{ currentSchoolYear, selectedSchoolYear, isHistorical }}>
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
        {children}
      </main>
      </div>
    </SchoolYearProvider>
  );
}
