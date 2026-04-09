import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import {
  fetchTopLapseRiskDonors,
  TopLapseRiskDonor,
} from '../api/MLPredictAPI';

interface TopLapseRiskDonorsCardProps {
  limit?: number;
}

function scoreColor(score: number) {
  if (score >= 70) return 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400';
  if (score >= 40) return 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
  return 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400';
}

export default function TopLapseRiskDonorsCard({
  limit = 5,
}: TopLapseRiskDonorsCardProps) {
  const navigate = useNavigate();
  const [donors, setDonors] = useState<TopLapseRiskDonor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTopLapseRiskDonors(limit)
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
    <div className="card flex max-h-96 flex-col p-5">
      <div className="shrink-0">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <AlertTriangle className="h-5 w-5 text-red-500" /> At-Risk Donors
          </h3>
        </div>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          ML triage aid &mdash; prioritize re-engagement outreach.
        </p>
      </div>

      {loading ? (
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
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
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
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
              <span className={`badge ${scoreColor(d.lapseScore)}`}>
                {d.lapseScore.toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
