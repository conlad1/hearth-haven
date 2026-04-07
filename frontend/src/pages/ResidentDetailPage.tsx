import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Resident } from '../types/Resident';
import { HealthWellbeingRecord } from '../types/HealthWellbeingRecord';
import { EducationRecord } from '../types/EducationRecord';
import { IncidentReport } from '../types/IncidentReport';
import { HomeVisitation } from '../types/HomeVisitation';
import RecordModal, { RecordFieldDef } from '../components/RecordModal';
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
} from '../api/CaseAPI';

// ── Resident field config (unchanged) ──

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

// ── Pagination component ──

function TabPagination({ page, totalPages, totalCount, onPageChange }: {
  page: number; totalPages: number; totalCount: number; onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="case-pagination">
      <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
      <span>Page {page} of {totalPages} ({totalCount} total)</span>
      <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
    </div>
  );
}

// ── Bool filter helper ──

function BoolSelect({ label, value, onChange }: {
  label: string; value: boolean | undefined; onChange: (v: boolean | undefined) => void;
}) {
  return (
    <select value={value === undefined ? '' : String(value)}
      onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value === 'true')}>
      <option value="">{label}</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  );
}

// ── Tabs ──

type TabKey = 'resident' | 'health' | 'education' | 'incidents' | 'visitations';
const tabList: { key: TabKey; label: string }[] = [
  { key: 'resident', label: 'Resident Data' },
  { key: 'health', label: 'Health & Wellbeing' },
  { key: 'education', label: 'Education' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'visitations', label: 'Visitations' },
];

// ── Record field definitions for CRUD modals ──

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

const defaultEducationLevels = ['Pre-School', 'Elementary', 'Junior High School', 'Senior High School', 'College', 'Vocational', 'ALS/Alternative Learning'];
const defaultEnrollmentStatuses = ['Enrolled', 'Not Enrolled', 'Dropped Out', 'Graduated', 'On Hold'];
const defaultCompletionStatuses = ['In Progress', 'Completed', 'Incomplete', 'Withdrawn'];

const defaultIncidentTypes = ['Behavioral', 'Medical', 'Accident', 'Abuse', 'Neglect', 'Runaway', 'Conflict', 'Self-Harm', 'Substance Use', 'Other'];
const defaultSeverities = ['Low', 'Medium', 'High', 'Critical'];

const defaultVisitTypes = ['Home Visit', 'School Visit', 'Community Visit', 'Follow-up Visit', 'Court Visit', 'Other'];
const defaultCooperationLevels = ['Very Cooperative', 'Cooperative', 'Neutral', 'Uncooperative', 'Hostile'];
const defaultVisitOutcomes = ['Successful', 'Partially Successful', 'Unsuccessful', 'Rescheduled', 'Cancelled'];

function getEducationFields(opts?: GlobalEducationOptions): RecordFieldDef[] {
  return [
    { key: 'recordDate', label: 'Record Date', type: 'date', required: true },
    { key: 'educationLevel', label: 'Education Level', type: 'select', options: mergeOpts(defaultEducationLevels, opts?.educationLevels), required: true },
    { key: 'schoolName', label: 'School Name', type: 'text' },
    { key: 'enrollmentStatus', label: 'Enrollment Status', type: 'select', options: mergeOpts(defaultEnrollmentStatuses, opts?.enrollmentStatuses), required: true },
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

export default function ResidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const residentId = Number(id);

  const [activeTab, setActiveTab] = useState<TabKey>('resident');

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

  // Global options for modal dropdowns
  const [globalEduOpts, setGlobalEduOpts] = useState<GlobalEducationOptions>();
  const [globalIncOpts, setGlobalIncOpts] = useState<GlobalIncidentOptions>();
  const [globalVisOpts, setGlobalVisOpts] = useState<GlobalVisitationOptions>();

  const [tabLoading, setTabLoading] = useState(false);
  const [tabError, setTabError] = useState<string | null>(null);

  // Record modal state (shared across all tabs)
  const [recordModal, setRecordModal] = useState<{
    tab: TabKey;
    mode: 'view' | 'edit' | 'create';
    data: Record<string, unknown>;
    original?: Record<string, unknown>;
  } | null>(null);
  const [recordSaving, setRecordSaving] = useState(false);

  // A counter that increments to force tab data refetch after CRUD
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  // ── Initial loads ──

  useEffect(() => {
    fetchSafehouses().then(setSafehouses).catch(console.error);
    fetchFilterOptions().then(setFilterOptions).catch(console.error);
    fetchGlobalEducationOptions().then(setGlobalEduOpts).catch(console.error);
    fetchGlobalIncidentOptions().then(setGlobalIncOpts).catch(console.error);
    fetchGlobalVisitationOptions().then(setGlobalVisOpts).catch(console.error);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchResident(residentId)
      .then((r) => { setResident(r); setEditData({ ...r }); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Tab data fetching ──

  useEffect(() => {
    if (activeTab !== 'health') return;
    setTabLoading(true); setTabError(null);
    fetchHealthRecords(residentId, healthPage, 10, healthFilters)
      .then((res) => { setHealthRecords(res.data); setHealthTotal({ totalPages: res.totalPages, totalCount: res.totalCount }); })
      .catch((err) => setTabError(err.message))
      .finally(() => setTabLoading(false));
  }, [activeTab, healthPage, healthFilters, residentId, refreshKey]);

  useEffect(() => {
    if (activeTab !== 'education') return;
    setTabLoading(true); setTabError(null);
    fetchEducationRecords(residentId, eduPage, 10, eduFilters)
      .then((res) => { setEducationRecords(res.data); setEduTotal({ totalPages: res.totalPages, totalCount: res.totalCount }); })
      .catch((err) => setTabError(err.message))
      .finally(() => setTabLoading(false));
  }, [activeTab, eduPage, eduFilters, residentId, refreshKey]);

  useEffect(() => {
    if (activeTab !== 'incidents') return;
    setTabLoading(true); setTabError(null);
    fetchIncidentReports(residentId, incPage, 10, incFilters)
      .then((res) => { setIncidentReports(res.data); setIncTotal({ totalPages: res.totalPages, totalCount: res.totalCount }); })
      .catch((err) => setTabError(err.message))
      .finally(() => setTabLoading(false));
  }, [activeTab, incPage, incFilters, residentId, refreshKey]);

  useEffect(() => {
    if (activeTab !== 'visitations') return;
    setTabLoading(true); setTabError(null);
    fetchVisitations(residentId, visPage, 10, visFilters)
      .then((res) => { setVisitations(res.data); setVisTotal({ totalPages: res.totalPages, totalCount: res.totalCount }); })
      .catch((err) => setTabError(err.message))
      .finally(() => setTabLoading(false));
  }, [activeTab, visPage, visFilters, residentId, refreshKey]);

  // Load filter options once per tab
  useEffect(() => {
    if (activeTab === 'education' && !eduFilterOpts)
      fetchEducationFilterOptions(residentId).then(setEduFilterOpts).catch(console.error);
    if (activeTab === 'incidents' && !incFilterOpts)
      fetchIncidentFilterOptions(residentId).then(setIncFilterOpts).catch(console.error);
    if (activeTab === 'visitations' && !visFilterOpts)
      fetchVisitationFilterOptions(residentId).then(setVisFilterOpts).catch(console.error);
  }, [activeTab]);

  // ── Resident edit handlers ──

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

  // ── Record modal handlers ──

  const openRecordCreate = (tab: TabKey, defaults: Record<string, unknown>) => {
    setRecordModal({ tab, mode: 'create', data: { ...defaults, residentId } });
  };

  const openRecordView = (tab: TabKey, record: Record<string, unknown>) => {
    setRecordModal({ tab, mode: 'view', data: { ...record }, original: { ...record } });
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
        switch (recordModal.tab) {
          case 'health': await createHealthRecord(recordModal.data as Partial<HealthWellbeingRecord>); break;
          case 'education': await createEducationRecord(recordModal.data as Partial<EducationRecord>); break;
          case 'incidents': await createIncidentReport(recordModal.data as Partial<IncidentReport>); break;
          case 'visitations': await createVisitation(recordModal.data as Partial<HomeVisitation>); break;
        }
      } else {
        const d = recordModal.data;
        switch (recordModal.tab) {
          case 'health': await updateHealthRecord(d.healthRecordId as number, d as unknown as HealthWellbeingRecord); break;
          case 'education': await updateEducationRecord(d.educationRecordId as number, d as unknown as EducationRecord); break;
          case 'incidents': await updateIncidentReport(d.incidentId as number, d as unknown as IncidentReport); break;
          case 'visitations': await updateVisitation(d.visitationId as number, d as unknown as HomeVisitation); break;
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
      switch (recordModal.tab) {
        case 'health': await deleteHealthRecord(d.healthRecordId as number); break;
        case 'education': await deleteEducationRecord(d.educationRecordId as number); break;
        case 'incidents': await deleteIncidentReport(d.incidentId as number); break;
        case 'visitations': await deleteVisitation(d.visitationId as number); break;
      }
      setRecordModal(null);
      triggerRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setRecordSaving(false);
    }
  };

  // ── Resident input renderer ──

  const renderInput = (col: FieldDef) => {
    if (!editData) return null;
    const value = editData[col.key];
    if (readOnlyFields.includes(col.key)) return <span className="resident-modal-field-value">{fmt(value)}</span>;
    if (booleanFields.includes(col.key)) return <input type="checkbox" checked={!!value} onChange={(e) => handleEditField(col.key, e.target.checked)} />;
    if (col.key === 'safehouseId') return (
      <select value={value as number} onChange={(e) => handleEditField(col.key, Number(e.target.value))}>
        {safehouses.map((sh) => <option key={sh.safehouseId} value={sh.safehouseId}>{sh.name}</option>)}
      </select>
    );
    const sc = selectFieldMap[col.key];
    if (sc && filterOptions) {
      const opts = filterOptions[sc.optionsKey];
      return (
        <select value={value == null ? '' : String(value)} onChange={(e) => handleEditField(col.key, e.target.value || null)}>
          {sc.nullable && <option value="">&mdash; None &mdash;</option>}
          {!sc.nullable && !value && <option value="">&mdash; Select &mdash;</option>}
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (dateFields.includes(col.key)) return <input type="date" value={value == null ? '' : String(value).slice(0, 10)} onChange={(e) => handleEditField(col.key, e.target.value || null)} />;
    if (textareaFields.includes(col.key)) return <textarea rows={3} value={value == null ? '' : String(value)} onChange={(e) => handleEditField(col.key, e.target.value || null)} />;
    if (intFields.includes(col.key)) return <input type="number" value={value == null ? '' : String(value)} onChange={(e) => handleEditField(col.key, e.target.value ? Number(e.target.value) : null)} />;
    return <input type="text" value={value == null ? '' : String(value)} onChange={(e) => handleEditField(col.key, e.target.value || null)} />;
  };

  // ── Date range filter helper ──

  const DateRange = ({ from, to, onChange }: { from?: string; to?: string; onChange: (f: string | undefined, t: string | undefined) => void }) => (
    <>
      <label className="tab-filter-date">
        From <input type="date" value={from || ''} onChange={(e) => onChange(e.target.value || undefined, to)} />
      </label>
      <label className="tab-filter-date">
        To <input type="date" value={to || ''} onChange={(e) => onChange(from, e.target.value || undefined)} />
      </label>
    </>
  );

  // ── Tab renderers ──

  const renderResidentTab = () => {
    if (!resident || !editData) return null;
    return modalSections.map((section) => (
      <div className="resident-modal-section" key={section.title}>
        <h3 className="resident-modal-section-title">{section.title}</h3>
        <div className="resident-modal-fields">
          {section.fields.map((col) => (
            <div className="resident-modal-field" key={col.key}>
              <label>
                {col.label}
                {fieldTooltips[col.key] && <span className="resident-modal-info-icon" data-tip={fieldTooltips[col.key]}>i</span>}
              </label>
              {isEditing ? renderInput(col) : <span className="resident-modal-field-value">{fmt(resident[col.key])}</span>}
            </div>
          ))}
        </div>
      </div>
    ));
  };

  const renderHealthTab = () => (
    <>
      <div className="tab-filter-bar">
        <DateRange from={healthFilters.dateFrom} to={healthFilters.dateTo}
          onChange={(f, t) => { setHealthFilters((p) => ({ ...p, dateFrom: f, dateTo: t })); setHealthPage(1); }} />
        <BoolSelect label="Medical" value={healthFilters.medicalCheckupDone}
          onChange={(v) => { setHealthFilters((p) => ({ ...p, medicalCheckupDone: v })); setHealthPage(1); }} />
        <BoolSelect label="Dental" value={healthFilters.dentalCheckupDone}
          onChange={(v) => { setHealthFilters((p) => ({ ...p, dentalCheckupDone: v })); setHealthPage(1); }} />
        <BoolSelect label="Psychological" value={healthFilters.psychologicalCheckupDone}
          onChange={(v) => { setHealthFilters((p) => ({ ...p, psychologicalCheckupDone: v })); setHealthPage(1); }} />
        <button className="resident-modal-btn resident-modal-btn-edit tab-add-btn"
          onClick={() => openRecordCreate('health', { recordDate: new Date().toISOString().slice(0, 10), medicalCheckupDone: false, dentalCheckupDone: false, psychologicalCheckupDone: false })}>
          + Add Record
        </button>
      </div>
      {healthRecords.length === 0 ? <p className="tab-empty">No health & wellbeing records found.</p> : (
        <>
          <div className="tab-table-wrap">
            <table className="case-table">
              <thead><tr>
                <th>Date</th><th>Health</th><th>Nutrition</th><th>Sleep</th><th>Energy</th>
                <th>Height</th><th>Weight</th><th>BMI</th><th>Medical</th><th>Dental</th><th>Psych</th><th>Notes</th>
              </tr></thead>
              <tbody>
                {healthRecords.map((r) => (
                  <tr key={r.healthRecordId} className="case-row-clickable" onClick={() => openRecordView('health', r as unknown as Record<string, unknown>)}>
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
      <div className="tab-filter-bar">
        <DateRange from={eduFilters.dateFrom} to={eduFilters.dateTo}
          onChange={(f, t) => { setEduFilters((p) => ({ ...p, dateFrom: f, dateTo: t })); setEduPage(1); }} />
        {eduFilterOpts && <>
          <select value={eduFilters.educationLevel || ''} onChange={(e) => { setEduFilters((p) => ({ ...p, educationLevel: e.target.value || undefined })); setEduPage(1); }}>
            <option value="">All Levels</option>
            {eduFilterOpts.educationLevels.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={eduFilters.enrollmentStatus || ''} onChange={(e) => { setEduFilters((p) => ({ ...p, enrollmentStatus: e.target.value || undefined })); setEduPage(1); }}>
            <option value="">All Enrollment</option>
            {eduFilterOpts.enrollmentStatuses.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={eduFilters.completionStatus || ''} onChange={(e) => { setEduFilters((p) => ({ ...p, completionStatus: e.target.value || undefined })); setEduPage(1); }}>
            <option value="">All Completion</option>
            {eduFilterOpts.completionStatuses.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </>}
        <button className="resident-modal-btn resident-modal-btn-edit tab-add-btn"
          onClick={() => openRecordCreate('education', { recordDate: new Date().toISOString().slice(0, 10), attendanceRate: 0, progressPercent: 0 })}>
          + Add Record
        </button>
      </div>
      {educationRecords.length === 0 ? <p className="tab-empty">No education records found.</p> : (
        <>
          <div className="tab-table-wrap">
            <table className="case-table">
              <thead><tr>
                <th>Date</th><th>Level</th><th>School</th><th>Enrollment</th>
                <th>Attendance</th><th>Progress</th><th>Completion</th><th>Notes</th>
              </tr></thead>
              <tbody>
                {educationRecords.map((r) => (
                  <tr key={r.educationRecordId} className="case-row-clickable" onClick={() => openRecordView('education', r as unknown as Record<string, unknown>)}>
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
      <div className="tab-filter-bar">
        <DateRange from={incFilters.dateFrom} to={incFilters.dateTo}
          onChange={(f, t) => { setIncFilters((p) => ({ ...p, dateFrom: f, dateTo: t })); setIncPage(1); }} />
        {incFilterOpts && <>
          <select value={incFilters.incidentType || ''} onChange={(e) => { setIncFilters((p) => ({ ...p, incidentType: e.target.value || undefined })); setIncPage(1); }}>
            <option value="">All Types</option>
            {incFilterOpts.incidentTypes.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={incFilters.severity || ''} onChange={(e) => { setIncFilters((p) => ({ ...p, severity: e.target.value || undefined })); setIncPage(1); }}>
            <option value="">All Severities</option>
            {incFilterOpts.severities.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </>}
        <BoolSelect label="Resolved" value={incFilters.resolved}
          onChange={(v) => { setIncFilters((p) => ({ ...p, resolved: v })); setIncPage(1); }} />
        <button className="resident-modal-btn resident-modal-btn-edit tab-add-btn"
          onClick={() => openRecordCreate('incidents', { incidentDate: new Date().toISOString().slice(0, 10), resolved: false, followUpRequired: false })}>
          + Add Record
        </button>
      </div>
      {incidentReports.length === 0 ? <p className="tab-empty">No incident reports found.</p> : (
        <>
          <div className="tab-table-wrap">
            <table className="case-table">
              <thead><tr>
                <th>Date</th><th>Type</th><th>Severity</th><th>Description</th><th>Response</th>
                <th>Resolved</th><th>Resolution Date</th><th>Reported By</th><th>Follow-up</th>
              </tr></thead>
              <tbody>
                {incidentReports.map((r) => (
                  <tr key={r.incidentId} className="case-row-clickable" onClick={() => openRecordView('incidents', r as unknown as Record<string, unknown>)}>
                    <td>{r.incidentDate}</td><td>{r.incidentType}</td><td>{r.severity}</td>
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
      <div className="tab-filter-bar">
        <DateRange from={visFilters.dateFrom} to={visFilters.dateTo}
          onChange={(f, t) => { setVisFilters((p) => ({ ...p, dateFrom: f, dateTo: t })); setVisPage(1); }} />
        {visFilterOpts && <>
          <select value={visFilters.visitType || ''} onChange={(e) => { setVisFilters((p) => ({ ...p, visitType: e.target.value || undefined })); setVisPage(1); }}>
            <option value="">All Types</option>
            {visFilterOpts.visitTypes.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={visFilters.familyCooperationLevel || ''} onChange={(e) => { setVisFilters((p) => ({ ...p, familyCooperationLevel: e.target.value || undefined })); setVisPage(1); }}>
            <option value="">All Cooperation</option>
            {visFilterOpts.cooperationLevels.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={visFilters.socialWorker || ''} onChange={(e) => { setVisFilters((p) => ({ ...p, socialWorker: e.target.value || undefined })); setVisPage(1); }}>
            <option value="">All Workers</option>
            {visFilterOpts.socialWorkers.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </>}
        <BoolSelect label="Safety Concerns" value={visFilters.safetyConcernsNoted}
          onChange={(v) => { setVisFilters((p) => ({ ...p, safetyConcernsNoted: v })); setVisPage(1); }} />
        <button className="resident-modal-btn resident-modal-btn-edit tab-add-btn"
          onClick={() => openRecordCreate('visitations', { visitDate: new Date().toISOString().slice(0, 10), safetyConcernsNoted: false, followUpNeeded: false })}>
          + Add Record
        </button>
      </div>
      {visitations.length === 0 ? <p className="tab-empty">No visitation records found.</p> : (
        <>
          <div className="tab-table-wrap">
            <table className="case-table">
              <thead><tr>
                <th>Date</th><th>Social Worker</th><th>Type</th><th>Location</th><th>Purpose</th>
                <th>Cooperation</th><th>Safety Concerns</th><th>Follow-up</th><th>Outcome</th>
              </tr></thead>
              <tbody>
                {visitations.map((r) => (
                  <tr key={r.visitationId} className="case-row-clickable" onClick={() => openRecordView('visitations', r as unknown as Record<string, unknown>)}>
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

  const renderTabContent = () => {
    if (activeTab !== 'resident' && tabLoading) return <p className="case-status">Loading...</p>;
    if (activeTab !== 'resident' && tabError) return <p className="case-status case-error">Error: {tabError}</p>;
    switch (activeTab) {
      case 'resident': return renderResidentTab();
      case 'health': return renderHealthTab();
      case 'education': return renderEducationTab();
      case 'incidents': return renderIncidentsTab();
      case 'visitations': return renderVisitationsTab();
    }
  };

  // ── Render ──

  if (loading) return <div className="resident-detail-page"><p className="case-status">Loading...</p></div>;
  if (error) return <div className="resident-detail-page"><p className="case-status case-error">Error: {error}</p></div>;
  if (!resident || !editData) return <div className="resident-detail-page"><p className="case-status">Resident not found.</p></div>;

  return (
    <>
      <div className="resident-detail-page">
        <button className="resident-detail-back" onClick={() => navigate('/cases')}>&larr; Back to Cases</button>

        <div className="resident-detail-card">
          <div className="resident-modal-top-bar">
            <img src="/portrait_resident.png" alt="Resident" className="resident-modal-portrait" />
            <div className="resident-modal-profile-info">
              <h2>{resident.caseControlNo}</h2>
              <p>{resident.internalCode} &middot; {resident.caseStatus}</p>
            </div>
            <div className="resident-modal-actions">
              {activeTab === 'resident' && (
                isEditing ? (
                  <>
                    <button className="resident-modal-btn resident-modal-btn-save" onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button className="resident-modal-btn resident-modal-btn-cancel"
                      onClick={() => { setEditData({ ...resident }); setIsEditing(false); }} disabled={saving}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button className="resident-modal-btn resident-modal-btn-edit" onClick={() => setIsEditing(true)}>Edit</button>
                    <button className="resident-modal-btn resident-modal-btn-delete" onClick={handleDelete} disabled={saving}>Delete</button>
                  </>
                )
              )}
            </div>
          </div>

          <div className="resident-detail-tabs">
            {tabList.map((tab) => (
              <button key={tab.key}
                className={`resident-detail-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => { setActiveTab(tab.key); setIsEditing(false); }}>
                {tab.label}
              </button>
            ))}
          </div>

          {renderTabContent()}
        </div>
      </div>

      {recordModal && (
        <RecordModal
          title={
            recordModal.tab === 'health' ? 'Health & Wellbeing Record'
            : recordModal.tab === 'education' ? 'Education Record'
            : recordModal.tab === 'incidents' ? 'Incident Report'
            : 'Home Visitation'
          }
          fields={
            recordModal.tab === 'health' ? healthFields
            : recordModal.tab === 'education' ? getEducationFields(globalEduOpts)
            : recordModal.tab === 'incidents' ? getIncidentFields(globalIncOpts, filterOptions?.socialWorkers)
            : getVisitationFields(globalVisOpts, filterOptions?.socialWorkers)
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
        <div className="resident-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Resident</h3>
            <p>Are you sure you want to delete this resident record? This action cannot be undone.</p>
            <div className="delete-confirm-actions">
              <button className="resident-modal-btn resident-modal-btn-delete" onClick={confirmDelete} disabled={saving}>
                {saving ? 'Deleting...' : 'Delete'}
              </button>
              <button className="resident-modal-btn resident-modal-btn-cancel" onClick={() => setShowDeleteConfirm(false)} disabled={saving}>
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
