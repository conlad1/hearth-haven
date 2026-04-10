import { ShieldCheck } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        {/* Page header */}
        <div className="mb-12">
          <div className="mb-4 flex items-center gap-2 text-orange-500">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-widest">
              Legal
            </span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Effective date: April 8, 2026
          </p>
        </div>

        {/* Introduction */}
        <p className="mb-10 leading-relaxed text-gray-600 dark:text-gray-400">
          This privacy policy explains how The Hearth Project collects, uses,
          and protects personal data when you use our website and related
          services.
        </p>

        {/* Sections */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Who We Are
            </h2>
            <p className="mt-3 leading-relaxed text-gray-600 dark:text-gray-400">
              The Hearth Project is a social impact initiative focused on
              restoring hope and rebuilding lives. For privacy questions or data
              requests, contact{' '}
              <a
                href="mailto:tylermitton@gmail.com"
                className="text-orange-500 hover:text-orange-600"
              >
                tylermitton@gmail.com
              </a>
              .
            </p>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Personal Data We Process
            </h2>
            <ul className="mt-3 ml-5 list-disc space-y-2 leading-relaxed text-gray-600 dark:text-gray-400">
              <li>
                Account data: email address and authentication-related records
                (passwords are stored as secure hashes by our identity provider).
              </li>
              <li>
                Donation and supporter data: names, organization details, contact
                details, and donor notes.
              </li>
              <li>
                Case management records: sensitive service and support records
                managed by authorized staff.
              </li>
              <li>
                Payment metadata: non-full-card transaction metadata used for
                donation operations and reconciliation.
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Why We Process Data (GDPR Legal Bases)
            </h2>
            <ul className="mt-3 ml-5 list-disc space-y-2 leading-relaxed text-gray-600 dark:text-gray-400">
              <li>
                Consent: when you choose to submit optional information through
                our forms.
              </li>
              <li>
                Contract: to provide requested account and donation features.
              </li>
              <li>
                Legal obligation: where recordkeeping or compliance obligations
                apply.
              </li>
              <li>
                Legitimate interests: to operate, secure, and improve service
                delivery.
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Data Retention
            </h2>
            <p className="mt-3 leading-relaxed text-gray-600 dark:text-gray-400">
              We retain data only for as long as necessary for the purposes
              described in this notice, with periodic review and legal/archive
              exceptions where required.
            </p>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Cookies and Tracking
            </h2>
            <p className="mt-3 leading-relaxed text-gray-600 dark:text-gray-400">
              The Hearth Project uses essential cookies to keep the site working.
              No analytics cookies are ever gathered on The Hearth Project
              website.
            </p>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Your GDPR Rights
            </h2>
            <ul className="mt-3 ml-5 list-disc space-y-2 leading-relaxed text-gray-600 dark:text-gray-400">
              <li>Access, correction, and deletion requests</li>
              <li>Restriction or objection to certain processing</li>
              <li>Data portability where applicable</li>
              <li>Withdrawal of consent for consent-based processing</li>
            </ul>
            <p className="mt-3 leading-relaxed text-gray-600 dark:text-gray-400">
              To exercise your rights, contact{' '}
              <a
                href="mailto:tylermitton@gmail.com"
                className="text-orange-500 hover:text-orange-600"
              >
                tylermitton@gmail.com
              </a>
              .
            </p>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              International Transfers and Security
            </h2>
            <p className="mt-3 leading-relaxed text-gray-600 dark:text-gray-400">
              We use reasonable technical and organizational safeguards to
              protect personal data. Where data transfers occur, we apply
              appropriate safeguards consistent with applicable law.
            </p>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Updates to This Policy
            </h2>
            <p className="mt-3 leading-relaxed text-gray-600 dark:text-gray-400">
              We may update this policy as our systems and legal obligations
              evolve. Material updates will be reflected by updating the
              effective date.
            </p>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Project Domain Notice
            </h2>
            <p className="mt-3 leading-relaxed text-gray-600 dark:text-gray-400">
              The canonical public site domain is{' '}
              <a
                href="https://the-hearth-project.org"
                className="text-orange-500 hover:text-orange-600"
              >
                https://the-hearth-project.org
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
