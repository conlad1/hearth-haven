import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthService } from '../../api/core/AuthService';
import { Eye, EyeOff, Heart, LogIn } from 'lucide-react';

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
        AuthService.setAuthenticated();
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
    <div className="flex min-h-[calc(100vh-57px)] items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 sm:p-10">
        {/* Branding */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-500/10">
            <Heart className="h-7 w-7 text-orange-500" />
          </div>
          <h1 className="mt-6 text-3xl font-black text-gray-900 dark:text-white">Welcome Back</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 leading-relaxed">
            Sign in to continue your journey of restoring hope.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</span>
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
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Password</span>
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

        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Don't have an account?{' '}
          <button onClick={() => navigate('/register')} className="font-medium text-orange-500 hover:text-orange-600">
            Register
          </button>
        </p>
      </div>

      {/* Success modal */}
      {showSuccessModal && (
        <div className="modal-overlay" role="alertdialog" aria-modal="true">
          <div className="modal-body max-w-sm text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-500/10">
              <Heart className="h-6 w-6 text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Welcome to The Hearth Project</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{successMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
