import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DonatePage.css';

const AMOUNTS: number[] = [10, 25, 50, 100, 250, 500];

type AuthMode     = 'anonymous' | 'loggedin';
type Frequency    = 'once'      | 'monthly';
type DonorType    = 'individual' | 'organization';
type DonationType = 'monetary'  | 'inkind' | 'volunteer';
type PayMethod    = 'card'      | 'paypal';

function DonatePage() {
  // ── DEV ONLY: remove before deploying ───────────────────────────────────
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // ────────────────────────────────────────────────────────────────────────

  const navigate = useNavigate();

  const [authMode,     setAuthMode]     = useState<AuthMode>('anonymous');
  const [donorType,    setDonorType]    = useState<DonorType>('individual');
  const [donationType, setDonationType] = useState<DonationType>('monetary');
  const [frequency,    setFrequency]    = useState<Frequency>('once');
  const [amount,       setAmount]       = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState('');
  const [notes,        setNotes]        = useState('');
  const [payMethod,    setPayMethod]    = useState<PayMethod>('card');

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', organizationName: '',
    cardNumber: '', cardExpiry: '', cardCvc: '', cardName: '',
  });

  const finalAmount = customAmount ? Number(customAmount) : (amount ?? 0);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleAuthToggle(mode: AuthMode) {
    setAuthMode(mode);
    if (mode === 'anonymous') {
      setDonationType('monetary');
      setDonorType('individual');
    }
  }

  function handleSubmit(e: React.MouseEvent) {
    e.preventDefault();
    const payload = {
      supporter: {
        supporter_type:
          authMode === 'anonymous' ? 'Anonymous'
          : donorType === 'organization' ? 'Corporate' : 'Individual',
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        organization_name: donorType === 'organization' ? form.organizationName : null,
        status: 'Active',
      },
      donation: {
        donation_type:
          donationType === 'monetary' ? 'Monetary'
          : donationType === 'inkind' ? 'InKind' : 'Volunteer',
        is_recurring: frequency === 'monthly',
        currency_code: 'PHP',
        amount: donationType === 'monetary' ? finalAmount : null,
        estimated_value: donationType === 'monetary' ? finalAmount : null,
        channel_source: payMethod === 'card' ? 'Card' : 'PayPal',
        notes,
      },
    };
    console.log('SEND TO BACKEND:', payload);
    alert('Check console → payload ready for DB ✅');
  }

  const showPayment      = donationType === 'monetary';
  const showLoginTeaser  = authMode === 'loggedin' && !isLoggedIn;

  return (
    <div className="donate-page">

      {/* ── DEV TOGGLE ───────────────────────────────────────────────────── */}
      <div className="dev-toggle-bar">
        <span>🛠 DEV</span>
        <button
          className={`dev-toggle-btn${isLoggedIn ? ' on' : ''}`}
          onClick={() => setIsLoggedIn(v => !v)}
        >
          Logged In: {isLoggedIn ? 'ON ✓' : 'OFF'}
        </button>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>Remove before deploying</span>
      </div>

      {/* ── HERO — toggle lives here now ─────────────────────────────────── */}
      <div className="donate-hero">
        <div className="donate-hero-inner">
          <div className="donate-heart-icon">❤️</div>
          <h1>Make a Difference Today</h1>
          <p>Your generosity helps change lives.</p>

          {/* Toggle embedded at the bottom of the hero */}
          <div className="donate-hero-toggle">
            <button
              className={`donate-hero-tab${authMode === 'anonymous' ? ' active' : ''}`}
              onClick={() => handleAuthToggle('anonymous')}
            >
              🕊️ Donate Anonymously
            </button>
            <button
              className={`donate-hero-tab${authMode === 'loggedin' ? ' active' : ''}`}
              onClick={() => handleAuthToggle('loggedin')}
            >
              🌟 Log In to Donate
            </button>
          </div>
        </div>
      </div>

      {/* ── LOGIN TEASER PANEL ───────────────────────────────────────────── */}
      {showLoginTeaser && (
        <div className="donate-login-teaser">
          <div className="donate-login-teaser-inner">

            <div className="donate-teaser-left">
              <h2>More ways to give when you log in</h2>
              <p>Create an account or sign in to unlock all donation types and track your impact over time.</p>
              <div className="donate-teaser-options">
                <div className="donate-teaser-option">
                  <span className="donate-teaser-icon">💰</span>
                  <div>
                    <strong>Donate Money</strong>
                    <p>One-time or recurring monetary gifts, with full donation history.</p>
                  </div>
                </div>
                <div className="donate-teaser-option">
                  <span className="donate-teaser-icon">📦</span>
                  <div>
                    <strong>Contribute Resources</strong>
                    <p>Donate clothing, food, supplies, or other in-kind items.</p>
                  </div>
                </div>
                <div className="donate-teaser-option">
                  <span className="donate-teaser-icon">🤝</span>
                  <div>
                    <strong>Volunteer Your Time</strong>
                    <p>Share your skills and availability — we'll reach out to coordinate.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="donate-teaser-right">
              <div className="donate-teaser-card">
                <h3>Ready to get started?</h3>
                <p>Log in to your account to donate money, resources, or time.</p>
                <button
                  className="btn-teaser-login"
                  onClick={() => navigate('/login', { state: { returnTo: '/donate' } })}
                >
                  Log In to Donate →
                </button>
                <div className="donate-teaser-divider"><span>or</span></div>
                <p className="donate-teaser-register-text">Don't have an account?</p>
                <button
                  className="btn-teaser-register"
                  onClick={() => navigate('/register', { state: { returnTo: '/donate' } })}
                >
                  Create an Account
                </button>
                <button
                  className="btn-teaser-anonymous"
                  onClick={() => handleAuthToggle('anonymous')}
                >
                  Continue anonymously instead →
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── DONATION FORM ────────────────────────────────────────────────── */}
      {!showLoginTeaser && (
        <div className="donate-form-page">

          {/* ════ LEFT ════ */}
          <div className="donate-form-left">
            <h2>Your Information</h2>

            {authMode === 'anonymous' && (
              <>
                <div className="donate-receipt-notice">
                  <span className="donate-receipt-icon">🧾</span>
                  <p>We'll use these details to send your receipt only — no account will be created and we won't contact you for anything else.</p>
                </div>

                <div className="donate-form-row two-col">
                  <div>
                    <label className="donate-label">First Name</label>
                    <input name="firstName" placeholder="First Name" value={form.firstName} onChange={handleInput} />
                  </div>
                  <div>
                    <label className="donate-label">Last Name</label>
                    <input name="lastName" placeholder="Last Name" value={form.lastName} onChange={handleInput} />
                  </div>
                </div>

                <label className="donate-label">Email</label>
                <input name="email" type="email" placeholder="Email for receipt" value={form.email} onChange={handleInput} />

                <div className="donate-anon-individual-tag">👤 Individual Donation</div>
              </>
            )}

            {authMode === 'loggedin' && isLoggedIn && (
              <>
                <div className="donate-welcome-box">
                  <h3>Welcome back 👋</h3>
                  <p>Your info is already saved.</p>
                </div>

                <div className="donate-type-toggle" style={{ marginBottom: 20 }}>
                  <h3>Donating As</h3>
                  <div className="toggle-buttons">
                    <button className={donorType === 'individual' ? 'active' : ''} onClick={() => setDonorType('individual')}>👤 Individual</button>
                    <button className={donorType === 'organization' ? 'active' : ''} onClick={() => setDonorType('organization')}>🏢 Organization</button>
                  </div>
                </div>

                {donorType === 'organization' && (
                  <>
                    <label className="donate-label">Organization Name</label>
                    <input name="organizationName" placeholder="Organization Name" value={form.organizationName} onChange={handleInput} required />
                  </>
                )}
              </>
            )}

            {donationType !== 'monetary' && (
              <>
                <label className="donate-label" style={{ marginTop: 20 }}>Details</label>
                <textarea
                  className="donate-textarea"
                  placeholder={donationType === 'inkind' ? "Describe the items or resources you'd like to contribute..." : 'Tell us about your availability and skills...'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </>
            )}

            {/* ── PAYMENT METHOD ── */}
            {showPayment && (
              <div className="donate-payment-section">
                <h3 className="donate-payment-title">Payment Method</h3>

                <div className="donate-pay-toggle">
                  <button className={`donate-pay-btn${payMethod === 'card' ? ' active' : ''}`} onClick={() => setPayMethod('card')}>
                    💳 Credit / Debit Card
                  </button>
                  <button className={`donate-pay-btn${payMethod === 'paypal' ? ' active' : ''}`} onClick={() => setPayMethod('paypal')}>
                    <span className="paypal-logo">Pay<span>Pal</span></span>
                  </button>
                </div>

                {payMethod === 'card' && (
                  <div className="donate-card-fields">
                    <label className="donate-label">Name on Card</label>
                    <input name="cardName" placeholder="Full name as on card" value={form.cardName} onChange={handleInput} />

                    <label className="donate-label">Card Number</label>
                    <input
                      name="cardNumber" placeholder="1234 5678 9012 3456" maxLength={19} value={form.cardNumber}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
                        setForm({ ...form, cardNumber: raw.match(/.{1,4}/g)?.join(' ') ?? raw });
                      }}
                    />

                    <div className="donate-form-row two-col">
                      <div>
                        <label className="donate-label">Expiry</label>
                        <input
                          name="cardExpiry" placeholder="MM / YY" maxLength={7} value={form.cardExpiry}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
                            setForm({ ...form, cardExpiry: raw.length > 2 ? `${raw.slice(0, 2)} / ${raw.slice(2)}` : raw });
                          }}
                        />
                      </div>
                      <div>
                        <label className="donate-label">CVC</label>
                        <input
                          name="cardCvc" placeholder="123" maxLength={4} value={form.cardCvc}
                          onChange={(e) => setForm({ ...form, cardCvc: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                        />
                      </div>
                    </div>

                    <p className="donate-card-notice">🔒 Your card details are encrypted and never stored on our servers.</p>
                  </div>
                )}

                {payMethod === 'paypal' && (
                  <div className="donate-paypal-box">
                    <p>You'll be redirected to PayPal to complete your donation securely.</p>
                    <div className="donate-paypal-logo-large">Pay<span>Pal</span></div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ════ RIGHT ════ */}
          <div className="donate-form-right">

            {authMode === 'loggedin' && isLoggedIn && (
              <div className="donate-type-toggle">
                <h3>Donation Type</h3>
                <div className="toggle-buttons">
                  <button className={donationType === 'monetary'  ? 'active' : ''} onClick={() => setDonationType('monetary')}>💰 Money</button>
                  <button className={donationType === 'inkind'    ? 'active' : ''} onClick={() => setDonationType('inkind')}>📦 Resources</button>
                  <button className={donationType === 'volunteer' ? 'active' : ''} onClick={() => setDonationType('volunteer')}>🤝 Volunteer</button>
                </div>
              </div>
            )}

            {donationType === 'monetary' && (
              <div className="donate-summary-box">
                <h3>Select Amount</h3>
                <div className="donate-frequency">
                  <button className={frequency === 'once'    ? 'active' : ''} onClick={() => setFrequency('once')}>Once</button>
                  <button className={frequency === 'monthly' ? 'active' : ''} onClick={() => setFrequency('monthly')}>Monthly</button>
                </div>
                <div className="donate-amounts">
                  {AMOUNTS.map((a) => (
                    <button
                      key={a}
                      className={`donate-amount-btn${amount === a && !customAmount ? ' active' : ''}`}
                      onClick={() => { setAmount(a); setCustomAmount(''); }}
                    >
                      ${a}
                    </button>
                  ))}
                </div>
                <div className="donate-custom">
                  <span>$</span>
                  <input
                    type="number" placeholder="Custom amount" value={customAmount}
                    onChange={(e) => { setCustomAmount(e.target.value); setAmount(null); }}
                  />
                </div>
              </div>
            )}

            {donationType !== 'monetary' && (
              <div className="donate-summary-box donate-nonmonetary-box">
                <span className="donate-nonmonetary-icon">{donationType === 'inkind' ? '📦' : '🤝'}</span>
                <h3>{donationType === 'inkind' ? 'Resource Donation' : 'Volunteer Time'}</h3>
                <p>{donationType === 'inkind' ? "Describe the items or resources you'd like to contribute in the details field." : 'Share your availability and skills. Our team will reach out to coordinate.'}</p>
              </div>
            )}

            {donationType === 'monetary' && (
              <div className="donate-order-summary">
                <div className="donate-summary-row">
                  <span>Donation</span>
                  <span className="donate-summary-amount">${finalAmount || '0'}{frequency === 'monthly' ? ' / mo' : ''}</span>
                </div>
                <div className="donate-summary-row">
                  <span>Type</span>
                  <span>{authMode === 'anonymous' ? 'Anonymous' : donorType === 'organization' ? 'Organization' : 'Individual'}</span>
                </div>
                <div className="donate-summary-row">
                  <span>Payment</span>
                  <span>{payMethod === 'card' ? '💳 Card' : '🅿 PayPal'}</span>
                </div>
                <div className="donate-summary-divider" />
                <div className="donate-summary-row total">
                  <span>Total</span>
                  <span>${finalAmount || '0'}{frequency === 'monthly' ? ' / mo' : ''}</span>
                </div>
              </div>
            )}

            <button className="btn-donate-submit" onClick={handleSubmit}>
              {donationType === 'monetary'
                ? payMethod === 'paypal' ? `Continue to PayPal → $${finalAmount || '—'}` : `Donate $${finalAmount || '—'} →`
                : donationType === 'inkind' ? 'Submit Resource Donation →' : 'Sign Up to Volunteer →'}
            </button>

            <p className="donate-tax-note">Hearth Haven is a registered nonprofit. Your contribution makes a difference.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default DonatePage;