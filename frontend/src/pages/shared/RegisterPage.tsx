import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthService } from '../../api/core/AuthService';
import { Check, Eye, EyeOff, Heart, UserPlus } from 'lucide-react';
import {
  getPasswordRuleStatus,
  validatePassword,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MIN_UNIQUE_CHARS,
} from '../../utils/passwordPolicy';

type RegisterNavigationState = { returnTo?: string } | null;

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as RegisterNavigationState;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const passwordRuleStatus = getPasswordRuleStatus(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setError(`Password does not meet policy: ${passwordErrors.join(', ')}.`);
      return;
    }

    try {
      const response = await AuthService.register(email, fullName, password);
      if (response.ok) {
        navigate('/login', {
          replace: true,
          state: { registered: true, returnTo: locationState?.returnTo || '/' },
        });
      } else {
        const data = await response.json();
        setError(data[0]?.description || data?.message || data?.Message || "Registration failed. Please check your password strength.");
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
          <h1 className="mt-6 text-3xl font-black text-gray-900 dark:text-white">Join the Mission</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 leading-relaxed">
            Create an account and help us restore hope.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        <form onSubmit={handleRegister} className="mt-8 space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</span>
            <input type="text" placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} required className="input-field" />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</span>
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required className="input-field" />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Password</span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
                className="input-field pr-10"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Password requirements</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Minimum {PASSWORD_MIN_LENGTH} characters with lowercase, uppercase, number, special character, and at least {PASSWORD_MIN_UNIQUE_CHARS} unique characters.
              </p>
              <ul className="mt-3 space-y-2">
                {passwordRuleStatus.map((rule) => (
                  <li key={rule.id} className={`flex items-center gap-2 text-sm ${rule.isMet ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    <Check className={`h-4 w-4 ${rule.isMet ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'}`} />
                    <span>{rule.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</span>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="input-field pr-10"
              />
              <button type="button" onClick={() => setShowConfirmPassword(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <button type="submit" className="btn-primary w-full">
            <UserPlus className="h-4 w-4" /> Create Account
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="font-medium text-orange-500 hover:text-orange-600">
            Login
          </button>
        </p>
      </div>
    </div>
  );
}
