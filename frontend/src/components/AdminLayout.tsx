import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import AdminSidebar from './AdminSidebar';

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-900">
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        {/* Mobile toggle bar */}
        <div className="sticky top-[57px] z-10 flex items-center border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900 lg:hidden">
          <button
            className="btn-icon"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open admin menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            Admin Menu
          </span>
        </div>

        <Outlet />
      </div>
    </div>
  );
}

export default AdminLayout;
