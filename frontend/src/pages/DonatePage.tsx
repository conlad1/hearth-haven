import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../api/AuthService';
import './DonatePage.css';

const AMOUNTS: number[] = [10, 25, 50, 100, 250, 500];

type AuthMode = 'anonymous' | 'loggedin';

function DonatePage() {
  const navigate = useNavigate();
  const isLoggedIn = AuthService.isAuthenticated();

  const [authMode, setAuthMode] = useState<AuthMode>('anonymous');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [amount, setAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState('');
  const [notes, setNotes] = useState('');

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  const finalAmount = customAmount ? Number(customAmount) : (amount ?? 0);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function validate() {
    const e: Record<string, string> = {};

    if (authMode === 'anonymous') {
      if (!form.firstName.trim()) e.firstName = 'First name is required.';
      if (!form.lastName.trim()) e.lastName = 'Last name is required.';
      if (!form.email.trim()) e.email = 'Email is required.';
    }

    if (!finalAmount || finalAmount <= 0) {
      e.amount = 'Enter a valid amount.';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.MouseEvent) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      supporter: null,
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
      const res = await fetch(
        'https://localhost:7052/Donation/CreateDonation',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

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
    <div className="donate-page">
      {/* HERO */}
      <div className="donate-hero">
        <div className="donate-hero-inner">
          <div className="donate-heart-icon">❤️</div>
          <h1>Make a Difference Today</h1>
          <p>Your generosity helps change lives.</p>

          {/* TOGGLE */}
          <div className="donate-hero-toggle">
            <button
              className={`donate-hero-tab${authMode === 'anonymous' ? ' active' : ''}`}
              onClick={() => setAuthMode('anonymous')}
            >
              🕊️ Donate Anonymously
            </button>
            <button
              className={`donate-hero-tab${authMode === 'loggedin' ? ' active' : ''}`}
              onClick={() => setAuthMode('loggedin')}
            >
              🌟 Log In to Donate
            </button>
          </div>
        </div>
      </div>

      {/* LOGIN TEASER */}
      {showLoginTeaser && (
        <div className="donate-login-teaser">
          <div className="donate-login-teaser-inner">
            <div className="donate-teaser-left">
              <h2>More ways to give when you log in</h2>
              <p>Track your impact and unlock more features.</p>
            </div>

            <div className="donate-teaser-right">
              <div className="donate-teaser-card">
                <h3>Get started</h3>
                <button
                  className="btn-teaser-login"
                  onClick={() => navigate('/login')}
                >
                  Log In →
                </button>

                <button
                  className="btn-teaser-register"
                  onClick={() => navigate('/register')}
                >
                  Create Account
                </button>

                <button
                  className="btn-teaser-anonymous"
                  onClick={() => setAuthMode('anonymous')}
                >
                  Continue anonymously →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORM */}
      {!showLoginTeaser && (
        <div className="donate-form-page">
          {/* LEFT */}
          <div className="donate-form-left">
            <h2>Your Information</h2>

            {authMode === 'anonymous' && (
              <>
                <div className="donate-form-row two-col">
                  <div>
                    <label className="donate-label">First Name</label>
                    <input
                      name="firstName"
                      value={form.firstName}
                      onChange={handleInput}
                    />
                    {errors.firstName && (
                      <p className="donate-field-error">{errors.firstName}</p>
                    )}
                  </div>

                  <div>
                    <label className="donate-label">Last Name</label>
                    <input
                      name="lastName"
                      value={form.lastName}
                      onChange={handleInput}
                    />
                    {errors.lastName && (
                      <p className="donate-field-error">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <label className="donate-label">Email</label>
                <input name="email" value={form.email} onChange={handleInput} />
                {errors.email && (
                  <p className="donate-field-error">{errors.email}</p>
                )}
              </>
            )}

            <label className="donate-label" style={{ marginTop: 20 }}>
              Notes
            </label>
            <textarea
              className="donate-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* RIGHT */}
          <div className="donate-form-right">
            <div className="donate-summary-box">
              <h3>Select Amount</h3>

              <div className="donate-amounts">
                {AMOUNTS.map((a) => (
                  <button
                    key={a}
                    className={`donate-amount-btn${amount === a && !customAmount ? ' active' : ''}`}
                    onClick={() => {
                      setAmount(a);
                      setCustomAmount('');
                    }}
                  >
                    ${a}
                  </button>
                ))}
              </div>

              <div className="donate-custom">
                <span>$</span>
                <input
                  type="number"
                  placeholder="Custom amount"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setAmount(null);
                  }}
                />
              </div>

              {errors.amount && (
                <p className="donate-field-error">{errors.amount}</p>
              )}
            </div>

            <div className="donate-order-summary">
              <div className="donate-summary-row">
                <span>Total</span>
                <span className="donate-summary-amount">
                  ${finalAmount || 0}
                </span>
              </div>
            </div>

            <button className="btn-donate-submit" onClick={handleSubmit}>
              Donate ${finalAmount || '—'} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DonatePage;
