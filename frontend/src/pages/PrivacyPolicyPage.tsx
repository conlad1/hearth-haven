export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Effective date: April 7, 2026</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-600 dark:text-gray-400 [&_h2]:mb-2 [&_h2]:mt-0 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-gray-900 dark:[&_h2]:text-white [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1">
        <p>
          This privacy policy explains how The Hearth Project collects, uses, and protects personal data when you use our website and related services.
        </p>

        <section>
          <h2>Who We Are</h2>
          <p>The Hearth Project is a social impact initiative focused on restoring hope and rebuilding lives. For privacy questions or data requests, contact tylermitton@gmail.com.</p>
        </section>

        <section>
          <h2>Personal Data We Process</h2>
          <ul>
            <li>Account data: email address and authentication-related records (passwords are stored as secure hashes by our identity provider).</li>
            <li>Donation and supporter data: names, organization details, contact details, and donor notes.</li>
            <li>Case management records: sensitive service and support records managed by authorized staff.</li>
            <li>Payment metadata: non-full-card transaction metadata used for donation operations and reconciliation.</li>
          </ul>
        </section>

        <section>
          <h2>Why We Process Data (GDPR Legal Bases)</h2>
          <ul>
            <li>Consent: when you choose to submit optional information or enable optional analytics cookies.</li>
            <li>Contract: to provide requested account and donation features.</li>
            <li>Legal obligation: where recordkeeping or compliance obligations apply.</li>
            <li>Legitimate interests: to operate, secure, and improve service delivery.</li>
          </ul>
        </section>

        <section>
          <h2>Data Retention</h2>
          <p>We retain data only for as long as necessary for the purposes described in this notice, with periodic review and legal/archive exceptions where required.</p>
        </section>

        <section>
          <h2>Cookies and Tracking</h2>
          <p>Essential cookies are always enabled for core site operation. Analytics cookies are optional and disabled by default until you opt in through our cookie preferences banner.</p>
        </section>

        <section>
          <h2>Your GDPR Rights</h2>
          <ul>
            <li>Access, correction, and deletion requests</li>
            <li>Restriction or objection to certain processing</li>
            <li>Data portability where applicable</li>
            <li>Withdrawal of consent for consent-based processing</li>
          </ul>
          <p className="mt-2">To exercise your rights, contact tylermitton@gmail.com.</p>
        </section>

        <section>
          <h2>International Transfers and Security</h2>
          <p>We use reasonable technical and organizational safeguards to protect personal data. Where data transfers occur, we apply appropriate safeguards consistent with applicable law.</p>
        </section>

        <section>
          <h2>Updates to This Policy</h2>
          <p>We may update this policy as our systems and legal obligations evolve. Material updates will be reflected by updating the effective date.</p>
        </section>

        <section>
          <h2>Project Domain Notice</h2>
          <p>Current project domain references may use thehearthproject.tylermitton.com as a temporary placeholder until the production domain is finalized.</p>
        </section>
      </div>
    </div>
  );
}
