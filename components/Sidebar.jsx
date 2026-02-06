"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Wallet,
  School,
  Settings,
  HelpCircle,
  LogOut
} from 'lucide-react';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname(); // Hook to get current URL for highlighting

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.refresh();
    router.push('/');
  };

  // Helper to check if a link is active
  const isActive = (path) => pathname === path || pathname.startsWith(`${path}/`);

  const menuItems = [
    { name: 'Dashboard', href: '/portal/dashboard', icon: LayoutDashboard },
    { name: 'Student Management', href: '/portal/students', icon: Users },
    { name: 'Financials', href: '/portal/financials', icon: Wallet },
    { name: 'Class & Section', href: '/portal/classes', icon: School },
    { name: 'System Settings', href: '/portal/system', icon: Settings },
    { name: 'Help & Manual', href: '/portal/help', icon: HelpCircle },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 shadow-sm z-50">

      {/* 1. BRAND HEADER (Dark Blue) */}
      <div className="h-16 bg-blue-900 flex items-center px-6 gap-3">
        {/* Placeholder for School Logo - You can replace src with your actual logo file */}
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-900 font-bold text-xs">
          Logo
        </div>
        <h1 className="text-white font-bold text-lg tracking-wide">Admin Portal</h1>
      </div>

      {/* 2. NAVIGATION MENU */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                active
                  ? 'bg-blue-50 text-blue-700 font-medium' // Active Style
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900' // Inactive Style
              }`}
            >
              <item.icon size={20} className={active ? "text-blue-700" : "text-gray-500"} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* 3. FOOTER (Logout) */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full text-left p-3 text-red-500 hover:bg-red-50 rounded-lg transition-all font-medium"
        >
          <LogOut size={20} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
