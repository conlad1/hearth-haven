import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  Plus, Search, ChevronLeft, ChevronRight, X, Check, ArrowUpDown, Filter,
  Home, Handshake, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { Safehouse } from '../types/Safehouse';
import { Partner } from '../types/Partner';
import AlertModal from '../components/AlertModal';
import {
  fetchSafehouses,
  fetchSafehouseFilterOptions,
  createSafehouse,
  fetchPartners,
  fetchPartnerFilterOptions,
  createPartner,
  SafehouseFilters,
  SafehouseFilterOptions,
  PartnerFilters,
  PartnerFilterOptions,
} from '../api/NetworkAPI';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

type ViewMode = 'safehouses' | 'partners';

// -- Safehouse table columns --
const safehouseColumns: { key: keyof Safehouse; label: string }[] = [
  { key: 'safehouseCode', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'region', label: 'Region' },
  { key: 'city', label: 'City' },
  { key: 'status', label: 'Status' },
  { key: 'capacityGirls', label: 'Capacity' },
  { key: 'currentOccupancy', label: 'Occupancy' },
];

// -- Partner table columns --
const partnerColumns: { key: keyof Partner; label: string }[] = [
  { key: 'partnerName', label: 'Name' },
  { key: 'partnerType', label: 'Type' },
  { key: 'roleType', label: 'Role' },
  { key: 'contactName', label: 'Contact' },
  { key: 'email', label: 'Email' },
  { key: 'status', label: 'Status' },
  { key: 'region', label: 'Region' },
];

// -- Create modal field definitions --
type FieldDef<T> = { key: keyof T; label: string };
interface FieldSection<T> { title: string; fields: FieldDef<T>[] }

const safehouseModalSections: FieldSection<Safehouse>[] = [
  {
    title: 'Safehouse Details',
    fields: [
      { key: 'safehouseCode', label: 'Safehouse Code' },
      { key: 'name', label: 'Name' },
      { key: 'region', label: 'Region' },
      { key: 'city', label: 'City' },
      { key: 'province', label: 'Province' },
      { key: 'country', label: 'Country' },
      { key: 'openDate', label: 'Open Date' },
      { key: 'status', label: 'Status' },
      { key: 'capacityGirls', label: 'Capacity (Girls)' },
      { key: 'capacityStaff', label: 'Capacity (Staff)' },
      { key: 'currentOccupancy', label: 'Current Occupancy' },
      { key: 'notes', label: 'Notes' },
    ],
  },
];

const partnerModalSections: FieldSection<Partner>[] = [
  {
    title: 'Partner Details',
    fields: [
      { key: 'partnerName', label: 'Partner Name' },
      { key: 'partnerType', label: 'Partner Type' },
      { key: 'roleType', label: 'Role Type' },
      { key: 'contactName', label: 'Contact Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'region', label: 'Region' },
      { key: 'status', label: 'Status' },
      { key: 'startDate', label: 'Start Date' },
      { key: 'endDate', label: 'End Date' },
      { key: 'notes', label: 'Notes' },
    ],
  },
];

// -- Dropdown options from schema constraints --
const safehouseRegions = ['Luzon', 'Visayas', 'Mindanao'];
const safehouseStatuses = ['Active', 'Inactive'];
const partnerTypes = ['Organization', 'Individual'];
const partnerRoleTypes = ['Education', 'Evaluation', 'SafehouseOps', 'FindSafehouse', 'Logistics', 'Transport', 'Maintenance'];
const partnerStatuses = ['Active', 'Inactive'];

const safehouseSelectFields: Record<string, { options: string[]; nullable: boolean }> = {
  region: { options: safehouseRegions, nullable: false },
  status: { options: safehouseStatuses, nullable: false },
};

const partnerSelectFields: Record<string, { options: string[]; nullable: boolean }> = {
  partnerType: { options: partnerTypes, nullable: false },
  roleType: { options: partnerRoleTypes, nullable: false },
  status: { options: partnerStatuses, nullable: false },
};

const safehouseDateFields: (keyof Safehouse)[] = ['openDate'];
const safehouseIntFields: (keyof Safehouse)[] = ['capacityGirls', 'capacityStaff', 'currentOccupancy'];
const safehouseTextareaFields: (keyof Safehouse)[] = ['notes'];

const partnerDateFields: (keyof Partner)[] = ['startDate', 'endDate'];
const partnerTextareaFields: (keyof Partner)[] = ['notes'];

const blankSafehouse: Safehouse = {
  safehouseId: 0, safehouseCode: '', name: '', region: '', city: '', province: '',
  country: 'Philippines', openDate: '', status: '', capacityGirls: 0, capacityStaff: 0,
  currentOccupancy: 0, notes: null,
};

const blankPartner: Partner = {
  partnerId: 0, partnerName: '', partnerType: '', roleType: '', contactName: null,
  email: null, phone: null, region: null, status: '', startDate: '', endDate: null, notes: null,
};

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '--';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export default function SafehouseManagementPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>('safehouses');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null);

  // -- Safehouse state --
  const [shList, setShList] = useState<Safehouse[]>([]);
  const [shLoading, setShLoading] = useState(true);
  const [shError, setShError] = useState<string | null>(null);
  const [shPage, setShPage] = useState(1);
  const [shPageSize, setShPageSize] = useState(20);
  const [shTotalPages, setShTotalPages] = useState(1);
  const [shTotalCount, setShTotalCount] = useState(0);
  const [shFilters, setShFilters] = useState<SafehouseFilters>({});
  const [shFilterOpts, setShFilterOpts] = useState<SafehouseFilterOptions | null>(null);
  const [shSearch, setShSearch] = useState('');
  const [shDebouncedSearch, setShDebouncedSearch] = useState('');
  const [shCreating, setShCreating] = useState(false);
  const [shCreateData, setShCreateData] = useState<Safehouse>({ ...blankSafehouse });
  const [shSaving, setShSaving] = useState(false);

  // -- Partner state --
  const [pList, setPList] = useState<Partner[]>([]);
  const [pLoading, setPLoading] = useState(true);
  const [pError, setPError] = useState<string | null>(null);
  const [pPage, setPPage] = useState(1);
  const [pPageSize, setPPageSize] = useState(20);
  const [pTotalPages, setPTotalPages] = useState(1);
  const [pTotalCount, setPTotalCount] = useState(0);
  const [pFilters, setPFilters] = useState<PartnerFilters>({});
  const [pFilterOpts, setPFilterOpts] = useState<PartnerFilterOptions | null>(null);
  const [pSearch, setPSearch] = useState('');
  const [pDebouncedSearch, setPDebouncedSearch] = useState('');
  const [pCreating, setPCreating] = useState(false);
  const [pCreateData, setPCreateData] = useState<Partner>({ ...blankPartner });
  const [pSaving, setPSaving] = useState(false);

  // -- Load filter options on mount --
  useEffect(() => {
    fetchSafehouseFilterOptions().then(setShFilterOpts).catch(console.error);
    fetchPartnerFilterOptions().then(setPFilterOpts).catch(console.error);
  }, []);

  // -- Debounce safehouse search --
  useEffect(() => {
    const t = setTimeout(() => setShDebouncedSearch(shSearch), 300);
    return () => clearTimeout(t);
  }, [shSearch]);
  useEffect(() => {
    setShFilters((prev) => {
      const next = { ...prev };
      if (shDebouncedSearch) next.search = shDebouncedSearch;
      else delete next.search;
      return next;
    });
    setShPage(1);
  }, [shDebouncedSearch]);

  // -- Debounce partner search --
  useEffect(() => {
    const t = setTimeout(() => setPDebouncedSearch(pSearch), 300);
    return () => clearTimeout(t);
  }, [pSearch]);
  useEffect(() => {
    setPFilters((prev) => {
      const next = { ...prev };
      if (pDebouncedSearch) next.search = pDebouncedSearch;
      else delete next.search;
      return next;
    });
    setPPage(1);
  }, [pDebouncedSearch]);

  // -- Load safehouses --
  const loadSafehouses = () => {
    setShLoading(true);
    setShError(null);
    fetchSafehouses(shPage, shPageSize, shFilters)
      .then((res) => { setShList(res.data); setShTotalPages(res.totalPages); setShTotalCount(res.totalCount); })
      .catch((err) => setShError(err.message))
      .finally(() => setShLoading(false));
  };
  useEffect(() => { loadSafehouses(); }, [shPage, shPageSize, shFilters]);

  // -- Load partners --
  const loadPartners = () => {
    setPLoading(true);
    setPError(null);
    fetchPartners(pPage, pPageSize, pFilters)
      .then((res) => { setPList(res.data); setPTotalPages(res.totalPages); setPTotalCount(res.totalCount); })
      .catch((err) => setPError(err.message))
      .finally(() => setPLoading(false));
  };
  useEffect(() => { loadPartners(); }, [pPage, pPageSize, pFilters]);

  // -- Safehouse filter helpers --
  const updateShFilter = (key: keyof SafehouseFilters, value: string | undefined) => {
    setShFilters((prev) => {
      const next = { ...prev };
      if (value) (next as Record<string, unknown> & object)[key] = value;
      else delete (next as Record<string, unknown> & object)[key];
      return next;
    });
    setShPage(1);
  };

  const shHasActiveFilters = shFilters.region || shFilters.status || shFilters.search;
  const clearShFilters = () => { setShSearch(''); setShDebouncedSearch(''); setShFilters({}); setShPage(1); };

  // -- Partner filter helpers --
  const updatePFilter = (key: keyof PartnerFilters, value: string | undefined) => {
    setPFilters((prev) => {
      const next = { ...prev };
      if (value) (next as Record<string, unknown> & object)[key] = value;
      else delete (next as Record<string, unknown> & object)[key];
      return next;
    });
    setPPage(1);
  };

  const pHasActiveFilters = pFilters.partnerType || pFilters.roleType || pFilters.status || pFilters.region || pFilters.search;
  const clearPFilters = () => { setPSearch(''); setPDebouncedSearch(''); setPFilters({}); setPPage(1); };

  // -- Safehouse create --
  const handleShCreate = async () => {
    const required: { key: keyof Safehouse; label: string }[] = [
      { key: 'safehouseCode', label: 'Safehouse Code' }, { key: 'name', label: 'Name' },
      { key: 'region', label: 'Region' }, { key: 'city', label: 'City' },
      { key: 'province', label: 'Province' }, { key: 'country', label: 'Country' },
      { key: 'openDate', label: 'Open Date' }, { key: 'status', label: 'Status' },
    ];
    const missing = required.filter((f) => !shCreateData[f.key]);
    if (missing.length > 0) {
      setAlertModal({ title: 'Missing Fields', message: `Please fill in required fields:\n${missing.map((f) => f.label).join(', ')}` });
      return;
    }
    setShSaving(true);
    try {
      await createSafehouse(shCreateData);
      setShCreating(false);
      setShCreateData({ ...blankSafehouse });
      loadSafehouses();
    } catch (err) {
      setAlertModal({ title: 'Error', message: err instanceof Error ? err.message : 'Failed to create safehouse' });
    } finally {
      setShSaving(false);
    }
  };

  // -- Partner create --
  const handlePCreate = async () => {
    const required: { key: keyof Partner; label: string }[] = [
      { key: 'partnerName', label: 'Partner Name' }, { key: 'partnerType', label: 'Partner Type' },
      { key: 'roleType', label: 'Role Type' }, { key: 'status', label: 'Status' },
      { key: 'startDate', label: 'Start Date' },
    ];
    const missing = required.filter((f) => !pCreateData[f.key]);
    if (missing.length > 0) {
      setAlertModal({ title: 'Missing Fields', message: `Please fill in required fields:\n${missing.map((f) => f.label).join(', ')}` });
      return;
    }
    setPSaving(true);
    try {
      await createPartner(pCreateData);
      setPCreating(false);
      setPCreateData({ ...blankPartner });
      loadPartners();
    } catch (err) {
      setAlertModal({ title: 'Error', message: err instanceof Error ? err.message : 'Failed to create partner' });
    } finally {
      setPSaving(false);
    }
  };

  // -- Generic input renderer --
  function renderCreateInput<T>(
    col: { key: keyof T; label: string },
    data: T,
    onChange: (key: keyof T, value: unknown) => void,
    selectFields: Record<string, { options: string[]; nullable: boolean }>,
    dateFields: (keyof T)[],
    intFields: (keyof T)[],
    textareaFields: (keyof T)[],
  ) {
    const value = (data as Record<string, unknown>)[col.key as string];
    const selectCfg = selectFields[col.key as string];

    if (selectCfg) {
      return (
        <select
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(col.key, e.target.value || null)}
          className="select-field"
        >
          {selectCfg.nullable && <option value="">-- None --</option>}
          {!selectCfg.nullable && !value && <option value="">-- Select --</option>}
          {selectCfg.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }

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

    if (intFields.includes(col.key)) {
      return (
        <input
          type="number"
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(col.key, e.target.value ? Number(e.target.value) : 0)}
          className="input-field"
        />
      );
    }

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

    return (
      <input
        type="text"
        value={value === null || value === undefined ? '' : String(value)}
        onChange={(e) => onChange(col.key, e.target.value || null)}
        className="input-field"
      />
    );
  }

  // -- Render create modal --
  function renderCreateModal<T>(
    isOpen: boolean,
    onClose: () => void,
    title: string,
    sections: FieldSection<T>[],
    data: T,
    onChange: (key: keyof T, value: unknown) => void,
    onSave: () => void,
    saving: boolean,
    selectFields: Record<string, { options: string[]; nullable: boolean }>,
    dateFields: (keyof T)[],
    intFields: (keyof T)[],
    textareaFields: (keyof T)[],
  ) {
    if (!isOpen) return null;
    return createPortal(
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-body max-w-4xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-6 flex items-start justify-between border-b border-gray-100 pb-5 dark:border-gray-700">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">New {title}</h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Fill in the details below</p>
            </div>
            <div className="ml-4 flex items-center gap-2">
              <button
                className="inline-flex items-center justify-center rounded-lg bg-orange-500 p-2 text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 cursor-pointer"
                onClick={onSave}
                disabled={saving}
                aria-label={saving ? 'Creating' : 'Create'}
                title="Create"
              >
                {saving ? <span className="text-xs font-medium">Creating...</span> : <Check size={16} />}
              </button>
              <button
                className="inline-flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-2 text-gray-600 dark:text-gray-400 transition hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 cursor-pointer"
                onClick={onClose}
                disabled={saving}
                aria-label="Cancel"
                title="Cancel"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          {sections.map((section) => (
            <div className="mb-6" key={section.title}>
              <h3 className="mb-4 border-b border-gray-100 dark:border-gray-700 pb-2 text-sm font-bold uppercase tracking-wide text-gray-900 dark:text-white">
                {section.title}
              </h3>
              <div className="grid grid-cols-1 gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-3 dark:bg-white/5">
                {section.fields.map((col) => (
                  <div className="flex flex-col gap-1.5" key={col.key as string}>
                    <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{col.label}</label>
                    {renderCreateInput(col, data, onChange, selectFields, dateFields, intFields, textareaFields)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>,
      document.body
    );
  }

  return (
    <>
      <div className="flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className={`w-full shrink-0 border-b border-gray-200 bg-white transition-all duration-200 dark:border-gray-700 dark:bg-gray-900 lg:border-b-0 lg:border-r ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-60'}`}>
          {/* Header with collapse toggle */}
          <div className={`flex items-center pt-6 pb-2 ${sidebarCollapsed ? 'lg:justify-center lg:px-2 px-5' : 'justify-between px-5'}`}>
            {!sidebarCollapsed && (
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Safehouse Management
              </h2>
            )}
            <button
              onClick={() => setSidebarCollapsed(prev => !prev)}
              className="btn-icon hidden lg:inline-flex"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>
          <div className={`pb-6 ${sidebarCollapsed ? 'lg:px-2 px-5' : 'px-5'}`}>
            <ul className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:pb-0">
              <li>
                <button
                  title={sidebarCollapsed ? 'Safehouses' : undefined}
                  className={`flex w-full min-w-max items-center gap-3 whitespace-nowrap rounded-lg py-2 text-sm font-medium transition lg:min-w-0 ${
                    sidebarCollapsed ? 'lg:justify-center lg:px-2 px-3' : 'px-3 text-left'
                  } ${
                    view === 'safehouses'
                      ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-700'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  onClick={() => setView('safehouses')}
                >
                  <Home className="h-4 w-4 shrink-0" />
                  <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Safehouses</span>
                </button>
              </li>
              <li>
                <button
                  title={sidebarCollapsed ? 'Partners' : undefined}
                  className={`flex w-full min-w-max items-center gap-3 whitespace-nowrap rounded-lg py-2 text-sm font-medium transition lg:min-w-0 ${
                    sidebarCollapsed ? 'lg:justify-center lg:px-2 px-3' : 'px-3 text-left'
                  } ${
                    view === 'partners'
                      ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-700'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  onClick={() => setView('partners')}
                >
                  <Handshake className="h-4 w-4 shrink-0" />
                  <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Partners</span>
                </button>
              </li>
            </ul>
          </div>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {view === 'safehouses' ? (
            <>
              {/* Header */}
              <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Safehouses</h1>
                <div className="flex items-center gap-4">
                  <button className="btn-primary" onClick={() => setShCreating(true)}>
                    <Plus className="h-4 w-4" /> New Safehouse
                  </button>
                </div>
              </div>

              {/* Filter bar */}
              <div className="mb-6 space-y-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-md">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text" placeholder="Search by name, code, city, province..."
                    value={shSearch} onChange={(e) => setShSearch(e.target.value)} className="input-field pl-10"
                  />
                </div>
                {shFilterOpts && (
                  <div className="flex flex-wrap items-center gap-3">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <select value={shFilters.region || ''} onChange={(e) => updateShFilter('region', e.target.value || undefined)} className="select-field w-auto">
                      <option value="">All Regions</option>
                      {shFilterOpts.regions.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <select value={shFilters.status || ''} onChange={(e) => updateShFilter('status', e.target.value || undefined)} className="select-field w-auto">
                      <option value="">All Statuses</option>
                      {shFilterOpts.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      Per page:
                      <select value={shPageSize} onChange={(e) => { setShPageSize(Number(e.target.value)); setShPage(1); }} className="select-field w-auto" aria-label="Safehouses per page">
                        {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </label>
                    {shHasActiveFilters && (
                      <button className="btn-ghost text-red-500 hover:text-red-700" onClick={clearShFilters}>
                        <X className="h-4 w-4" /> Clear Filters
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Table */}
              {shLoading && <p className="py-12 text-center text-sm text-gray-500">Loading safehouses...</p>}
              {shError && <p className="py-12 text-center text-sm text-red-500">Error: {shError}</p>}
              {!shLoading && !shError && shList.length === 0 && <p className="py-12 text-center text-sm text-gray-500">No safehouses found.</p>}
              {shList.length > 0 && (
                <>
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-md">
                    <table className="table-base">
                      <thead>
                        <tr>
                          {safehouseColumns.map((col) => (
                            <th key={col.key}><span className="inline-flex items-center gap-1">{col.label}<ArrowUpDown className="h-3 w-3 text-gray-400" /></span></th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {shList.map((s) => (
                          <tr key={s.safehouseId} onClick={() => navigate(`/safehouse-management/safehouses/${s.safehouseId}`)} className="cursor-pointer">
                            {safehouseColumns.map((col) => <td key={col.key}>{formatCell(s[col.key])}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <button className="btn-secondary" disabled={shPage <= 1} onClick={() => setShPage(shPage - 1)}><ChevronLeft className="h-4 w-4" /> Previous</button>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Page {shPage} of {shTotalPages} ({shTotalCount} total)</span>
                    <button className="btn-secondary" disabled={shPage >= shTotalPages} onClick={() => setShPage(shPage + 1)}>Next <ChevronRight className="h-4 w-4" /></button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {/* Partner list */}
              <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Partners</h1>
                <div className="flex items-center gap-4">
                  <button className="btn-primary" onClick={() => setPCreating(true)}>
                    <Plus className="h-4 w-4" /> New Partner
                  </button>
                </div>
              </div>

              <div className="mb-6 space-y-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-md">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text" placeholder="Search by name, contact, email..."
                    value={pSearch} onChange={(e) => setPSearch(e.target.value)} className="input-field pl-10"
                  />
                </div>
                {pFilterOpts && (
                  <div className="flex flex-wrap items-center gap-3">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <select value={pFilters.partnerType || ''} onChange={(e) => updatePFilter('partnerType', e.target.value || undefined)} className="select-field w-auto">
                      <option value="">All Types</option>
                      {pFilterOpts.partnerTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={pFilters.roleType || ''} onChange={(e) => updatePFilter('roleType', e.target.value || undefined)} className="select-field w-auto">
                      <option value="">All Roles</option>
                      {pFilterOpts.roleTypes.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <select value={pFilters.status || ''} onChange={(e) => updatePFilter('status', e.target.value || undefined)} className="select-field w-auto">
                      <option value="">All Statuses</option>
                      {pFilterOpts.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={pFilters.region || ''} onChange={(e) => updatePFilter('region', e.target.value || undefined)} className="select-field w-auto">
                      <option value="">All Regions</option>
                      {pFilterOpts.regions.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      Per page:
                      <select value={pPageSize} onChange={(e) => { setPPageSize(Number(e.target.value)); setPPage(1); }} className="select-field w-auto" aria-label="Partners per page">
                        {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </label>
                    {pHasActiveFilters && (
                      <button className="btn-ghost text-red-500 hover:text-red-700" onClick={clearPFilters}>
                        <X className="h-4 w-4" /> Clear Filters
                      </button>
                    )}
                  </div>
                )}
              </div>

              {pLoading && <p className="py-12 text-center text-sm text-gray-500">Loading partners...</p>}
              {pError && <p className="py-12 text-center text-sm text-red-500">Error: {pError}</p>}
              {!pLoading && !pError && pList.length === 0 && <p className="py-12 text-center text-sm text-gray-500">No partners found.</p>}
              {pList.length > 0 && (
                <>
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-md">
                    <table className="table-base">
                      <thead>
                        <tr>
                          {partnerColumns.map((col) => (
                            <th key={col.key}><span className="inline-flex items-center gap-1">{col.label}<ArrowUpDown className="h-3 w-3 text-gray-400" /></span></th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pList.map((p) => (
                          <tr key={p.partnerId} onClick={() => navigate(`/safehouse-management/partners/${p.partnerId}`)} className="cursor-pointer">
                            {partnerColumns.map((col) => <td key={col.key}>{formatCell(p[col.key])}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <button className="btn-secondary" disabled={pPage <= 1} onClick={() => setPPage(pPage - 1)}><ChevronLeft className="h-4 w-4" /> Previous</button>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Page {pPage} of {pTotalPages} ({pTotalCount} total)</span>
                    <button className="btn-secondary" disabled={pPage >= pTotalPages} onClick={() => setPPage(pPage + 1)}>Next <ChevronRight className="h-4 w-4" /></button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Safehouse Modal */}
      {renderCreateModal<Safehouse>(
        shCreating,
        () => { setShCreating(false); setShCreateData({ ...blankSafehouse }); },
        'Safehouse',
        safehouseModalSections,
        shCreateData,
        (key, val) => setShCreateData((prev) => ({ ...prev, [key]: val })),
        handleShCreate,
        shSaving,
        safehouseSelectFields,
        safehouseDateFields,
        safehouseIntFields,
        safehouseTextareaFields,
      )}

      {/* Create Partner Modal */}
      {renderCreateModal<Partner>(
        pCreating,
        () => { setPCreating(false); setPCreateData({ ...blankPartner }); },
        'Partner',
        partnerModalSections,
        pCreateData,
        (key, val) => setPCreateData((prev) => ({ ...prev, [key]: val })),
        handlePCreate,
        pSaving,
        partnerSelectFields,
        partnerDateFields,
        [] as (keyof Partner)[],
        partnerTextareaFields,
      )}

      {/* Alert Modal */}
      <AlertModal
        open={!!alertModal}
        title={alertModal?.title ?? ''}
        message={alertModal?.message ?? ''}
        onClose={() => setAlertModal(null)}
      />
    </>
  );
}
