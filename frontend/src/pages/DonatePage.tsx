import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../api/AuthService';
import { API_BASE_URL } from '../api/config';
import { Heart, UserX, User, ArrowRight, LogIn } from 'lucide-react';

const AMOUNTS: number[] = [10, 25, 50, 100, 250, 500];
type AuthMode = 'anonymous' | 'loggedin';

function getStoredUserForm() {
  const email = AuthService.getUserEmail() ?? '';
  const fullName = AuthService.getUserName() ?? '';
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? '';
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName, email };
}

function DonatePage() {
  const navigate = useNavigate();
  const isLoggedIn = AuthService.isAuthenticated();

  const [authMode, setAuthMode] = useState<AuthMode>(isLoggedIn ? 'loggedin' : 'anonymous');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [form, setForm] = useState(() => isLoggedIn ? getStoredUserForm() : { firstName: '', lastName: '', email: '' });

  const finalAmount = customAmount ? Number(customAmount) : (amount ?? 0);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required.';
    if (!form.lastName.trim()) e.lastName = 'Last name is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    if (!finalAmount || finalAmount <= 0) e.amount = 'Enter a valid amount.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.MouseEvent) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      supporter: authMode === 'anonymous' ? null : {
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
      const res = await fetch(`${API_BASE_URL}/Donation/CreateDonation`, {
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

  const showLoginTeaser = authMode === 'loggedin' && !isLoggedIn;

  return (
    <div>
      {/* Hero */}
      <section className="py-16 text-center">
        <Heart className="mx-auto mb-4 h-10 w-10 text-orange-500" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">Make a <span className="text-orange-500">Difference</span> Today</h1>
        <p className="mt-3 text-gray-500 dark:text-gray-400">Your generosity helps change lives.</p>

        {/* Toggle */}
        <div className="mx-auto mt-8 inline-flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shadow-sm">
          <button
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition ${
              authMode === 'anonymous' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            onClick={() => setAuthMode('anonymous')}
          >
            <UserX className="h-4 w-4" /> Donate Anonymously
          </button>
          <button
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition ${
              authMode === 'loggedin' ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            onClick={() => setAuthMode('loggedin')}
          >
            <User className="h-4 w-4" /> Log In to Donate
          </button>
        </div>
      </section>

      {/* Login Teaser */}
      {showLoginTeaser && (
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold">More ways to give when you log in</h2>
              <p className="mt-2 text-gray-500 dark:text-gray-400">Track your impact and unlock more features.</p>
            </div>
            <div className="card space-y-3">
              <h3 className="text-lg font-semibold">Get started</h3>
              <button className="btn-primary w-full" onClick={() => navigate('/login', { state: { returnTo: '/donate' } })}>
                <LogIn className="h-4 w-4" /> Log In
              </button>
              <button className="btn-secondary w-full" onClick={() => navigate('/register', { state: { returnTo: '/donate' } })}>
                Create Account
              </button>
              <button className="btn-ghost w-full text-gray-500" onClick={() => setAuthMode('anonymous')}>
                Continue anonymously <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {!showLoginTeaser && (
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
            {/* Left — Info */}
            <div className="lg:col-span-3">
              <h2 className="text-xl font-bold">Your Information</h2>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</span>
                    <input name="firstName" value={form.firstName} onChange={handleInput} className={`input-field ${isLoggedIn ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}/>
                    {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>}
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</span>
                    <input name="lastName" value={form.lastName} onChange={handleInput} className={`input-field ${isLoggedIn ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}/>
                    {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>}
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</span>
                  <input name="email" value={form.email} onChange={handleInput} className={`input-field ${isLoggedIn ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`} readOnly={isLoggedIn} />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                </label>
              </div>

              <label className="mt-6 block">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</span>
                <textarea className="input-field resize-none" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </label>
            </div>

            {/* Right — Amount */}
            <div className="lg:col-span-2">
              <div className="card">
                <h3 className="text-lg font-semibold">Select Amount</h3>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {AMOUNTS.map((a) => (
                    <button
                      key={a}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                        amount === a && !customAmount
                          ? 'border-orange-500 bg-orange-500 text-white'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-orange-300'
                      }`}
                      onClick={() => { setAmount(a); setCustomAmount(''); }}
                    >
                      ${a}
                    </button>
                  ))}
                </div>

                <div className="relative mt-4">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500">$</span>
                  <input
                    type="number"
                    placeholder="Custom amount"
                    value={customAmount}
                    onChange={(e) => { setCustomAmount(e.target.value); setAmount(null); }}
                    className="input-field pl-7"
                  />
                </div>

                {errors.amount && <p className="mt-2 text-xs text-red-500">{errors.amount}</p>}

                <div className="mt-6 flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">${finalAmount || 0}</span>
                </div>

                <button className="btn-primary mt-4 w-full" onClick={handleSubmit}>
                  Donate ${finalAmount || '\u2014'} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DonatePage;
