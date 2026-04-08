import {
  Supporter,
  Contribution,
  DonorFilterOptions,
  SupporterFilters,
  ContributionFilters,
  PaginatedResponse,
} from '../types/Donor';

// ── Flip to false when backend is ready ──────────────────────────────────────
const USE_MOCK = true;
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://hearth-haven-backend-eqbyhhc4h8htajhv.westus3-01.azurewebsites.net';

// ── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_SUPPORTERS: Supporter[] = [
  {
    supporterId: 1,
    supporterType: 'Individual',
    status: 'Active',
    firstName: 'Maria',
    lastName: 'Santos',
    email: 'maria.santos@email.com',
    phone: '+63-912-345-6789',
    organizationName: null,
    address: '123 Rizal St., Makati City',
    notes: 'Long-time donor, prefers email updates.',
    createdAt: '2023-03-12T08:00:00Z',
  },
  {
    supporterId: 2,
    supporterType: 'Individual',
    status: 'Active',
    firstName: 'Juan',
    lastName: 'dela Cruz',
    email: 'juan.delacruz@gmail.com',
    phone: '+63-917-654-3210',
    organizationName: null,
    address: '45 Mabini Ave., Quezon City',
    notes: null,
    createdAt: '2023-06-01T10:30:00Z',
  },
  {
    supporterId: 3,
    supporterType: 'Corporate',
    status: 'Active',
    firstName: 'Grace',
    lastName: 'Tan',
    email: 'corp@abccorporation.com',
    phone: '+63-2-8888-1234',
    organizationName: 'ABC Corporation',
    address: 'One Corporate Center, Ortigas',
    notes: 'CSR partner — annual commitment.',
    createdAt: '2022-11-20T09:00:00Z',
  },
  {
    supporterId: 4,
    supporterType: 'Anonymous',
    status: 'Active',
    firstName: 'Anonymous',
    lastName: 'Donor',
    email: 'anon001@hearth.org',
    phone: null,
    organizationName: null,
    address: null,
    notes: 'Requested full anonymity.',
    createdAt: '2024-01-05T14:00:00Z',
  },
  {
    supporterId: 5,
    supporterType: 'Individual',
    status: 'Inactive',
    firstName: 'Rosa',
    lastName: 'Mendoza',
    email: 'rosa.mendoza@yahoo.com',
    phone: '+63-918-222-3333',
    organizationName: null,
    address: '7 Pines St., Davao City',
    notes: 'Relocated abroad — on hold.',
    createdAt: '2023-01-15T11:00:00Z',
  },
  {
    supporterId: 6,
    supporterType: 'Corporate',
    status: 'Active',
    firstName: 'Paolo',
    lastName: 'Reyes',
    email: 'info@xyzfoundation.org',
    phone: '+63-2-7777-5678',
    organizationName: 'XYZ Foundation',
    address: 'BGC Tower, Taguig City',
    notes: 'Focus on healthcare and education programs.',
    createdAt: '2022-08-10T07:30:00Z',
  },
  {
    supporterId: 7,
    supporterType: 'Individual',
    status: 'Active',
    firstName: 'Carlos',
    lastName: 'Reyes',
    email: 'carlos.r@email.com',
    phone: '+63-916-888-9999',
    organizationName: null,
    address: '22 Luna Rd., Cebu City',
    notes: 'Volunteer coordinator.',
    createdAt: '2023-09-08T15:00:00Z',
  },
  {
    supporterId: 8,
    supporterType: 'Individual',
    status: 'Active',
    firstName: 'Elena',
    lastName: 'Guzman',
    email: 'elena.g@email.com',
    phone: '+63-919-111-2222',
    organizationName: null,
    address: '5 Sampaguita St., Manila',
    notes: 'Provides literacy tutoring sessions.',
    createdAt: '2023-11-22T13:00:00Z',
  },
];

const MOCK_CONTRIBUTIONS: Contribution[] = [
  {
    donationId: 1,
    supporterId: 1,
    supporterName: 'Maria Santos',
    donationType: 'Monetary',
    amount: 5000,
    currencyCode: 'PHP',
    isRecurring: true,
    frequency: 'Monthly',
    channelSource: 'Card',
    description: null,
    estimatedValue: 5000,
    donationDate: '2024-01-10',
    safehouseAllocation: 'Manila',
    programArea: 'Education',
    status: 'Confirmed',
    notes: 'Monthly pledge — auto-charge.',
    createdAt: '2024-01-10T08:00:00Z',
  },
  {
    donationId: 2,
    supporterId: 2,
    supporterName: 'Juan dela Cruz',
    donationType: 'Monetary',
    amount: 1000,
    currencyCode: 'PHP',
    isRecurring: false,
    frequency: 'Once',
    channelSource: 'PayPal',
    description: null,
    estimatedValue: 1000,
    donationDate: '2024-02-14',
    safehouseAllocation: 'Quezon City',
    programArea: 'General',
    status: 'Confirmed',
    notes: null,
    createdAt: '2024-02-14T10:00:00Z',
  },
  {
    donationId: 3,
    supporterId: 3,
    supporterName: 'ABC Corporation',
    donationType: 'Monetary',
    amount: 25000,
    currencyCode: 'PHP',
    isRecurring: false,
    frequency: 'Once',
    channelSource: 'Bank Transfer',
    description: null,
    estimatedValue: 25000,
    donationDate: '2024-03-01',
    safehouseAllocation: 'Manila',
    programArea: 'Safe Haven',
    status: 'Confirmed',
    notes: 'Annual CSR donation.',
    createdAt: '2024-03-01T09:00:00Z',
  },
  {
    donationId: 4,
    supporterId: 4,
    supporterName: 'Anonymous Donor',
    donationType: 'Monetary',
    amount: 500,
    currencyCode: 'PHP',
    isRecurring: false,
    frequency: 'Once',
    channelSource: 'Card',
    description: null,
    estimatedValue: 500,
    donationDate: '2024-03-15',
    safehouseAllocation: null,
    programArea: 'General',
    status: 'Confirmed',
    notes: null,
    createdAt: '2024-03-15T14:00:00Z',
  },
  {
    donationId: 5,
    supporterId: 5,
    supporterName: 'Rosa Mendoza',
    donationType: 'InKind',
    amount: null,
    currencyCode: 'PHP',
    isRecurring: false,
    frequency: null,
    channelSource: null,
    description: 'Assorted clothing (3 boxes) and canned goods (2 boxes)',
    estimatedValue: 800,
    donationDate: '2024-01-20',
    safehouseAllocation: 'Manila',
    programArea: 'Safe Haven',
    status: 'Confirmed',
    notes: null,
    createdAt: '2024-01-20T11:00:00Z',
  },
  {
    donationId: 6,
    supporterId: 6,
    supporterName: 'XYZ Foundation',
    donationType: 'Monetary',
    amount: 10000,
    currencyCode: 'PHP',
    isRecurring: false,
    frequency: 'Once',
    channelSource: 'Bank Transfer',
    description: null,
    estimatedValue: 10000,
    donationDate: '2024-02-28',
    safehouseAllocation: 'Davao',
    programArea: 'Healthcare',
    status: 'Confirmed',
    notes: 'Earmarked for medical supplies.',
    createdAt: '2024-02-28T09:30:00Z',
  },
  {
    donationId: 7,
    supporterId: 7,
    supporterName: 'Carlos Reyes',
    donationType: 'Volunteer',
    amount: null,
    currencyCode: 'PHP',
    isRecurring: false,
    frequency: null,
    channelSource: null,
    description: 'Weekend community kitchen volunteer — 8 hours/month',
    estimatedValue: null,
    donationDate: '2024-03-05',
    safehouseAllocation: 'Quezon City',
    programArea: 'General',
    status: 'Confirmed',
    notes: null,
    createdAt: '2024-03-05T07:00:00Z',
  },
  {
    donationId: 8,
    supporterId: 8,
    supporterName: 'Elena Guzman',
    donationType: 'Skills',
    amount: null,
    currencyCode: 'PHP',
    isRecurring: true,
    frequency: 'Monthly',
    channelSource: null,
    description:
      'Literacy tutoring — 2 sessions per week for school-age residents',
    estimatedValue: 2000,
    donationDate: '2024-01-08',
    safehouseAllocation: 'Manila',
    programArea: 'Education',
    status: 'Confirmed',
    notes: 'Background in elementary education.',
    createdAt: '2024-01-08T13:00:00Z',
  },
  {
    donationId: 9,
    supporterId: 1,
    supporterName: 'Maria Santos',
    donationType: 'Monetary',
    amount: 5000,
    currencyCode: 'PHP',
    isRecurring: true,
    frequency: 'Monthly',
    channelSource: 'Card',
    description: null,
    estimatedValue: 5000,
    donationDate: '2024-04-10',
    safehouseAllocation: 'Manila',
    programArea: 'Healthcare',
    status: 'Confirmed',
    notes: 'April installment.',
    createdAt: '2024-04-10T08:00:00Z',
  },
  {
    donationId: 10,
    supporterId: 2,
    supporterName: 'Juan dela Cruz',
    donationType: 'InKind',
    amount: null,
    currencyCode: 'PHP',
    isRecurring: false,
    frequency: null,
    channelSource: null,
    description:
      'School supplies — notebooks, pencils, crayons for 20 children',
    estimatedValue: 500,
    donationDate: '2024-04-05',
    safehouseAllocation: 'Quezon City',
    programArea: 'Education',
    status: 'Pending',
    notes: 'Awaiting pickup confirmation.',
    createdAt: '2024-04-05T10:00:00Z',
  },
  {
    donationId: 11,
    supporterId: 3,
    supporterName: 'ABC Corporation',
    donationType: 'SocialMedia',
    amount: null,
    currencyCode: 'PHP',
    isRecurring: false,
    frequency: null,
    channelSource: null,
    description:
      'Awareness campaign across LinkedIn, Facebook, and Instagram (reach: ~50k)',
    estimatedValue: null,
    donationDate: '2024-03-20',
    safehouseAllocation: null,
    programArea: 'General',
    status: 'Confirmed',
    notes: null,
    createdAt: '2024-03-20T12:00:00Z',
  },
  {
    donationId: 12,
    supporterId: 4,
    supporterName: 'Anonymous Donor',
    donationType: 'Monetary',
    amount: 250,
    currencyCode: 'PHP',
    isRecurring: false,
    frequency: 'Once',
    channelSource: 'Card',
    description: null,
    estimatedValue: 250,
    donationDate: '2024-04-01',
    safehouseAllocation: null,
    programArea: 'General',
    status: 'Pending',
    notes: null,
    createdAt: '2024-04-01T14:00:00Z',
  },
  {
    donationId: 13,
    supporterId: 5,
    supporterName: 'Rosa Mendoza',
    donationType: 'Volunteer',
    amount: null,
    currencyCode: 'PHP',
    isRecurring: false,
    frequency: null,
    channelSource: null,
    description: 'Cooking and nutrition workshop for residents',
    estimatedValue: null,
    donationDate: '2024-02-10',
    safehouseAllocation: 'Manila',
    programArea: 'Safe Haven',
    status: 'Pending',
    notes: 'Awaiting scheduling.',
    createdAt: '2024-02-10T11:00:00Z',
  },
  {
    donationId: 14,
    supporterId: 7,
    supporterName: 'Carlos Reyes',
    donationType: 'Skills',
    amount: null,
    currencyCode: 'PHP',
    isRecurring: false,
    frequency: null,
    channelSource: null,
    description: 'First aid training — 4-hour session for 15 staff members',
    estimatedValue: 3000,
    donationDate: '2024-03-18',
    safehouseAllocation: 'Quezon City',
    programArea: 'Healthcare',
    status: 'Confirmed',
    notes: 'Carlos is a licensed nurse.',
    createdAt: '2024-03-18T08:00:00Z',
  },
  {
    donationId: 15,
    supporterId: 6,
    supporterName: 'XYZ Foundation',
    donationType: 'InKind',
    amount: null,
    currencyCode: 'PHP',
    isRecurring: false,
    frequency: null,
    channelSource: null,
    description: 'Medical supplies: bandages, antiseptics, vitamins (bulk)',
    estimatedValue: 5000,
    donationDate: '2024-04-12',
    safehouseAllocation: 'Davao',
    programArea: 'Healthcare',
    status: 'Confirmed',
    notes: null,
    createdAt: '2024-04-12T09:00:00Z',
  },
];

const MOCK_FILTER_OPTIONS: DonorFilterOptions = {
  supporterTypes: ['Individual', 'Corporate', 'Anonymous'],
  statuses: ['Active', 'Inactive'],
  donationTypes: ['Monetary', 'InKind', 'Volunteer', 'Skills', 'SocialMedia'],
  channelSources: ['Card', 'PayPal', 'Bank Transfer', 'Cash'],
  programAreas: ['General', 'Safe Haven', 'Education', 'Healthcare'],
  safehouseAllocations: ['Manila', 'Quezon City', 'Davao'],
  contributionStatuses: ['Pending', 'Confirmed', 'Cancelled'],
};

// ── Mock helpers ──────────────────────────────────────────────────────────────

let mockSupporters = [...MOCK_SUPPORTERS];
let mockContributions = [...MOCK_CONTRIBUTIONS];
let mockNextSupporterId = 9;
let mockNextDonationId = 16;

function paginate<T>(
  data: T[],
  page: number,
  pageSize: number
): PaginatedResponse<T> {
  const start = (page - 1) * pageSize;
  const slice = data.slice(start, start + pageSize);
  return {
    data: slice,
    totalCount: data.length,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(data.length / pageSize)),
  };
}

function filterSupporters(
  data: Supporter[],
  filters: SupporterFilters
): Supporter[] {
  return data.filter((s) => {
    if (filters.supporterType && s.supporterType !== filters.supporterType)
      return false;
    if (filters.status && s.status !== filters.status) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const name = `${s.firstName} ${s.lastName}`.toLowerCase();
      if (
        !name.includes(q) &&
        !s.email.toLowerCase().includes(q) &&
        !s.organizationName?.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });
}

function filterContributions(
  data: Contribution[],
  filters: ContributionFilters
): Contribution[] {
  return data.filter((c) => {
    if (filters.donationType && c.donationType !== filters.donationType)
      return false;
    if (filters.status && c.status !== filters.status) return false;
    if (filters.programArea && c.programArea !== filters.programArea)
      return false;
    if (
      filters.safehouseAllocation &&
      c.safehouseAllocation !== filters.safehouseAllocation
    )
      return false;
    if (filters.supporterId && c.supporterId !== filters.supporterId)
      return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (
        !c.supporterName.toLowerCase().includes(q) &&
        !c.donationType.toLowerCase().includes(q) &&
        !c.description?.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });
}

// ── Exported API functions ────────────────────────────────────────────────────

export const fetchDonorFilterOptions =
  async (): Promise<DonorFilterOptions> => {
    if (USE_MOCK) return { ...MOCK_FILTER_OPTIONS };
    const res = await fetch(`${API_BASE_URL}/Donor/FilterOptions`);
    if (!res.ok)
      throw new Error(`Failed to fetch filter options: ${res.status}`);
    return res.json();
  };

export const fetchSupporters = async (
  page = 1,
  pageSize = 20,
  filters: SupporterFilters = {}
): Promise<PaginatedResponse<Supporter>> => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 80));
    const filtered = filterSupporters(mockSupporters, filters);
    return paginate(filtered, page, pageSize);
  }
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (filters.supporterType) params.set('supporterType', filters.supporterType);
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);
  const res = await fetch(`${API_BASE_URL}/Donor/Supporters?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch supporters: ${res.status}`);
  return res.json();
};

export const fetchContributions = async (
  page = 1,
  pageSize = 20,
  filters: ContributionFilters = {}
): Promise<PaginatedResponse<Contribution>> => {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 80));
    const filtered = filterContributions(mockContributions, filters);
    return paginate(filtered, page, pageSize);
  }
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (filters.donationType) params.set('donationType', filters.donationType);
  if (filters.status) params.set('status', filters.status);
  if (filters.programArea) params.set('programArea', filters.programArea);
  if (filters.safehouseAllocation)
    params.set('safehouseAllocation', filters.safehouseAllocation);
  if (filters.supporterId)
    params.set('supporterId', String(filters.supporterId));
  if (filters.search) params.set('search', filters.search);
  const res = await fetch(`${API_BASE_URL}/Donor/Contributions?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch contributions: ${res.status}`);
  return res.json();
};

export const createSupporter = async (
  data: Partial<Supporter>
): Promise<Supporter> => {
  if (USE_MOCK) {
    const { supporterId, createdAt, ...rest } = data as Supporter;
    void supporterId;
    void createdAt;
    const newItem: Supporter = {
      ...rest,
      supporterId: mockNextSupporterId++,
      createdAt: new Date().toISOString(),
    };
    mockSupporters = [...mockSupporters, newItem];
    return newItem;
  }
  const res = await fetch(`${API_BASE_URL}/Donor/Supporters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create supporter: ${res.status}`);
  return res.json();
};

export const updateSupporter = async (
  id: number,
  data: Supporter
): Promise<Supporter> => {
  if (USE_MOCK) {
    mockSupporters = mockSupporters.map((s) =>
      s.supporterId === id ? { ...data } : s
    );
    return { ...data };
  }
  const res = await fetch(`${API_BASE_URL}/Donor/Supporters/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update supporter: ${res.status}`);
  return res.json();
};

export const deleteSupporter = async (id: number): Promise<void> => {
  if (USE_MOCK) {
    mockSupporters = mockSupporters.filter((s) => s.supporterId !== id);
    return;
  }
  const res = await fetch(`${API_BASE_URL}/Donor/Supporters/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete supporter: ${res.status}`);
};

export const createContribution = async (
  data: Partial<Contribution>
): Promise<Contribution> => {
  if (USE_MOCK) {
    const { donationId, createdAt, ...rest } = data as Contribution;
    void donationId;
    void createdAt;
    const supporter = mockSupporters.find(
      (s) => s.supporterId === rest.supporterId
    );
    const newItem: Contribution = {
      ...rest,
      donationId: mockNextDonationId++,
      supporterName: supporter
        ? `${supporter.firstName} ${supporter.lastName}`
        : 'Unknown',
      createdAt: new Date().toISOString(),
    };
    mockContributions = [...mockContributions, newItem];
    return newItem;
  }
  const res = await fetch(`${API_BASE_URL}/Donor/Contributions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create contribution: ${res.status}`);
  return res.json();
};

export const updateContribution = async (
  id: number,
  data: Contribution
): Promise<Contribution> => {
  if (USE_MOCK) {
    mockContributions = mockContributions.map((c) =>
      c.donationId === id ? { ...data } : c
    );
    return { ...data };
  }
  const res = await fetch(`${API_BASE_URL}/Donor/Contributions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update contribution: ${res.status}`);
  return res.json();
};

export const deleteContribution = async (id: number): Promise<void> => {
  if (USE_MOCK) {
    mockContributions = mockContributions.filter((c) => c.donationId !== id);
    return;
  }
  const res = await fetch(`${API_BASE_URL}/Donor/Contributions/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete contribution: ${res.status}`);
};
