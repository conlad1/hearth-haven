import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import React from 'react';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'form' | 'confirm'>('form');

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    setStep('confirm');
  }

  function handleConfirm() {
    // TODO: call login API
    console.log('Login:', { email });
  }

  if (step === 'confirm') {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-left">
            <h1>Welcome Back</h1>
            <p>Continue your journey of restoring hope and rebuilding lives.</p>
          </div>

          <div className="auth-box">
            <h2>Confirm Sign In</h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
              You're signing in with the following account.
            </p>

            <div className="auth-confirm-rows">
              <div className="auth-confirm-row">
                <span>Email</span>
                <span>{email}</span>
              </div>
              <div className="auth-confirm-row">
                <span>Password</span>
                <span>••••••••</span>
              </div>
            </div>

            <button className="auth-submit" onClick={handleConfirm}>Confirm &amp; Sign In</button>
            <button className="auth-back" onClick={() => setStep('form')}>← Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-left">
          <h1>Welcome Back</h1>
          <p>Continue your journey of restoring hope and rebuilding lives.</p>
        </div>

        <div className="auth-box">
          <h2>Sign In</h2>

          <form className="auth-form" onSubmit={handleNext}>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button className="auth-submit" type="submit">Next →</button>
          </form>

          <p className="auth-switch">
            Don't have an account?{' '}
            <span onClick={() => navigate('/register')}>Register</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
