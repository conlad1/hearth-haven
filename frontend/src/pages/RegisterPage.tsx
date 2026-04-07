import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import React from 'react';
import { AuthService } from '../api/AuthService';

type RegisterNavigationState = {
  returnTo?: string;
} | null;

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as RegisterNavigationState;
  
  // State for the form inputs
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // State for UI feedback
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Validate that passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      // 2. Call the backend API (Note: fullName is not sent yet)
      const response = await AuthService.register(email, password);
      
      if (response.ok) {
        navigate('/login', {
          replace: true,
          state: {
            registered: true,
            returnTo: locationState?.returnTo || '/',
          },
        });
      } else {
        // If the backend rejects the password (e.g., no uppercase letter)
        const data = await response.json();
        // Identity returns an array of errors, we grab the first one
        setError(data[0]?.description || data?.message || data?.Message || "Registration failed. Please check your password strength.");
      }
    } catch {
      setError('Network error. Is the backend running?');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-left">
          <h1>Create an Account</h1>
          <p>Join us in restoring hope and rebuilding lives.</p>
        </div>

        <div className="auth-box">
          <h2>Register</h2>

          {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}

          <form className="auth-form" onSubmit={handleRegister}>
            <input 
              type="text" 
              placeholder="Full Name" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
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

            <div className="auth-password-field">
              <input 
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm Password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="auth-toggle-password"
                onClick={() => setShowConfirmPassword((current) => !current)}
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <button type="submit" className="auth-submit">Create Account</button>
          </form>

          {/* 🔥 SWITCH TO LOGIN PAGE */}
          <p className="auth-switch">
            Already have an account?{' '}
            <span onClick={() => navigate('/login')} style={{ cursor: 'pointer', color: 'blue' }}>Login</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;