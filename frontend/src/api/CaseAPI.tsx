import { Resident } from '../types/Resident';

const API_BASE_URL = 'https://localhost:7052';

export interface PaginatedResponse {
  data: Resident[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Safehouse {
  safehouseId: number;
  name: string;
}

export interface FilterOptions {
  caseStatuses: string[];
  caseCategories: string[];
  sexes: string[];
  riskLevels: string[];
  referralSources: string[];
  initialCaseAssessments: string[];
  reintegrationTypes: string[];
  socialWorkers: string[];
  birthStatuses: string[];
  religions: string[];
  reintegrationStatuses: string[];
  pwdTypes: string[];
}

export interface CaseFilters {
  safehouseId?: number;
  caseStatus?: string;
  caseCategory?: string;
  sex?: string;
  currentRiskLevel?: string;
  referralSource?: string;
  initialCaseAssessment?: string;
  reintegrationType?: string;
  assignedSocialWorker?: string;
  search?: string;
}

export const fetchCases = async (
  page: number = 1,
  pageSize: number = 20,
  filters: CaseFilters = {}
): Promise<PaginatedResponse> => {
  try {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (filters.safehouseId !== undefined) {
      params.set('safehouseId', String(filters.safehouseId));
    }
    if (filters.caseStatus) params.set('caseStatus', filters.caseStatus);
    if (filters.caseCategory) params.set('caseCategory', filters.caseCategory);
    if (filters.sex) params.set('sex', filters.sex);
    if (filters.currentRiskLevel)
      params.set('currentRiskLevel', filters.currentRiskLevel);
    if (filters.referralSource)
      params.set('referralSource', filters.referralSource);
    if (filters.initialCaseAssessment)
      params.set('initialCaseAssessment', filters.initialCaseAssessment);
    if (filters.reintegrationType)
      params.set('reintegrationType', filters.reintegrationType);
    if (filters.assignedSocialWorker)
      params.set('assignedSocialWorker', filters.assignedSocialWorker);
    if (filters.search) params.set('search', filters.search);

    const response = await fetch(`${API_BASE_URL}/Case/AllCases?${params}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch cases: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching cases:', error);
    throw error;
  }
};

export const fetchSafehouses = async (): Promise<Safehouse[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/Case/Safehouses`);

    if (!response.ok) {
      throw new Error(`Failed to fetch safehouses: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching safehouses:', error);
    throw error;
  }
};

export const createResident = async (
  data: Partial<Resident>
): Promise<Resident> => {
  // Strip residentId (auto-generated) and convert empty strings to null
  // so DateOnly and nullable fields deserialize correctly on the backend
  const { residentId, createdAt, ...rest } = data as Resident;
  const cleaned = Object.fromEntries(
    Object.entries(rest).map(([k, v]) => [k, v === '' ? null : v])
  );

  const response = await fetch(`${API_BASE_URL}/Case`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleaned),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to create resident: ${response.status} — ${body}`);
  }

  return await response.json();
};

export const updateResident = async (
  id: number,
  data: Resident
): Promise<Resident> => {
  const response = await fetch(`${API_BASE_URL}/Case/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update resident: ${response.status}`);
  }

  return await response.json();
};

export const deleteResident = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/Case/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete resident: ${response.status}`);
  }
};

export const fetchFilterOptions = async (): Promise<FilterOptions> => {
  try {
    const response = await fetch(`${API_BASE_URL}/Case/FilterOptions`);

    if (!response.ok) {
      throw new Error(`Failed to fetch filter options: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching filter options:', error);
    throw error;
  }
};
