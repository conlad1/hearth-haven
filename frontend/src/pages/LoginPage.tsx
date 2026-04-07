import { useNavigate } from 'react-router-dom';
import React from 'react';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-left">
          <h1>Welcome Back</h1>
          <p>Continue your journey of restoring hope and rebuilding lives.</p>
        </div>

        <div className="auth-box">
          <h2>Sign In</h2>

          <form className="auth-form">
            <input type="email" placeholder="Email Address" />
            <input type="password" placeholder="Password" />

            <button className="auth-submit">Login</button>
          </form>

          {/* 🔥 SWITCH TO REGISTER PAGE */}
          <p className="auth-switch">
            Don't have an account?
            <span onClick={() => navigate('/register')}>Register</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
