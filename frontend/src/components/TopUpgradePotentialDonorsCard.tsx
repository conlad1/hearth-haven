import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import {
  fetchTopUpgradePotentialDonors,
  TopUpgradePotentialDonor,
} from '../api/MLPredictAPI';

interface TopUpgradePotentialDonorsCardProps {
  limit?: number;
}

function scoreColor(score: number) {
  if (score >= 60) return 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400';
  if (score >= 35) return 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
  return 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400';
}

export default function TopUpgradePotentialDonorsCard({
  limit = 5,
}: TopUpgradePotentialDonorsCardProps) {
  const navigate = useNavigate();
  const [donors, setDonors] = useState<TopUpgradePotentialDonor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTopUpgradePotentialDonors(limit)
      .then((data) => {
        if (!cancelled) {
          setDonors(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load predictions');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return (
    <div className="card">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
          <TrendingUp className="h-5 w-5 text-green-500" /> Top Upgrade Potential Donors
        </h2>
      </div>
      <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
        ML triage aid &mdash; good candidates for major-gift outreach.
      </p>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          Could not load predictions. {error}
        </p>
      ) : donors.length === 0 ? (
        <p className="text-sm text-gray-500">No active donors to score yet.</p>
      ) : (
        <div className="space-y-2">
          {donors.map((d) => (
            <div
              key={d.supporterId}
              className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2 transition hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              onClick={() => navigate(`/donors`, { state: { from: '/admin', supporterId: d.supporterId } })}
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {d.displayName}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {d.supporterType} &middot; {d.country ?? 'Unknown'}
                </div>
              </div>
              <span className={`badge ${scoreColor(d.upgradeScore)}`}>
                {d.upgradeScore.toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
