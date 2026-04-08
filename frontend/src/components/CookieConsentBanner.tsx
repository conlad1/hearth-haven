import { useMemo, useState } from 'react';
import { Cookie, Shield, BarChart3, Check } from 'lucide-react';

export type CookiePreferences = {
  essential: true;
  analytics: boolean;
  updatedAt: string;
};

const COOKIE_PREFS_KEY = 'hearthHavenCookiePreferences';

export function getCookiePreferences(): CookiePreferences | null {
  const raw = localStorage.getItem(COOKIE_PREFS_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CookiePreferences;
  } catch {
    return null;
  }
}

function saveCookiePreferences(preferences: CookiePreferences) {
  localStorage.setItem(COOKIE_PREFS_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new Event('cookie-consent-change'));
}

function CookieConsentBanner() {
  const existingPrefs = useMemo(() => getCookiePreferences(), []);
  const [isOpen, setIsOpen] = useState(existingPrefs === null);
  const [analytics, setAnalytics] = useState(existingPrefs?.analytics ?? false);

  const saveAndClose = (analyticsEnabled: boolean) => {
    saveCookiePreferences({
      essential: true,
      analytics: analyticsEnabled,
      updatedAt: new Date().toISOString(),
    });

    setAnalytics(analyticsEnabled);
    setIsOpen(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-title"
    >
      <div className="relative mx-4 w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-500/10">
            <Cookie className="h-5 w-5 text-orange-500" />
          </div>
          <h3
            id="cookie-title"
            className="text-lg font-bold tracking-tight text-gray-900 dark:text-white"
          >
            Cookie Preferences
          </h3>
        </div>

        <p className="mb-5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          The Hearth Project uses essential cookies to keep the site working and
          optional analytics cookies to understand usage trends.
        </p>

        <div className="mb-2 flex flex-col gap-3">
          <label className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-md">
            <input
              type="checkbox"
              checked
              disabled
              className="h-4 w-4 rounded border-gray-300 text-orange-500 accent-orange-500"
            />
            <Shield className="h-4 w-4 shrink-0 text-gray-400" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Essential cookies
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Always on</span>
            </div>
            <Check className="ml-auto h-4 w-4 text-green-500" />
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-md transition hover:border-orange-200 hover:bg-orange-50/30 dark:hover:bg-orange-500/5">
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-orange-500 accent-orange-500"
            />
            <BarChart3 className="h-4 w-4 shrink-0 text-gray-400" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Analytics cookies
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Optional</span>
            </div>
            {analytics && <Check className="ml-auto h-4 w-4 text-green-500" />}
          </label>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            className="btn-ghost"
            onClick={() => saveAndClose(false)}
          >
            Essential Only
          </button>
          <button
            className="btn-secondary"
            onClick={() => saveAndClose(analytics)}
          >
            Save Preferences
          </button>
          <button
            className="btn-primary"
            onClick={() => saveAndClose(true)}
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}

export default CookieConsentBanner;
