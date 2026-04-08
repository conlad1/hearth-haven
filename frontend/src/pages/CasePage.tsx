import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Info,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { Resident } from '../types/Resident';
import {
  fetchCases,
  fetchSafehouses,
  fetchFilterOptions,
  createResident,
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
  if (value === null || value === undefined) return '--';
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

  const navigate = useNavigate();
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
        return <span className="text-sm italic text-gray-400 dark:text-gray-500">Auto-generated</span>;
      }
      return <span className="text-sm text-gray-700 dark:text-gray-300">{formatCell(value)}</span>;
    }

    // booleans -> checkbox
    if (booleanFields.includes(col.key)) {
      return (
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(col.key, e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
        />
      );
    }

    // safehouseId -> safehouse dropdown
    if (col.key === 'safehouseId') {
      return (
        <select
          value={value as number}
          onChange={(e) => onChange(col.key, Number(e.target.value))}
          className="select-field"
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
          className="select-field"
        >
          {selectConfig.nullable && <option value="">-- None --</option>}
          {!selectConfig.nullable && !value && <option value="">-- Select --</option>}
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
          className="input-field"
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
          className="input-field resize-y"
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
          className="input-field"
        />
      );
    }

    // default text input
    return (
      <input
        type="text"
        value={value === null || value === undefined ? '' : String(value)}
        onChange={(e) => onChange(col.key, e.target.value || null)}
        className="input-field"
      />
    );
  };

  const renderOnboardInput = (col: { key: keyof Resident; label: string }) => {
    return renderInput(col, onboardData, handleOnboardField, true);
  };

  return (
    <>
      <div className="flex min-h-screen flex-col bg-white dark:bg-gray-900 lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full shrink-0 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 lg:w-60 lg:border-b-0 lg:border-r">
          <div className="px-5 py-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Locations
            </h2>
            <ul className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:pb-0">
              <li>
                <button
                  className={`w-full min-w-max whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium transition lg:min-w-0 ${
                    filters.safehouseId === undefined
                      ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-700'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  onClick={() => handleSafehouseChange(undefined)}
                >
                  All Locations
                </button>
              </li>
              {safehouses.map((sh) => (
                <li key={sh.safehouseId}>
                  <button
                    className={`w-full min-w-max whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium transition lg:min-w-0 ${
                      filters.safehouseId === sh.safehouseId
                        ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-700'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    onClick={() => handleSafehouseChange(sh.safehouseId)}
                  >
                    {sh.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Resident Cases</h1>
            <div className="flex w-full flex-wrap items-center gap-4 lg:w-auto lg:justify-end">
              <button className="btn-primary w-full sm:w-auto" onClick={openOnboard}>
                <Plus className="h-4 w-4" />
                Onboard New Resident
              </button>
              <label className="flex w-full items-center gap-2 text-sm text-gray-600 dark:text-gray-400 sm:w-auto">
                Residents per page:
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="select-field w-full sm:w-auto"
                  aria-label="Residents per page"
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

          {/* Filter bar */}
          <div className="mb-6 space-y-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-md">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by case no., code, worker, agency..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="input-field pl-10"
                aria-label="Search resident cases"
              />
            </div>

            {filterOptions && (
              <div className="flex flex-wrap items-center gap-3">
                <Filter className="h-4 w-4 text-gray-400" />

                <select
                  value={filters.caseStatus || ''}
                  onChange={(e) =>
                    updateFilter('caseStatus', e.target.value || undefined)
                  }
                  className="select-field w-auto"
                  aria-label="Filter by case status"
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
                  className="select-field w-auto"
                  aria-label="Filter by case category"
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
                  className="select-field w-auto"
                  aria-label="Filter by risk level"
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
                  className="select-field w-auto"
                  aria-label="Filter by referral source"
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
                  className="select-field w-auto"
                  aria-label="Filter by reintegration type"
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
                  className="select-field w-auto"
                  aria-label="Filter by social worker"
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
                  className="select-field w-auto"
                  aria-label="Sort resident cases"
                >
                  <option value="">All Social Workers</option>
                  {filterOptions.socialWorkers.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>

                {hasActiveFilters && (
                  <button className="btn-ghost text-red-500 hover:text-red-700" onClick={clearFilters}>
                    <X className="h-4 w-4" />
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Status messages */}
          {loading && (
            <p className="py-12 text-center text-sm text-gray-500">Loading cases...</p>
          )}
          {error && (
            <p className="py-12 text-center text-sm text-red-500">Error: {error}</p>
          )}

          {!loading && !error && residents.length === 0 && (
            <p className="py-12 text-center text-sm text-gray-500">No cases found.</p>
          )}

          {residents.length > 0 && (
            <>
              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-md">
                <table className="table-base">
                  <thead>
                    <tr>
                      {tableColumns.map((col) => (
                        <th key={col.key}>
                          <span className="inline-flex items-center gap-1">
                            {col.label}
                            <ArrowUpDown className="h-3 w-3 text-gray-400" />
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {residents.map((r) => (
                      <tr
                        key={r.residentId}
                        onClick={() => navigate(`/cases/${r.residentId}`)}
                        className="cursor-pointer"
                      >
                        {tableColumns.map((col) => (
                          <td key={col.key}>{formatCell(r[col.key])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <button
                  className="btn-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Page {page} of {totalPages} ({totalCount} total)
                </span>
                <button
                  className="btn-secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Onboarding Modal */}
      {isOnboarding &&
        createPortal(
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="new-resident-title" onClick={closeOnboard}>
            <div
              className="modal-body max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal top bar */}
              <div className="mb-6 flex items-center gap-4 border-b border-gray-100 dark:border-gray-700 pb-6">
                <img
                  src="/portrait_resident.png"
                  alt="New Resident"
                  className="h-14 w-14 rounded-full border-2 border-gray-100 dark:border-gray-700 object-cover"
                />
                <div className="flex-1">
                  <h2 id="new-resident-title" className="text-lg font-bold text-gray-900 dark:text-white">New Resident</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Onboard a new resident</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="btn-primary"
                    onClick={handleCreate}
                    disabled={saving}
                  >
                    {saving ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={closeOnboard}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
                <button className="btn-icon" onClick={closeOnboard} aria-label="Close dialog">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal sections */}
              {modalSections.map((section) => (
                <div className="mb-6" key={section.title}>
                  <h3 className="mb-4 border-b border-gray-100 dark:border-gray-700 pb-2 text-sm font-bold uppercase tracking-wide text-gray-900 dark:text-white">
                    {section.title}
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {section.fields.map((col) => (
                      <div className="flex flex-col gap-1" key={col.key}>
                        <label className="flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {col.label}
                          {fieldTooltips[col.key] && (
                            <span
                              className="group relative cursor-help"
                              title={fieldTooltips[col.key]}
                            >
                              <Info className="h-3.5 w-3.5 text-gray-400" />
                            </span>
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
