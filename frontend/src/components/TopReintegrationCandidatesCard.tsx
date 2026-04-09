import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain } from 'lucide-react';
import {
  fetchTopReintegrationCandidates,
  TopReintegrationCandidate,
} from '../api/MLPredictAPI';

interface TopReintegrationCandidatesCardProps {
  limit?: number;
}

function scoreColor(score: number) {
  if (score >= 75) return 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400';
  if (score >= 50) return 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
  return 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400';
}

export default function TopReintegrationCandidatesCard({
  limit = 10,
}: TopReintegrationCandidatesCardProps) {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<TopReintegrationCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTopReintegrationCandidates(limit)
      .then((data) => {
        if (!cancelled) {
          setCandidates(data);
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
            <Brain className="h-5 w-5 text-indigo-500" /> Top Reintegration Candidates
          </h3>
        </div>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          ML triage aid &mdash; confirm with case conference.
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
      ) : candidates.length === 0 ? (
        <p className="text-sm text-gray-500">No active residents to score yet.</p>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {candidates.map((c) => (
            <div
              key={c.residentId}
              className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2 transition hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              onClick={() => navigate(`/cases/${c.residentId}`, { state: { from: '/admin' } })}
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {c.caseControlNo}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {c.safehouseName ?? 'Unknown'} &middot; {c.caseCategory} &middot;{' '}
                  {c.assignedSocialWorker ?? 'Unassigned'}
                </div>
              </div>
              <span className={`badge ${scoreColor(c.readinessScore)}`}>
                {c.readinessScore.toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
