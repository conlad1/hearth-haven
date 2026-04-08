import { Resident } from '../types/Resident';
import { HealthWellbeingRecord } from '../types/HealthWellbeingRecord';
import { EducationRecord } from '../types/EducationRecord';
import { IncidentReport } from '../types/IncidentReport';
import { HomeVisitation } from '../types/HomeVisitation';
import { ProcessRecording } from '../types/ProcessRecording';
import { InterventionPlan } from '../types/InterventionPlan';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://hearth-haven-backend-eqbyhhc4h8htajhv.westus3-01.azurewebsites.net';

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

export const fetchResident = async (id: number): Promise<Resident> => {
  const response = await fetch(`${API_BASE_URL}/Case/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch resident: ${response.status}`);
  }
  return await response.json();
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

// Generic paginated response for tab data
export interface TabPaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Health & Wellbeing
export interface HealthFilters {
  dateFrom?: string;
  dateTo?: string;
  medicalCheckupDone?: boolean;
  dentalCheckupDone?: boolean;
  psychologicalCheckupDone?: boolean;
}

export const fetchHealthRecords = async (
  residentId: number, page = 1, pageSize = 10, filters: HealthFilters = {}
): Promise<TabPaginatedResponse<HealthWellbeingRecord>> => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.medicalCheckupDone !== undefined) params.set('medicalCheckupDone', String(filters.medicalCheckupDone));
  if (filters.dentalCheckupDone !== undefined) params.set('dentalCheckupDone', String(filters.dentalCheckupDone));
  if (filters.psychologicalCheckupDone !== undefined) params.set('psychologicalCheckupDone', String(filters.psychologicalCheckupDone));
  const response = await fetch(`${API_BASE_URL}/HealthWellbeing/Resident/${residentId}?${params}`);
  if (!response.ok) throw new Error(`Failed to fetch health records: ${response.status}`);
  return await response.json();
};

// Education
export interface EducationFilters {
  dateFrom?: string;
  dateTo?: string;
  educationLevel?: string;
  enrollmentStatus?: string;
  completionStatus?: string;
}

export interface EducationFilterOptions {
  educationLevels: string[];
  enrollmentStatuses: string[];
  completionStatuses: string[];
}

export const fetchEducationRecords = async (
  residentId: number, page = 1, pageSize = 10, filters: EducationFilters = {}
): Promise<TabPaginatedResponse<EducationRecord>> => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.educationLevel) params.set('educationLevel', filters.educationLevel);
  if (filters.enrollmentStatus) params.set('enrollmentStatus', filters.enrollmentStatus);
  if (filters.completionStatus) params.set('completionStatus', filters.completionStatus);
  const response = await fetch(`${API_BASE_URL}/Education/Resident/${residentId}?${params}`);
  if (!response.ok) throw new Error(`Failed to fetch education records: ${response.status}`);
  return await response.json();
};

export const fetchEducationFilterOptions = async (residentId: number): Promise<EducationFilterOptions> => {
  const response = await fetch(`${API_BASE_URL}/Education/Resident/${residentId}/FilterOptions`);
  if (!response.ok) throw new Error(`Failed to fetch education filter options: ${response.status}`);
  return await response.json();
};

// Incidents
export interface IncidentFilters {
  dateFrom?: string;
  dateTo?: string;
  incidentType?: string;
  severity?: string;
  resolved?: boolean;
}

export interface IncidentFilterOptions {
  incidentTypes: string[];
  severities: string[];
}

export const fetchIncidentReports = async (
  residentId: number, page = 1, pageSize = 10, filters: IncidentFilters = {}
): Promise<TabPaginatedResponse<IncidentReport>> => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.incidentType) params.set('incidentType', filters.incidentType);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.resolved !== undefined) params.set('resolved', String(filters.resolved));
  const response = await fetch(`${API_BASE_URL}/Incident/Resident/${residentId}?${params}`);
  if (!response.ok) throw new Error(`Failed to fetch incident reports: ${response.status}`);
  return await response.json();
};

export const fetchIncidentFilterOptions = async (residentId: number): Promise<IncidentFilterOptions> => {
  const response = await fetch(`${API_BASE_URL}/Incident/Resident/${residentId}/FilterOptions`);
  if (!response.ok) throw new Error(`Failed to fetch incident filter options: ${response.status}`);
  return await response.json();
};

// Visitations
export interface VisitationFilters {
  dateFrom?: string;
  dateTo?: string;
  visitType?: string;
  familyCooperationLevel?: string;
  socialWorker?: string;
  safetyConcernsNoted?: boolean;
}

export interface VisitationFilterOptions {
  visitTypes: string[];
  cooperationLevels: string[];
  socialWorkers: string[];
}

export const fetchVisitations = async (
  residentId: number, page = 1, pageSize = 10, filters: VisitationFilters = {}
): Promise<TabPaginatedResponse<HomeVisitation>> => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.visitType) params.set('visitType', filters.visitType);
  if (filters.familyCooperationLevel) params.set('familyCooperationLevel', filters.familyCooperationLevel);
  if (filters.socialWorker) params.set('socialWorker', filters.socialWorker);
  if (filters.safetyConcernsNoted !== undefined) params.set('safetyConcernsNoted', String(filters.safetyConcernsNoted));
  const response = await fetch(`${API_BASE_URL}/Visitation/Resident/${residentId}?${params}`);
  if (!response.ok) throw new Error(`Failed to fetch visitations: ${response.status}`);
  return await response.json();
};

export const fetchVisitationFilterOptions = async (residentId: number): Promise<VisitationFilterOptions> => {
  const response = await fetch(`${API_BASE_URL}/Visitation/Resident/${residentId}/FilterOptions`);
  if (!response.ok) throw new Error(`Failed to fetch visitation filter options: ${response.status}`);
  return await response.json();
};

// ── Global filter options (across all residents — for modal dropdowns) ──

export interface GlobalEducationOptions {
  educationLevels: string[];
  enrollmentStatuses: string[];
  completionStatuses: string[];
}

export interface GlobalIncidentOptions {
  incidentTypes: string[];
  severities: string[];
}

export interface GlobalVisitationOptions {
  visitTypes: string[];
  cooperationLevels: string[];
  visitOutcomes: string[];
  socialWorkers: string[];
}

export const fetchGlobalEducationOptions = async (): Promise<GlobalEducationOptions> => {
  const response = await fetch(`${API_BASE_URL}/Education/GlobalFilterOptions`);
  if (!response.ok) throw new Error(`Failed to fetch global education options: ${response.status}`);
  return await response.json();
};

export const fetchGlobalIncidentOptions = async (): Promise<GlobalIncidentOptions> => {
  const response = await fetch(`${API_BASE_URL}/Incident/GlobalFilterOptions`);
  if (!response.ok) throw new Error(`Failed to fetch global incident options: ${response.status}`);
  return await response.json();
};

export const fetchGlobalVisitationOptions = async (): Promise<GlobalVisitationOptions> => {
  const response = await fetch(`${API_BASE_URL}/Visitation/GlobalFilterOptions`);
  if (!response.ok) throw new Error(`Failed to fetch global visitation options: ${response.status}`);
  return await response.json();
};

// ── CRUD helpers for tab records ──

function cleanPayload(data: Record<string, unknown>, idKey: string): Record<string, unknown> {
  const { [idKey]: _id, resident: _nav, safehouse: _nav2, ...rest } = data;
  return Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v === '' ? null : v]));
}

// Health CRUD
export const createHealthRecord = async (data: Partial<HealthWellbeingRecord>): Promise<HealthWellbeingRecord> => {
  const response = await fetch(`${API_BASE_URL}/HealthWellbeing`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanPayload(data as Record<string, unknown>, 'healthRecordId')),
  });
  if (!response.ok) throw new Error(`Failed to create health record: ${response.status}`);
  return await response.json();
};
export const updateHealthRecord = async (id: number, data: HealthWellbeingRecord): Promise<HealthWellbeingRecord> => {
  const response = await fetch(`${API_BASE_URL}/HealthWellbeing/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to update health record: ${response.status}`);
  return await response.json();
};
export const deleteHealthRecord = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/HealthWellbeing/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Failed to delete health record: ${response.status}`);
};

// Education CRUD
export const createEducationRecord = async (data: Partial<EducationRecord>): Promise<EducationRecord> => {
  const response = await fetch(`${API_BASE_URL}/Education`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanPayload(data as Record<string, unknown>, 'educationRecordId')),
  });
  if (!response.ok) throw new Error(`Failed to create education record: ${response.status}`);
  return await response.json();
};
export const updateEducationRecord = async (id: number, data: EducationRecord): Promise<EducationRecord> => {
  const response = await fetch(`${API_BASE_URL}/Education/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to update education record: ${response.status}`);
  return await response.json();
};
export const deleteEducationRecord = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/Education/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Failed to delete education record: ${response.status}`);
};

// Incident CRUD
export const createIncidentReport = async (data: Partial<IncidentReport>): Promise<IncidentReport> => {
  const response = await fetch(`${API_BASE_URL}/Incident`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanPayload(data as Record<string, unknown>, 'incidentId')),
  });
  if (!response.ok) throw new Error(`Failed to create incident report: ${response.status}`);
  return await response.json();
};
export const updateIncidentReport = async (id: number, data: IncidentReport): Promise<IncidentReport> => {
  const response = await fetch(`${API_BASE_URL}/Incident/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to update incident report: ${response.status}`);
  return await response.json();
};
export const deleteIncidentReport = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/Incident/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Failed to delete incident report: ${response.status}`);
};

// Visitation CRUD
export const createVisitation = async (data: Partial<HomeVisitation>): Promise<HomeVisitation> => {
  const response = await fetch(`${API_BASE_URL}/Visitation`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanPayload(data as Record<string, unknown>, 'visitationId')),
  });
  if (!response.ok) throw new Error(`Failed to create visitation: ${response.status}`);
  return await response.json();
};
export const updateVisitation = async (id: number, data: HomeVisitation): Promise<HomeVisitation> => {
  const response = await fetch(`${API_BASE_URL}/Visitation/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to update visitation: ${response.status}`);
  return await response.json();
};
export const deleteVisitation = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/Visitation/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Failed to delete visitation: ${response.status}`);
};

// Process Recordings
export interface ProcessRecordingFilters {
  dateFrom?: string;
  dateTo?: string;
  sessionType?: string;
  socialWorker?: string;
  concernsFlagged?: boolean;
}

export interface ProcessRecordingFilterOptions {
  sessionTypes: string[];
  socialWorkers: string[];
}

export interface GlobalProcessRecordingOptions {
  sessionTypes: string[];
  emotionalStates: string[];
  socialWorkers: string[];
}

export const fetchProcessRecordings = async (
  residentId: number, page = 1, pageSize = 10, filters: ProcessRecordingFilters = {}
): Promise<TabPaginatedResponse<ProcessRecording>> => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.sessionType) params.set('sessionType', filters.sessionType);
  if (filters.socialWorker) params.set('socialWorker', filters.socialWorker);
  if (filters.concernsFlagged !== undefined) params.set('concernsFlagged', String(filters.concernsFlagged));
  const response = await fetch(`${API_BASE_URL}/ProcessRecording/Resident/${residentId}?${params}`);
  if (!response.ok) throw new Error(`Failed to fetch process recordings: ${response.status}`);
  return await response.json();
};

export const fetchProcessRecordingFilterOptions = async (residentId: number): Promise<ProcessRecordingFilterOptions> => {
  const response = await fetch(`${API_BASE_URL}/ProcessRecording/Resident/${residentId}/FilterOptions`);
  if (!response.ok) throw new Error(`Failed to fetch process recording filter options: ${response.status}`);
  return await response.json();
};

export const fetchGlobalProcessRecordingOptions = async (): Promise<GlobalProcessRecordingOptions> => {
  const response = await fetch(`${API_BASE_URL}/ProcessRecording/GlobalFilterOptions`);
  if (!response.ok) throw new Error(`Failed to fetch global process recording options: ${response.status}`);
  return await response.json();
};

export const createProcessRecording = async (data: Partial<ProcessRecording>): Promise<ProcessRecording> => {
  const response = await fetch(`${API_BASE_URL}/ProcessRecording`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanPayload(data as Record<string, unknown>, 'recordingId')),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to create process recording: ${response.status} — ${body}`);
  }
  return await response.json();
};
export const updateProcessRecording = async (id: number, data: ProcessRecording): Promise<ProcessRecording> => {
  const response = await fetch(`${API_BASE_URL}/ProcessRecording/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to update process recording: ${response.status}`);
  return await response.json();
};
export const deleteProcessRecording = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/ProcessRecording/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Failed to delete process recording: ${response.status}`);
};

// Intervention Plans
export const fetchInterventionPlans = async (residentId: number, planCategory?: string): Promise<InterventionPlan[]> => {
  const params = new URLSearchParams();
  if (planCategory) params.set('planCategory', planCategory);
  const qs = params.toString() ? `?${params}` : '';
  const response = await fetch(`${API_BASE_URL}/InterventionPlan/Resident/${residentId}${qs}`);
  if (!response.ok) throw new Error(`Failed to fetch intervention plans: ${response.status}`);
  return await response.json();
};

export const createInterventionPlan = async (data: Partial<InterventionPlan>): Promise<InterventionPlan> => {
  const response = await fetch(`${API_BASE_URL}/InterventionPlan`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanPayload(data as Record<string, unknown>, 'planId')),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to create intervention plan: ${response.status} — ${body}`);
  }
  return await response.json();
};

export const updateInterventionPlan = async (id: number, data: InterventionPlan): Promise<InterventionPlan> => {
  const response = await fetch(`${API_BASE_URL}/InterventionPlan/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to update intervention plan: ${response.status}`);
  return await response.json();
};

export const deleteInterventionPlan = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/InterventionPlan/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`Failed to delete intervention plan: ${response.status}`);
};
