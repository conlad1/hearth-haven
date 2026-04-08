import { Safehouse } from '../types/Safehouse';
import { Partner } from '../types/Partner';
import { PartnerAssignment } from '../types/PartnerAssignment';
import { API_BASE_URL } from './config';

// -- Paginated responses --

export interface PaginatedSafehouseResponse {
  data: Safehouse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedPartnerResponse {
  data: Partner[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedAssignmentResponse {
  data: PartnerAssignment[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// -- Filter types --

export interface SafehouseFilters {
  region?: string;
  status?: string;
  search?: string;
}

export interface PartnerFilters {
  partnerType?: string;
  roleType?: string;
  status?: string;
  region?: string;
  search?: string;
}

export interface AssignmentFilters {
  programArea?: string;
  status?: string;
}

// -- Filter option types --

export interface SafehouseFilterOptions {
  regions: string[];
  statuses: string[];
}

export interface PartnerFilterOptions {
  partnerTypes: string[];
  roleTypes: string[];
  statuses: string[];
  regions: string[];
}

export interface AssignmentFilterOptions {
  programAreas: string[];
  statuses: string[];
}

// -- Helper --

function cleanPayload(data: Record<string, unknown>, stripKeys: string[]): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([k]) => !stripKeys.includes(k))
      .map(([k, v]) => [k, v === '' ? null : v])
  );
}

// ============================
// Safehouse API
// ============================

export const fetchSafehouses = async (
  page: number = 1,
  pageSize: number = 20,
  filters: SafehouseFilters = {}
): Promise<PaginatedSafehouseResponse> => {
  try {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filters.region) params.set('region', filters.region);
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);

    const response = await fetch(`${API_BASE_URL}/Safehouse/All?${params}`);
    if (!response.ok) throw new Error(`Failed to fetch safehouses: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching safehouses:', error);
    throw error;
  }
};

export const fetchSafehouse = async (id: number): Promise<Safehouse> => {
  const response = await fetch(`${API_BASE_URL}/Safehouse/${id}`);
  if (!response.ok) throw new Error(`Failed to fetch safehouse: ${response.status}`);
  return await response.json();
};

export const fetchSafehouseFilterOptions = async (): Promise<SafehouseFilterOptions> => {
  try {
    const response = await fetch(`${API_BASE_URL}/Safehouse/FilterOptions`);
    if (!response.ok) throw new Error(`Failed to fetch safehouse filter options: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching safehouse filter options:', error);
    throw error;
  }
};

export const fetchSafehousePartners = async (
  safehouseId: number,
  page: number = 1,
  pageSize: number = 20,
  filters: AssignmentFilters = {}
): Promise<PaginatedAssignmentResponse> => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (filters.programArea) params.set('programArea', filters.programArea);
  if (filters.status) params.set('status', filters.status);

  const response = await fetch(`${API_BASE_URL}/Safehouse/${safehouseId}/Partners?${params}`);
  if (!response.ok) throw new Error(`Failed to fetch safehouse partners: ${response.status}`);
  return await response.json();
};

export const createSafehouse = async (data: Partial<Safehouse>): Promise<Safehouse> => {
  const cleaned = cleanPayload(data as Record<string, unknown>, ['safehouseId']);
  const response = await fetch(`${API_BASE_URL}/Safehouse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleaned),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to create safehouse: ${response.status} — ${body}`);
  }
  return await response.json();
};

export const updateSafehouse = async (id: number, data: Safehouse): Promise<Safehouse> => {
  const response = await fetch(`${API_BASE_URL}/Safehouse/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to update safehouse: ${response.status}`);
  return await response.json();
};

export const deleteSafehouse = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/Safehouse/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Failed to delete safehouse: ${response.status}`);
};

// ============================
// Partner API
// ============================

export const fetchPartners = async (
  page: number = 1,
  pageSize: number = 20,
  filters: PartnerFilters = {}
): Promise<PaginatedPartnerResponse> => {
  try {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filters.partnerType) params.set('partnerType', filters.partnerType);
    if (filters.roleType) params.set('roleType', filters.roleType);
    if (filters.status) params.set('status', filters.status);
    if (filters.region) params.set('region', filters.region);
    if (filters.search) params.set('search', filters.search);

    const response = await fetch(`${API_BASE_URL}/Partner/All?${params}`);
    if (!response.ok) throw new Error(`Failed to fetch partners: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching partners:', error);
    throw error;
  }
};

export const fetchPartner = async (id: number): Promise<Partner> => {
  const response = await fetch(`${API_BASE_URL}/Partner/${id}`);
  if (!response.ok) throw new Error(`Failed to fetch partner: ${response.status}`);
  return await response.json();
};

export const fetchPartnerFilterOptions = async (): Promise<PartnerFilterOptions> => {
  try {
    const response = await fetch(`${API_BASE_URL}/Partner/FilterOptions`);
    if (!response.ok) throw new Error(`Failed to fetch partner filter options: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching partner filter options:', error);
    throw error;
  }
};

export const fetchPartnerSafehouses = async (
  partnerId: number,
  page: number = 1,
  pageSize: number = 20,
  filters: AssignmentFilters = {}
): Promise<PaginatedAssignmentResponse> => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (filters.programArea) params.set('programArea', filters.programArea);
  if (filters.status) params.set('status', filters.status);

  const response = await fetch(`${API_BASE_URL}/Partner/${partnerId}/Safehouses?${params}`);
  if (!response.ok) throw new Error(`Failed to fetch partner safehouses: ${response.status}`);
  return await response.json();
};

export const createPartner = async (data: Partial<Partner>): Promise<Partner> => {
  const cleaned = cleanPayload(data as Record<string, unknown>, ['partnerId']);
  const response = await fetch(`${API_BASE_URL}/Partner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleaned),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to create partner: ${response.status} — ${body}`);
  }
  return await response.json();
};

export const updatePartner = async (id: number, data: Partner): Promise<Partner> => {
  const response = await fetch(`${API_BASE_URL}/Partner/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to update partner: ${response.status}`);
  return await response.json();
};

export const deletePartner = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/Partner/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Failed to delete partner: ${response.status}`);
};

// ============================
// PartnerAssignment API
// ============================

export const fetchAssignmentFilterOptions = async (): Promise<AssignmentFilterOptions> => {
  try {
    const response = await fetch(`${API_BASE_URL}/PartnerAssignment/FilterOptions`);
    if (!response.ok) throw new Error(`Failed to fetch assignment filter options: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching assignment filter options:', error);
    throw error;
  }
};

export const createAssignment = async (data: Partial<PartnerAssignment>): Promise<PartnerAssignment> => {
  const cleaned = cleanPayload(data as unknown as Record<string, unknown>, ['assignmentId', 'partner', 'safehouse']);
  const response = await fetch(`${API_BASE_URL}/PartnerAssignment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleaned),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to create assignment: ${response.status} — ${body}`);
  }
  return await response.json();
};

export const updateAssignment = async (id: number, data: PartnerAssignment): Promise<PartnerAssignment> => {
  const cleaned = cleanPayload(data as unknown as Record<string, unknown>, ['partner', 'safehouse']);
  const response = await fetch(`${API_BASE_URL}/PartnerAssignment/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleaned),
  });
  if (!response.ok) throw new Error(`Failed to update assignment: ${response.status}`);
  return await response.json();
};

export const deleteAssignment = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/PartnerAssignment/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Failed to delete assignment: ${response.status}`);
};
