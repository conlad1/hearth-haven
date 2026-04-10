import { useEffect, useState } from 'react';
import { Phone, MapPin, BookOpen, LifeBuoy } from 'lucide-react';
import { API_BASE_URL as API } from '../../api/core/config';
import { apiFetch } from '../../api/core/http';

interface SafehouseFilterOptions {
  regions: string[];
}

function ResourcesPage() {
  const [regions, setRegions] = useState<string[]>([]);

  useEffect(() => {
    apiFetch(`${API}/Safehouse/PublicRegions`)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load safehouse regions');
        return response.json() as Promise<SafehouseFilterOptions>;
      })
      .then((data) => setRegions(data.regions ?? []))
      .catch(() => setRegions([]));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        {/* Page header */}
        <div className="mb-12 text-center">
          <div className="mb-4 flex items-center justify-center gap-2 text-orange-500">
            <LifeBuoy className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-widest">
              Support
            </span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">
            Get Help &amp; Resources
          </h1>
          <p className="mt-3 leading-relaxed text-gray-500 dark:text-gray-400">
            Confidential support, safe locations, and education to help you or
            someone you know.
          </p>
        </div>

        {/* Cards */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-3">
              <Phone className="h-5 w-5 text-orange-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Helpline Numbers
              </h2>
            </div>

            <ul className="space-y-3 leading-relaxed text-gray-600 dark:text-gray-400">
              <li>
                <strong className="text-gray-900 dark:text-white">
                  National Human Trafficking Hotline:
                </strong>{' '}
                1-888-373-7888
              </li>
              <li>
                <strong className="text-gray-900 dark:text-white">
                  Text:
                </strong>{' '}
                &quot;HELP&quot; to 233733
              </li>
              <li>
                <strong className="text-gray-900 dark:text-white">
                  Emergency:
                </strong>{' '}
                911
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-3">
              <MapPin className="h-5 w-5 text-orange-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Safehouse Locations
              </h2>
            </div>

            <p className="leading-relaxed text-gray-600 dark:text-gray-400">
              For safety reasons, exact safehouse addresses are not publicly
              listed. We currently support survivors across these regions:
            </p>

            {regions.length > 0 ? (
              <ul className="mt-4 ml-5 list-disc space-y-2 leading-relaxed text-gray-600 dark:text-gray-400">
                {regions.map((region) => (
                  <li key={region}>{region}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Region information is currently unavailable. Please call a
                hotline or contact us directly to be connected to a secure
                shelter near you.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-orange-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Educational Resources
              </h2>
            </div>

            <ul className="ml-5 list-disc space-y-2 leading-relaxed text-gray-600 dark:text-gray-400">
              <li>Signs of human trafficking</li>
              <li>How to safely seek help</li>
              <li>Understanding exploitation and coercion</li>
              <li>Support for survivors</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResourcesPage;
