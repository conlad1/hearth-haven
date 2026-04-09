import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
type ThemePref = Theme | 'system';

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePref;
  setPreference: (pref: ThemePref) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  preference: 'system',
  setPreference: () => {},
});

const STORAGE_KEY = 'theme-preference';
const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function readCookie(cookieName: string) {
  if (typeof document === 'undefined') {
    return null;
  }

  const entry = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${cookieName}=`));

  return entry ? decodeURIComponent(entry.slice(cookieName.length + 1)) : null;
}

function writeCookie(cookieName: string, value: string) {
  if (typeof document === 'undefined') {
    return;
  }

  const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${cookieName}=${encodeURIComponent(value)}; Max-Age=${THEME_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secureFlag}`;
}

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePref>(() => {
    const cookieValue = readCookie(STORAGE_KEY);
    if (cookieValue === 'light' || cookieValue === 'dark' || cookieValue === 'system') {
      return cookieValue;
    }

    // One-time migration from older localStorage setting to cookie storage.
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      writeCookie(STORAGE_KEY, stored);
      localStorage.removeItem(STORAGE_KEY);
      return stored;
    }

    return 'system';
  });

  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const theme: Theme = preference === 'system' ? systemTheme : preference;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const setPreference = (pref: ThemePref) => {
    setPreferenceState(pref);
    writeCookie(STORAGE_KEY, pref);
  };

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
