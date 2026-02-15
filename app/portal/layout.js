// import Sidebar from '@/components/Sidebar';

// export default function DashboardLayout({ children }) {
//   return (
//     <div className="flex bg-gray-100 min-h-screen">
//       {/* The Sidebar is fixed on the left */}
//       <Sidebar />

//       {/* The Page Content is pushed to the right */}
//       <main className="flex-1 ml-64 p-8">
//         {children}
//       </main>
//     </div>
//   );
// }
import Sidebar from '@/components/Sidebar';
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

  return (
    <div className="flex bg-gray-100 min-h-screen">

      {/* 5. Pass the userRole directly into the Sidebar as a prop! */}
      <Sidebar userRole={userRole} />

      {/* The Page Content is pushed to the right */}
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}
