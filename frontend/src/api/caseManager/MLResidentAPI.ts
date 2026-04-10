import { API_BASE_URL } from '../core/config';
import { apiFetch } from '../core/http';

// ── Reintegration ─────────────────────────────────────────────────────────────

export interface ReintegrationPrediction {
  resident_id: number;
  readiness_score: number;
  probability: number;
  recommendation: string;
  model_version: string;
  predicted_at: string;
}

export const fetchReintegrationPrediction = async (
  residentId: number,
): Promise<ReintegrationPrediction> => {
  const response = await apiFetch(`${API_BASE_URL}/MLPredict/reintegration/${residentId}`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error(`ML prediction failed: ${response.status}`);
  return await response.json();
};

// ── Top reintegration candidates (batch ranked) ──────────────────────────────

export interface TopReintegrationCandidate {
  residentId: number;
  caseControlNo: string;
  internalCode: string | null;
  caseCategory: string;
  assignedSocialWorker: string | null;
  safehouseName: string | null;
  readinessScore: number;
  prediction: ReintegrationPrediction;
}

export const fetchTopReintegrationCandidates = async (
  limit = 10,
): Promise<TopReintegrationCandidate[]> => {
  const response = await apiFetch(
    `${API_BASE_URL}/MLPredict/reintegration/top-candidates?limit=${limit}`,
    { method: 'POST' },
  );
  if (!response.ok) throw new Error(`ML batch prediction failed: ${response.status}`);
  return await response.json();
};

// ── Progress ──────────────────────────────────────────────────────────────────

export interface ProgressPrediction {
  resident_id: number;
  progress_score: number;
  recommendation: string;
  model_version: string;
  predicted_at: string;
}

export const fetchProgressPrediction = async (
  residentId: number,
): Promise<ProgressPrediction> => {
  const response = await apiFetch(`${API_BASE_URL}/MLPredict/progress/${residentId}`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error(`ML prediction failed: ${response.status}`);
  return await response.json();
};
