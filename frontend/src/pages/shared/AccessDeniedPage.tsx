import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export default function AccessDeniedPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-500/10">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Access denied</h1>
      <p className="mt-3 max-w-xl text-sm text-gray-500 dark:text-gray-400">
        You are signed in, but your account does not have permission to open that page.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-primary no-underline">Back to home</Link>
        <Link to="/profile" className="btn-secondary no-underline">My profile</Link>
      </div>
    </div>
  );
}