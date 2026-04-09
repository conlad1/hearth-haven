import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthService, type CurrentUser } from '../api/AuthService';
import { Menu, X, Sun, Moon, Monitor, UserRound, Heart } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { AppRoles, canShowLink, getCurrentRole, headerLinks } from '../authz';

type HeaderProps = {
  isAuthenticated: boolean;
  currentUser: CurrentUser | null;
};

function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const options = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'system' as const, icon: Monitor, label: 'System' },
  ];

  return (
    <div className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setPreference(value)}
          aria-label={`Use ${label.toLowerCase()} theme`}
          aria-pressed={preference === value}
          title={label}
          className={`inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 transition ${
            preference === value
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

function Header({ isAuthenticated, currentUser }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { theme } = useTheme();
  const role = getCurrentRole(currentUser);

  const isActive = (to: string) =>
    to === '/' ? pathname === '/' : pathname.startsWith(to);

  const handleLogout = async () => {
    await AuthService.logout();
    setMenuOpen(false);
    navigate('/');
  };

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const visibleLinks = headerLinks.filter((link) => canShowLink(link, isAuthenticated, role));
  const primaryLinks = visibleLinks.filter((link) => ['/', '/impact', '/donate'].includes(link.to));
  const userName = currentUser?.displayName ?? null;
  const isStaffRole = role === AppRoles.Admin || role === AppRoles.CaseManager || role === AppRoles.DonationsManager || role === AppRoles.OutreachManager;

  return (
    <>
      <nav id="site-header" className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95">
        <div className="mx-auto flex h-[57px] w-full max-w-7xl items-center justify-between gap-3 px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 lg:gap-4">
            <Link to="/" className="flex min-w-0 items-center gap-2 text-gray-900 no-underline hover:text-gray-900 dark:text-white dark:hover:text-white">
              <img src={theme === 'dark' ? '/heart-dark.svg' : '/Logo.svg'} alt="The Hearth Project" className="h-8 w-8" />
              <span className="truncate text-base font-bold tracking-tight sm:text-lg">The Hearth Project</span>
            </Link>

            <div className="hidden items-center gap-1 lg:flex">
              {primaryLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={to === '/donate'
                    ? `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold no-underline transition ${
                        isActive(to)
                          ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-500 dark:bg-orange-500/10 dark:text-orange-300'
                          : 'text-orange-600 hover:bg-orange-50 hover:text-orange-700 dark:text-orange-400 dark:hover:bg-orange-500/10 dark:hover:text-orange-300'
                      }`
                    : `rounded-lg px-3 py-2 text-sm font-medium no-underline transition ${
                        isActive(to)
                          ? 'ring-2 ring-orange-500 text-orange-600 dark:text-orange-400'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                      }`}
                >
                  {to === '/donate' && <Heart className="h-4 w-4" />}
                  {label}
                </Link>
              ))}
              {isStaffRole && (
                <Link
                  to="/admin"
                  className={`rounded-lg px-3 py-2 text-sm font-medium no-underline transition ${
                    isActive('/admin')
                      ? 'ring-2 ring-orange-500 text-orange-600 dark:text-orange-400'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                  }`}
                >
                  Admin Dashboard
                </Link>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 lg:gap-3">
            <div className="hidden items-center gap-2 lg:flex xl:gap-3">
              {!isAuthenticated ? (
                <>
                  <Link to="/login" className="btn-ghost no-underline">Sign in</Link>
                  <Link to="/register" className="btn-secondary px-4 py-2 text-sm no-underline">Register</Link>
                </>
              ) : (
                <>
                  {userName && <span className="hidden max-w-[12rem] truncate text-sm font-medium text-gray-700 dark:text-gray-300 xl:inline">Hi, {userName}</span>}
                  <Link to="/profile" className="btn-secondary px-4 py-2 text-sm no-underline">
                    <UserRound className="h-4 w-4" />
                    Profile
                  </Link>
                  <button className="btn-ghost" onClick={handleLogout}>Logout</button>
                </>
              )}
            </div>

            <ThemeToggle />
            <button
              className="btn-icon lg:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-header-menu"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 top-[57px] z-30 bg-black/30 lg:hidden" onClick={() => setMenuOpen(false)}>
          <div id="mobile-header-menu" className="ml-auto h-full w-full max-w-sm overflow-y-auto border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" onClick={(event) => event.stopPropagation()}>
            <div className="flex flex-col gap-1 border-b border-gray-100 px-4 py-4 dark:border-gray-800">
              {primaryLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={to === '/donate'
                    ? `inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-base font-bold no-underline transition ${
                        isActive(to)
                          ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-500 dark:bg-orange-500/10 dark:text-orange-300'
                          : 'text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-500/10'
                      }`
                    : `rounded-lg px-3 py-2.5 text-base font-medium no-underline transition ${
                        isActive(to)
                          ? 'ring-2 ring-orange-500 text-orange-600 dark:text-orange-400'
                          : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                >
                  {to === '/donate' && <Heart className="h-4 w-4" />}
                  {label}
                </Link>
              ))}
              {isStaffRole && (
                <Link
                  to="/admin"
                  className={`rounded-lg px-3 py-2.5 text-base font-medium no-underline transition ${
                    isActive('/admin')
                      ? 'ring-2 ring-orange-500 text-orange-600 dark:text-orange-400'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  Admin Dashboard
                </Link>
              )}
            </div>

            <div className="flex flex-col gap-2 px-4 py-4">
              {!isAuthenticated ? (
                <>
                  <Link to="/login" className="btn-secondary w-full no-underline">Sign in</Link>
                  <Link to="/register" className="btn-secondary w-full no-underline">Register</Link>
                </>
              ) : (
                <>
                  {userName && <p className="px-1 text-sm font-medium text-gray-700 dark:text-gray-300">Hi, {userName}</p>}
                  <Link to="/profile" className="btn-secondary w-full no-underline">
                    <UserRound className="h-4 w-4" />
                    Profile
                  </Link>
                  <button className="btn-secondary w-full" onClick={handleLogout}>Logout</button>
                </>
              )}

              <div className="mt-2 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Theme</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Header;
