import { API_BASE_URL } from '../core/config';
import { apiFetch } from '../core/http';

// ── Donation conversion ───────────────────────────────────────────────────────

export interface DonationConversionPrediction {
  post_id: number;
  conversion_score: number;
  probability: number;
  recommendation: string;
  model_version: string;
  predicted_at: string;
}

// ── Engagement rate ───────────────────────────────────────────────────────────

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

// ── Monthly donation forecast ─────────────────────────────────────────────────

export interface MonthlyDonationForecast {
  month: string;
  predicted_donation_value: number;
  predicted_donation_value_formatted: string;
  confidence_note: string;
  model_version: string;
  predicted_at: string;
}

export const fetchMonthlyDonationForecast = async (
  month: string,
): Promise<MonthlyDonationForecast> => {
  const response = await apiFetch(`${API_BASE_URL}/MLPredict/monthly-donations/${month}`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error(`Monthly forecast failed: ${response.status}`);
  return await response.json();
};
