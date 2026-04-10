import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Home, Heart, Share2, Wallet, UserCog,
  X, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useAuthSession } from '../authSession';
import { AppRoles, canShowLink, getCurrentRole, type NavLink } from '../authz';

type SidebarItem = NavLink & {
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: SidebarItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, roles: [AppRoles.Admin, AppRoles.CaseManager, AppRoles.DonationsManager, AppRoles.OutreachManager] },
  { to: '/admin/users', label: 'User Management', icon: UserCog, roles: [AppRoles.Admin] },
  { to: '/cases', label: 'Cases', icon: Users, roles: [AppRoles.Admin, AppRoles.CaseManager] },
  { to: '/safehouse-management', label: 'Safehouses', icon: Home, roles: [AppRoles.Admin, AppRoles.CaseManager] },
  { to: '/donors', label: 'Donors', icon: Heart, roles: [AppRoles.Admin, AppRoles.DonationsManager] },
  { to: '/allocations', label: 'Allocations', icon: Wallet, roles: [AppRoles.Admin, AppRoles.DonationsManager] },
  { to: '/social-media', label: 'Social Media', icon: Share2, roles: [AppRoles.Admin, AppRoles.OutreachManager] },
];

type AdminSidebarProps = {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  headerOffset: number;
};

function AdminSidebar({ open, onClose, collapsed, onToggleCollapse, headerOffset }: AdminSidebarProps) {
  const { pathname } = useLocation();
  const { isAuthenticated, currentUser } = useAuthSession();
  const role = getCurrentRole(currentUser);

  const visibleItems = navItems.filter((item) => canShowLink(item, isAuthenticated, role));

  const isActive = (to: string) =>
    to === '/admin' ? pathname === '/admin' : pathname.startsWith(to);

  return (
    <>
      {open && (
        <div
          className="fixed inset-x-0 bottom-0 z-20 bg-black/30 lg:hidden"
          style={{ top: `${headerOffset}px` }}
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed bottom-0 left-0 z-30 flex shrink-0 flex-col border-r border-gray-200 bg-white transition-all duration-200 dark:border-gray-700 dark:bg-gray-900 lg:sticky lg:self-start lg:min-h-screen lg:translate-x-0 ${
          collapsed ? 'w-16' : 'w-60'
        } ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ top: `${headerOffset}px` }}
      >
        <div className={`flex items-center pt-1 pb-1 lg:pt-6 ${collapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
          {!collapsed && (
            <h2 className="text-base font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Admin
            </h2>
          )}
          <button
            className="btn-icon lg:hidden"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
          <button
            onClick={onToggleCollapse}
            className="btn-icon hidden lg:inline-flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
          </button>
        </div>

        <nav className={`flex-1 py-1 ${collapsed ? 'px-2' : 'px-5'}`}>
          <ul className="space-y-1">
            {visibleItems.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  onClick={onClose}
                  title={collapsed ? label : undefined}
                  className={`flex w-full min-w-max items-center gap-3 whitespace-nowrap rounded-lg py-2.5 text-base font-medium no-underline transition ${
                    collapsed ? 'justify-center px-2' : 'px-3 text-left'
                  } ${
                    isActive(to)
                      ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}

export default AdminSidebar;