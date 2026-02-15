// "use client";
// import Link from 'next/link';
// import { usePathname, useRouter } from 'next/navigation';
// import {
//   LayoutDashboard,
//   Users,
//   GraduationCap, // 1. Imported new icon
//   Wallet,
//   School,
//   Settings,
//   HelpCircle,
//   LogOut
// } from 'lucide-react';

// export default function Sidebar() {
//   const router = useRouter();
//   const pathname = usePathname();

//   const handleLogout = async () => {
//     // In a real app, ensure this endpoint exists
//     await fetch('/api/logout', { method: 'POST' });
//     router.refresh();
//     router.push('/');
//   };

//   const isActive = (path) => pathname === path || pathname.startsWith(`${path}/`);

//   const menuItems = [
//     { name: 'Dashboard', href: '/portal/dashboard', icon: LayoutDashboard },
//     { name: 'Student Management', href: '/portal/students', icon: Users },
//     // 2. Added Teacher Management here
//     { name: 'Teacher Management', href: '/portal/teachers', icon: GraduationCap },
//     { name: 'Financials', href: '/portal/financials', icon: Wallet },
//     { name: 'Class & Section', href: '/portal/classes', icon: School },
//     { name: 'System Settings', href: '/portal/system', icon: Settings },
//     { name: 'Help & Manual', href: '/portal/help', icon: HelpCircle },
//   ];

//   return (
//     <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 shadow-sm z-50">

//       {/* 1. BRAND HEADER */}
//       <div className="h-16 bg-blue-900 flex items-center px-6 gap-3">
//         <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-900 font-bold text-xs">
//           Logo
//         </div>
//         <h1 className="text-white font-bold text-lg tracking-wide">Admin Portal</h1>
//       </div>

//       {/* 2. NAVIGATION MENU */}
//       <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
//         {menuItems.map((item) => {
//           const active = isActive(item.href);
//           return (
//             <Link
//               key={item.href}
//               href={item.href}
//               className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
//                 active
//                   ? 'bg-blue-50 text-blue-700 font-medium'
//                   : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
//               }`}
//             >
//               <item.icon size={20} className={active ? "text-blue-700" : "text-gray-500"} />
//               <span>{item.name}</span>
//             </Link>
//           );
//         })}
//       </nav>

//       {/* 3. FOOTER */}
//       <div className="p-4 border-t border-gray-100">
//         <button
//           onClick={handleLogout}
//           className="flex items-center gap-3 w-full text-left p-3 text-red-500 hover:bg-red-50 rounded-lg transition-all font-medium"
//         >
//           <LogOut size={20} />
//           <span>Log Out</span>
//         </button>
//       </div>
//     </aside>
//   );
// }


"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, GraduationCap, Wallet, School, Settings, HelpCircle, LogOut } from 'lucide-react';

// Notice we are passing userRole as a prop now
export default function Sidebar({ userRole = 'Admin' }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.refresh();
    router.push('/');
  };

  const isActive = (path) => pathname === path || pathname.startsWith(`${path}/`);

  // We attach 'allowedRoles' to every menu item
  const menuItems = [
    { name: 'Dashboard', href: '/portal/dashboard', icon: LayoutDashboard, allowedRoles: ['Admin', 'Registrar', 'Cashier'] },
    { name: 'Student Management', href: '/portal/students', icon: Users, allowedRoles: ['Admin', 'Registrar'] },
    { name: 'Teacher Management', href: '/portal/teachers', icon: GraduationCap, allowedRoles: ['Admin', 'Registrar'] },
    { name: 'Class & Section', href: '/portal/classes', icon: School, allowedRoles: ['Admin', 'Registrar'] },
    { name: 'Financials', href: '/portal/financials', icon: Wallet, allowedRoles: ['Admin', 'Cashier'] },
    { name: 'System Settings', href: '/portal/system', icon: Settings, allowedRoles: ['Admin'] },
    { name: 'Help & Manual', href: '/portal/help', icon: HelpCircle, allowedRoles: ['Admin', 'Registrar', 'Cashier'] },
  ];

  // Filter the menu so they only see what they are allowed to see
  const visibleMenuItems = menuItems.filter(item => item.allowedRoles.includes(userRole));

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 shadow-sm z-50">
{/* BRAND HEADER */}
      <div className="h-16 bg-blue-900 flex items-center px-6 gap-3">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-900 font-bold text-xs">
          Logo
        </div>
        <h1 className="text-white font-bold text-lg tracking-wide">
          {userRole} Portal
        </h1>
      </div>

      {/* NAVIGATION MENU */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {/* We map over visibleMenuItems instead of all menuItems */}
        {visibleMenuItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
              <item.icon size={20} className={active ? "text-blue-700" : "text-gray-500"} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* FOOTER */}
      <div className="p-4 border-t border-gray-100">
        {/* <div className="px-3 pb-3 mb-3 border-b border-gray-100">
           <p className="text-xs text-gray-400 font-semibold uppercase">Logged in as</p>
           <p className="text-sm text-gray-700 font-bold">{userRole}</p>
        </div> */}
        <button onClick={handleLogout} className="flex items-center gap-3 w-full text-left p-3 text-red-500 hover:bg-red-50 rounded-lg transition-all font-medium">
          <LogOut size={20} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
