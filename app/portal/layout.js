import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }) {
  return (
    <div className="flex bg-gray-100 min-h-screen">
      {/* The Sidebar is fixed on the left */}
      <Sidebar />

      {/* The Page Content is pushed to the right */}
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}
