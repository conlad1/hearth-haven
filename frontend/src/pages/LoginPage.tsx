import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthService } from '../api/AuthService';
import { Eye, EyeOff, LogIn } from 'lucide-react';

type LoginNavigationState = {
  registered?: boolean;
  returnTo?: string;
} | null;

export default function LoginPage() {
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
  const [successMessage, setSuccessMessage] = useState('Login successful. Redirecting...');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await AuthService.login(email, password);
      if (response.ok) {
        const modalMessage = fromRegistration
          ? 'Account created and login confirmed. Redirecting you to The Hearth Project...'
          : 'Login successful. Redirecting you now...';
        setSuccessMessage(modalMessage);
        AuthService.setAuthenticated(true);
        AuthService.setUserEmail(email);
        setShowSuccessModal(true);
        window.setTimeout(() => navigate(returnTo, { replace: true }), 1200);
      } else {
        const data = await response.json();
        setError(data?.message || data?.Message || 'Invalid email or password.');
      }
    } catch {
      setError('Network error. Is the backend running?');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-center justify-center bg-white dark:bg-gray-900 px-4 py-16">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-md border border-gray-200 dark:border-gray-700 md:flex">
        {/* Left panel */}
        <div className="flex flex-col justify-center border-r border-orange-200 dark:border-orange-500/20 bg-orange-50 dark:bg-orange-500/10 px-8 py-12 md:w-5/12 md:px-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome Back</h1>
          <p className="mt-3 text-gray-500 dark:text-gray-400">Continue your journey of <span className="font-medium text-orange-500">restoring hope</span> and rebuilding lives.</p>
        </div>

        {/* Form */}
        <div className="flex flex-col justify-center px-8 py-12 md:w-7/12 md:px-10">
          <h2 className="text-2xl font-bold">Sign In</h2>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="input-field"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <button type="submit" className="btn-primary w-full">
              <LogIn className="h-4 w-4" /> Sign In
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Don't have an account?{' '}
            <button onClick={() => navigate('/register')} className="font-medium text-orange-500 hover:text-orange-600">
              Register
            </button>
          </p>
        </div>
      </div>

      {/* Success modal */}
      {showSuccessModal && (
        <div className="modal-overlay" role="alertdialog" aria-modal="true">
          <div className="modal-body max-w-sm text-center">
            <h3 className="text-lg font-semibold">Welcome to The Hearth Project</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{successMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
