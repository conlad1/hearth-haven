import { API_BASE_URL } from './config';
import { apiFetch } from './http';

// -- Shared filter params --

export interface ReportsFilters {
  region?: string;
  months?: number;
}

function buildParams(filters: ReportsFilters): string {
  const params = new URLSearchParams();
  if (filters.region) params.set('region', filters.region);
  if (filters.months !== undefined) params.set('months', String(filters.months));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// -- Summary --

export interface ReportsSummary {
  totalDonationCount: number;
  totalDonationAmount: number;
  activeResidents: number;
  avgEducationProgress: number | null;
  avgHealthScore: number | null;
  reintegrationCompletionRate: number;
  safehouseCount: number;
}

// -- Donation Trends --

export interface MonthlyDonationTotal {
  month: string;
  totalAmount: number;
  donationCount: number;
}

export interface DonationByType {
  donationType: string;
  totalAmount: number;
  count: number;
}

export interface DonationByRegion {
  region: string;
  totalAllocated: number;
}

export interface RecurringComparison {
  recurringCount: number;
  recurringAmount: number;
  oneTimeCount: number;
  oneTimeAmount: number;
}

export interface DonationTrends {
  monthlyTotals: MonthlyDonationTotal[];
  byType: DonationByType[];
  byRegion: DonationByRegion[];
  recurringVsOneTime: RecurringComparison;
}

// -- Resident Outcomes --

export interface RiskDistributionItem {
  riskLevel: string;
  count: number;
}

export interface CaseCategoryItem {
  category: string;
  count: number;
}

export interface MonthlyEducationPoint {
  month: string;
  avgProgress: number;
}

export interface MonthlyHealthPoint {
  month: string;
  avgScore: number;
}

export interface ResidentOutcomes {
  initialRiskDistribution: RiskDistributionItem[];
  currentRiskDistribution: RiskDistributionItem[];
  caseCategories: CaseCategoryItem[];
  monthlyEducationProgress: MonthlyEducationPoint[];
  monthlyHealthScores: MonthlyHealthPoint[];
}

// -- Safehouse Performance --

export interface SafehousePerformanceRow {
  safehouseId: number;
  name: string;
  region: string;
  avgEducationProgress: number | null;
  avgHealthScore: number | null;
  totalIncidents: number;
  totalVisitations: number;
  totalProcessRecordings: number;
  latestActiveResidents: number;
}

export interface SafehousePerformance {
  safehouses: SafehousePerformanceRow[];
}

// -- Reintegration Rates --

export interface TypeStatusItem {
  reintegrationType: string;
  status: string;
  count: number;
}

export interface RegionCompletionItem {
  region: string;
  total: number;
  completed: number;
  rate: number;
}

export interface OverallRate {
  total: number;
  completed: number;
  rate: number;
}

export interface ReintegrationRates {
  byTypeAndStatus: TypeStatusItem[];
  completionByRegion: RegionCompletionItem[];
  overallRate: OverallRate;
}

// -- Fetch functions --

export const fetchReportsSummary = async (filters: ReportsFilters = {}): Promise<ReportsSummary> => {
  const response = await apiFetch(`${API_BASE_URL}/Reports/Summary${buildParams(filters)}`);
  if (!response.ok) throw new Error(`Failed to fetch reports summary: ${response.status}`);
  return await response.json();
};

export const fetchDonationTrends = async (filters: ReportsFilters = {}): Promise<DonationTrends> => {
  const response = await apiFetch(`${API_BASE_URL}/Reports/DonationTrends${buildParams(filters)}`);
  if (!response.ok) throw new Error(`Failed to fetch donation trends: ${response.status}`);
  return await response.json();
};

export const fetchResidentOutcomes = async (filters: ReportsFilters = {}): Promise<ResidentOutcomes> => {
  const response = await apiFetch(`${API_BASE_URL}/Reports/ResidentOutcomes${buildParams(filters)}`);
  if (!response.ok) throw new Error(`Failed to fetch resident outcomes: ${response.status}`);
  return await response.json();
};

export const fetchSafehousePerformance = async (filters: ReportsFilters = {}): Promise<SafehousePerformance> => {
  const response = await apiFetch(`${API_BASE_URL}/Reports/SafehousePerformance${buildParams(filters)}`);
  if (!response.ok) throw new Error(`Failed to fetch safehouse performance: ${response.status}`);
  return await response.json();
};

export const fetchReintegrationRates = async (filters: ReportsFilters = {}): Promise<ReintegrationRates> => {
  const response = await apiFetch(`${API_BASE_URL}/Reports/ReintegrationRates${buildParams(filters)}`);
  if (!response.ok) throw new Error(`Failed to fetch reintegration rates: ${response.status}`);
  return await response.json();
};

