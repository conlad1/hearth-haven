import { useState } from 'react';
import { Cookie, Shield, Check } from 'lucide-react';

export type CookiePreferences = {
  essential: true;
  analytics: boolean;
  updatedAt: string;
};

const COOKIE_PREFS_KEY = 'hearthHavenCookiePreferences';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function readCookie(cookieName: string) {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookieEntry = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${cookieName}=`));

  if (!cookieEntry) {
    return null;
  }

  return cookieEntry.slice(cookieName.length + 1);
}

export function getCookiePreferences(): CookiePreferences | null {
  const cookieRaw = readCookie(COOKIE_PREFS_KEY);
  if (cookieRaw) {
    try {
      return JSON.parse(decodeURIComponent(cookieRaw)) as CookiePreferences;
    } catch {
      return null;
    }
  }

  try {
    const localRaw = localStorage.getItem(COOKIE_PREFS_KEY);
    if (!localRaw) {
      return null;
    }

    return JSON.parse(localRaw) as CookiePreferences;
  } catch {
    return null;
  }
}

function saveCookiePreferences(preferences: CookiePreferences) {
  const serialized = encodeURIComponent(JSON.stringify(preferences));

  if (typeof document !== 'undefined') {
    const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${COOKIE_PREFS_KEY}=${serialized}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secureFlag}`;
  }

  try {
    localStorage.setItem(COOKIE_PREFS_KEY, JSON.stringify(preferences));
  } catch {
    // Best effort fallback only; the cookie remains the source of truth.
  }
  window.dispatchEvent(new Event('cookie-consent-change'));
}

function CookieConsentBanner() {
  const [isOpen, setIsOpen] = useState(() => getCookiePreferences() === null);

  const saveAndClose = () => {
    saveCookiePreferences({
      essential: true,
      analytics: false,
      updatedAt: new Date().toISOString(),
    });
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
          The Hearth Project uses essential cookies to keep the site working. No analytics cookies are ever gathered on The Hearth Project website.
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
              <span className="text-xs text-gray-500 dark:text-gray-400">Required for the site to function</span>
            </div>
            <Check className="ml-auto h-4 w-4 text-green-500" />
          </label>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            className="btn-primary"
            onClick={saveAndClose}
          >
            Accept Essential Cookies Only
          </button>
        </div>
      </div>
    </div>
  );
}

export default CookieConsentBanner;
