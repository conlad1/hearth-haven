import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export default function AccessDeniedPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-orange-50 text-orange-500 dark:bg-orange-500/10">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h1 className="text-3xl font-black text-gray-900 dark:text-white">Access Denied</h1>
      <p className="mt-4 max-w-md text-gray-500 dark:text-gray-400 leading-relaxed">
        You are signed in, but your account does not have permission to view that page. If you think this is an error, please contact your administrator.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600 transition-colors no-underline">Back to home</Link>
        <Link to="/profile" className="btn-secondary no-underline">My profile</Link>
      </div>
    </div>
  );
}