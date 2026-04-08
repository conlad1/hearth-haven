import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthService } from '../api/AuthService';
import { Menu, X, Heart, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { API_BASE_URL } from '../api/config';

type HeaderProps = {
  isAuthenticated: boolean;
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
          className={`inline-flex items-center justify-center rounded-md p-1.5 transition cursor-pointer ${
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

function Header({ isAuthenticated }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState(AuthService.getUserName());
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { theme } = useTheme();

  const isActive = (to: string) =>
    to === '/' ? pathname === '/' : pathname.startsWith(to);

  const handleLogout = async () => {
    await AuthService.logout();
    setMenuOpen(false);
    navigate('/');
  };

  const publicNavLinks = [
    { to: '/', label: 'Home' },
    { to: '/impact', label: 'Impact' },
  ];

  const adminNavLinks = [
    { to: '/admin', label: 'Dashboard' },
    { to: '/cases', label: 'Case Management' },
    { to: '/safehouse-management', label: 'Safehouse Management' },
    { to: '/donors', label: 'Donors' },
    { to: '/outreach', label: 'Outreach' },
    { to: '/social-media', label: 'Social Media' },
    { to: '/reports', label: 'Reports' },
  ];

  const adminPrefixes = ['/admin', '/cases', '/safehouse-management', '/donors', '/outreach', '/social-media', '/reports'];
  const isOnAdminPage = adminPrefixes.some(p => pathname === p || pathname.startsWith(p + '/'));

  const navLinks = isOnAdminPage ? publicNavLinks : [...publicNavLinks, ...adminNavLinks];
  useEffect(() => {
    const syncName = () => setUserName(AuthService.getUserName());
    window.addEventListener('auth-change', syncName);

    return () => window.removeEventListener('auth-change', syncName);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setUserName(null);
      return;
    }

    const email = AuthService.getUserEmail();
    if (!email) {
      return;
    }

    fetch(`${API_BASE_URL}/Donor/Portal?email=${encodeURIComponent(email)}`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) {
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.displayName) {
          AuthService.setUserName(data.displayName);
          setUserName(data.displayName);
        }
      })
      .catch(() => {
        // Ignore header lookup failures so nav/header work remains stable.
      });
  }, [isAuthenticated]);

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-gray-900 no-underline hover:text-gray-900 dark:text-white dark:hover:text-white">
            <img src={theme === 'dark' ? '/heart-dark.svg' : '/Logo.svg'} alt="The Hearth Project" className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight">The Hearth Project</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`rounded-lg px-3 py-2 text-sm font-medium no-underline transition ${
                  isActive(to)
                    ? 'ring-2 ring-orange-500 text-orange-600 dark:text-orange-400'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden items-center gap-2 md:flex">
            <Link to="/donate" className="btn-primary no-underline">
              <Heart className="h-4 w-4" />
              Donate
            </Link>
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="btn-ghost no-underline">Sign in</Link>
                <Link to="/register" className="btn-secondary no-underline">Register</Link>
              </>
            ) : (
              <>
                <Link to="/profile" className="btn-ghost no-underline">
                  {userName ? `Hi, ${userName}` : 'My Giving'}
                </Link>
                <button className="btn-ghost" onClick={handleLogout}>Logout</button>
              </>
            )}
          </div>

          {/* Theme toggle + hamburger — pinned to far right */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              className="btn-icon md:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 top-[57px] z-30 bg-white dark:bg-gray-900 md:hidden">
          <div className="flex flex-col gap-1 border-b border-gray-100 px-4 py-4 dark:border-gray-800">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-base font-medium no-underline transition ${
                  isActive(to)
                    ? 'ring-2 ring-orange-500 text-orange-600 dark:text-orange-400'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-2 px-4 py-4">
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Theme</span>
              <ThemeToggle />
            </div>
            <Link to="/donate" onClick={() => setMenuOpen(false)} className="btn-primary w-full no-underline">
              <Heart className="h-4 w-4" />
              Donate
            </Link>
            {!isAuthenticated ? (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-secondary w-full no-underline">Sign in</Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-secondary w-full no-underline">Register</Link>
              </>
            ) : (
              <>
                <Link to="/profile" onClick={() => setMenuOpen(false)} className="btn-secondary w-full no-underline">
                  {userName ? `Hi, ${userName}` : 'My Giving'}
                </Link>
                <button className="btn-secondary w-full" onClick={handleLogout}>Logout</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default Header;
