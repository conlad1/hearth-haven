import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';

function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        {/* Top grid */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="mb-3 flex items-center gap-2">
              <img src="/Logo.svg" alt="The Hearth Project" className="h-8 w-8 dark:brightness-200" />
              <span className="text-lg font-bold text-gray-900 dark:text-white">The Hearth Project</span>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              Restoring hope and rebuilding lives through safe refuge,
              comprehensive care, and community support.
            </p>
            <p className="flex items-center gap-2 text-sm font-medium text-orange-500">
              <Phone className="h-4 w-4" />
              24/7 Crisis Line: <a href="tel:1-800-467-3123" className="text-orange-500 hover:text-orange-600">1-800-HOPE-123</a>
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">Quick Links</h4>
            <div className="flex flex-col gap-2.5">
              <Link to="/" className="text-sm text-gray-500 no-underline transition hover:text-orange-500 dark:text-gray-400">Home</Link>
              <Link to="/outreach" className="text-sm text-gray-500 no-underline transition hover:text-orange-500 dark:text-gray-400">Outreach</Link>
              <Link to="/cases" className="text-sm text-gray-500 no-underline transition hover:text-orange-500 dark:text-gray-400">Case Management</Link>
              <Link to="/donors" className="text-sm text-gray-500 no-underline transition hover:text-orange-500 dark:text-gray-400">Donors</Link>
              <Link to="/donate" className="text-sm text-gray-500 no-underline transition hover:text-orange-500 dark:text-gray-400">Donate</Link>
            </div>
          </div>

          {/* Get Involved */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">Get Involved</h4>
            <div className="flex flex-col gap-2.5">
              <Link to="/donate" className="text-sm text-gray-500 no-underline transition hover:text-orange-500 dark:text-gray-400">Donate</Link>
              <Link to="/register" className="text-sm text-gray-500 no-underline transition hover:text-orange-500 dark:text-gray-400">Create an Account</Link>
              <Link to="/login" className="text-sm text-gray-500 no-underline transition hover:text-orange-500 dark:text-gray-400">Sign In</Link>
              <Link to="/outreach" className="text-sm text-gray-500 no-underline transition hover:text-orange-500 dark:text-gray-400">Outreach Insights</Link>
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">Support</h4>
            <div className="flex flex-col gap-2.5">
              <Link to="/#contact" className="text-sm text-gray-500 no-underline transition hover:text-orange-500 dark:text-gray-400">Contact Us</Link>
              <Link to="/privacy" className="text-sm text-gray-500 no-underline transition hover:text-orange-500 dark:text-gray-400">Privacy Policy</Link>
              <Link to="/terms" className="text-sm text-gray-500 no-underline transition hover:text-orange-500 dark:text-gray-400">Terms of Service</Link>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-10 border-t border-gray-200 dark:border-gray-700" />

        {/* Bottom */}
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            &copy; {new Date().getFullYear()} The Hearth Project. All rights reserved.
            Soon to be a registered 501(c)(3) nonprofit organization.
          </p>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-xs text-gray-400 no-underline transition hover:text-orange-500 dark:text-gray-500">Privacy</Link>
            <Link to="/terms" className="text-xs text-gray-400 no-underline transition hover:text-orange-500 dark:text-gray-500">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
