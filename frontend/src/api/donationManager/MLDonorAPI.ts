import { API_BASE_URL } from '../core/config';
import { apiFetch } from '../core/http';

// ── Donor lapse risk ──────────────────────────────────────────────────────────

export interface DonorLapsePrediction {
  supporter_id: number;
  lapse_score: number;
  probability: number;
  recommendation: string;
  model_version: string;
  predicted_at: string;
}

// ── Donor upgrade potential ───────────────────────────────────────────────────

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

// ── Top lapse risk / upgrade potential (batch ranked) ────────────────────────

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
