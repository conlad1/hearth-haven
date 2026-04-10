import { ScrollText } from 'lucide-react';

export default function TermsPage() {
  const sections = [
    { title: '1. Acceptance of Terms', body: 'By accessing or using the The Hearth Project website and services, you agree to these Terms of Service. If you do not agree, please discontinue use.' },
    { title: '2. Service Scope', body: 'The Hearth Project provides informational, case-support, and donation-related tooling intended to support outreach and social impact work. Features may change over time.' },
    { title: '3. User Accounts', body: 'You are responsible for the confidentiality of your account credentials and for activity performed through your account. You agree to provide accurate information.' },
    { title: '4. Acceptable Use', body: 'You agree not to misuse the platform, interfere with system operation, attempt unauthorized access, or upload harmful content or code.' },
    { title: '5. Donations and Financial Information', body: 'Donation workflows are provided in good faith for supporter engagement and administrative processing. You are responsible for verifying donation details before submission.' },
    { title: '6. Intellectual Property', body: 'Platform content, branding, and materials are owned by The Hearth Project or respective rights holders, unless otherwise indicated.' },
    { title: '7. Privacy and Data Use', body: 'Use of this service is also governed by our Privacy Policy. By using the service, you acknowledge those data processing practices.' },
    { title: '8. Service Availability', body: 'We may modify, suspend, or discontinue parts of the service at any time, including for maintenance, security, or operational updates.' },
    { title: '9. Disclaimer', body: 'The service is provided on an "as is" and "as available" basis without warranties of any kind, to the extent permitted by law.' },
    { title: '10. Limitation of Liability', body: 'To the maximum extent permitted by law, The Hearth Project is not liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the service.' },
    { title: '11. Changes to Terms', body: 'We may update these terms as the project evolves. Continued use after updates means you accept the revised terms.' },
    { title: '12. Contact', body: 'For legal or account-related questions, contact tylermitton@gmail.com.' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        {/* Page header */}
        <div className="mb-12">
          <div className="mb-4 flex items-center gap-2 text-orange-500">
            <ScrollText className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-widest">
              Legal
            </span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Effective date: April 7, 2026
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map(({ title, body }) => (
            <section
              key={title}
              className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {title}
              </h2>
              <p className="mt-3 leading-relaxed text-gray-600 dark:text-gray-400">
                {body}
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
