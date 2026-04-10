import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../api/core/config';
import { apiFetch } from '../../api/core/http';
import { Heart, UserX, User, ArrowRight, LogIn } from 'lucide-react';
import { useAuthSession } from '../../authSession';

const AMOUNTS: number[] = [10, 25, 50, 100, 250, 500];
type AuthMode = 'anonymous' | 'loggedin';

function useOnScreen(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function FadeIn({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useOnScreen(0.08);
  return (
    <div ref={ref} className={className}
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms` }}>
      {children}
    </div>
  );
}

function DonatePage() {
  const navigate = useNavigate();
  const { isAuthenticated, currentUser, sessionReady } = useAuthSession();

  const [authMode, setAuthMode] = useState<AuthMode>('anonymous');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });

  useEffect(() => {
    if (!sessionReady || !isAuthenticated || !currentUser) {
      return;
    }

    const parts = currentUser.displayName.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] ?? '';
    const lastName = parts.slice(1).join(' ');
    setAuthMode('loggedin');
    setForm({
      firstName,
      lastName,
      email: currentUser.email ?? '',
    });
  }, [currentUser, isAuthenticated, sessionReady]);

  useEffect(() => {
    if (!isAuthenticated || authMode !== 'loggedin' || !currentUser) {
      return;
    }

    const parts = currentUser.displayName.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] ?? '';
    const lastName = parts.slice(1).join(' ');
    setForm({
      firstName,
      lastName,
      email: currentUser.email ?? '',
    });
  }, [authMode, currentUser, isAuthenticated]);

  const finalAmount = customAmount ? Number(customAmount) : (amount ?? 0);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (authMode === 'loggedin') {
      if (!form.firstName.trim()) e.firstName = 'First name is required.';
      if (!form.lastName.trim()) e.lastName = 'Last name is required.';
      if (!form.email.trim()) e.email = 'Email is required.';
    }
    if (!finalAmount || finalAmount <= 0) e.amount = 'Enter a valid amount.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.MouseEvent) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      supporter:
        authMode === 'anonymous'
          ? null
          : {
              supporter_type: 'MonetaryDonor',
              first_name: form.firstName,
              last_name: form.lastName,
              email: form.email,
              status: 'Active',
            },
      donation: {
        donation_type: 'Monetary',
        is_recurring: false,
        currency_code: 'USD',
        amount: finalAmount,
        estimated_value: finalAmount,
        channel_source: 'Direct',
        notes,
        is_anonymous: authMode === 'anonymous',
      },
    };

    try {
      const res = await apiFetch(`${API_BASE_URL}/Donation/CreateDonation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.text();
        alert(`Donation failed: ${err}`);
        return;
      }
      navigate('/donate/thank-you');
    } catch {
      alert('Network error.');
    }
  }

  const showLoginTeaser = authMode === 'loggedin' && !isAuthenticated;

  return (
    <div>
      {/* Hero */}
      <section className="py-24 px-6 text-center">
        <FadeIn>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-500/10">
            <Heart className="h-7 w-7 text-orange-500" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">
            Support Our Mission
          </p>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white sm:text-4xl">
            Make a <span className="text-orange-500">Difference</span> Today
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-gray-500 dark:text-gray-400 leading-relaxed">
            Your generosity helps change lives.
          </p>
        </FadeIn>

        {/* Toggle */}
        <FadeIn delay={120}>
          <div className="mx-auto mt-10 inline-flex overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
            <button
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors ${
                authMode === 'anonymous'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              onClick={() => setAuthMode('anonymous')}
            >
              <UserX className="h-4 w-4" /> Donate Anonymously
            </button>
            <button
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors ${
                authMode === 'loggedin'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              onClick={() => setAuthMode('loggedin')}
            >
              <User className="h-4 w-4" /> Log In to Donate
            </button>
          </div>
        </FadeIn>
      </section>

      {/* Login Teaser */}
      {showLoginTeaser && (
        <section className="py-24 px-6">
          <div className="mx-auto max-w-4xl">
            <FadeIn>
              <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">
                    Unlock More
                  </p>
                  <h2 className="text-3xl font-black text-gray-900 dark:text-white sm:text-4xl">
                    More ways to give when you log in
                  </h2>
                  <p className="mt-4 text-gray-500 dark:text-gray-400 leading-relaxed">
                    Track your impact and unlock more features.
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Get started</h3>
                  <button
                    className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600 transition-colors w-full inline-flex items-center justify-center gap-2"
                    onClick={() =>
                      navigate('/login', { state: { returnTo: '/donate' } })
                    }
                  >
                    <LogIn className="h-4 w-4" /> Log In
                  </button>
                  <button
                    className="btn-secondary w-full"
                    onClick={() =>
                      navigate('/register', { state: { returnTo: '/donate' } })
                    }
                  >
                    Create Account
                  </button>
                  <button
                    className="btn-ghost w-full text-gray-500"
                    onClick={() => setAuthMode('anonymous')}
                  >
                    Continue anonymously <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>
      )}

      {/* Form */}
      {!showLoginTeaser && (
        <section className="py-24 px-6">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-5">
              {/* Left -- Info */}
              <FadeIn className="lg:col-span-3">
                <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">
                    Your Details
                  </p>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">Your Information</h2>

                  <div className="mt-6 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          First Name{authMode === 'anonymous' ? ' (optional)' : ''}
                        </span>
                        <input
                          name="firstName"
                          value={form.firstName}
                          onChange={handleInput}
                          className={`input-field ${isAuthenticated ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}
                        />
                        {errors.firstName && (
                          <p className="mt-1 text-xs text-red-500">
                            {errors.firstName}
                          </p>
                        )}
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Last Name{authMode === 'anonymous' ? ' (optional)' : ''}
                        </span>
                        <input
                          name="lastName"
                          value={form.lastName}
                          onChange={handleInput}
                          className={`input-field ${isAuthenticated ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}
                        />
                        {errors.lastName && (
                          <p className="mt-1 text-xs text-red-500">
                            {errors.lastName}
                          </p>
                        )}
                      </label>
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email{authMode === 'anonymous' ? ' (optional)' : ''}
                      </span>
                      <input
                        name="email"
                        value={form.email}
                        onChange={handleInput}
                        className={`input-field ${isAuthenticated ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}
                        readOnly={isAuthenticated}
                      />
                      {errors.email && (
                        <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                      )}
                    </label>
                  </div>

                  <label className="mt-6 block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Notes
                    </span>
                    <textarea
                      className="input-field resize-none"
                      rows={4}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </label>
                </div>
              </FadeIn>

              {/* Right -- Amount */}
              <FadeIn className="lg:col-span-2" delay={120}>
                <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">
                    Gift Amount
                  </p>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">Select Amount</h3>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {AMOUNTS.map((a) => (
                      <button
                        key={a}
                        className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                          amount === a && !customAmount
                            ? 'border-orange-500 bg-orange-500 text-white'
                            : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-orange-300'
                        }`}
                        onClick={() => {
                          setAmount(a);
                          setCustomAmount('');
                        }}
                      >
                        ${a}
                      </button>
                    ))}
                  </div>

                  <div className="relative mt-4">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500">
                      $
                    </span>
                    <input
                      type="number"
                      placeholder="Custom amount"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setAmount(null);
                      }}
                      className="input-field pl-7"
                    />
                  </div>

                  {errors.amount && (
                    <p className="mt-2 text-xs text-red-500">{errors.amount}</p>
                  )}

                  <div className="mt-6 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Total
                    </span>
                    <span className="text-2xl font-black text-gray-900 dark:text-white">
                      ${finalAmount || 0}
                    </span>
                  </div>

                  <button
                    className="mt-4 w-full rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600 transition-colors inline-flex items-center justify-center gap-2"
                    onClick={handleSubmit}
                  >
                    Donate ${finalAmount || '\u2014'}{' '}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default DonatePage;
