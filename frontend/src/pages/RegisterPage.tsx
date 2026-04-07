import { useNavigate } from 'react-router-dom';
import React from 'react';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-left">
          <h1>Create an Account</h1>
          <p>Join us in restoring hope and rebuilding lives.</p>
        </div>

        <div className="auth-box">
          <h2>Register</h2>

          <form className="auth-form">
            <input type="text" placeholder="Full Name" />
            <input type="email" placeholder="Email Address" />
            <input type="password" placeholder="Password" />
            <input type="password" placeholder="Confirm Password" />

            <button className="auth-submit">Create Account</button>
          </form>

          {/* 🔥 SWITCH TO LOGIN PAGE */}
          <p className="auth-switch">
            Already have an account?
            <span onClick={() => navigate('/login')}>Login</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
