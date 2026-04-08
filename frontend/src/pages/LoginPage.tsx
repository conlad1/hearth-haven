import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import React from 'react';
import { AuthService } from '../api/AuthService';

type LoginNavigationState = {
  registered?: boolean;
  returnTo?: string;
} | null;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LoginNavigationState;
  const returnTo = locationState?.returnTo || '/';
  const fromRegistration = !!locationState?.registered;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState(
    'Login successful. Redirecting...'
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await AuthService.login(email, password);

      if (response.ok) {
        const modalMessage = fromRegistration
          ? 'Account created and login confirmed. Redirecting you to Hearth Haven...'
          : 'Login successful. Redirecting you now...';

        setSuccessMessage(modalMessage);
        AuthService.setAuthenticated(true);
        setShowSuccessModal(true);
        window.setTimeout(() => {
          navigate(returnTo, { replace: true });
        }, 1200);
      } else {
        const data = await response.json();
        const message =
          data?.message || data?.Message || 'Invalid email or password.';
        setError(message);
      }
    } catch {
      setError('Network error. Is the backend running?');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-left">
          <h1>Welcome Back</h1>
          <p>Continue your journey of restoring hope and rebuilding lives.</p>
        </div>

        <div className="auth-box">
          <h2>Sign In</h2>

          {error && (
            <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>
          )}

          <form className="auth-form" onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="auth-password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="auth-toggle-password"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <button className="auth-submit" type="submit">
              Sign In
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account?{' '}
            <span
              onClick={() => navigate('/register')}
              style={{ cursor: 'pointer', color: 'blue' }}
            >
              Register
            </span>
          </p>
        </div>
      </div>

      {showSuccessModal && (
        <div
          className="auth-modal-backdrop"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="auth-success-title"
        >
          <div className="auth-modal">
            <h3 id="auth-success-title">Welcome to Hearth Haven</h3>
            <p>{successMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
