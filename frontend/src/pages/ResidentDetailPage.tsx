import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Resident } from '../types/Resident';
import { HealthWellbeingRecord } from '../types/HealthWellbeingRecord';
import { EducationRecord } from '../types/EducationRecord';
import { IncidentReport } from '../types/IncidentReport';
import { HomeVisitation } from '../types/HomeVisitation';
import { ProcessRecording } from '../types/ProcessRecording';
import { InterventionPlan } from '../types/InterventionPlan';
import RecordModal, { RecordFieldDef } from '../components/RecordModal';
import { SafetyChart, HealthChart, EducationChart } from '../components/ProgressChart';
import {
  ArrowLeft, Pencil, Trash2, Plus, Check, X, Save,
  ChevronLeft, ChevronRight, Filter, Brain,
} from 'lucide-react';
import { fetchReintegrationPrediction, ReintegrationPrediction, fetchProgressPrediction, ProgressPrediction } from '../api/MLPredictAPI';
import {
  fetchResident,
  fetchSafehouses,
  fetchFilterOptions,
  updateResident,
  deleteResident,
  fetchHealthRecords,
  createHealthRecord,
  updateHealthRecord,
  deleteHealthRecord,
  fetchEducationRecords,
  fetchEducationFilterOptions,
  createEducationRecord,
  updateEducationRecord,
  deleteEducationRecord,
  fetchIncidentReports,
  fetchIncidentFilterOptions,
  createIncidentReport,
  updateIncidentReport,
  deleteIncidentReport,
  fetchVisitations,
  fetchVisitationFilterOptions,
  createVisitation,
  updateVisitation,
  deleteVisitation,
  Safehouse,
  FilterOptions,
  HealthFilters,
  EducationFilters,
  EducationFilterOptions,
  IncidentFilters,
  IncidentFilterOptions,
  VisitationFilters,
  VisitationFilterOptions,
  fetchGlobalEducationOptions,
  fetchGlobalIncidentOptions,
  fetchGlobalVisitationOptions,
  GlobalEducationOptions,
  GlobalIncidentOptions,
  GlobalVisitationOptions,
  fetchProcessRecordings,
  fetchProcessRecordingFilterOptions,
  fetchGlobalProcessRecordingOptions,
  createProcessRecording,
  updateProcessRecording,
  deleteProcessRecording,
  ProcessRecordingFilters,
  ProcessRecordingFilterOptions,
  GlobalProcessRecordingOptions,
  fetchInterventionPlans,
  createInterventionPlan,
  updateInterventionPlan,
  deleteInterventionPlan,
} from '../api/CaseAPI';

// -- Resident field config (unchanged) --

type FieldDef = { key: keyof Resident; label: string };
interface FieldSection { title: string; fields: FieldDef[] }

const modalSections: FieldSection[] = [
  { title: 'Case Information', fields: [
    { key: 'residentId', label: 'ID' }, { key: 'caseControlNo', label: 'Case Control No.' },
    { key: 'internalCode', label: 'Internal Code' }, { key: 'safehouseId', label: 'Safehouse' },
    { key: 'caseStatus', label: 'Status' }, { key: 'caseCategory', label: 'Category' },
    { key: 'initialRiskLevel', label: 'Initial Risk' }, { key: 'currentRiskLevel', label: 'Current Risk' },
    { key: 'assignedSocialWorker', label: 'Social Worker' },
  ]},
  { title: 'Personal Details', fields: [
    { key: 'sex', label: 'Sex' }, { key: 'dateOfBirth', label: 'Date of Birth' },
    { key: 'birthStatus', label: 'Birth Status' }, { key: 'placeOfBirth', label: 'Place of Birth' },
    { key: 'religion', label: 'Religion' }, { key: 'presentAge', label: 'Present Age' },
    { key: 'isPwd', label: 'PWD' }, { key: 'pwdType', label: 'PWD Type' },
    { key: 'hasSpecialNeeds', label: 'Special Needs' }, { key: 'specialNeedsDiagnosis', label: 'Special Needs Diagnosis' },
  ]},
  { title: 'Sub-Categories', fields: [
    { key: 'subCatOrphaned', label: 'Orphaned' }, { key: 'subCatTrafficked', label: 'Trafficked' },
    { key: 'subCatChildLabor', label: 'Child Labor' }, { key: 'subCatPhysicalAbuse', label: 'Physical Abuse' },
    { key: 'subCatSexualAbuse', label: 'Sexual Abuse' }, { key: 'subCatOsaec', label: 'OSAEC' },
    { key: 'subCatCicl', label: 'CICL' }, { key: 'subCatAtRisk', label: 'At Risk' },
    { key: 'subCatStreetChild', label: 'Street Child' }, { key: 'subCatChildWithHiv', label: 'Child w/ HIV' },
  ]},
  { title: 'Family Background', fields: [
    { key: 'familyIs4Ps', label: '4Ps' }, { key: 'familySoloParent', label: 'Solo Parent' },
    { key: 'familyIndigenous', label: 'Indigenous' }, { key: 'familyParentPwd', label: 'Parent PWD' },
    { key: 'familyInformalSettler', label: 'Informal Settler' },
  ]},
  { title: 'Admission & Referral', fields: [
    { key: 'dateOfAdmission', label: 'Date of Admission' }, { key: 'ageUponAdmission', label: 'Age Upon Admission' },
    { key: 'lengthOfStay', label: 'Length of Stay' }, { key: 'referralSource', label: 'Referral Source' },
    { key: 'referringAgencyPerson', label: 'Referring Agency/Person' },
    { key: 'dateColbRegistered', label: 'COLB Registered' }, { key: 'dateColbObtained', label: 'COLB Obtained' },
  ]},
  { title: 'Assessment & Reintegration', fields: [
    { key: 'initialCaseAssessment', label: 'Initial Assessment' }, { key: 'dateCaseStudyPrepared', label: 'Case Study Prepared' },
    { key: 'reintegrationType', label: 'Reintegration Type' }, { key: 'reintegrationStatus', label: 'Reintegration Status' },
  ]},
  { title: 'Dates & Notes', fields: [
    { key: 'dateEnrolled', label: 'Date Enrolled' }, { key: 'dateClosed', label: 'Date Closed' },
    { key: 'createdAt', label: 'Created At' }, { key: 'notesRestricted', label: 'Notes (Restricted)' },
  ]},
];

const booleanFields: (keyof Resident)[] = [
  'subCatOrphaned','subCatTrafficked','subCatChildLabor','subCatPhysicalAbuse','subCatSexualAbuse',
  'subCatOsaec','subCatCicl','subCatAtRisk','subCatStreetChild','subCatChildWithHiv',
  'isPwd','hasSpecialNeeds','familyIs4Ps','familySoloParent','familyIndigenous','familyParentPwd','familyInformalSettler',
];
const readOnlyFields: (keyof Resident)[] = ['residentId', 'createdAt'];
const dateFields: (keyof Resident)[] = ['dateOfBirth','dateOfAdmission','dateColbRegistered','dateColbObtained','dateCaseStudyPrepared','dateEnrolled','dateClosed'];
const intFields: (keyof Resident)[] = ['safehouseId'];
const textareaFields: (keyof Resident)[] = ['notesRestricted'];

const selectFieldMap: Record<string, { optionsKey: keyof FilterOptions; nullable: boolean }> = {
  caseStatus: { optionsKey: 'caseStatuses', nullable: false },
  caseCategory: { optionsKey: 'caseCategories', nullable: false },
  sex: { optionsKey: 'sexes', nullable: false },
  currentRiskLevel: { optionsKey: 'riskLevels', nullable: false },
  initialRiskLevel: { optionsKey: 'riskLevels', nullable: false },
  referralSource: { optionsKey: 'referralSources', nullable: false },
  initialCaseAssessment: { optionsKey: 'initialCaseAssessments', nullable: true },
  reintegrationType: { optionsKey: 'reintegrationTypes', nullable: true },
  reintegrationStatus: { optionsKey: 'reintegrationStatuses', nullable: true },
  assignedSocialWorker: { optionsKey: 'socialWorkers', nullable: true },
  birthStatus: { optionsKey: 'birthStatuses', nullable: false },
  religion: { optionsKey: 'religions', nullable: true },
  pwdType: { optionsKey: 'pwdTypes', nullable: true },
};

const fieldTooltips: Partial<Record<keyof Resident, string>> = {
  caseControlNo: 'Unique case identifier assigned to this resident',
  internalCode: 'Internal tracking code used within the safehouse',
  subCatOsaec: 'Online Sexual Abuse and Exploitation of Children',
  subCatCicl: 'Children in Conflict with the Law',
  isPwd: 'Person with Disability',
  pwdType: 'Specific type or classification of disability',
  familyIs4Ps: 'Pantawid Pamilyang Pilipino Program \u2014 government conditional cash transfer program',
  familyParentPwd: 'Parent is a Person with Disability',
  familyInformalSettler: 'Family resides in an informal or unauthorized settlement',
  dateColbRegistered: 'Date the Certificate of Live Birth was registered',
  dateColbObtained: 'Date the Certificate of Live Birth was obtained',
  initialCaseAssessment: 'Assessment classification assigned when the case was first opened',
  reintegrationType: 'Type of reintegration plan (e.g., family, community, independent living)',
  reintegrationStatus: 'Current status of the reintegration process',
  birthStatus: 'Birth classification (e.g., legitimate, illegitimate)',
  notesRestricted: 'Confidential notes \u2014 access may be restricted to authorized personnel',
  lengthOfStay: 'Duration the resident has stayed at the safehouse',
};

function fmt(value: unknown): string {
  if (value === null || value === undefined) return '\u2014';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function calcAge(birthDate: string, referenceDate: string): string | null {
  if (!birthDate || !referenceDate) return null;
  const birth = new Date(birthDate);
  const ref = new Date(referenceDate);
  if (isNaN(birth.getTime()) || isNaN(ref.getTime())) return null;
  let years = ref.getFullYear() - birth.getFullYear();
  let months = ref.getMonth() - birth.getMonth();
  if (ref.getDate() < birth.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  if (years < 0) return null;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
  return parts.length > 0 ? parts.join(' ') : '0 months';
}

// -- Severity badge helper --

function severityBadge(severity: string | null | undefined) {
  if (!severity) return null;
  const s = severity.toLowerCase();
  const colors = s === 'low' ? 'bg-green-100 text-green-700'
    : s === 'medium' ? 'bg-yellow-100 text-yellow-700'
    : s === 'high' ? 'bg-red-100 text-red-700'
    : 'bg-gray-100 text-gray-700';
  return <span className={`badge ${colors}`}>{severity}</span>;
}

// -- Status badge helper --

function statusBadge(status: string | null | undefined) {
  if (!status) return null;
  const s = status.toLowerCase();
  const colors = s === 'open' ? 'bg-blue-100 text-blue-700'
    : s === 'in progress' ? 'bg-orange-100 text-orange-700'
    : s === 'achieved' ? 'bg-green-100 text-green-700'
    : s === 'on hold' ? 'bg-gray-100 text-gray-600'
    : s === 'closed' ? 'bg-gray-100 text-gray-600'
    : 'bg-gray-100 text-gray-700';
  return <span className={`badge ${colors}`}>{status}</span>;
}

// -- Pagination component --

function TabPagination({ page, totalPages, totalCount, onPageChange }: {
  page: number; totalPages: number; totalCount: number; onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 px-2 py-3 mt-2">
      <button
        className="btn-ghost"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft size={16} />
        Previous
      </button>
      <span className="text-sm text-gray-500">
        Page {page} of {totalPages} ({totalCount} total)
      </span>
      <button
        className="btn-ghost"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// -- Bool filter helper --

function BoolSelect({ label, value, onChange }: {
  label: string; value: boolean | undefined; onChange: (v: boolean | undefined) => void;
}) {
  return (
    <select
      className="select-field max-w-[140px]"
      value={value === undefined ? '' : String(value)}
      onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value === 'true')}
    >
      <option value="">{label}</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  );
}

// -- Tabs --

type TabKey = 'resident' | 'safety' | 'physicalHealth' | 'education';
const tabList: { key: TabKey; label: string }[] = [
  { key: 'resident', label: 'Resident Profile' },
  { key: 'safety', label: 'Safety' },
  { key: 'physicalHealth', label: 'Physical Health' },
  { key: 'education', label: 'Education' },
];

// -- Record field definitions for CRUD modals --

const healthFields: RecordFieldDef[] = [
  { key: 'recordDate', label: 'Record Date', type: 'date', required: true },
  { key: 'generalHealthScore', label: 'General Health Score', type: 'number' },
  { key: 'nutritionScore', label: 'Nutrition Score', type: 'number' },
  { key: 'sleepQualityScore', label: 'Sleep Quality Score', type: 'number' },
  { key: 'energyLevelScore', label: 'Energy Level Score', type: 'number' },
  { key: 'heightCm', label: 'Height (cm)', type: 'number' },
  { key: 'weightKg', label: 'Weight (kg)', type: 'number' },
  { key: 'bmi', label: 'BMI', type: 'number' },
  { key: 'medicalCheckupDone', label: 'Medical Checkup', type: 'checkbox' },
  { key: 'dentalCheckupDone', label: 'Dental Checkup', type: 'checkbox' },
  { key: 'psychologicalCheckupDone', label: 'Psychological Checkup', type: 'checkbox' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

// Merge DB-derived values with hardcoded defaults (deduplicated, sorted)
function mergeOpts(defaults: string[], fromDb?: string[]): string[] {
  return [...new Set([...defaults, ...(fromDb ?? [])])].sort();
}

const defaultEducationLevels = ['Primary', 'Secondary', 'Vocational', 'CollegePrep'];
const defaultCompletionStatuses = ['NotStarted', 'InProgress', 'Completed'];

const defaultIncidentTypes = ['Behavioral', 'Medical', 'Security', 'RunawayAttempt', 'SelfHarm', 'ConflictWithPeer', 'PropertyDamage'];
const defaultSeverities = ['Low', 'Medium', 'High'];

const defaultVisitTypes = ['Initial Assessment', 'Routine Follow-Up', 'Reintegration Assessment', 'Post-Placement Monitoring', 'Emergency'];
const defaultCooperationLevels = ['Highly Cooperative', 'Cooperative', 'Neutral', 'Uncooperative'];
const defaultVisitOutcomes = ['Favorable', 'Needs Improvement', 'Unfavorable', 'Inconclusive'];

const defaultSessionTypes = ['Individual', 'Group'];
const defaultEmotionalStates = ['Calm', 'Anxious', 'Sad', 'Angry', 'Hopeful', 'Withdrawn', 'Happy', 'Distressed'];

const defaultPlanCategories = ['Safety', 'Physical Health', 'Education'];
const defaultPlanStatuses = ['Open', 'In Progress', 'Achieved', 'On Hold', 'Closed'];

const tabPlanCategories: Record<string, string[]> = {
  safety: ['Safety'],
  physicalHealth: ['Physical Health'],
  education: ['Education'],
};

function getEducationFields(opts?: GlobalEducationOptions): RecordFieldDef[] {
  return [
    { key: 'recordDate', label: 'Record Date', type: 'date', required: true },
    { key: 'educationLevel', label: 'Education Level', type: 'select', options: mergeOpts(defaultEducationLevels, opts?.educationLevels), required: true },
    { key: 'schoolName', label: 'School Name', type: 'text' },
    { key: 'enrollmentStatus', label: 'Enrollment Status', type: 'select', options: mergeOpts([], opts?.enrollmentStatuses), required: true },
    { key: 'attendanceRate', label: 'Attendance Rate', type: 'number', required: true },
    { key: 'progressPercent', label: 'Progress %', type: 'number', required: true },
    { key: 'completionStatus', label: 'Completion Status', type: 'select', options: mergeOpts(defaultCompletionStatuses, opts?.completionStatuses), required: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ];
}

function getIncidentFields(opts?: GlobalIncidentOptions, socialWorkers?: string[]): RecordFieldDef[] {
  return [
    { key: 'incidentDate', label: 'Incident Date', type: 'date', required: true },
    { key: 'incidentType', label: 'Incident Type', type: 'select', options: mergeOpts(defaultIncidentTypes, opts?.incidentTypes), required: true },
    { key: 'severity', label: 'Severity', type: 'select', options: mergeOpts(defaultSeverities, opts?.severities), required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'responseTaken', label: 'Response Taken', type: 'textarea' },
    { key: 'resolved', label: 'Resolved', type: 'checkbox' },
    { key: 'resolutionDate', label: 'Resolution Date', type: 'date' },
    { key: 'reportedBy', label: 'Reported By', type: 'select', options: socialWorkers ?? [], required: true },
    { key: 'followUpRequired', label: 'Follow-up Required', type: 'checkbox' },
  ];
}

function getVisitationFields(opts?: GlobalVisitationOptions, socialWorkers?: string[]): RecordFieldDef[] {
  return [
    { key: 'visitDate', label: 'Visit Date', type: 'date', required: true },
    { key: 'socialWorker', label: 'Social Worker', type: 'select', options: socialWorkers ?? opts?.socialWorkers ?? [], required: true },
    { key: 'visitType', label: 'Visit Type', type: 'select', options: mergeOpts(defaultVisitTypes, opts?.visitTypes), required: true },
    { key: 'locationVisited', label: 'Location Visited', type: 'text' },
    { key: 'familyMembersPresent', label: 'Family Members Present', type: 'text' },
    { key: 'purpose', label: 'Purpose', type: 'textarea' },
    { key: 'observations', label: 'Observations', type: 'textarea' },
    { key: 'familyCooperationLevel', label: 'Cooperation Level', type: 'select', options: mergeOpts(defaultCooperationLevels, opts?.cooperationLevels), required: true },
    { key: 'safetyConcernsNoted', label: 'Safety Concerns', type: 'checkbox' },
    { key: 'followUpNeeded', label: 'Follow-up Needed', type: 'checkbox' },
    { key: 'followUpNotes', label: 'Follow-up Notes', type: 'textarea' },
    { key: 'visitOutcome', label: 'Visit Outcome', type: 'select', options: mergeOpts(defaultVisitOutcomes, opts?.visitOutcomes), required: true },
  ];
}

function getProcessRecordingFields(opts?: GlobalProcessRecordingOptions, socialWorkers?: string[]): RecordFieldDef[] {
  return [
    { key: 'sessionDate', label: 'Session Date', type: 'date', required: true },
    { key: 'socialWorker', label: 'Social Worker', type: 'select', options: socialWorkers ?? opts?.socialWorkers ?? [], required: true },
    { key: 'sessionType', label: 'Session Type', type: 'select', options: mergeOpts(defaultSessionTypes, opts?.sessionTypes), required: true },
    { key: 'sessionDurationMinutes', label: 'Duration (min)', type: 'number', required: true },
    { key: 'emotionalStateObserved', label: 'Emotional State (Start)', type: 'select', options: mergeOpts(defaultEmotionalStates, opts?.emotionalStates), required: true },
    { key: 'emotionalStateEnd', label: 'Emotional State (End)', type: 'select', options: mergeOpts(defaultEmotionalStates, opts?.emotionalStates), required: true },
    { key: 'sessionNarrative', label: 'Session Narrative', type: 'textarea' },
    { key: 'interventionsApplied', label: 'Interventions Applied', type: 'textarea' },
    { key: 'followUpActions', label: 'Follow-up Actions', type: 'textarea' },
    { key: 'progressNoted', label: 'Progress Noted', type: 'checkbox' },
    { key: 'concernsFlagged', label: 'Concerns Flagged', type: 'checkbox' },
    { key: 'referralMade', label: 'Referral Made', type: 'checkbox' },
    { key: 'notesRestricted', label: 'Restricted Notes', type: 'textarea' },
  ];
}

const interventionPlanFields: RecordFieldDef[] = [
  { key: 'planCategory', label: 'Category', type: 'select', options: defaultPlanCategories, required: true },
  { key: 'planDescription', label: 'Description', type: 'textarea', required: true },
  { key: 'servicesProvided', label: 'Services Provided', type: 'textarea' },
  { key: 'targetValue', label: 'Target Value', type: 'number' },
  { key: 'targetDate', label: 'Target Date', type: 'date', required: true },
  { key: 'status', label: 'Status', type: 'select', options: defaultPlanStatuses, required: true },
  { key: 'caseConferenceDate', label: 'Case Conference Date', type: 'date' },
];

export default function ResidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const backTo = (location.state as { from?: string })?.from || '/cases';
  const backLabel = backTo === '/admin' ? 'Back to Dashboard' : 'Back to Cases';
  const residentId = Number(id);

  const initialTab = (location.state as { tab?: TabKey })?.tab || 'resident';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Resident state
  const [resident, setResident] = useState<Resident | null>(null);
  const [editData, setEditData] = useState<Resident | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);

  // Health tab
  const [healthRecords, setHealthRecords] = useState<HealthWellbeingRecord[]>([]);
  const [healthPage, setHealthPage] = useState(1);
  const [healthTotal, setHealthTotal] = useState({ totalPages: 1, totalCount: 0 });
  const [healthFilters, setHealthFilters] = useState<HealthFilters>({});

  // Education tab
  const [educationRecords, setEducationRecords] = useState<EducationRecord[]>([]);
  const [eduPage, setEduPage] = useState(1);
  const [eduTotal, setEduTotal] = useState({ totalPages: 1, totalCount: 0 });
  const [eduFilters, setEduFilters] = useState<EducationFilters>({});
  const [eduFilterOpts, setEduFilterOpts] = useState<EducationFilterOptions | null>(null);

  // Incidents tab
  const [incidentReports, setIncidentReports] = useState<IncidentReport[]>([]);
  const [incPage, setIncPage] = useState(1);
  const [incTotal, setIncTotal] = useState({ totalPages: 1, totalCount: 0 });
  const [incFilters, setIncFilters] = useState<IncidentFilters>({});
  const [incFilterOpts, setIncFilterOpts] = useState<IncidentFilterOptions | null>(null);

  // Visitations tab
  const [visitations, setVisitations] = useState<HomeVisitation[]>([]);
  const [visPage, setVisPage] = useState(1);
  const [visTotal, setVisTotal] = useState({ totalPages: 1, totalCount: 0 });
  const [visFilters, setVisFilters] = useState<VisitationFilters>({});
  const [visFilterOpts, setVisFilterOpts] = useState<VisitationFilterOptions | null>(null);

  // Process Recordings tab state
  const [procRecordings, setProcRecordings] = useState<ProcessRecording[]>([]);
  const [procPage, setProcPage] = useState(1);
  const [procTotal, setProcTotal] = useState({ totalPages: 1, totalCount: 0 });
  const [procFilters, setProcFilters] = useState<ProcessRecordingFilters>({});
  const [procFilterOpts, setProcFilterOpts] = useState<ProcessRecordingFilterOptions | null>(null);

  // Global options for modal dropdowns
  const [globalEduOpts, setGlobalEduOpts] = useState<GlobalEducationOptions>();
  const [globalIncOpts, setGlobalIncOpts] = useState<GlobalIncidentOptions>();
  const [globalVisOpts, setGlobalVisOpts] = useState<GlobalVisitationOptions>();
  const [globalProcOpts, setGlobalProcOpts] = useState<GlobalProcessRecordingOptions>();

  // Intervention plans
  const [interventionPlans, setInterventionPlans] = useState<InterventionPlan[]>([]);

  // Chart data (all records, unpaginated)
  const [allIncidents, setAllIncidents] = useState<IncidentReport[]>([]);
  const [allHealthRecords, setAllHealthRecords] = useState<HealthWellbeingRecord[]>([]);
  const [allEducationRecords, setAllEducationRecords] = useState<EducationRecord[]>([]);


  // Record modal state (shared across all tabs)
  type EntityKey = 'health' | 'education' | 'incidents' | 'visitations' | 'processRecordings' | 'interventionPlan';
  const [recordModal, setRecordModal] = useState<{
    entity: EntityKey;
    mode: 'view' | 'edit' | 'create';
    data: Record<string, unknown>;
    original?: Record<string, unknown>;
  } | null>(null);
  const [recordSaving, setRecordSaving] = useState(false);

  // A counter that increments to force tab data refetch after CRUD
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  // ML predictions
  const [mlPrediction, setMlPrediction] = useState<ReintegrationPrediction | null>(null);
  const [progressPrediction, setProgressPrediction] = useState<ProgressPrediction | null>(null);

  // -- Initial loads --

  useEffect(() => {
    fetchSafehouses().then(setSafehouses).catch(console.error);
    fetchFilterOptions().then(setFilterOptions).catch(console.error);
    fetchGlobalEducationOptions().then(setGlobalEduOpts).catch(console.error);
    fetchGlobalIncidentOptions().then(setGlobalIncOpts).catch(console.error);
    fetchGlobalVisitationOptions().then(setGlobalVisOpts).catch(console.error);
    fetchGlobalProcessRecordingOptions().then(setGlobalProcOpts).catch(console.error);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchResident(residentId)
      .then((r) => {
        setResident(r);
        setEditData({ ...r });
        fetchReintegrationPrediction(residentId)
          .then(setMlPrediction)
          .catch(() => { /* ML server unavailable — score card simply won't show */ });
        fetchProgressPrediction(residentId)
          .then(setProgressPrediction)
          .catch(() => { /* ML server unavailable — score card simply won't show */ });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // -- Tab data fetching --

  // Intervention plans -- fetch when any non-resident tab is active
  useEffect(() => {
    if (activeTab === 'resident') return;
    fetchInterventionPlans(residentId).then(setInterventionPlans).catch(console.error);
  }, [activeTab, residentId, refreshKey]);

  // Safety tab: incidents + visitations
  useEffect(() => {
    if (activeTab !== 'safety') return;
    fetchIncidentReports(residentId, incPage, 10, incFilters)
      .then((res) => { setIncidentReports(res.data); setIncTotal({ totalPages: res.totalPages, totalCount: res.totalCount }); })
      .catch(console.error);
  }, [activeTab, incPage, incFilters, residentId, refreshKey]);

  useEffect(() => {
    if (activeTab !== 'safety') return;
    fetchVisitations(residentId, visPage, 10, visFilters)
      .then((res) => { setVisitations(res.data); setVisTotal({ totalPages: res.totalPages, totalCount: res.totalCount }); })
      .catch(console.error);
  }, [activeTab, visPage, visFilters, residentId, refreshKey]);

  // Physical Health tab: health records + counseling sessions
  useEffect(() => {
    if (activeTab !== 'physicalHealth') return;
    fetchHealthRecords(residentId, healthPage, 10, healthFilters)
      .then((res) => { setHealthRecords(res.data); setHealthTotal({ totalPages: res.totalPages, totalCount: res.totalCount }); })
      .catch(console.error);
  }, [activeTab, healthPage, healthFilters, residentId, refreshKey]);

  useEffect(() => {
    if (activeTab !== 'physicalHealth') return;
    fetchProcessRecordings(residentId, procPage, 10, procFilters)
      .then((res) => { setProcRecordings(res.data); setProcTotal({ totalPages: res.totalPages, totalCount: res.totalCount }); })
      .catch(console.error);
  }, [activeTab, procPage, procFilters, residentId, refreshKey]);

  // Education tab
  useEffect(() => {
    if (activeTab !== 'education') return;
    fetchEducationRecords(residentId, eduPage, 10, eduFilters)
      .then((res) => { setEducationRecords(res.data); setEduTotal({ totalPages: res.totalPages, totalCount: res.totalCount }); })
      .catch(console.error);
  }, [activeTab, eduPage, eduFilters, residentId, refreshKey]);

  // Load filter options once per tab
  useEffect(() => {
    if (activeTab === 'education' && !eduFilterOpts)
      fetchEducationFilterOptions(residentId).then(setEduFilterOpts).catch(console.error);
    if (activeTab === 'safety' && !incFilterOpts)
      fetchIncidentFilterOptions(residentId).then(setIncFilterOpts).catch(console.error);
    if (activeTab === 'safety' && !visFilterOpts)
      fetchVisitationFilterOptions(residentId).then(setVisFilterOpts).catch(console.error);
    if (activeTab === 'physicalHealth' && !procFilterOpts)
      fetchProcessRecordingFilterOptions(residentId).then(setProcFilterOpts).catch(console.error);
  }, [activeTab]);

  // Chart data -- fetch all records (unpaginated) for each tab
  useEffect(() => {
    if (activeTab === 'safety')
      fetchIncidentReports(residentId, 1, 500, {}).then((res) => setAllIncidents(res.data)).catch(console.error);
    if (activeTab === 'physicalHealth')
      fetchHealthRecords(residentId, 1, 500, {}).then((res) => setAllHealthRecords(res.data)).catch(console.error);
    if (activeTab === 'education')
      fetchEducationRecords(residentId, 1, 500, {}).then((res) => setAllEducationRecords(res.data)).catch(console.error);
  }, [activeTab, residentId, refreshKey]);

  // -- Resident edit handlers --

  const handleEditField = (key: keyof Resident, value: unknown) => {
    if (!editData) return;
    const next = { ...editData, [key]: value };
    const dob = String(next.dateOfBirth || '');
    if (key === 'dateOfBirth' || key === 'dateOfAdmission') {
      next.ageUponAdmission = calcAge(dob, String(next.dateOfAdmission || ''));
    }
    if (key === 'dateOfBirth') {
      next.presentAge = calcAge(dob, new Date().toISOString().slice(0, 10));
    }
    setEditData(next);
  };

  const handleSave = async () => {
    if (!editData) return;
    setSaving(true);
    try {
      const updated = await updateResident(editData.residentId, editData);
      setResident(updated); setEditData({ ...updated }); setIsEditing(false);
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = () => setShowDeleteConfirm(true);

  const confirmDelete = async () => {
    if (!resident) return;
    setSaving(true);
    try { await deleteResident(resident.residentId); setShowDeleteConfirm(false); navigate('/cases'); }
    catch (err) { alert(err instanceof Error ? err.message : 'Failed to delete'); }
    finally { setSaving(false); }
  };

  // -- Record modal handlers --

  const openRecordCreate = (entity: EntityKey, defaults: Record<string, unknown>) => {
    setRecordModal({ entity, mode: 'create', data: { ...defaults, residentId } });
  };

  const openRecordView = (entity: EntityKey, record: Record<string, unknown>) => {
    setRecordModal({ entity, mode: 'view', data: { ...record }, original: { ...record } });
  };

  const handleRecordField = (key: string, value: unknown) => {
    if (!recordModal) return;
    setRecordModal({ ...recordModal, data: { ...recordModal.data, [key]: value } });
  };

  const handleRecordSave = async () => {
    if (!recordModal) return;
    setRecordSaving(true);
    try {
      if (recordModal.mode === 'create') {
        switch (recordModal.entity) {
          case 'health': await createHealthRecord(recordModal.data as Partial<HealthWellbeingRecord>); break;
          case 'education': await createEducationRecord(recordModal.data as Partial<EducationRecord>); break;
          case 'incidents': await createIncidentReport(recordModal.data as Partial<IncidentReport>); break;
          case 'visitations': await createVisitation(recordModal.data as Partial<HomeVisitation>); break;
          case 'processRecordings': await createProcessRecording(recordModal.data as Partial<ProcessRecording>); break;
          case 'interventionPlan': await createInterventionPlan(recordModal.data as Partial<InterventionPlan>); break;
        }
      } else {
        const d = recordModal.data;
        switch (recordModal.entity) {
          case 'health': await updateHealthRecord(d.healthRecordId as number, d as unknown as HealthWellbeingRecord); break;
          case 'education': await updateEducationRecord(d.educationRecordId as number, d as unknown as EducationRecord); break;
          case 'incidents': await updateIncidentReport(d.incidentId as number, d as unknown as IncidentReport); break;
          case 'visitations': await updateVisitation(d.visitationId as number, d as unknown as HomeVisitation); break;
          case 'processRecordings': await updateProcessRecording(d.recordingId as number, d as unknown as ProcessRecording); break;
          case 'interventionPlan': await updateInterventionPlan(d.planId as number, d as unknown as InterventionPlan); break;
        }
      }
      setRecordModal(null);
      triggerRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setRecordSaving(false);
    }
  };

  const handleRecordDelete = async () => {
    if (!recordModal) return;
    setRecordSaving(true);
    try {
      const d = recordModal.data;
      switch (recordModal.entity) {
        case 'health': await deleteHealthRecord(d.healthRecordId as number); break;
        case 'education': await deleteEducationRecord(d.educationRecordId as number); break;
        case 'incidents': await deleteIncidentReport(d.incidentId as number); break;
        case 'visitations': await deleteVisitation(d.visitationId as number); break;
        case 'processRecordings': await deleteProcessRecording(d.recordingId as number); break;
        case 'interventionPlan': await deleteInterventionPlan(d.planId as number); break;
      }
      setRecordModal(null);
      triggerRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setRecordSaving(false);
    }
  };

  // -- Resident input renderer --

  const renderInput = (col: FieldDef) => {
    if (!editData) return null;
    const value = editData[col.key];
    if (readOnlyFields.includes(col.key)) return <span className="text-sm text-gray-900 dark:text-white">{fmt(value)}</span>;
    if (booleanFields.includes(col.key)) return (
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
        checked={!!value}
        onChange={(e) => handleEditField(col.key, e.target.checked)}
      />
    );
    if (col.key === 'safehouseId') return (
      <select className="select-field" value={value as number} onChange={(e) => handleEditField(col.key, Number(e.target.value))}>
        {safehouses.map((sh) => <option key={sh.safehouseId} value={sh.safehouseId}>{sh.name}</option>)}
      </select>
    );
    const sc = selectFieldMap[col.key];
    if (sc && filterOptions) {
      const opts = filterOptions[sc.optionsKey];
      return (
        <select className="select-field" value={value == null ? '' : String(value)} onChange={(e) => handleEditField(col.key, e.target.value || null)}>
          {sc.nullable && <option value="">&mdash; None &mdash;</option>}
          {!sc.nullable && !value && <option value="">&mdash; Select &mdash;</option>}
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (dateFields.includes(col.key)) return <input className="input-field" type="date" value={value == null ? '' : String(value).slice(0, 10)} onChange={(e) => handleEditField(col.key, e.target.value || null)} />;
    if (textareaFields.includes(col.key)) return <textarea className="input-field" rows={3} value={value == null ? '' : String(value)} onChange={(e) => handleEditField(col.key, e.target.value || null)} />;
    if (intFields.includes(col.key)) return <input className="input-field" type="number" value={value == null ? '' : String(value)} onChange={(e) => handleEditField(col.key, e.target.value ? Number(e.target.value) : null)} />;
    return <input className="input-field" type="text" value={value == null ? '' : String(value)} onChange={(e) => handleEditField(col.key, e.target.value || null)} />;
  };

  // -- Date range filter helper --

  const DateRange = ({ from, to, onChange }: { from?: string; to?: string; onChange: (f: string | undefined, t: string | undefined) => void }) => (
    <>
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
        From <input className="input-field max-w-[150px]" type="date" value={from || ''} onChange={(e) => onChange(e.target.value || undefined, to)} />
      </label>
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
        To <input className="input-field max-w-[150px]" type="date" value={to || ''} onChange={(e) => onChange(from, e.target.value || undefined)} />
      </label>
    </>
  );

  // -- Intervention plan inline CRUD --

  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [editPlanData, setEditPlanData] = useState<Record<string, unknown>>({});
  const [planSaving, setPlanSaving] = useState(false);
  const [showPlanDeleteConfirm, setShowPlanDeleteConfirm] = useState<number | null>(null);

  const startEditPlan = (p: InterventionPlan) => {
    setEditingPlanId(p.planId);
    setEditPlanData({ ...p } as unknown as Record<string, unknown>);
  };
  const cancelEditPlan = () => { setEditingPlanId(null); setEditPlanData({}); };

  const savePlan = async () => {
    if (editingPlanId == null) return;
    setPlanSaving(true);
    try {
      await updateInterventionPlan(editingPlanId, editPlanData as unknown as InterventionPlan);
      setEditingPlanId(null);
      triggerRefresh();
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed to save'); }
    finally { setPlanSaving(false); }
  };

  const confirmDeletePlan = async (planId: number) => {
    setPlanSaving(true);
    try {
      await deleteInterventionPlan(planId);
      setShowPlanDeleteConfirm(null);
      triggerRefresh();
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed to delete'); }
    finally { setPlanSaving(false); }
  };

  const renderPlanField = (p: InterventionPlan, key: string, label: string, type: 'text' | 'date' | 'number' | 'select' | 'textarea' = 'text', options?: string[]) => {
    const isEditing = editingPlanId === p.planId;
    const val = isEditing ? editPlanData[key] : (p as unknown as Record<string, unknown>)[key];
    if (!isEditing) return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
        <span className="text-sm text-gray-900 dark:text-white">{fmt(val)}</span>
      </div>
    );
    const onChange = (v: unknown) => setEditPlanData((d) => ({ ...d, [key]: v }));
    let input;
    if (type === 'select' && options) {
      input = <select className="select-field" value={val == null ? '' : String(val)} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">-- Select --</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>;
    } else if (type === 'date') {
      input = <input className="input-field" type="date" value={val == null ? '' : String(val).slice(0, 10)} onChange={(e) => onChange(e.target.value || null)} />;
    } else if (type === 'number') {
      input = <input className="input-field" type="number" value={val == null ? '' : String(val)} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)} />;
    } else if (type === 'textarea') {
      input = <textarea className="input-field" rows={2} value={val == null ? '' : String(val)} onChange={(e) => onChange(e.target.value || null)} />;
    } else {
      input = <input className="input-field" type="text" value={val == null ? '' : String(val)} onChange={(e) => onChange(e.target.value || null)} />;
    }
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
        {input}
      </div>
    );
  };

  // -- Intervention plans renderer --

  const renderInterventionPlans = (categories: string[]) => {
    const plans = interventionPlans.filter((p) => categories.includes(p.planCategory));
    const existingCategories = plans.map((p) => p.planCategory);
    const missingCategories = categories.filter((c) => !existingCategories.includes(c));

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Intervention Plans</h3>
          <div className="flex gap-2">
            {missingCategories.map((cat) => (
              <button key={cat} className="btn-primary"
                onClick={() => openRecordCreate('interventionPlan', {
                  planCategory: cat, status: 'Open', targetDate: new Date().toISOString().slice(0, 10),
                })}>
                <Plus size={16} />
                {cat} Plan
              </button>
            ))}
          </div>
        </div>
        {plans.length === 0 ? (
          <p className="text-sm text-gray-400">No intervention plans for this category yet.</p>
        ) : plans.map((p) => {
          const isEditing = editingPlanId === p.planId;
          return (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-md mb-4" key={p.planId}>
              <div className="flex items-center gap-3 mb-3">
                <strong className="flex-1 text-sm font-semibold text-gray-900 dark:text-white">{p.planCategory}</strong>
                {statusBadge(p.status)}
                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <>
                      <button className="btn-icon text-green-600 hover:bg-green-50 hover:text-green-700" onClick={savePlan} disabled={planSaving} title="Save">
                        <Check size={16} />
                      </button>
                      <button className="btn-icon text-gray-500 hover:bg-gray-100 hover:text-gray-700" onClick={cancelEditPlan} disabled={planSaving} title="Cancel">
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn-icon" onClick={() => startEditPlan(p)} title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button className="btn-icon text-red-500 hover:bg-red-50 hover:text-red-700" onClick={() => setShowPlanDeleteConfirm(p.planId)} title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {renderPlanField(p, 'planDescription', 'Description', 'textarea')}
                {renderPlanField(p, 'servicesProvided', 'Services Provided', 'textarea')}
                {renderPlanField(p, 'targetValue', 'Target Value', 'number')}
                {renderPlanField(p, 'targetDate', 'Target Date', 'date')}
                {renderPlanField(p, 'status', 'Status', 'select', defaultPlanStatuses)}
                {renderPlanField(p, 'caseConferenceDate', 'Case Conference Date', 'date')}
              </div>
            </div>
          );
        })}

        {showPlanDeleteConfirm != null && createPortal(
          <div className="modal-overlay" onClick={() => setShowPlanDeleteConfirm(null)}>
            <div className="modal-body max-w-md" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Intervention Plan</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Are you sure you want to delete this plan? This action cannot be undone.</p>
              <div className="flex items-center justify-end gap-3">
                <button className="btn-secondary"
                  onClick={() => setShowPlanDeleteConfirm(null)} disabled={planSaving}>Cancel</button>
                <button className="btn-danger"
                  onClick={() => confirmDeletePlan(showPlanDeleteConfirm)} disabled={planSaving}>
                  {planSaving ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  };

  // -- Tab renderers --

  const renderResidentTab = () => {
    if (!resident || !editData) return null;
    return modalSections.map((section) => (
      <div className="border-b border-gray-100 dark:border-gray-700 py-5 last:border-b-0" key={section.title}>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-900 dark:text-white">{section.title}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {section.fields.map((col) => (
            <div className="flex flex-col gap-1" key={col.key}>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {col.label}
                {fieldTooltips[col.key] && (
                  <span
                    className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] font-bold text-gray-500 dark:text-gray-400 cursor-help"
                    title={fieldTooltips[col.key]}
                  >i</span>
                )}
              </label>
              {isEditing ? renderInput(col) : <span className="text-sm text-gray-900 dark:text-white">{fmt(resident[col.key])}</span>}
            </div>
          ))}
        </div>
      </div>
    ));
  };

  const renderHealthTab = () => (
    <>
      <div className="mb-4 flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 p-3">
          <Filter size={16} className="shrink-0 text-gray-400" />
          <DateRange from={healthFilters.dateFrom} to={healthFilters.dateTo}
            onChange={(f, t) => { setHealthFilters((p) => ({ ...p, dateFrom: f, dateTo: t })); setHealthPage(1); }} />
          <BoolSelect label="Medical" value={healthFilters.medicalCheckupDone}
            onChange={(v) => { setHealthFilters((p) => ({ ...p, medicalCheckupDone: v })); setHealthPage(1); }} />
          <BoolSelect label="Dental" value={healthFilters.dentalCheckupDone}
            onChange={(v) => { setHealthFilters((p) => ({ ...p, dentalCheckupDone: v })); setHealthPage(1); }} />
          <BoolSelect label="Psychological" value={healthFilters.psychologicalCheckupDone}
            onChange={(v) => { setHealthFilters((p) => ({ ...p, psychologicalCheckupDone: v })); setHealthPage(1); }} />
        </div>
        <button className="btn-primary shrink-0"
          onClick={() => openRecordCreate('health', { recordDate: new Date().toISOString().slice(0, 10), medicalCheckupDone: false, dentalCheckupDone: false, psychologicalCheckupDone: false })}>
          <Plus size={16} />
          Add Health Record
        </button>
      </div>
      {healthRecords.length === 0 ? <p className="py-8 text-center text-sm text-gray-400">No health & wellbeing records found.</p> : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
            <table className="table-base">
              <thead><tr>
                <th>Date</th><th>Health</th><th>Nutrition</th><th>Sleep</th><th>Energy</th>
                <th>Height</th><th>Weight</th><th>BMI</th><th>Medical</th><th>Dental</th><th>Psych</th><th>Notes</th>
              </tr></thead>
              <tbody>
                {healthRecords.map((r) => (
                  <tr key={r.healthRecordId} className="cursor-pointer" onClick={() => openRecordView('health', r as unknown as Record<string, unknown>)}>
                    <td>{r.recordDate}</td><td>{fmt(r.generalHealthScore)}</td><td>{fmt(r.nutritionScore)}</td>
                    <td>{fmt(r.sleepQualityScore)}</td><td>{fmt(r.energyLevelScore)}</td>
                    <td>{fmt(r.heightCm)}</td><td>{fmt(r.weightKg)}</td><td>{fmt(r.bmi)}</td>
                    <td>{fmt(r.medicalCheckupDone)}</td><td>{fmt(r.dentalCheckupDone)}</td>
                    <td>{fmt(r.psychologicalCheckupDone)}</td><td>{fmt(r.notes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TabPagination page={healthPage} totalPages={healthTotal.totalPages} totalCount={healthTotal.totalCount} onPageChange={setHealthPage} />
        </>
      )}
    </>
  );

  const renderEducationTab = () => (
    <>
      <div className="mb-4 flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 p-3">
          <Filter size={16} className="shrink-0 text-gray-400" />
          <DateRange from={eduFilters.dateFrom} to={eduFilters.dateTo}
            onChange={(f, t) => { setEduFilters((p) => ({ ...p, dateFrom: f, dateTo: t })); setEduPage(1); }} />
          {eduFilterOpts && <>
            <select className="select-field max-w-[160px]" value={eduFilters.educationLevel || ''} onChange={(e) => { setEduFilters((p) => ({ ...p, educationLevel: e.target.value || undefined })); setEduPage(1); }}>
              <option value="">All Levels</option>
              {eduFilterOpts.educationLevels.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <select className="select-field max-w-[160px]" value={eduFilters.enrollmentStatus || ''} onChange={(e) => { setEduFilters((p) => ({ ...p, enrollmentStatus: e.target.value || undefined })); setEduPage(1); }}>
              <option value="">All Enrollment</option>
              {eduFilterOpts.enrollmentStatuses.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <select className="select-field max-w-[160px]" value={eduFilters.completionStatus || ''} onChange={(e) => { setEduFilters((p) => ({ ...p, completionStatus: e.target.value || undefined })); setEduPage(1); }}>
              <option value="">All Completion</option>
              {eduFilterOpts.completionStatuses.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </>}
        </div>
        <button className="btn-primary shrink-0"
          onClick={() => openRecordCreate('education', { recordDate: new Date().toISOString().slice(0, 10), attendanceRate: 0, progressPercent: 0 })}>
          <Plus size={16} />
          Add Education Record
        </button>
      </div>
      {educationRecords.length === 0 ? <p className="py-8 text-center text-sm text-gray-400">No education records found.</p> : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
            <table className="table-base">
              <thead><tr>
                <th>Date</th><th>Level</th><th>School</th><th>Enrollment</th>
                <th>Attendance</th><th>Progress</th><th>Completion</th><th>Notes</th>
              </tr></thead>
              <tbody>
                {educationRecords.map((r) => (
                  <tr key={r.educationRecordId} className="cursor-pointer" onClick={() => openRecordView('education', r as unknown as Record<string, unknown>)}>
                    <td>{r.recordDate}</td><td>{r.educationLevel}</td><td>{fmt(r.schoolName)}</td>
                    <td>{r.enrollmentStatus}</td><td>{(r.attendanceRate * 100).toFixed(1)}%</td>
                    <td>{r.progressPercent.toFixed(1)}%</td><td>{r.completionStatus}</td><td>{fmt(r.notes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TabPagination page={eduPage} totalPages={eduTotal.totalPages} totalCount={eduTotal.totalCount} onPageChange={setEduPage} />
        </>
      )}
    </>
  );

  const renderIncidentsTab = () => (
    <>
      <div className="mb-4 flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 p-3">
          <Filter size={16} className="shrink-0 text-gray-400" />
          <DateRange from={incFilters.dateFrom} to={incFilters.dateTo}
            onChange={(f, t) => { setIncFilters((p) => ({ ...p, dateFrom: f, dateTo: t })); setIncPage(1); }} />
          {incFilterOpts && <>
            <select className="select-field max-w-[160px]" value={incFilters.incidentType || ''} onChange={(e) => { setIncFilters((p) => ({ ...p, incidentType: e.target.value || undefined })); setIncPage(1); }}>
              <option value="">All Types</option>
              {incFilterOpts.incidentTypes.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <select className="select-field max-w-[160px]" value={incFilters.severity || ''} onChange={(e) => { setIncFilters((p) => ({ ...p, severity: e.target.value || undefined })); setIncPage(1); }}>
              <option value="">All Severities</option>
              {incFilterOpts.severities.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </>}
          <BoolSelect label="Resolved" value={incFilters.resolved}
            onChange={(v) => { setIncFilters((p) => ({ ...p, resolved: v })); setIncPage(1); }} />
        </div>
        <button className="btn-primary shrink-0"
          onClick={() => openRecordCreate('incidents', { incidentDate: new Date().toISOString().slice(0, 10), safehouseId: resident?.safehouseId, resolved: false, followUpRequired: false })}>
          <Plus size={16} />
          Report Incident
        </button>
      </div>
      {incidentReports.length === 0 ? <p className="py-8 text-center text-sm text-gray-400">No incident reports found.</p> : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
            <table className="table-base">
              <thead><tr>
                <th>Date</th><th>Type</th><th>Severity</th><th>Description</th><th>Response</th>
                <th>Resolved</th><th>Resolution Date</th><th>Reported By</th><th>Follow-up</th>
              </tr></thead>
              <tbody>
                {incidentReports.map((r) => (
                  <tr
                    key={r.incidentId}
                    className={`cursor-pointer ${r.severity === 'High' ? 'bg-red-50 dark:bg-red-500/10' : ''}`}
                    onClick={() => openRecordView('incidents', r as unknown as Record<string, unknown>)}
                  >
                    <td>{r.incidentDate}</td><td>{r.incidentType}</td>
                    <td>{severityBadge(r.severity)}</td>
                    <td>{fmt(r.description)}</td><td>{fmt(r.responseTaken)}</td>
                    <td>{fmt(r.resolved)}</td><td>{fmt(r.resolutionDate)}</td>
                    <td>{r.reportedBy}</td><td>{fmt(r.followUpRequired)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TabPagination page={incPage} totalPages={incTotal.totalPages} totalCount={incTotal.totalCount} onPageChange={setIncPage} />
        </>
      )}
    </>
  );

  const renderVisitationsTab = () => (
    <>
      <div className="mb-4 flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 p-3">
          <Filter size={16} className="shrink-0 text-gray-400" />
          <DateRange from={visFilters.dateFrom} to={visFilters.dateTo}
            onChange={(f, t) => { setVisFilters((p) => ({ ...p, dateFrom: f, dateTo: t })); setVisPage(1); }} />
          {visFilterOpts && <>
            <select className="select-field max-w-[160px]" value={visFilters.visitType || ''} onChange={(e) => { setVisFilters((p) => ({ ...p, visitType: e.target.value || undefined })); setVisPage(1); }}>
              <option value="">All Types</option>
              {visFilterOpts.visitTypes.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <select className="select-field max-w-[160px]" value={visFilters.familyCooperationLevel || ''} onChange={(e) => { setVisFilters((p) => ({ ...p, familyCooperationLevel: e.target.value || undefined })); setVisPage(1); }}>
              <option value="">All Cooperation</option>
              {visFilterOpts.cooperationLevels.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <select className="select-field max-w-[160px]" value={visFilters.socialWorker || ''} onChange={(e) => { setVisFilters((p) => ({ ...p, socialWorker: e.target.value || undefined })); setVisPage(1); }}>
              <option value="">All Workers</option>
              {visFilterOpts.socialWorkers.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </>}
          <BoolSelect label="Safety Concerns" value={visFilters.safetyConcernsNoted}
            onChange={(v) => { setVisFilters((p) => ({ ...p, safetyConcernsNoted: v })); setVisPage(1); }} />
        </div>
        <button className="btn-primary shrink-0"
          onClick={() => openRecordCreate('visitations', { visitDate: new Date().toISOString().slice(0, 10), safetyConcernsNoted: false, followUpNeeded: false })}>
          <Plus size={16} />
          Add Visitation
        </button>
      </div>
      {visitations.length === 0 ? <p className="py-8 text-center text-sm text-gray-400">No visitation records found.</p> : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
            <table className="table-base">
              <thead><tr>
                <th>Date</th><th>Social Worker</th><th>Type</th><th>Location</th><th>Purpose</th>
                <th>Cooperation</th><th>Safety Concerns</th><th>Follow-up</th><th>Outcome</th>
              </tr></thead>
              <tbody>
                {visitations.map((r) => (
                  <tr key={r.visitationId} className="cursor-pointer" onClick={() => openRecordView('visitations', r as unknown as Record<string, unknown>)}>
                    <td>{r.visitDate}</td><td>{r.socialWorker}</td><td>{r.visitType}</td>
                    <td>{fmt(r.locationVisited)}</td><td>{fmt(r.purpose)}</td>
                    <td>{r.familyCooperationLevel}</td><td>{fmt(r.safetyConcernsNoted)}</td>
                    <td>{fmt(r.followUpNeeded)}</td><td>{r.visitOutcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TabPagination page={visPage} totalPages={visTotal.totalPages} totalCount={visTotal.totalCount} onPageChange={setVisPage} />
        </>
      )}
    </>
  );

  const renderProcessRecordingsTab = () => (
    <>
      <div className="mb-4 flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 p-3">
          <Filter size={16} className="shrink-0 text-gray-400" />
          <DateRange from={procFilters.dateFrom} to={procFilters.dateTo}
            onChange={(f, t) => { setProcFilters((p) => ({ ...p, dateFrom: f, dateTo: t })); setProcPage(1); }} />
          {procFilterOpts && <>
            <select className="select-field max-w-[160px]" value={procFilters.sessionType || ''} onChange={(e) => { setProcFilters((p) => ({ ...p, sessionType: e.target.value || undefined })); setProcPage(1); }}>
              <option value="">All Types</option>
              {procFilterOpts.sessionTypes.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <select className="select-field max-w-[160px]" value={procFilters.socialWorker || ''} onChange={(e) => { setProcFilters((p) => ({ ...p, socialWorker: e.target.value || undefined })); setProcPage(1); }}>
              <option value="">All Workers</option>
              {procFilterOpts.socialWorkers.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </>}
          <BoolSelect label="Concerns" value={procFilters.concernsFlagged}
            onChange={(v) => { setProcFilters((p) => ({ ...p, concernsFlagged: v })); setProcPage(1); }} />
        </div>
        <button className="btn-primary shrink-0"
          onClick={() => openRecordCreate('processRecordings', { sessionDate: new Date().toISOString().slice(0, 10), progressNoted: false, concernsFlagged: false, referralMade: false })}>
          <Plus size={16} />
          Add Session
        </button>
      </div>
      {procRecordings.length === 0 ? <p className="py-8 text-center text-sm text-gray-400">No counseling sessions found.</p> : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
            <table className="table-base">
              <thead><tr>
                <th>Date</th><th>Worker</th><th>Type</th><th>Duration</th><th>State (Start)</th>
                <th>State (End)</th><th>Progress</th><th>Concerns</th><th>Referral</th>
              </tr></thead>
              <tbody>
                {procRecordings.map((r) => (
                  <tr key={r.recordingId} className="cursor-pointer" onClick={() => openRecordView('processRecordings', r as unknown as Record<string, unknown>)}>
                    <td>{r.sessionDate}</td><td>{r.socialWorker}</td><td>{r.sessionType}</td>
                    <td>{r.sessionDurationMinutes}m</td><td>{r.emotionalStateObserved}</td>
                    <td>{r.emotionalStateEnd}</td><td>{fmt(r.progressNoted)}</td>
                    <td>{fmt(r.concernsFlagged)}</td><td>{fmt(r.referralMade)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TabPagination page={procPage} totalPages={procTotal.totalPages} totalCount={procTotal.totalCount} onPageChange={setProcPage} />
        </>
      )}
    </>
  );

  // -- Composite tab renderers --

  const renderSafetyTab = () => {
    const plan = interventionPlans.find((p) => p.planCategory === 'Safety') ?? null;
    return (
      <>
        {renderInterventionPlans(tabPlanCategories.safety)}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-md mb-6">
          <SafetyChart plan={plan} incidents={allIncidents} />
        </div>
        <h3 className="mb-3 mt-6 text-base font-bold text-gray-900 dark:text-white">Incidents</h3>
        {renderIncidentsTab()}
        <h3 className="mb-3 mt-8 text-base font-bold text-gray-900 dark:text-white">Visitations</h3>
        {renderVisitationsTab()}
      </>
    );
  };

  const renderPhysicalHealthTab = () => {
    const plan = interventionPlans.find((p) => p.planCategory === 'Physical Health') ?? null;
    return (
      <>
        {renderInterventionPlans(tabPlanCategories.physicalHealth)}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-md mb-6">
          <HealthChart plan={plan} records={allHealthRecords} />
        </div>
        <h3 className="mb-3 mt-6 text-base font-bold text-gray-900 dark:text-white">Health & Wellbeing</h3>
        {renderHealthTab()}
        <h3 className="mb-3 mt-8 text-base font-bold text-gray-900 dark:text-white">Counseling Sessions</h3>
        {renderProcessRecordingsTab()}
      </>
    );
  };

  const renderEducationCompositeTab = () => {
    const plan = interventionPlans.find((p) => p.planCategory === 'Education') ?? null;
    return (
      <>
        {renderInterventionPlans(tabPlanCategories.education)}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-md mb-6">
          <EducationChart plan={plan} records={allEducationRecords} />
        </div>
        <h3 className="mb-3 mt-6 text-base font-bold text-gray-900 dark:text-white">Education Records</h3>
        {renderEducationTab()}
      </>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'resident': return renderResidentTab();
      case 'safety': return renderSafetyTab();
      case 'physicalHealth': return renderPhysicalHealthTab();
      case 'education': return renderEducationCompositeTab();
    }
  };

  // -- Render --

  if (loading) return <div className="p-4 sm:p-6 lg:p-8"><p className="text-center text-sm text-gray-500">Loading...</p></div>;
  if (error) return <div className="p-4 sm:p-6 lg:p-8"><p className="text-center text-sm text-red-500">Error: {error}</p></div>;
  if (!resident || !editData) return <div className="p-4 sm:p-6 lg:p-8"><p className="text-center text-sm text-gray-500">Resident not found.</p></div>;

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        <button className="btn-ghost mb-4" onClick={() => navigate(backTo)}>
          <ArrowLeft size={16} />
          {backLabel}
        </button>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-md">
          {/* Top bar */}
          <div className="flex flex-wrap items-start gap-4 border-b border-gray-100 p-4 sm:items-center sm:p-6 dark:border-gray-700">
            <img src="/portrait_resident.png" alt="Resident" className="h-14 w-14 rounded-full border border-gray-200 dark:border-gray-700 object-cover" />
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{resident.caseControlNo}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{resident.internalCode} &middot; {resident.caseStatus}</p>
            </div>
            <div className="flex items-center gap-2">
              {activeTab === 'resident' && (
                isEditing ? (
                  <>
                    <button className="btn-primary" onClick={handleSave} disabled={saving} title="Save">
                      {saving ? 'Saving...' : <><Save size={16} /> Save</>}
                    </button>
                    <button className="btn-secondary"
                      onClick={() => { setEditData({ ...resident }); setIsEditing(false); }} disabled={saving} title="Cancel">
                      <X size={16} /> Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn-icon" onClick={() => setIsEditing(true)} title="Edit">
                      <Pencil size={16} />
                    </button>
                    <button className="inline-flex items-center justify-center rounded-lg p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 cursor-pointer" onClick={handleDelete} disabled={saving} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </>
                )
              )}
            </div>
          </div>

          {/* ML Reintegration Score */}
          {mlPrediction && (
            <div className={`flex flex-wrap items-center gap-4 border-b border-gray-100 dark:border-gray-700 px-4 py-3 sm:px-6 ${
              mlPrediction.readiness_score >= 75
                ? 'bg-green-50 dark:bg-green-500/5'
                : mlPrediction.readiness_score >= 50
                ? 'bg-yellow-50 dark:bg-yellow-500/5'
                : 'bg-red-50 dark:bg-red-500/5'
            }`}>
              <Brain className={`h-5 w-5 shrink-0 ${
                mlPrediction.readiness_score >= 75 ? 'text-green-500'
                : mlPrediction.readiness_score >= 50 ? 'text-yellow-500'
                : 'text-red-500'
              }`} />
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Reintegration Readiness
                </span>
                <span className={`text-2xl font-bold ${
                  mlPrediction.readiness_score >= 75 ? 'text-green-600 dark:text-green-400'
                  : mlPrediction.readiness_score >= 50 ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'
                }`}>
                  {mlPrediction.readiness_score}
                  <span className="ml-0.5 text-sm font-normal text-gray-400">/100</span>
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{mlPrediction.recommendation}</span>
              </div>
              <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                ML · {new Date(mlPrediction.predicted_at).toLocaleTimeString()}
              </span>
            </div>
          )}

          {/* ML Education Progress Score */}
          {progressPrediction && (
            <div className={`flex flex-wrap items-center gap-4 border-b border-gray-100 dark:border-gray-700 px-4 py-3 sm:px-6 ${
              progressPrediction.progress_score >= 80
                ? 'bg-green-50 dark:bg-green-500/5'
                : progressPrediction.progress_score >= 60
                ? 'bg-yellow-50 dark:bg-yellow-500/5'
                : 'bg-red-50 dark:bg-red-500/5'
            }`}>
              <Brain className={`h-5 w-5 shrink-0 ${
                progressPrediction.progress_score >= 80 ? 'text-green-500'
                : progressPrediction.progress_score >= 60 ? 'text-yellow-500'
                : 'text-red-500'
              }`} />
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Education Progress
                </span>
                <span className={`text-2xl font-bold ${
                  progressPrediction.progress_score >= 80 ? 'text-green-600 dark:text-green-400'
                  : progressPrediction.progress_score >= 60 ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'
                }`}>
                  {progressPrediction.progress_score}
                  <span className="ml-0.5 text-sm font-normal text-gray-400">%</span>
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{progressPrediction.recommendation}</span>
              </div>
              <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                ML · {new Date(progressPrediction.predicted_at).toLocaleTimeString()}
              </span>
            </div>
          )}

          {/* Tabs */}
          <div className="overflow-x-auto border-b border-gray-100 dark:border-gray-700">
            <div className="flex min-w-max">
            {tabList.map((tab) => (
              <button key={tab.key}
                className={`relative whitespace-nowrap px-4 py-3 text-sm font-medium transition sm:px-5 ${
                  activeTab === tab.key
                    ? 'text-orange-500 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-orange-500'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
                onClick={() => { setActiveTab(tab.key); setIsEditing(false); }}>
                {tab.label}
              </button>
            ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="p-4 sm:p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {recordModal && (
        <RecordModal
          title={
            recordModal.entity === 'health' ? 'Health & Wellbeing Record'
            : recordModal.entity === 'education' ? 'Education Record'
            : recordModal.entity === 'incidents' ? 'Incident Report'
            : recordModal.entity === 'visitations' ? 'Home Visitation'
            : recordModal.entity === 'processRecordings' ? 'Counseling Session'
            : 'Intervention Plan'
          }
          fields={
            recordModal.entity === 'health' ? healthFields
            : recordModal.entity === 'education' ? getEducationFields(globalEduOpts)
            : recordModal.entity === 'incidents' ? getIncidentFields(globalIncOpts, filterOptions?.socialWorkers)
            : recordModal.entity === 'visitations' ? getVisitationFields(globalVisOpts, filterOptions?.socialWorkers)
            : recordModal.entity === 'processRecordings' ? getProcessRecordingFields(globalProcOpts, filterOptions?.socialWorkers)
            : interventionPlanFields
          }
          data={recordModal.data}
          mode={recordModal.mode}
          saving={recordSaving}
          onFieldChange={handleRecordField}
          onSave={handleRecordSave}
          onDelete={recordModal.mode === 'view' ? handleRecordDelete : undefined}
          onEdit={recordModal.mode === 'view' ? () => setRecordModal({ ...recordModal, mode: 'edit' }) : undefined}
          onCancel={recordModal.mode === 'create'
            ? () => setRecordModal(null)
            : () => setRecordModal({ ...recordModal, mode: 'view', data: { ...recordModal.original! } })}
          onClose={() => setRecordModal(null)}
        />
      )}

      {showDeleteConfirm && createPortal(
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-body max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Resident</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Are you sure you want to delete this resident record? This action cannot be undone.</p>
            <div className="flex items-center justify-end gap-3">
              <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)} disabled={saving}>
                Cancel
              </button>
              <button className="btn-danger" onClick={confirmDelete} disabled={saving}>
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
