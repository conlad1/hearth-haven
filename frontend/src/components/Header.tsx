import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthService, type CurrentUser } from '../api/core/AuthService';
import { Menu, X, UserRound, Heart, ChevronDown, LogOut } from 'lucide-react';
import { AppRoles, canShowLink, getCurrentRole, headerLinks } from '../authz';

type HeaderProps = {
  isAuthenticated: boolean;
  currentUser: CurrentUser | null;
};

function Header({ isAuthenticated, currentUser }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
const role = getCurrentRole(currentUser);

  const isActive = (to: string) =>
    to === '/' ? pathname === '/' : pathname.startsWith(to);

  const handleLogout = async () => {
    await AuthService.logout();
    setMenuOpen(false);
    setUserDropdownOpen(false);
    navigate('/');
  };

  useEffect(() => {
    setMenuOpen(false);
    setUserDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const visibleLinks = headerLinks.filter((link) => canShowLink(link, isAuthenticated, role));
  const primaryLinks = visibleLinks.filter((link) =>
    ['/', '/impact', '/donate'].includes(link.to) && (isAuthenticated || link.to !== '/donate')
  );
  const userName = currentUser?.displayName ?? null;
  const isStaffRole = role === AppRoles.Admin || role === AppRoles.CaseManager || role === AppRoles.DonationsManager || role === AppRoles.OutreachManager;

  return (
    <>
      <nav id="site-header" className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95">
        <div className="mx-auto flex h-[57px] w-full max-w-7xl items-center justify-between gap-3 px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 lg:gap-4">
            <Link to="/" className="flex min-w-0 items-center gap-2 text-gray-900 no-underline hover:text-gray-900 dark:text-white dark:hover:text-white">
              <img src="/Logo.png" alt="The Hearth Project" className="h-8 w-auto shrink-0" />
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
                  <Link to="/donate" className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white no-underline transition hover:bg-orange-600 dark:bg-orange-500 dark:hover:bg-orange-400">
                    <Heart className="h-4 w-4" /> Donate
                  </Link>
                </>
              ) : (
                <div ref={dropdownRef} className="relative">
                  <button
                    onClick={() => setUserDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <UserRound className="h-4 w-4 shrink-0 text-orange-500" />
                    {userName && <span className="max-w-[10rem] truncate">{userName}</span>}
                    <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                      <Link
                        to="/profile"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 no-underline transition hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        <UserRound className="h-4 w-4 text-gray-400" />
                        Profile
                      </Link>
                      <div className="mx-3 border-t border-gray-100 dark:border-gray-700" />
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      >
                        <LogOut className="h-4 w-4" />
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

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
                  <Link to="/donate" className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2.5 text-base font-bold text-white no-underline transition hover:bg-orange-600 dark:bg-orange-500 dark:hover:bg-orange-400">
                    <Heart className="h-4 w-4" /> Donate
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/profile" className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-base font-medium no-underline text-gray-700 transition hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800">
                    <UserRound className="h-4 w-4 text-orange-500" />
                    {userName ?? 'Profile'}
                  </Link>
                  <button
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-base font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Header;
