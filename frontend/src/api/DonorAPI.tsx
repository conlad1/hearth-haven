import {
  Supporter,
  Contribution,
  DonorFilterOptions,
  SupporterFilters,
  ContributionFilters,
  PaginatedResponse,
  DonorAnalyticsResponse,
} from '../types/Donor';

import { API_BASE_URL } from './config';
import { apiFetch } from './http';

// ── FETCH FILTER OPTIONS ─────────────────────────────────────
export const fetchDonorFilterOptions = async (): Promise<DonorFilterOptions> => {
  const res = await apiFetch(`${API_BASE_URL}/Donor/FilterOptions`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch filter options: ${res.status}`);
  return res.json();
};

// ── FETCH SUPPORTERS ─────────────────────────────────────────
export const fetchSupporters = async (
  page = 1,
  pageSize = 20,
  filters: SupporterFilters = {}
): Promise<PaginatedResponse<Supporter>> => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });

  if (filters.supporterType) params.set('supporterType', filters.supporterType);
  if (filters.supporterId) params.set('supporterId', String(filters.supporterId));
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);

  const res = await apiFetch(`${API_BASE_URL}/Donor/Supporters?${params}`, {
    credentials: 'include',
  });

  if (!res.ok) throw new Error(`Failed to fetch supporters: ${res.status}`);
  return res.json();
};

// ── FETCH CONTRIBUTIONS ─────────────────────────────────────
export const fetchContributions = async (
  page = 1,
  pageSize = 20,
  filters: ContributionFilters = {}
): Promise<PaginatedResponse<Contribution>> => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });

  if (filters.donationType) params.set('donationType', filters.donationType);
  if (filters.status) params.set('status', filters.status);
  if (filters.programArea) params.set('programArea', filters.programArea);
  if (filters.safehouseAllocation) params.set('safehouseAllocation', filters.safehouseAllocation);
  if (filters.supporterId) params.set('supporterId', String(filters.supporterId));
  if (filters.search) params.set('search', filters.search);

  const res = await apiFetch(`${API_BASE_URL}/Donor/Contributions?${params}`, {
    credentials: 'include',
  });

  if (!res.ok) throw new Error(`Failed to fetch contributions: ${res.status}`);
  return res.json();
};

// ── CREATE SUPPORTER ────────────────────────────────────────
export const createSupporter = async (data: Partial<Supporter>): Promise<Supporter> => {
  const res = await apiFetch(`${API_BASE_URL}/Donor/Supporters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error(`Failed to create supporter: ${res.status}`);
  return res.json();
};

// ── ✅ UPDATE SUPPORTER (FIXED) ─────────────────────────────
export const updateSupporter = async (id: number, data: Supporter): Promise<Supporter> => {
  const res = await apiFetch(`${API_BASE_URL}/Donor/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error(`Failed to update supporter: ${res.status}`);
  return res.json();
};

// ── ✅ DELETE SUPPORTER (FIXED) ─────────────────────────────
export const deleteSupporter = async (id: number): Promise<void> => {
  const res = await apiFetch(`${API_BASE_URL}/Donor/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!res.ok) throw new Error(`Failed to delete supporter: ${res.status}`);
};

// ── CREATE CONTRIBUTION ─────────────────────────────────────
export const createContribution = async (data: Partial<Contribution>): Promise<Contribution> => {
  const res = await apiFetch(`${API_BASE_URL}/Donor/Contributions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error(`Failed to create contribution: ${res.status}`);
  return res.json();
};

// ── UPDATE CONTRIBUTION ─────────────────────────────────────
export const updateContribution = async (id: number, data: Contribution): Promise<Contribution> => {
  const res = await apiFetch(`${API_BASE_URL}/Donor/Contributions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error(`Failed to update contribution: ${res.status}`);
  return res.json();
};

// ── DELETE CONTRIBUTION ─────────────────────────────────────
export const deleteContribution = async (id: number): Promise<void> => {
  const res = await apiFetch(`${API_BASE_URL}/Donor/Contributions/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!res.ok) throw new Error(`Failed to delete contribution: ${res.status}`);
};

export const fetchDonorAnalytics = async (): Promise<DonorAnalyticsResponse> => {
  const res = await apiFetch(`${API_BASE_URL}/Donor/Analytics`, {
    credentials: 'include',
  });

  if (!res.ok) throw new Error(`Failed to fetch donor analytics: ${res.status}`);
  return res.json();
};

