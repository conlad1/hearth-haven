import { API_BASE_URL } from './config';
import { apiFetch } from './http';

// -- Stats --

export interface DashboardStats {
  activeResidents: number;
  totalResidents: number;
  activeSafehouses: number;
  highRiskCount: number;
  recentDonationCount: number;
  recentDonationTotal: number;
  unresolvedIncidents: number;
  pendingFollowUpVisits: number;
  flaggedSessions: number;
  upcomingConferences: number;
  activePartners: number;
}

// -- Safehouse occupancy --

export interface SafehouseOccupancy {
  safehouseId: number;
  name: string;
  region: string;
  capacityGirls: number;
  currentOccupancy: number;
  activeResidents: number;
}

// -- Recent incidents --

export interface DashboardIncident {
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
  description: string | null;
}

// -- Recent visitations --

export interface DashboardVisitation {
  visitationId: number;
  residentId: number;
  residentCode: string | null;
  visitDate: string;
  socialWorker: string;
  visitType: string;
  visitOutcome: string;
  safetyConcernsNoted: boolean;
  followUpNeeded: boolean;
  familyCooperationLevel: string;
}

// -- Concerning sessions --

export interface DashboardSession {
  recordingId: number;
  residentId: number;
  residentCode: string | null;
  sessionDate: string;
  socialWorker: string;
  sessionType: string;
  emotionalStateObserved: string;
  emotionalStateEnd: string;
  referralMade: boolean;
  followUpActions: string | null;
}

// -- Upcoming conferences --

export interface DashboardConference {
  planId: number;
  residentId: number;
  residentCode: string | null;
  planCategory: string;
  planDescription: string;
  status: string;
  caseConferenceDate: string;
  targetDate: string;
}

// -- High-risk residents --

export interface DashboardHighRiskResident {
  residentId: number;
  caseControlNo: string;
  internalCode: string;
  currentRiskLevel: string;
  caseCategory: string;
  assignedSocialWorker: string | null;
  safehouseName: string | null;
  dateOfAdmission: string;
}

// -- Recent donations --

export interface DashboardDonation {
  donationId: number;
  donationType: string;
  donationDate: string;
  amount: number | null;
  estimatedValue: number | null;
  campaignName: string | null;
  isRecurring: boolean;
  supporterName: string | null;
  totalAllocated: number;
}

// -- Fetch functions --

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const response = await apiFetch(`${API_BASE_URL}/AdminDashboard/Stats`);
  if (!response.ok) throw new Error(`Failed to fetch dashboard stats: ${response.status}`);
  return await response.json();
};

export const fetchSafehouseOccupancy = async (): Promise<SafehouseOccupancy[]> => {
  const response = await apiFetch(`${API_BASE_URL}/AdminDashboard/SafehouseOccupancy`);
  if (!response.ok) throw new Error(`Failed to fetch occupancy: ${response.status}`);
  return await response.json();
};

export const fetchRecentIncidents = async (limit = 10): Promise<DashboardIncident[]> => {
  const response = await apiFetch(`${API_BASE_URL}/AdminDashboard/RecentIncidents?limit=${limit}`);
  if (!response.ok) throw new Error(`Failed to fetch incidents: ${response.status}`);
  return await response.json();
};

export const fetchRecentVisitations = async (limit = 10): Promise<DashboardVisitation[]> => {
  const response = await apiFetch(`${API_BASE_URL}/AdminDashboard/RecentVisitations?limit=${limit}`);
  if (!response.ok) throw new Error(`Failed to fetch visitations: ${response.status}`);
  return await response.json();
};

export const fetchConcerningSessions = async (limit = 10): Promise<DashboardSession[]> => {
  const response = await apiFetch(`${API_BASE_URL}/AdminDashboard/ConcerningSessions?limit=${limit}`);
  if (!response.ok) throw new Error(`Failed to fetch sessions: ${response.status}`);
  return await response.json();
};

export const fetchUpcomingConferences = async (limit = 10): Promise<DashboardConference[]> => {
  const response = await apiFetch(`${API_BASE_URL}/AdminDashboard/UpcomingConferences?limit=${limit}`);
  if (!response.ok) throw new Error(`Failed to fetch conferences: ${response.status}`);
  return await response.json();
};

export const fetchHighRiskResidents = async (limit = 10): Promise<DashboardHighRiskResident[]> => {
  const response = await apiFetch(`${API_BASE_URL}/AdminDashboard/HighRiskResidents?limit=${limit}`);
  if (!response.ok) throw new Error(`Failed to fetch high-risk residents: ${response.status}`);
  return await response.json();
};

export const fetchRecentDonations = async (limit = 10): Promise<DashboardDonation[]> => {
  const response = await apiFetch(`${API_BASE_URL}/AdminDashboard/RecentDonations?limit=${limit}`);
  if (!response.ok) throw new Error(`Failed to fetch donations: ${response.status}`);
  return await response.json();
};
