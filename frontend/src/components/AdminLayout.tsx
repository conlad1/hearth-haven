import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import AdminSidebar from './AdminSidebar';

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerOffset, setHeaderOffset] = useState(57);

  useEffect(() => {
    const updateHeaderOffset = () => {
      const header = document.getElementById('site-header');
      if (!header) {
        setHeaderOffset(57);
        return;
      }

      const measured = Math.round(header.getBoundingClientRect().height);
      setHeaderOffset(measured > 0 ? measured : 57);
    };

    updateHeaderOffset();

    const header = document.getElementById('site-header');
    const observer = header ? new ResizeObserver(updateHeaderOffset) : null;
    if (header && observer) {
      observer.observe(header);
    }

    window.addEventListener('resize', updateHeaderOffset);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateHeaderOffset);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-900">
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        headerOffset={headerOffset}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        {/* Mobile toggle bar */}
        <div
          className="fixed inset-x-0 z-20 flex items-center border-b border-gray-200 bg-white px-3 py-1.5 dark:border-gray-700 dark:bg-gray-900 lg:hidden"
          style={{ top: `${headerOffset}px` }}
        >
          <button
            className="inline-flex items-center justify-center rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open admin menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="ml-2 text-base leading-none font-semibold text-gray-600 dark:text-gray-300">
            Admin Menu
          </span>
        </div>

        <div className="h-[46px] lg:hidden" />

        <Outlet />
      </div>
    </div>
  );
}

export default AdminLayout;
