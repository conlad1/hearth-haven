export interface InterventionPlan {
  planId: number;
  residentId: number;
  planCategory: string;
  planDescription: string;
  servicesProvided: string | null;
  targetValue: number | null;
  targetDate: string;
  status: string;
  caseConferenceDate: string | null;
  createdAt: string;
  updatedAt: string;
}
