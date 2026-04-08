import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthService } from '../api/AuthService';
import { Eye, EyeOff, UserPlus } from 'lucide-react';

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const response = await AuthService.register(email, password);
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
    <div className="flex min-h-[calc(100vh-57px)] items-center justify-center bg-white dark:bg-gray-900 px-4 py-16">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-md border border-gray-200 dark:border-gray-700 md:flex">
        {/* Left panel */}
        <div className="flex flex-col justify-center border-r border-orange-200 dark:border-orange-500/20 bg-orange-50 dark:bg-orange-500/10 px-8 py-12 md:w-5/12 md:px-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create an Account</h1>
          <p className="mt-3 text-gray-500 dark:text-gray-400">Join us in <span className="font-medium text-orange-500">restoring hope</span> and rebuilding lives.</p>
        </div>

        {/* Form */}
        <div className="flex flex-col justify-center px-8 py-12 md:w-7/12 md:px-10">
          <h2 className="text-2xl font-bold">Register</h2>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
          )}

          <form onSubmit={handleRegister} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</span>
              <input type="text" placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} required className="input-field" />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</span>
              <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required className="input-field" />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Password</span>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} placeholder="Create a password" value={password} onChange={e => setPassword(e.target.value)} required className="input-field pr-10" />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</span>
              <div className="relative">
                <input type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm your password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="input-field pr-10" />
                <button type="button" onClick={() => setShowConfirmPassword(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <button type="submit" className="btn-primary w-full">
              <UserPlus className="h-4 w-4" /> Create Account
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="font-medium text-orange-500 hover:text-orange-600">
              Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
