"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
// 1. Add 'Calendar' to your imports
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Wallet, 
  School, 
  Settings, 
  HelpCircle, 
  LogOut, 
  Calendar,
  Layers3,
  Archive,
  BookOpen,
  LibraryBig
} from 'lucide-react';

export default function Sidebar({ userRole = 'Admin' }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.refresh();
    router.push('/');
  };

  const isActive = (path, exact = false) => {
    if (exact) {
      return pathname === path;
    }

    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const menuItems = [
    { name: 'Dashboard', href: '/portal/dashboard', icon: LayoutDashboard, allowedRoles: ['Admin', 'Registrar', 'Cashier'] },
    { name: 'Student Management', href: '/portal/students', icon: Users, allowedRoles: ['Admin', 'Registrar'] },
    { name: 'Archived Students', href: '/portal/students/archived', icon: Archive, allowedRoles: ['Admin', 'Registrar'] },
    { name: 'Enrollments/Admission', href: '/portal/enrollments', icon: Users, allowedRoles: ['Admin', 'Registrar'] },
    { name: 'Teacher Management', href: '/portal/teachers', icon: GraduationCap, allowedRoles: ['Admin', 'Registrar'] },
    { name: 'Curriculum Management', href: '/portal/curriculums', icon: BookOpen, allowedRoles: ['Admin', 'Registrar'] },
    { name: 'Grade Curriculums', href: '/portal/curriculum-assignments', icon: LibraryBig, allowedRoles: ['Admin', 'Registrar'] },
    { name: 'Section Management', href: '/portal/sections', icon: School, allowedRoles: ['Admin', 'Registrar'] },
    { name: 'Class Assignments', href: '/portal/classes', icon: Layers3, allowedRoles: ['Admin', 'Registrar'] },
    { name: 'Schedule Management', href: '/portal/schedules', icon: Calendar, allowedRoles: ['Admin', 'Registrar'] },
    { name: 'Financials', href: '/portal/financials', icon: Wallet, allowedRoles: ['Admin', 'Cashier'] },
    { name: 'System Settings', href: '/portal/system', icon: Settings, allowedRoles: ['Admin'] },
    { name: 'Help & Manual', href: '/portal/help', icon: HelpCircle, allowedRoles: ['Admin', 'Registrar', 'Cashier'] },
  ];

  const visibleMenuItems = menuItems.filter(item => item.allowedRoles.includes(userRole));

  return (
    <aside className="w-72 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 shadow-sm z-50">
      <div className="h-16 bg-blue-900 flex items-center px-6 gap-4">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-900 font-bold text-sm">
            MVBA
        </div>
        <h1 className="text-white font-bold text-xl tracking-wide">
          {userRole} Portal
        </h1>
      </div>

      <nav className="flex-1 p-6 space-y-3 overflow-y-auto">
        {visibleMenuItems.map((item) => {
          const active = isActive(item.href, item.href === '/portal/students');
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`flex items-center gap-4 py-3 px-3 rounded-md transition-all duration-200 ${active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                <item.icon size={22} className={active ? "text-blue-700" : "text-gray-500"} />
              </div>
              <span className="text-base truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button onClick={handleLogout} className="flex items-center gap-3 w-full text-left py-3 px-3 text-red-500 hover:bg-red-50 rounded-md transition-all font-medium">
          <LogOut size={22} />
          <span className="text-base">Log Out</span>
        </button>
      </div>
    </aside>
  );
}