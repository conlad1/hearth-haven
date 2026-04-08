import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Home, Banknote, Handshake, ArrowRight } from 'lucide-react';
import { API_BASE_URL as API } from '../api/config';

interface Stats {
  totalDonations: number;
  totalMonetary: number;
  totalDonors: number;
  activeSafehouses: number;
  totalResidents: number;
  activeResidents: number;
  totalAllocated: number;
  byProgramArea: { area: string; amount: number }[];
  byDonationType: { type: string; count: number }[];
}

function fmt(n: number) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0 });
}

const kpiCards = [
  { key: 'residents', icon: Heart, label: 'Children Supported', color: 'bg-orange-50 dark:bg-orange-500/10 text-orange-500', getValue: (s: Stats) => s.totalResidents.toLocaleString() },
  { key: 'safehouses', icon: Home, label: 'Active Safehouses', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300', getValue: (s: Stats) => String(s.activeSafehouses) },
  { key: 'donations', icon: Banknote, label: 'Total Donations Received', color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500', getValue: (s: Stats) => fmt(s.totalMonetary) },
  { key: 'donors', icon: Handshake, label: 'Generous Donors', color: 'bg-blue-50 dark:bg-blue-500/10 text-blue-500', getValue: (s: Stats) => s.totalDonors.toLocaleString() },
];

export default function ImpactDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/Impact/Stats`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const maxArea = stats ? Math.max(...stats.byProgramArea.map((a) => a.amount), 1) : 1;

  return (
    <div>
      <section className="py-16 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
          Our <span className="text-orange-500">Impact</span>
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-gray-500 dark:text-gray-400">
          See how your generosity is transforming lives - every dollar tracked, every child supported.
        </p>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {loading && <p className="text-center text-gray-500">Loading...</p>}
        {error && <p className="text-center text-red-500">Could not load impact data.</p>}

        {stats && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {kpiCards.map(({ key, icon: Icon, label, color, getValue }) => (
                <div key={key} className="card flex flex-col items-center text-center">
                  <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{getValue(stats)}</div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{label}</div>
                </div>
              ))}
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="card">
                <h2 className="text-lg font-bold">Resources by Program Area</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">How allocated funds are distributed across programs</p>

                {stats.byProgramArea.length === 0 ? (
                  <p className="mt-6 text-sm text-gray-400 dark:text-gray-500">No allocations recorded yet.</p>
                ) : (
                  <div className="mt-6 space-y-4">
                    {stats.byProgramArea.map((a) => (
                      <div key={a.area}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700 dark:text-gray-300">{a.area}</span>
                          <span className="text-gray-500 dark:text-gray-400">{fmt(a.amount)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                          <div
                            className="h-full rounded-full bg-orange-500 transition-all"
                            style={{ width: `${(a.amount / maxArea) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <h2 className="text-lg font-bold">Ways People Give</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Contributions by donation type</p>

                <div className="mt-6 space-y-3">
                  {stats.byDonationType.map((d) => (
                    <div key={d.type} className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                      <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">{d.type}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{d.count} donation{d.count !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>

                <div className="my-6 border-t border-gray-100 dark:border-gray-700" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Total Allocated to Programs</span>
                    <strong className="text-gray-900 dark:text-white">{fmt(stats.totalAllocated)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Children Currently in Care</span>
                    <strong className="text-gray-900 dark:text-white">{stats.activeResidents}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 rounded-2xl border border-orange-200 dark:border-orange-500/20 bg-orange-50/50 dark:bg-orange-500/5 px-6 py-14 text-center shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Be Part of the <span className="text-orange-500">Change</span>
              </h2>
              <p className="mx-auto mt-3 max-w-md text-gray-500 dark:text-gray-400">
                Every donation directly supports a child in need of safety, care, and a brighter future.
              </p>
              <Link to="/donate" className="btn-primary mt-6 no-underline">
                Donate Now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
