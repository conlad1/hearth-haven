import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Resident } from '../types/Resident';
import {
  fetchCases,
  fetchSafehouses,
  fetchFilterOptions,
  createResident,
  updateResident,
  deleteResident,
  Safehouse,
  FilterOptions,
  CaseFilters,
} from '../api/CaseAPI';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const tableColumns: { key: keyof Resident; label: string }[] = [
  { key: 'caseControlNo', label: 'Case Control No.' },
  { key: 'internalCode', label: 'Internal Code' },
  { key: 'caseStatus', label: 'Status' },
  { key: 'caseCategory', label: 'Category' },
  { key: 'currentRiskLevel', label: 'Risk Level' },
  { key: 'referralSource', label: 'Referral Source' },
  { key: 'initialCaseAssessment', label: 'Initial Assessment' },
  { key: 'reintegrationType', label: 'Reintegration Type' },
  { key: 'assignedSocialWorker', label: 'Social Worker' },
];

type FieldDef = { key: keyof Resident; label: string };

interface FieldSection {
  title: string;
  fields: FieldDef[];
}

const modalSections: FieldSection[] = [
  {
    title: 'Case Information',
    fields: [
      { key: 'residentId', label: 'ID' },
      { key: 'caseControlNo', label: 'Case Control No.' },
      { key: 'internalCode', label: 'Internal Code' },
      { key: 'safehouseId', label: 'Safehouse' },
      { key: 'caseStatus', label: 'Status' },
      { key: 'caseCategory', label: 'Category' },
      { key: 'initialRiskLevel', label: 'Initial Risk' },
      { key: 'currentRiskLevel', label: 'Current Risk' },
      { key: 'assignedSocialWorker', label: 'Social Worker' },
    ],
  },
  {
    title: 'Personal Details',
    fields: [
      { key: 'sex', label: 'Sex' },
      { key: 'dateOfBirth', label: 'Date of Birth' },
      { key: 'birthStatus', label: 'Birth Status' },
      { key: 'placeOfBirth', label: 'Place of Birth' },
      { key: 'religion', label: 'Religion' },
      { key: 'presentAge', label: 'Present Age' },
      { key: 'isPwd', label: 'PWD' },
      { key: 'pwdType', label: 'PWD Type' },
      { key: 'hasSpecialNeeds', label: 'Special Needs' },
      { key: 'specialNeedsDiagnosis', label: 'Special Needs Diagnosis' },
    ],
  },
  {
    title: 'Sub-Categories',
    fields: [
      { key: 'subCatOrphaned', label: 'Orphaned' },
      { key: 'subCatTrafficked', label: 'Trafficked' },
      { key: 'subCatChildLabor', label: 'Child Labor' },
      { key: 'subCatPhysicalAbuse', label: 'Physical Abuse' },
      { key: 'subCatSexualAbuse', label: 'Sexual Abuse' },
      { key: 'subCatOsaec', label: 'OSAEC' },
      { key: 'subCatCicl', label: 'CICL' },
      { key: 'subCatAtRisk', label: 'At Risk' },
      { key: 'subCatStreetChild', label: 'Street Child' },
      { key: 'subCatChildWithHiv', label: 'Child w/ HIV' },
    ],
  },
  {
    title: 'Family Background',
    fields: [
      { key: 'familyIs4Ps', label: '4Ps' },
      { key: 'familySoloParent', label: 'Solo Parent' },
      { key: 'familyIndigenous', label: 'Indigenous' },
      { key: 'familyParentPwd', label: 'Parent PWD' },
      { key: 'familyInformalSettler', label: 'Informal Settler' },
    ],
  },
  {
    title: 'Admission & Referral',
    fields: [
      { key: 'dateOfAdmission', label: 'Date of Admission' },
      { key: 'ageUponAdmission', label: 'Age Upon Admission' },
      { key: 'lengthOfStay', label: 'Length of Stay' },
      { key: 'referralSource', label: 'Referral Source' },
      { key: 'referringAgencyPerson', label: 'Referring Agency/Person' },
      { key: 'dateColbRegistered', label: 'COLB Registered' },
      { key: 'dateColbObtained', label: 'COLB Obtained' },
    ],
  },
  {
    title: 'Assessment & Reintegration',
    fields: [
      { key: 'initialCaseAssessment', label: 'Initial Assessment' },
      { key: 'dateCaseStudyPrepared', label: 'Case Study Prepared' },
      { key: 'reintegrationType', label: 'Reintegration Type' },
      { key: 'reintegrationStatus', label: 'Reintegration Status' },
    ],
  },
  {
    title: 'Dates & Notes',
    fields: [
      { key: 'dateEnrolled', label: 'Date Enrolled' },
      { key: 'dateClosed', label: 'Date Closed' },
      { key: 'createdAt', label: 'Created At' },
      { key: 'notesRestricted', label: 'Notes (Restricted)' },
    ],
  },
];

const booleanFields: (keyof Resident)[] = [
  'subCatOrphaned',
  'subCatTrafficked',
  'subCatChildLabor',
  'subCatPhysicalAbuse',
  'subCatSexualAbuse',
  'subCatOsaec',
  'subCatCicl',
  'subCatAtRisk',
  'subCatStreetChild',
  'subCatChildWithHiv',
  'isPwd',
  'hasSpecialNeeds',
  'familyIs4Ps',
  'familySoloParent',
  'familyIndigenous',
  'familyParentPwd',
  'familyInformalSettler',
];

const readOnlyFields: (keyof Resident)[] = ['residentId', 'createdAt'];

const dateFields: (keyof Resident)[] = [
  'dateOfBirth',
  'dateOfAdmission',
  'dateColbRegistered',
  'dateColbObtained',
  'dateCaseStudyPrepared',
  'dateEnrolled',
  'dateClosed',
];

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

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

const blankResident: Resident = {
  residentId: 0,
  caseControlNo: '',
  internalCode: '',
  safehouseId: 0,
  caseStatus: '',
  sex: '',
  dateOfBirth: '',
  birthStatus: '',
  placeOfBirth: null,
  religion: null,
  caseCategory: '',
  subCatOrphaned: false,
  subCatTrafficked: false,
  subCatChildLabor: false,
  subCatPhysicalAbuse: false,
  subCatSexualAbuse: false,
  subCatOsaec: false,
  subCatCicl: false,
  subCatAtRisk: false,
  subCatStreetChild: false,
  subCatChildWithHiv: false,
  isPwd: false,
  pwdType: null,
  hasSpecialNeeds: false,
  specialNeedsDiagnosis: null,
  familyIs4Ps: false,
  familySoloParent: false,
  familyIndigenous: false,
  familyParentPwd: false,
  familyInformalSettler: false,
  dateOfAdmission: '',
  ageUponAdmission: null,
  presentAge: null,
  lengthOfStay: null,
  referralSource: '',
  referringAgencyPerson: null,
  dateColbRegistered: null,
  dateColbObtained: null,
  assignedSocialWorker: null,
  initialCaseAssessment: null,
  dateCaseStudyPrepared: null,
  reintegrationType: null,
  reintegrationStatus: null,
  initialRiskLevel: '',
  currentRiskLevel: '',
  dateEnrolled: '',
  dateClosed: null,
  createdAt: '',
  notesRestricted: null,
};

function calcAge(birthDate: string, referenceDate: string): string | null {
  if (!birthDate || !referenceDate) return null;
  const birth = new Date(birthDate);
  const ref = new Date(referenceDate);
  if (isNaN(birth.getTime()) || isNaN(ref.getTime())) return null;

  let years = ref.getFullYear() - birth.getFullYear();
  let months = ref.getMonth() - birth.getMonth();
  if (ref.getDate() < birth.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years < 0) return null;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
  return parts.length > 0 ? parts.join(' ') : '0 months';
}

const fieldTooltips: Partial<Record<keyof Resident, string>> = {
  caseControlNo: 'Unique case identifier assigned to this resident',
  internalCode: 'Internal tracking code used within the safehouse',
  subCatOsaec: 'Online Sexual Abuse and Exploitation of Children',
  subCatCicl: 'Children in Conflict with the Law',
  isPwd: 'Person with Disability',
  pwdType: 'Specific type or classification of disability',
  familyIs4Ps: 'Pantawid Pamilyang Pilipino Program — government conditional cash transfer program',
  familyParentPwd: 'Parent is a Person with Disability',
  familyInformalSettler: 'Family resides in an informal or unauthorized settlement',
  dateColbRegistered: 'Date the Certificate of Live Birth was registered',
  dateColbObtained: 'Date the Certificate of Live Birth was obtained',
  initialCaseAssessment: 'Assessment classification assigned when the case was first opened',
  reintegrationType: 'Type of reintegration plan (e.g., family, community, independent living)',
  reintegrationStatus: 'Current status of the reintegration process',
  birthStatus: 'Birth classification (e.g., legitimate, illegitimate)',
  notesRestricted: 'Confidential notes — access may be restricted to authorized personnel',
  lengthOfStay: 'Duration the resident has stayed at the safehouse',
};

const emptyFilters: CaseFilters = {};

export default function CasePage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(
    null
  );
  const [filters, setFilters] = useState<CaseFilters>(emptyFilters);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // modal state
  const [selectedResident, setSelectedResident] = useState<Resident | null>(
    null
  );
  const [editData, setEditData] = useState<Resident | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // onboard modal state
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardData, setOnboardData] = useState<Resident>({ ...blankResident });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    updateFilter('search', debouncedSearch || undefined);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchSafehouses()
      .then(setSafehouses)
      .catch((err) => console.error('Error loading safehouses:', err));
    fetchFilterOptions()
      .then(setFilterOptions)
      .catch((err) => console.error('Error loading filter options:', err));
  }, []);

  const loadCases = () => {
    setLoading(true);
    setError(null);
    fetchCases(page, pageSize, filters)
      .then((res) => {
        setResidents(res.data);
        setTotalPages(res.totalPages);
        setTotalCount(res.totalCount);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCases();
  }, [page, pageSize, filters]);

  const updateFilter = (key: keyof CaseFilters, value: string | undefined) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value) {
        (next as Record<string, unknown>)[key] =
          key === 'safehouseId' ? Number(value) : value;
      } else {
        delete (next as Record<string, unknown>)[key];
      }
      return next;
    });
    setPage(1);
  };

  const handleSafehouseChange = (id: number | undefined) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (id !== undefined) {
        next.safehouseId = id;
      } else {
        delete next.safehouseId;
      }
      return next;
    });
    setPage(1);
  };

  const hasActiveFilters =
    filters.caseStatus ||
    filters.caseCategory ||
    filters.currentRiskLevel ||
    filters.referralSource ||
    filters.initialCaseAssessment ||
    filters.reintegrationType ||
    filters.assignedSocialWorker ||
    filters.search;

  const clearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setFilters((prev) => {
      const next: CaseFilters = {};
      if (prev.safehouseId !== undefined) next.safehouseId = prev.safehouseId;
      return next;
    });
    setPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  // modal handlers
  const openModal = (resident: Resident) => {
    setSelectedResident(resident);
    setEditData({ ...resident });
    setIsEditing(false);
  };

  const closeModal = () => {
    setSelectedResident(null);
    setEditData(null);
    setIsEditing(false);
  };

  const handleEditField = (key: keyof Resident, value: unknown) => {
    if (!editData) return;
    const next = { ...editData, [key]: value };
    const dob = String(next.dateOfBirth || '');
    if (key === 'dateOfBirth' || key === 'dateOfAdmission') {
      const doa = String(next.dateOfAdmission || '');
      next.ageUponAdmission = calcAge(dob, doa);
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
      setSelectedResident(updated);
      setEditData({ ...updated });
      setIsEditing(false);
      loadCases();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedResident) return;
    if (
      !window.confirm('Are you sure you want to delete this resident record?')
    )
      return;
    setSaving(true);
    try {
      await deleteResident(selectedResident.residentId);
      closeModal();
      loadCases();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  // onboard handlers
  const openOnboard = () => {
    if (filters.safehouseId === undefined) {
      alert('Please select a location from the sidebar before onboarding a resident.');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    setOnboardData({
      ...blankResident,
      safehouseId: filters.safehouseId,
      dateOfAdmission: today,
      dateEnrolled: today,
    });
    setIsOnboarding(true);
  };

  const closeOnboard = () => {
    setIsOnboarding(false);
    setOnboardData({ ...blankResident });
  };

  const handleOnboardField = (key: keyof Resident, value: unknown) => {
    setOnboardData((prev) => {
      const next = { ...prev, [key]: value };
      const dob = String(next.dateOfBirth || '');
      if (key === 'dateOfBirth' || key === 'dateOfAdmission') {
        const doa = String(next.dateOfAdmission || '');
        next.ageUponAdmission = calcAge(dob, doa);
      }
      if (key === 'dateOfBirth') {
        next.presentAge = calcAge(dob, new Date().toISOString().slice(0, 10));
      }
      return next;
    });
  };

  const requiredFields: { key: keyof Resident; label: string }[] = [
    { key: 'caseControlNo', label: 'Case Control No.' },
    { key: 'internalCode', label: 'Internal Code' },
    { key: 'caseStatus', label: 'Status' },
    { key: 'sex', label: 'Sex' },
    { key: 'dateOfBirth', label: 'Date of Birth' },
    { key: 'birthStatus', label: 'Birth Status' },
    { key: 'caseCategory', label: 'Category' },
    { key: 'dateOfAdmission', label: 'Date of Admission' },
    { key: 'referralSource', label: 'Referral Source' },
    { key: 'initialRiskLevel', label: 'Initial Risk Level' },
    { key: 'currentRiskLevel', label: 'Current Risk Level' },
    { key: 'dateEnrolled', label: 'Date Enrolled' },
  ];

  const handleCreate = async () => {
    const missing = requiredFields.filter((f) => !onboardData[f.key]);
    if (missing.length > 0) {
      alert(`Please fill in required fields:\n${missing.map((f) => f.label).join(', ')}`);
      return;
    }
    setSaving(true);
    try {
      await createResident(onboardData);
      closeOnboard();
      loadCases();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create resident');
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (
    col: { key: keyof Resident; label: string },
    data: Resident,
    onChange: (key: keyof Resident, value: unknown) => void,
    isCreate = false
  ) => {
    const value = data[col.key];

    // read-only / auto-generated
    if (readOnlyFields.includes(col.key)) {
      if (isCreate) {
        return <span className="resident-modal-field-value">Auto-generated</span>;
      }
      return <span className="resident-modal-field-value">{formatCell(value)}</span>;
    }

    // booleans -> checkbox
    if (booleanFields.includes(col.key)) {
      return (
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(col.key, e.target.checked)}
        />
      );
    }

    // safehouseId -> safehouse dropdown
    if (col.key === 'safehouseId') {
      return (
        <select
          value={value as number}
          onChange={(e) => onChange(col.key, Number(e.target.value))}
        >
          {safehouses.map((sh) => (
            <option key={sh.safehouseId} value={sh.safehouseId}>
              {sh.name}
            </option>
          ))}
        </select>
      );
    }

    // category fields -> select dropdown
    const selectConfig = selectFieldMap[col.key];
    if (selectConfig && filterOptions) {
      const options = filterOptions[selectConfig.optionsKey];
      return (
        <select
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(col.key, e.target.value || null)}
        >
          {selectConfig.nullable && <option value="">— None —</option>}
          {!selectConfig.nullable && !value && <option value="">— Select —</option>}
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    // date fields -> date picker
    if (dateFields.includes(col.key)) {
      return (
        <input
          type="date"
          value={value === null || value === undefined ? '' : String(value).slice(0, 10)}
          onChange={(e) => onChange(col.key, e.target.value || null)}
        />
      );
    }

    // textarea for long text
    if (textareaFields.includes(col.key)) {
      return (
        <textarea
          rows={3}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(col.key, e.target.value || null)}
        />
      );
    }

    // int fields
    if (intFields.includes(col.key)) {
      return (
        <input
          type="number"
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(col.key, e.target.value ? Number(e.target.value) : null)}
        />
      );
    }

    // default text input
    return (
      <input
        type="text"
        value={value === null || value === undefined ? '' : String(value)}
        onChange={(e) => onChange(col.key, e.target.value || null)}
      />
    );
  };

  const renderFieldInput = (col: { key: keyof Resident; label: string }) => {
    if (!editData) return null;
    return renderInput(col, editData, handleEditField);
  };

  const renderOnboardInput = (col: { key: keyof Resident; label: string }) => {
    return renderInput(col, onboardData, handleOnboardField, true);
  };

  return (
    <>
      <div className="case-layout">
        <aside className="case-sidebar">
          <h2>Locations</h2>
          <ul>
            <li>
              <button
                className={filters.safehouseId === undefined ? 'active' : ''}
                onClick={() => handleSafehouseChange(undefined)}
              >
                All Locations
              </button>
            </li>
            {safehouses.map((sh) => (
              <li key={sh.safehouseId}>
                <button
                  className={
                    filters.safehouseId === sh.safehouseId ? 'active' : ''
                  }
                  onClick={() => handleSafehouseChange(sh.safehouseId)}
                >
                  {sh.name}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="case-page">
          <div className="case-header">
            <h1>Resident Cases</h1>
            <div className="case-controls">
              <button
                className="resident-modal-btn resident-modal-btn-edit"
                onClick={openOnboard}
              >
                Onboard New Resident
              </button>
              <label>
                Residents per page:
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="case-filter-bar">
            <div className="case-search">
              <input
                type="text"
                placeholder="Search by case no., code, worker, agency..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            {filterOptions && (
              <div className="case-filters">
                <select
                  value={filters.caseStatus || ''}
                  onChange={(e) =>
                    updateFilter('caseStatus', e.target.value || undefined)
                  }
                >
                  <option value="">All Statuses</option>
                  {filterOptions.caseStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.caseCategory || ''}
                  onChange={(e) =>
                    updateFilter('caseCategory', e.target.value || undefined)
                  }
                >
                  <option value="">All Categories</option>
                  {filterOptions.caseCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.currentRiskLevel || ''}
                  onChange={(e) =>
                    updateFilter(
                      'currentRiskLevel',
                      e.target.value || undefined
                    )
                  }
                >
                  <option value="">All Risk Levels</option>
                  {filterOptions.riskLevels.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.referralSource || ''}
                  onChange={(e) =>
                    updateFilter('referralSource', e.target.value || undefined)
                  }
                >
                  <option value="">All Referral Sources</option>
                  {filterOptions.referralSources.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.initialCaseAssessment || ''}
                  onChange={(e) =>
                    updateFilter(
                      'initialCaseAssessment',
                      e.target.value || undefined
                    )
                  }
                >
                  <option value="">All Assessments</option>
                  {filterOptions.initialCaseAssessments.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.reintegrationType || ''}
                  onChange={(e) =>
                    updateFilter(
                      'reintegrationType',
                      e.target.value || undefined
                    )
                  }
                >
                  <option value="">All Reintegration Types</option>
                  {filterOptions.reintegrationTypes.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.assignedSocialWorker || ''}
                  onChange={(e) =>
                    updateFilter(
                      'assignedSocialWorker',
                      e.target.value || undefined
                    )
                  }
                >
                  <option value="">All Social Workers</option>
                  {filterOptions.socialWorkers.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>

                {hasActiveFilters && (
                  <button className="case-clear-filters" onClick={clearFilters}>
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>

          {loading && <p className="case-status">Loading cases...</p>}
          {error && <p className="case-status case-error">Error: {error}</p>}

          {!loading && !error && residents.length === 0 && (
            <p className="case-status">No cases found.</p>
          )}

          {residents.length > 0 && (
            <>
              <div className="case-table-wrap">
                <table className="case-table">
                  <thead>
                    <tr>
                      {tableColumns.map((col) => (
                        <th key={col.key}>{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {residents.map((r) => (
                      <tr
                        key={r.residentId}
                        onClick={() => openModal(r)}
                        className="case-row-clickable"
                      >
                        {tableColumns.map((col) => (
                          <td key={col.key}>{formatCell(r[col.key])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="case-pagination">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </button>
                <span>
                  Page {page} of {totalPages} ({totalCount} total)
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedResident &&
        editData &&
        createPortal(
          <div className="resident-modal-overlay" onClick={closeModal}>
            <div
              className="resident-modal-body"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="resident-modal-top-bar">
                <img
                  src="/portrait_resident.png"
                  alt="Resident"
                  className="resident-modal-portrait"
                />
                <div className="resident-modal-profile-info">
                  <h2>{selectedResident.caseControlNo}</h2>
                  <p>
                    {selectedResident.internalCode} &middot;{' '}
                    {selectedResident.caseStatus}
                  </p>
                </div>
                <div className="resident-modal-actions">
                  {isEditing ? (
                    <>
                      <button
                        className="resident-modal-btn resident-modal-btn-save"
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className="resident-modal-btn resident-modal-btn-cancel"
                        onClick={() => {
                          setEditData({ ...selectedResident });
                          setIsEditing(false);
                        }}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="resident-modal-btn resident-modal-btn-edit"
                        onClick={() => setIsEditing(true)}
                      >
                        Edit
                      </button>
                      <button
                        className="resident-modal-btn resident-modal-btn-delete"
                        onClick={handleDelete}
                        disabled={saving}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
                <button className="resident-modal-close" onClick={closeModal}>
                  &times;
                </button>
              </div>

              {modalSections.map((section) => (
                <div className="resident-modal-section" key={section.title}>
                  <h3 className="resident-modal-section-title">
                    {section.title}
                  </h3>
                  <div className="resident-modal-fields">
                    {section.fields.map((col) => (
                      <div className="resident-modal-field" key={col.key}>
                        <label>
                          {col.label}
                          {fieldTooltips[col.key] && (
                            <span className="resident-modal-info-icon" data-tip={fieldTooltips[col.key]}>i</span>
                          )}
                        </label>
                        {isEditing ? (
                          renderFieldInput(col)
                        ) : (
                          <span className="resident-modal-field-value">
                            {formatCell(selectedResident[col.key])}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}

      {isOnboarding &&
        createPortal(
          <div className="resident-modal-overlay" onClick={closeOnboard}>
            <div
              className="resident-modal-body"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="resident-modal-top-bar">
                <img
                  src="/portrait_resident.png"
                  alt="New Resident"
                  className="resident-modal-portrait"
                />
                <div className="resident-modal-profile-info">
                  <h2>New Resident</h2>
                  <p>Onboard a new resident</p>
                </div>
                <div className="resident-modal-actions">
                  <button
                    className="resident-modal-btn resident-modal-btn-save"
                    onClick={handleCreate}
                    disabled={saving}
                  >
                    {saving ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    className="resident-modal-btn resident-modal-btn-cancel"
                    onClick={closeOnboard}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
                <button className="resident-modal-close" onClick={closeOnboard}>
                  &times;
                </button>
              </div>

              {modalSections.map((section) => (
                <div className="resident-modal-section" key={section.title}>
                  <h3 className="resident-modal-section-title">
                    {section.title}
                  </h3>
                  <div className="resident-modal-fields">
                    {section.fields.map((col) => (
                      <div className="resident-modal-field" key={col.key}>
                        <label>
                          {col.label}
                          {fieldTooltips[col.key] && (
                            <span className="resident-modal-info-icon" data-tip={fieldTooltips[col.key]}>i</span>
                          )}
                        </label>
                        {renderOnboardInput(col)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
