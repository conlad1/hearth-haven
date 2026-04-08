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

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePref>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
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
    localStorage.setItem(STORAGE_KEY, pref);
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
