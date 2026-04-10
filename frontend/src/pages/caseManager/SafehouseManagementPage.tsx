import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  ArrowUpDown,
  Filter,
  Home,
  Handshake,
  ExternalLink,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { Safehouse } from '../../types/Safehouse';
import { Partner } from '../../types/Partner';
import { PartnerAssignment } from '../../types/PartnerAssignment';
import AlertModal from '../../components/AlertModal';
import { DetailModal } from '../../components/admin/dashboard/DetailModal';
import {
  fetchSafehouses,
  fetchSafehouseFilterOptions,
  createSafehouse,
  fetchPartners,
  fetchPartnerFilterOptions,
  createPartner,
  fetchSafehousePartners,
  SafehouseFilters,
  SafehouseFilterOptions,
  PartnerFilters,
  PartnerFilterOptions,
} from '../../api/caseManager/NetworkAPI';
import {
  fetchCaseManager,
  fetchCaseAnalytics,
} from '../../api/admin/RoleDashboardAPI';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

type ViewMode = 'safehouses' | 'partners';

// -- Safehouse table columns (Occupancy rendered separately) --
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
interface FieldSection<T> {
  title: string;
  fields: FieldDef<T>[];
}

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
const partnerRoleTypes = [
  'Education',
  'Evaluation',
  'SafehouseOps',
  'FindSafehouse',
  'Logistics',
  'Transport',
  'Maintenance',
];
const partnerStatuses = ['Active', 'Inactive'];

const safehouseSelectFields: Record<
  string,
  { options: string[]; nullable: boolean }
> = {
  region: { options: safehouseRegions, nullable: false },
  status: { options: safehouseStatuses, nullable: false },
};

const partnerSelectFields: Record<
  string,
  { options: string[]; nullable: boolean }
> = {
  partnerType: { options: partnerTypes, nullable: false },
  roleType: { options: partnerRoleTypes, nullable: false },
  status: { options: partnerStatuses, nullable: false },
};

const safehouseDateFields: (keyof Safehouse)[] = ['openDate'];
const safehouseIntFields: (keyof Safehouse)[] = [
  'capacityGirls',
  'capacityStaff',
  'currentOccupancy',
];
const safehouseTextareaFields: (keyof Safehouse)[] = ['notes'];

const partnerDateFields: (keyof Partner)[] = ['startDate', 'endDate'];
const partnerTextareaFields: (keyof Partner)[] = ['notes'];

const blankSafehouse: Safehouse = {
  safehouseId: 0,
  safehouseCode: '',
  name: '',
  region: '',
  city: '',
  province: '',
  country: 'Philippines',
  openDate: '',
  status: '',
  capacityGirls: 0,
  capacityStaff: 0,
  currentOccupancy: 0,
  notes: null,
};

const blankPartner: Partner = {
  partnerId: 0,
  partnerName: '',
  partnerType: '',
  roleType: '',
  contactName: null,
  email: null,
  phone: null,
  region: null,
  status: '',
  startDate: '',
  endDate: null,
  notes: null,
};

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '--';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

// -- Occupancy bar component --
function OccupancyBar({ occupancy, capacity }: { occupancy: number; capacity: number }) {
  const pct = capacity > 0 ? Math.round((occupancy / capacity) * 100) : 0;
  const color =
    pct >= 90
      ? 'bg-red-500'
      : pct >= 70
      ? 'bg-orange-400'
      : 'bg-emerald-500';
  const textColor =
    pct >= 90
      ? 'text-red-600 dark:text-red-400'
      : pct >= 70
      ? 'text-orange-600 dark:text-orange-400'
      : 'text-emerald-600 dark:text-emerald-400';
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className={`text-xs font-medium tabular-nums ${textColor}`}>
        {occupancy}/{capacity}
      </span>
    </div>
  );
}

// -- Safehouse detail modal content --
interface ShModalData {
  partners: PartnerAssignment[];
  incidentCount: number;
  avgHealthScore: number | null;
  avgEduProgress: number | null;
}

function SafehouseModalContent({
  safehouse,
  data,
  loading,
  navigate,
}: {
  safehouse: Safehouse;
  data: ShModalData | null;
  loading: boolean;
  navigate: (path: string) => void;
}) {
  const occ = safehouse.currentOccupancy;
  const cap = safehouse.capacityGirls;
  const pct = cap > 0 ? Math.round((occ / cap) * 100) : 0;
  const barColor =
    pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-400' : 'bg-emerald-500';
  const pctColor =
    pct >= 90
      ? 'text-red-600 dark:text-red-400'
      : pct >= 70
      ? 'text-orange-600 dark:text-orange-400'
      : 'text-emerald-600 dark:text-emerald-400';

  const infoRows: { label: string; value: string }[] = [
    { label: 'Code', value: safehouse.safehouseCode },
    { label: 'Region', value: safehouse.region },
    { label: 'City', value: safehouse.city },
    { label: 'Province', value: safehouse.province },
    { label: 'Status', value: safehouse.status },
    { label: 'Open Date', value: safehouse.openDate || '—' },
  ];

  return (
    <div className="space-y-5">
      {/* Info */}
      <div className="space-y-1.5">
        {infoRows.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{label}</span>
            <span className="font-medium text-gray-900 dark:text-white">{value}</span>
          </div>
        ))}
      </div>

      {/* Occupancy bar */}
      <div>
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Occupancy</span>
          <span className={`font-bold ${pctColor}`}>
            {occ} / {cap} ({pct}%)
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-700">
          <div
            className={`h-3 rounded-full ${barColor} transition-all`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <p className={`mt-1 text-xs font-medium ${pctColor}`}>
          {pct >= 90 ? 'Near capacity' : pct >= 70 ? 'Approaching capacity' : 'Healthy occupancy'}
        </p>
      </div>

      {/* Stats row */}
      {loading ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">Loading details…</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{data.incidentCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">incidents this month</p>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {data.avgHealthScore !== null ? data.avgHealthScore.toFixed(1) : '—'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">avg health (org)</p>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {data.avgEduProgress !== null ? data.avgEduProgress.toFixed(0) + '%' : '—'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">avg edu (org)</p>
            </div>
          </div>

          {/* Active partners */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Active Partner Assignments
            </p>
            {data.partners.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No active assignments.</p>
            ) : (
              <div className="space-y-1.5">
                {data.partners.map((a) => (
                  <div
                    key={a.assignmentId}
                    className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {a.partner?.partnerName ?? `Partner #${a.partnerId}`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{a.programArea}</p>
                    </div>
                    {a.isPrimary && (
                      <span className="ml-2 shrink-0 rounded-full bg-orange-100 dark:bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-700 dark:text-orange-400">
                        Primary
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* Manage button */}
      <button
        onClick={() =>
          navigate(`/safehouse-management/safehouses/${safehouse.safehouseId}`)
        }
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-orange-600"
      >
        Manage safehouse <ExternalLink className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function SafehouseManagementPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>('safehouses');
  const [alertModal, setAlertModal] = useState<{
    title: string;
    message: string;
  } | null>(null);

  // -- All safehouses for org-wide stats --
  const [allSh, setAllSh] = useState<Safehouse[]>([]);

  // -- Safehouse detail modal state --
  const [selectedSh, setSelectedSh] = useState<Safehouse | null>(null);
  const [modalData, setModalData] = useState<ShModalData | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // -- Safehouse state --
  const [shList, setShList] = useState<Safehouse[]>([]);
  const [shLoading, setShLoading] = useState(true);
  const [shError, setShError] = useState<string | null>(null);
  const [shPage, setShPage] = useState(1);
  const [shPageSize, setShPageSize] = useState(20);
  const [shTotalPages, setShTotalPages] = useState(1);
  const [shTotalCount, setShTotalCount] = useState(0);
  const [shFilters, setShFilters] = useState<SafehouseFilters>({});
  const [shFilterOpts, setShFilterOpts] =
    useState<SafehouseFilterOptions | null>(null);
  const [shSearch, setShSearch] = useState('');
  const [shDebouncedSearch, setShDebouncedSearch] = useState('');
  const [shCreating, setShCreating] = useState(false);
  const [shCreateData, setShCreateData] = useState<Safehouse>({
    ...blankSafehouse,
  });
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
  const [pFilterOpts, setPFilterOpts] = useState<PartnerFilterOptions | null>(
    null
  );
  const [pSearch, setPSearch] = useState('');
  const [pDebouncedSearch, setPDebouncedSearch] = useState('');
  const [pCreating, setPCreating] = useState(false);
  const [pCreateData, setPCreateData] = useState<Partner>({ ...blankPartner });
  const [pSaving, setPSaving] = useState(false);

  // -- Load all safehouses for stats (once) --
  useEffect(() => {
    fetchSafehouses(1, 9999).then((res) => setAllSh(res.data)).catch(console.error);
  }, []);

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
      .then((res) => {
        setShList(res.data);
        setShTotalPages(res.totalPages);
        setShTotalCount(res.totalCount);
      })
      .catch((err) => setShError(err.message))
      .finally(() => setShLoading(false));
  };
  useEffect(() => {
    loadSafehouses();
  }, [shPage, shPageSize, shFilters]);

  // -- Load partners --
  const loadPartners = () => {
    setPLoading(true);
    setPError(null);
    fetchPartners(pPage, pPageSize, pFilters)
      .then((res) => {
        setPList(res.data);
        setPTotalPages(res.totalPages);
        setPTotalCount(res.totalCount);
      })
      .catch((err) => setPError(err.message))
      .finally(() => setPLoading(false));
  };
  useEffect(() => {
    loadPartners();
  }, [pPage, pPageSize, pFilters]);

  // -- Load safehouse modal data lazily --
  useEffect(() => {
    if (!selectedSh) {
      setModalData(null);
      return;
    }
    setModalLoading(true);
    const now = new Date();
    const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    Promise.all([
      fetchSafehousePartners(selectedSh.safehouseId, 1, 20, { status: 'Active' }),
      fetchCaseManager(),
      fetchCaseAnalytics(),
    ])
      .then(([assignRes, caseData, analytics]) => {
        const incidentCount = caseData.recentIncidents.filter(
          (i) =>
            i.safehouseName === selectedSh.name &&
            i.incidentDate.startsWith(thisMonthPrefix)
        ).length;

        const healthSeries = analytics.monthlyHealthScores;
        const eduSeries = analytics.monthlyEducationProgress;
        const avgHealthScore =
          healthSeries.length > 0
            ? healthSeries[healthSeries.length - 1].avgScore
            : null;
        const avgEduProgress =
          eduSeries.length > 0
            ? eduSeries[eduSeries.length - 1].avgProgress
            : null;

        setModalData({
          partners: assignRes.data,
          incidentCount,
          avgHealthScore,
          avgEduProgress,
        });
      })
      .catch(console.error)
      .finally(() => setModalLoading(false));
  }, [selectedSh]);

  // -- Safehouse filter helpers --
  const updateShFilter = (
    key: keyof SafehouseFilters,
    value: string | undefined
  ) => {
    setShFilters((prev) => {
      const next = { ...prev };
      if (value) (next as Record<string, unknown> & object)[key] = value;
      else delete (next as Record<string, unknown> & object)[key];
      return next;
    });
    setShPage(1);
  };

  const shHasActiveFilters =
    shFilters.region || shFilters.status || shFilters.search;
  const clearShFilters = () => {
    setShSearch('');
    setShDebouncedSearch('');
    setShFilters({});
    setShPage(1);
  };

  // -- Partner filter helpers --
  const updatePFilter = (
    key: keyof PartnerFilters,
    value: string | undefined
  ) => {
    setPFilters((prev) => {
      const next = { ...prev };
      if (value) (next as Record<string, unknown> & object)[key] = value;
      else delete (next as Record<string, unknown> & object)[key];
      return next;
    });
    setPPage(1);
  };

  const pHasActiveFilters =
    pFilters.partnerType ||
    pFilters.roleType ||
    pFilters.status ||
    pFilters.region ||
    pFilters.search;
  const clearPFilters = () => {
    setPSearch('');
    setPDebouncedSearch('');
    setPFilters({});
    setPPage(1);
  };

  // -- Safehouse create --
  const handleShCreate = async () => {
    const required: { key: keyof Safehouse; label: string }[] = [
      { key: 'safehouseCode', label: 'Safehouse Code' },
      { key: 'name', label: 'Name' },
      { key: 'region', label: 'Region' },
      { key: 'city', label: 'City' },
      { key: 'province', label: 'Province' },
      { key: 'country', label: 'Country' },
      { key: 'openDate', label: 'Open Date' },
      { key: 'status', label: 'Status' },
    ];
    const missing = required.filter((f) => !shCreateData[f.key]);
    if (missing.length > 0) {
      setAlertModal({
        title: 'Missing Fields',
        message: `Please fill in required fields:\n${missing.map((f) => f.label).join(', ')}`,
      });
      return;
    }
    setShSaving(true);
    try {
      await createSafehouse(shCreateData);
      setShCreating(false);
      setShCreateData({ ...blankSafehouse });
      loadSafehouses();
    } catch (err) {
      setAlertModal({
        title: 'Error',
        message:
          err instanceof Error ? err.message : 'Failed to create safehouse',
      });
    } finally {
      setShSaving(false);
    }
  };

  // -- Partner create --
  const handlePCreate = async () => {
    const required: { key: keyof Partner; label: string }[] = [
      { key: 'partnerName', label: 'Partner Name' },
      { key: 'partnerType', label: 'Partner Type' },
      { key: 'roleType', label: 'Role Type' },
      { key: 'status', label: 'Status' },
      { key: 'startDate', label: 'Start Date' },
    ];
    const missing = required.filter((f) => !pCreateData[f.key]);
    if (missing.length > 0) {
      setAlertModal({
        title: 'Missing Fields',
        message: `Please fill in required fields:\n${missing.map((f) => f.label).join(', ')}`,
      });
      return;
    }
    setPSaving(true);
    try {
      await createPartner(pCreateData);
      setPCreating(false);
      setPCreateData({ ...blankPartner });
      loadPartners();
    } catch (err) {
      setAlertModal({
        title: 'Error',
        message:
          err instanceof Error ? err.message : 'Failed to create partner',
      });
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
    textareaFields: (keyof T)[]
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
          {!selectCfg.nullable && !value && (
            <option value="">-- Select --</option>
          )}
          {selectCfg.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }

    if (dateFields.includes(col.key)) {
      return (
        <input
          type="date"
          value={
            value === null || value === undefined
              ? ''
              : String(value).slice(0, 10)
          }
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
          onChange={(e) =>
            onChange(col.key, e.target.value ? Number(e.target.value) : 0)
          }
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
    textareaFields: (keyof T)[]
  ) {
    if (!isOpen) return null;
    return createPortal(
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-body max-w-4xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-6 flex items-start justify-between border-b border-gray-100 pb-5 dark:border-gray-700">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                New {title}
              </h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                Fill in the details below
              </p>
            </div>
            <div className="ml-4 flex items-center gap-2">
              <button
                className="inline-flex items-center justify-center rounded-lg bg-orange-500 p-2 text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 cursor-pointer"
                onClick={onSave}
                disabled={saving}
                aria-label={saving ? 'Creating' : 'Create'}
                title="Create"
              >
                {saving ? (
                  <span className="text-xs font-medium">Creating...</span>
                ) : (
                  <Check size={16} />
                )}
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
                  <div
                    className="flex flex-col gap-1.5"
                    key={col.key as string}
                  >
                    <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {col.label}
                    </label>
                    {renderCreateInput(
                      col,
                      data,
                      onChange,
                      selectFields,
                      dateFields,
                      intFields,
                      textareaFields
                    )}
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

  // -- Compute org-wide stats --
  const totalOccupancy = allSh.reduce((s, h) => s + h.currentOccupancy, 0);
  const totalCapacity = allSh.reduce((s, h) => s + h.capacityGirls, 0);
  const nearCapacityCount = allSh.filter(
    (h) => h.capacityGirls > 0 && h.currentOccupancy / h.capacityGirls >= 0.9
  ).length;
  const avgOccupancyPct =
    totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0;

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Safehouse Management
          </h1>
          <button
            className="btn-primary"
            onClick={() =>
              view === 'safehouses' ? setShCreating(true) : setPCreating(true)
            }
          >
            <Plus className="h-4 w-4" />
            {view === 'safehouses' ? 'New Safehouse' : 'New Partner'}
          </button>
        </div>

        {/* Stats strip (safehouses only) */}
        {view === 'safehouses' && allSh.length > 0 && (
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="card flex items-center gap-3 px-4 py-3">
              <Users className="h-5 w-5 shrink-0 text-orange-500" />
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {totalOccupancy} / {totalCapacity}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">girls housed org-wide</p>
              </div>
            </div>
            <div className={`card flex items-center gap-3 px-4 py-3 ${nearCapacityCount > 0 ? 'border-orange-200 dark:border-orange-500/30' : ''}`}>
              <AlertTriangle className={`h-5 w-5 shrink-0 ${nearCapacityCount > 0 ? 'text-orange-500' : 'text-gray-300 dark:text-gray-600'}`} />
              <div>
                <p className={`text-lg font-bold ${nearCapacityCount > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}>
                  {nearCapacityCount}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">at ≥90% capacity</p>
              </div>
            </div>
            <div className="card flex items-center gap-3 px-4 py-3">
              <div
                className={`h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                  avgOccupancyPct >= 90 ? 'bg-red-500' : avgOccupancyPct >= 70 ? 'bg-orange-400' : 'bg-emerald-500'
                }`}
              >
                %
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{avgOccupancyPct}%</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">avg occupancy rate</p>
              </div>
            </div>
          </div>
        )}

        {/* Pill toggle */}
        <div className="mb-5 inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 gap-1">
          <button
            className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              view === 'safehouses'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            onClick={() => setView('safehouses')}
          >
            <Home className="h-4 w-4" />
            Safehouses
          </button>
          <button
            className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              view === 'partners'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            onClick={() => setView('partners')}
          >
            <Handshake className="h-4 w-4" />
            Partners
          </button>
        </div>

        {view === 'safehouses' ? (
          <>
            {/* Safehouse filter bar */}
            <div className="mb-6 space-y-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-md">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, code, city, province..."
                  value={shSearch}
                  onChange={(e) => setShSearch(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
              {shFilterOpts && (
                <div className="flex flex-wrap items-center gap-3">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={shFilters.region || ''}
                    onChange={(e) =>
                      updateShFilter('region', e.target.value || undefined)
                    }
                    className="select-field w-auto"
                  >
                    <option value="">All Regions</option>
                    {shFilterOpts.regions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <select
                    value={shFilters.status || ''}
                    onChange={(e) =>
                      updateShFilter('status', e.target.value || undefined)
                    }
                    className="select-field w-auto"
                  >
                    <option value="">All Statuses</option>
                    {shFilterOpts.statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    Per page:
                    <select
                      value={shPageSize}
                      onChange={(e) => {
                        setShPageSize(Number(e.target.value));
                        setShPage(1);
                      }}
                      className="select-field w-auto"
                      aria-label="Safehouses per page"
                    >
                      {PAGE_SIZE_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  {shHasActiveFilters && (
                    <button
                      className="btn-ghost text-red-500 hover:text-red-700"
                      onClick={clearShFilters}
                    >
                      <X className="h-4 w-4" /> Clear Filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Safehouse table */}
            {shLoading && (
              <p className="py-12 text-center text-sm text-gray-500">
                Loading safehouses...
              </p>
            )}
            {shError && (
              <p className="py-12 text-center text-sm text-red-500">
                Error: {shError}
              </p>
            )}
            {!shLoading && !shError && shList.length === 0 && (
              <p className="py-12 text-center text-sm text-gray-500">
                No safehouses found.
              </p>
            )}
            {shList.length > 0 && (
              <>
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-md">
                  <table className="table-base">
                    <thead>
                      <tr>
                        {safehouseColumns.map((col) => (
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
                      {shList.map((s) => (
                        <tr
                          key={s.safehouseId}
                          onClick={() => setSelectedSh(s)}
                          className="cursor-pointer"
                        >
                          {safehouseColumns.map((col) =>
                            col.key === 'currentOccupancy' ? (
                              <td key={col.key}>
                                <OccupancyBar
                                  occupancy={s.currentOccupancy}
                                  capacity={s.capacityGirls}
                                />
                              </td>
                            ) : (
                              <td key={col.key}>{formatCell(s[col.key])}</td>
                            )
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <button
                    className="btn-secondary"
                    disabled={shPage <= 1}
                    onClick={() => setShPage(shPage - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </button>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Page {shPage} of {shTotalPages} ({shTotalCount} total)
                  </span>
                  <button
                    className="btn-secondary"
                    disabled={shPage >= shTotalPages}
                    onClick={() => setShPage(shPage + 1)}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {/* Partner filter bar */}
            <div className="mb-6 space-y-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-md">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, contact, email..."
                  value={pSearch}
                  onChange={(e) => setPSearch(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
              {pFilterOpts && (
                <div className="flex flex-wrap items-center gap-3">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={pFilters.partnerType || ''}
                    onChange={(e) =>
                      updatePFilter(
                        'partnerType',
                        e.target.value || undefined
                      )
                    }
                    className="select-field w-auto"
                  >
                    <option value="">All Types</option>
                    {pFilterOpts.partnerTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <select
                    value={pFilters.roleType || ''}
                    onChange={(e) =>
                      updatePFilter('roleType', e.target.value || undefined)
                    }
                    className="select-field w-auto"
                  >
                    <option value="">All Roles</option>
                    {pFilterOpts.roleTypes.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <select
                    value={pFilters.status || ''}
                    onChange={(e) =>
                      updatePFilter('status', e.target.value || undefined)
                    }
                    className="select-field w-auto"
                  >
                    <option value="">All Statuses</option>
                    {pFilterOpts.statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <select
                    value={pFilters.region || ''}
                    onChange={(e) =>
                      updatePFilter('region', e.target.value || undefined)
                    }
                    className="select-field w-auto"
                  >
                    <option value="">All Regions</option>
                    {pFilterOpts.regions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    Per page:
                    <select
                      value={pPageSize}
                      onChange={(e) => {
                        setPPageSize(Number(e.target.value));
                        setPPage(1);
                      }}
                      className="select-field w-auto"
                      aria-label="Partners per page"
                    >
                      {PAGE_SIZE_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  {pHasActiveFilters && (
                    <button
                      className="btn-ghost text-red-500 hover:text-red-700"
                      onClick={clearPFilters}
                    >
                      <X className="h-4 w-4" /> Clear Filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {pLoading && (
              <p className="py-12 text-center text-sm text-gray-500">
                Loading partners...
              </p>
            )}
            {pError && (
              <p className="py-12 text-center text-sm text-red-500">
                Error: {pError}
              </p>
            )}
            {!pLoading && !pError && pList.length === 0 && (
              <p className="py-12 text-center text-sm text-gray-500">
                No partners found.
              </p>
            )}
            {pList.length > 0 && (
              <>
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-md">
                  <table className="table-base">
                    <thead>
                      <tr>
                        {partnerColumns.map((col) => (
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
                      {pList.map((p) => (
                        <tr
                          key={p.partnerId}
                          onClick={() =>
                            navigate(
                              `/safehouse-management/partners/${p.partnerId}`
                            )
                          }
                          className="cursor-pointer"
                        >
                          {partnerColumns.map((col) => (
                            <td key={col.key}>{formatCell(p[col.key])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <button
                    className="btn-secondary"
                    disabled={pPage <= 1}
                    onClick={() => setPPage(pPage - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </button>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Page {pPage} of {pTotalPages} ({pTotalCount} total)
                  </span>
                  <button
                    className="btn-secondary"
                    disabled={pPage >= pTotalPages}
                    onClick={() => setPPage(pPage + 1)}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Safehouse detail modal */}
      {selectedSh && (
        <DetailModal
          title={selectedSh.name}
          subtitle={`${selectedSh.safehouseCode} · ${selectedSh.region} · ${selectedSh.city}`}
          onClose={() => setSelectedSh(null)}
          content={
            <SafehouseModalContent
              safehouse={selectedSh}
              data={modalData}
              loading={modalLoading}
              navigate={navigate}
            />
          }
        />
      )}

      {/* Create Safehouse Modal */}
      {renderCreateModal<Safehouse>(
        shCreating,
        () => {
          setShCreating(false);
          setShCreateData({ ...blankSafehouse });
        },
        'Safehouse',
        safehouseModalSections,
        shCreateData,
        (key, val) => setShCreateData((prev) => ({ ...prev, [key]: val })),
        handleShCreate,
        shSaving,
        safehouseSelectFields,
        safehouseDateFields,
        safehouseIntFields,
        safehouseTextareaFields
      )}

      {/* Create Partner Modal */}
      {renderCreateModal<Partner>(
        pCreating,
        () => {
          setPCreating(false);
          setPCreateData({ ...blankPartner });
        },
        'Partner',
        partnerModalSections,
        pCreateData,
        (key, val) => setPCreateData((prev) => ({ ...prev, [key]: val })),
        handlePCreate,
        pSaving,
        partnerSelectFields,
        partnerDateFields,
        [] as (keyof Partner)[],
        partnerTextareaFields
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
