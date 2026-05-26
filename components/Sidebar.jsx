"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [openGroups, setOpenGroups] = useState({});
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const idleLogoutTimerRef = useRef(null);
  const idleWarningTimerRef = useRef(null);
  const isAdmin = userRole === 'Admin';

  const clearIdleTimers = useCallback(() => {
    if (idleWarningTimerRef.current) {
      clearTimeout(idleWarningTimerRef.current);
      idleWarningTimerRef.current = null;
    }

    if (idleLogoutTimerRef.current) {
      clearTimeout(idleLogoutTimerRef.current);
      idleLogoutTimerRef.current = null;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    clearIdleTimers();
    setShowIdleWarning(false);
    await fetch('/api/logout', { method: 'POST' });
    router.refresh();
    router.push('/');
  }, [clearIdleTimers, router]);

  const scheduleIdleLogout = useCallback(() => {
    if (!isAdmin) {
      return;
    }

    clearIdleTimers();
    idleWarningTimerRef.current = setTimeout(() => {
      setShowIdleWarning(true);
      idleLogoutTimerRef.current = setTimeout(() => {
        handleLogout();
      }, 10000);
    }, 60000);
  }, [clearIdleTimers, handleLogout, isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      clearIdleTimers();
      return undefined;
    }

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const resetIdleTimer = () => {
      if (showIdleWarning) {
        return;
      }

      scheduleIdleLogout();
    };

    scheduleIdleLogout();

    activityEvents.forEach((eventName) => window.addEventListener(eventName, resetIdleTimer, { passive: true }));

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, resetIdleTimer));
      clearIdleTimers();
    };
  }, [clearIdleTimers, isAdmin, scheduleIdleLogout, showIdleWarning]);

  const staySignedIn = () => {
    setShowIdleWarning(false);
    scheduleIdleLogout();
  };

  const isActive = (path, exact = false) => {
    if (exact) {
      return pathname === path;
    }

    return pathname === path || pathname.startsWith(`${path}/`);
  };

  // Grouped menu structure to support hover dropdowns
  const menuGroups = [
    {
      title: null,
      items: [
        { name: 'Dashboard', href: '/portal/dashboard', icon: LayoutDashboard, allowedRoles: ['Admin', 'Registrar', 'Cashier'] },
      ],
    },

    {
      title: 'Academics',
      children: [
        { name: 'Curriculum Management', href: '/portal/curriculums', icon: BookOpen, allowedRoles: ['Admin', 'Registrar'] },
        { name: 'Grade Curriculums', href: '/portal/curriculum-assignments', icon: LibraryBig, allowedRoles: ['Admin', 'Registrar'] },
        { name: 'Section Management', href: '/portal/sections', icon: School, allowedRoles: ['Admin', 'Registrar'] },
        { name: 'Schedule Management', href: '/portal/schedules', icon: Calendar, allowedRoles: ['Admin', 'Registrar'] },
        { name: 'Class Assignments', href: '/portal/classes', icon: Layers3, allowedRoles: ['Admin', 'Registrar'] },
      ],
    },
    
    {
      title: 'Enrollment & Students',
      children: [
        { name: 'Student Management', href: '/portal/students', icon: Users, allowedRoles: ['Admin', 'Registrar'] },
        { name: 'Enrollments/Admission', href: '/portal/enrollments', icon: Users, allowedRoles: ['Admin', 'Registrar'] },
        { name: 'Student GWA Registry', href: '/portal/academics', icon: School, allowedRoles: ['Admin', 'Registrar'] },
        { name: 'Archived Students', href: '/portal/students/archived', icon: Archive, allowedRoles: ['Admin', 'Registrar'] },
      ],
    },

    {
      title: 'Faculty',
      children: [
        { name: 'Teacher Management', href: '/portal/teachers', icon: GraduationCap, allowedRoles: ['Admin', 'Registrar'] },
      ],
    },

    {
      title: null,
      items: [
        { name: 'Financials', href: '/portal/financials', icon: Wallet, allowedRoles: ['Admin', 'Cashier'] },
      ],
    },

    {
      title: 'Administration & Support',
      children: [
        { name: 'System Settings', href: '/portal/system', icon: Settings, allowedRoles: ['Admin'] },
        { name: 'Help & Manual', href: '/portal/help', icon: HelpCircle, allowedRoles: ['Admin', 'Registrar', 'Cashier'] },
      ],
    },
  ];

  function GroupHeader({ title, active, onClickToggle, isOpen }) {
    return (
      <button type="button" onClick={onClickToggle} className={`w-full flex items-center justify-between gap-4 py-3 px-3 rounded-md transition-all duration-200 ${active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}>
        <div className="flex items-center gap-4">
          <span className="text-base font-medium">{title}</span>
        </div>
        <div className={`text-gray-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
    );
  }

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

      <nav className="flex-1 p-2 space-y-3 overflow-y-auto">
        {menuGroups.map((group, gi) => {
          // standalone items (title === null with items) — render each item
          if (group.items) {
            return group.items
              .filter(item => item.allowedRoles.includes(userRole))
              .map(item => {
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
              });
          }

          // groups with children -> hover parent
          if (group.children) {
            const visibleChildren = group.children.filter(child => child.allowedRoles.includes(userRole));
            if (visibleChildren.length === 0) return null;

            // determine if any child is active to style the parent
            const groupActive = visibleChildren.some(c => isActive(c.href));

              return (
                <div key={gi} className="group relative">
                  <GroupHeader
                    title={group.title}
                    active={groupActive}
                    isOpen={!!openGroups[gi]}
                    onClickToggle={() => {
                      setOpenGroups(prev => ({ ...prev, [gi]: !prev[gi] }));
                    }}
                  />

                  {/* Inline dropdown panel (expands inside sidebar to avoid overlay) */}
                  <div className={`mt-1 overflow-hidden transition-all duration-150 ${openGroups[gi] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} group-hover:max-h-96 group-hover:opacity-100`}>
                    <div className="bg-white border border-gray-100 rounded-md shadow-sm p-2">
                      {visibleChildren.map(child => {
                        const active = isActive(child.href, child.href === '/portal/students');
                        return (
                          <Link key={child.href} href={child.href} className={`flex items-center gap-3 py-2 px-3 rounded-md transition-all duration-150 ${active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}>
                            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                              <child.icon size={18} className={active ? "text-blue-700" : "text-gray-500"} />
                            </div>
                            <span className="text-sm truncate">{child.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
          }

          return null;
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        {userRole === 'Admin' && (
          <Link href="/portal/rollover" className={`mb-3 flex items-center gap-3 w-full text-left py-3 px-3 rounded-md transition-all font-medium ${pathname.startsWith('/portal/rollover') ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}>
            <Archive size={22} />
            <span className="text-base">School Year Rollover</span>
          </Link>
        )}
        <button onClick={handleLogout} className="flex items-center gap-3 w-full text-left py-3 px-3 text-red-500 hover:bg-red-50 rounded-md transition-all font-medium">
          <LogOut size={22} />
          <span className="text-base">Log Out</span>
        </button>
      </div>

      {showIdleWarning && isAdmin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Session inactive</h2>
            <p className="mt-2 text-sm text-slate-600">
              No activity was detected for 1 minute. You will be logged out automatically shortly.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={staySignedIn}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Stay signed in
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Log out now
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}