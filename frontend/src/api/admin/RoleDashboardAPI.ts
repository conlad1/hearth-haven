import { API_BASE_URL } from '../core/config';
import { apiFetch } from '../core/http';

// ── Top Stats ─────────────────────────────────────────────────────────────────

export interface DashboardTopStats {
  activeResidents: number;
  activeDonors: number;
  monthlyDonations: number;
  unallocatedFunds: number;
}

export const fetchTopStats = async (): Promise<DashboardTopStats> => {
  const res = await apiFetch(`${API_BASE_URL}/Dashboard/TopStats`);
  if (!res.ok) throw new Error(`Failed to fetch top stats: ${res.status}`);
  return res.json();
};

// ── Case Manager ──────────────────────────────────────────────────────────────

export interface CaseTriage {
  highCriticalRisk: number;
  unresolvedIncidents: number;
  flaggedSessions: number;
  upcomingConferences: number;
}

export interface EscalatedResident {
  residentId: number;
  caseControlNo: string;
  initialRiskLevel: string;
  currentRiskLevel: string;
  safehouseName: string | null;
}

export interface SafehouseOccupancyItem {
  safehouseId: number;
  name: string;
  region: string;
  capacityGirls: number;
  activeResidents: number;
}

export interface CaseIncident {
  incidentId: number;
  residentId: number;
  residentCode: string | null;
  safehouseName: string | null;
  incidentDate: string;
  incidentType: string;
  severity: string;
  resolved: boolean;
  followUpRequired: boolean;
  reportedBy: string;
}

export interface CaseManagerData {
  triage: CaseTriage;
  escalatedResidents: EscalatedResident[];
  safehouseOccupancy: SafehouseOccupancyItem[];
  recentIncidents: CaseIncident[];
}

export const fetchCaseManager = async (): Promise<CaseManagerData> => {
  const res = await apiFetch(`${API_BASE_URL}/Dashboard/CaseManager`);
  if (!res.ok) throw new Error(`Failed to fetch case manager data: ${res.status}`);
  return res.json();
};

// ── Case Analytics ────────────────────────────────────────────────────────────

export interface MonthlyEduPoint {
  month: string;
  avgProgress: number;
}

export interface MonthlyHealthPoint {
  month: string;
  avgScore: number;
}

export interface SafetyRiskComparisonItem {
  group: string;       // e.g. 'Concerns Flagged' | 'No Concerns Flagged'
  avgRiskLevel: number; // Low=1, Medium=2, High=3, Critical=4
  count: number;
}

export interface CaseAnalyticsData {
  monthlyEducationProgress: MonthlyEduPoint[];
  monthlyHealthScores: MonthlyHealthPoint[];
  safetyRiskComparison?: SafetyRiskComparisonItem[];
}

export const fetchCaseAnalytics = async (): Promise<CaseAnalyticsData> => {
  const res = await apiFetch(`${API_BASE_URL}/Dashboard/CaseAnalytics`);
  if (!res.ok) throw new Error(`Failed to fetch case analytics: ${res.status}`);
  return res.json();
};

// ── Donor Manager ─────────────────────────────────────────────────────────────

export interface DonorStats {
  donationsThisMonth: number;
  activeDonors: number;
  atRiskCount: number;
  unallocatedFunds: number;
}

export interface DonorTrendPoint {
  month: string;
  total: number;
  count: number;
}

export interface RecentDonationItem {
  donationId: number;
  donationDate: string;
  donationType: string;
  amount: number | null;
  estimatedValue: number | null;
  campaignName: string | null;
  isRecurring: boolean;
  supporterName: string | null;
  supporterEmail: string | null;
  totalAllocated: number;
}

export interface VolunteerPartnerItem {
  supporterId: number;
  displayName: string;
  supporterType: string;
  relationshipType: string;
  status: string;
  country: string | null;
  region: string | null;
  inKindTotal: number;
}

export interface DonorManagerData {
  stats: DonorStats;
  donationTrend: DonorTrendPoint[];
  recentDonations: RecentDonationItem[];
  volunteersPartners: VolunteerPartnerItem[];
}

export const fetchDonorManager = async (): Promise<DonorManagerData> => {
  const res = await apiFetch(`${API_BASE_URL}/Dashboard/DonorManager`);
  if (!res.ok) throw new Error(`Failed to fetch donor manager data: ${res.status}`);
  return res.json();
};

// ── Donor Allocations ─────────────────────────────────────────────────────────

export interface ProgramAreaBreakdown {
  programArea: string;
  totalAllocated: number;
}

export interface SafehouseOption {
  safehouseId: number;
  name: string;
}

export interface UnallocatedDonationOption {
  donationId: number;
  donationDate: string;
  amount: number;
  supporterName: string | null;
  remaining: number;
}

export interface DonorAllocationsData {
  totalReceived: number;
  totalAllocated: number;
  unallocated: number;
  byProgramArea: ProgramAreaBreakdown[];
  safehouses: SafehouseOption[];
  programAreas: string[];
  unallocatedDonations: UnallocatedDonationOption[];
}

export const fetchDonorAllocations = async (): Promise<DonorAllocationsData> => {
  const res = await apiFetch(`${API_BASE_URL}/Dashboard/DonorAllocations`);
  if (!res.ok) throw new Error(`Failed to fetch allocations: ${res.status}`);
  return res.json();
};

export interface CreateAllocationPayload {
  donationId: number;
  safehouseId: number;
  programArea: string;
  amountAllocated: number;
  notes?: string;
}

export const createAllocation = async (payload: CreateAllocationPayload): Promise<void> => {
  const res = await apiFetch(`${API_BASE_URL}/Dashboard/DonorAllocations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `Failed to create allocation: ${res.status}`);
  }
};

// ── Social Media Manager ──────────────────────────────────────────────────────

export interface ActionQueuePost {
  postId: number;
  platform: string;
  postType: string;
  contentTopic: string;
  caption: string | null;
  createdAt: string;
}

export interface EngagementTrendPoint {
  month: string;
  avgEngagement: number;
  postCount: number;
}

export interface ReferralTrendPoint {
  month: string;
  totalReferrals: number;
}

export interface TopPost {
  postId: number;
  platform: string;
  postType: string;
  contentTopic: string;
  caption: string | null;
  likes: number;
  comments: number;
  shares: number;
  donationReferrals: number;
  engagementPct: number;
  createdAt: string;
}

export interface SocialMediaManagerData {
  actionQueue: ActionQueuePost[];
  avgEngagementThisMonth: number;
  referralsThisMonth: number;
  engagementTrend: EngagementTrendPoint[];
  referralTrend: ReferralTrendPoint[];
  topPosts: TopPost[];
}

export const fetchSocialMediaManager = async (): Promise<SocialMediaManagerData> => {
  const res = await apiFetch(`${API_BASE_URL}/Dashboard/SocialMediaManager`);
  if (!res.ok) throw new Error(`Failed to fetch social media data: ${res.status}`);
  return res.json();
};

// ── Static causal driver JSON (served from /public/causal/) ──────────────────

export interface CausalFactor {
  feature: string;
  coefficient: number;
}

export interface PostingStrategyDrivers {
  top_positive_factors: CausalFactor[];
  top_negative_factors: CausalFactor[];
  model_r2: number;
  n_observations: number;
}

export interface RiskDriver {
  feature: string;
  coefficient: number;
  significant: string;
}

export const fetchPostingDrivers = async (): Promise<PostingStrategyDrivers> => {
  const res = await fetch('/causal/posting_strategy_summary.json');
  if (!res.ok) throw new Error('Failed to load posting drivers');
  return res.json();
};

export const fetchRiskDrivers = async (): Promise<RiskDriver[]> => {
  const res = await fetch('/causal/current_risk_num_drivers.csv');
  if (!res.ok) throw new Error('Failed to load risk drivers');
  const text = await res.text();
  const lines = text.trim().split('\n').slice(1); // skip header
  return lines.map((line) => {
    const [feature, coefficient, , , , , significant] = line.split(',');
    return { feature, coefficient: parseFloat(coefficient), significant: significant?.trim() ?? '' };
  });
};
