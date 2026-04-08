export interface Supporter {
  supporterId: number;
  supporterType: string;       // 'Individual' | 'Corporate' | 'Anonymous'
  status: string;              // 'Active' | 'Inactive'
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  organizationName: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Contribution {
  donationId: number;
  supporterId: number;
  supporterName: string;       // denormalized for display
  donationType: string;        // 'Monetary' | 'InKind' | 'Volunteer' | 'Skills' | 'SocialMedia'
  amount: number | null;
  currencyCode: string;
  isRecurring: boolean;
  frequency: string | null;    // 'Once' | 'Monthly'
  channelSource: string | null;
  description: string | null;
  estimatedValue: number | null;
  donationDate: string;
  safehouseAllocation: string | null;
  programArea: string | null;
  status: string;              // 'Pending' | 'Confirmed' | 'Cancelled'
  notes: string | null;
  createdAt: string;
}

export interface DonorFilterOptions {
  supporterTypes: string[];
  statuses: string[];
  donationTypes: string[];
  channelSources: string[];
  programAreas: string[];
  safehouseAllocations: string[];
  contributionStatuses: string[];
}

export interface SupporterFilters {
  supporterType?: string;
  supporterId?: number;
  status?: string;
  search?: string;
}

export interface ContributionFilters {
  donationType?: string;
  status?: string;
  programArea?: string;
  safehouseAllocation?: string;
  supporterId?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
