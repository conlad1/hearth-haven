import { useEffect, useState } from "react";
import { Phone, MapPin, BookOpen } from "lucide-react";
import { API_BASE_URL as API } from "../api/config";

interface SafehouseFilterOptions {
  regions: string[];
}

function ResourcesPage() {
  const [regions, setRegions] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API}/Safehouse/FilterOptions`)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load safehouse regions");
        return response.json() as Promise<SafehouseFilterOptions>;
      })
      .then((data) => setRegions(data.regions ?? []))
      .catch(() => setRegions([]));
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Get Help & Resources</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Confidential support, safe locations, and education to help you or someone you know.
        </p>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center gap-3">
          <Phone className="text-orange-500" />
          <h2 className="text-xl font-semibold">Helpline Numbers</h2>
        </div>

        <ul className="space-y-3 text-sm">
          <li><strong>National Human Trafficking Hotline:</strong> 1-888-373-7888</li>
          <li><strong>Text:</strong> "HELP" to 233733</li>
          <li><strong>Emergency:</strong> 911</li>
        </ul>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center gap-3">
          <MapPin className="text-orange-500" />
          <h2 className="text-xl font-semibold">Safehouse Locations</h2>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          For safety reasons, exact safehouse addresses are not publicly listed. We currently support survivors across these regions:
        </p>

        {regions.length > 0 ? (
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-gray-700 dark:text-gray-300">
            {regions.map((region) => (
              <li key={region}>{region}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Region information is currently unavailable. Please call a hotline or contact us directly to be connected to a secure shelter near you.
          </p>
        )}
      </div>

      <div className="card">
        <div className="mb-4 flex items-center gap-3">
          <BookOpen className="text-orange-500" />
          <h2 className="text-xl font-semibold">Educational Resources</h2>
        </div>

        <ul className="ml-5 list-disc space-y-2 text-sm">
          <li>Signs of human trafficking</li>
          <li>How to safely seek help</li>
          <li>Understanding exploitation and coercion</li>
          <li>Support for survivors</li>
        </ul>
      </div>
    </div>
  );
}

export default ResourcesPage;
