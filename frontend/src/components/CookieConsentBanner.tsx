import { useMemo, useState } from 'react';

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
      className="cookie-banner"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-title"
    >
      <div className="cookie-banner-card">
        <h3 id="cookie-title">Cookie Preferences</h3>
        <p>
          Hearth Haven uses essential cookies to keep the site working and
          optional analytics cookies to understand usage trends.
        </p>

        <div className="cookie-option-row">
          <label>
            <input type="checkbox" checked disabled /> Essential cookies (always
            on)
          </label>
        </div>

        <div className="cookie-option-row">
          <label>
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
            />
            Analytics cookies (optional)
          </label>
        </div>

        <div className="cookie-banner-actions">
          <button className="btn-light" onClick={() => saveAndClose(false)}>
            Essential Only
          </button>
          <button className="btn-light" onClick={() => saveAndClose(analytics)}>
            Save Preferences
          </button>
          <button className="btn-dark" onClick={() => saveAndClose(true)}>
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}

export default CookieConsentBanner;
