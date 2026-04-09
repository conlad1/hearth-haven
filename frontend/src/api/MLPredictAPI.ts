import { API_BASE_URL } from './config';
import { apiFetch } from './http';

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

// ── Social post ───────────────────────────────────────────────────────────────

export interface DonationConversionPrediction {
  post_id: number;
  conversion_score: number;
  probability: number;
  recommendation: string;
  model_version: string;
  predicted_at: string;
}

export interface EngagementRatePrediction {
  post_id: number;
  predicted_engagement_rate: number;
  engagement_rate_pct: number;
  recommendation: string;
  model_version: string;
  predicted_at: string;
}

export interface SocialPostPrediction {
  donationConversion: DonationConversionPrediction | null;
  engagementRate: EngagementRatePrediction | null;
}

export const fetchSocialPostPrediction = async (
  postId: number,
): Promise<SocialPostPrediction> => {
  const response = await apiFetch(`${API_BASE_URL}/MLPredict/social-post/${postId}`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error(`ML prediction failed: ${response.status}`);
  return await response.json();
};

// ── Donor ─────────────────────────────────────────────────────────────────────

export interface DonorLapsePrediction {
  supporter_id: number;
  lapse_score: number;
  probability: number;
  recommendation: string;
  model_version: string;
  predicted_at: string;
}

export interface DonorUpgradePrediction {
  supporter_id: number;
  upgrade_score: number;
  probability: number;
  recommendation: string;
  model_version: string;
  predicted_at: string;
}

export interface DonorPrediction {
  lapse: DonorLapsePrediction | null;
  upgrade: DonorUpgradePrediction | null;
}

export const fetchDonorPrediction = async (
  supporterId: number,
): Promise<DonorPrediction> => {
  const response = await apiFetch(`${API_BASE_URL}/MLPredict/donor/${supporterId}`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error(`ML prediction failed: ${response.status}`);
  return await response.json();
};

// ── Top donor lapse risk / upgrade potential (batch ranked) ──────────────────

export interface TopLapseRiskDonor {
  supporterId: number;
  displayName: string;
  supporterType: string;
  country: string | null;
  region: string | null;
  status: string;
  lapseScore: number;
  prediction: DonorLapsePrediction;
}

export interface TopUpgradePotentialDonor {
  supporterId: number;
  displayName: string;
  supporterType: string;
  country: string | null;
  region: string | null;
  status: string;
  upgradeScore: number;
  prediction: DonorUpgradePrediction;
}

export const fetchTopLapseRiskDonors = async (
  limit = 5,
): Promise<TopLapseRiskDonor[]> => {
  const response = await apiFetch(
    `${API_BASE_URL}/MLPredict/donors/top-lapse-risk?limit=${limit}`,
    { method: 'POST' },
  );
  if (!response.ok) throw new Error(`ML batch prediction failed: ${response.status}`);
  return await response.json();
};

export const fetchTopUpgradePotentialDonors = async (
  limit = 5,
): Promise<TopUpgradePotentialDonor[]> => {
  const response = await apiFetch(
    `${API_BASE_URL}/MLPredict/donors/top-upgrade-potential?limit=${limit}`,
    { method: 'POST' },
  );
  if (!response.ok) throw new Error(`ML batch prediction failed: ${response.status}`);
  return await response.json();
};
