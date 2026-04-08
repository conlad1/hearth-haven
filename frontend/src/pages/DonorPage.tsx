import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AuthService } from '../api/AuthService';
import AllocationPage from './AllocationPage';
import {
  Supporter,
  Contribution,
  DonorFilterOptions,
  SupporterFilters,
  ContributionFilters,
} from '../types/Donor';
import {
  fetchSupporters,
  fetchContributions,
  fetchDonorFilterOptions,
  createSupporter,
  updateSupporter,
  deleteSupporter,
  createContribution,
  updateContribution,
  deleteContribution,
} from '../api/DonorAPI';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const SUPPORTER_TYPES = ['Individual', 'Corporate', 'Anonymous'];
const DONATION_TYPES = [
  'Monetary',
  'InKind',
  'Volunteer',
  'Skills',
  'SocialMedia',
];
const FREQUENCY_OPTIONS = ['Once', 'Monthly'];

// ── Field section configs ─────────────────────────────────────────────────────

type SFieldDef = { key: keyof Supporter; label: string };
type CFieldDef = { key: keyof Contribution; label: string };

const supporterSections: { title: string; fields: SFieldDef[] }[] = [
  {
    title: 'Profile',
    fields: [
      { key: 'supporterId', label: 'ID' },
      { key: 'supporterType', label: 'Supporter Type' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Created At' },
    ],
  },
  {
    title: 'Contact Details',
    fields: [
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'organizationName', label: 'Organization' },
      { key: 'address', label: 'Address' },
    ],
  },
  {
    title: 'Notes',
    fields: [{ key: 'notes', label: 'Notes' }],
  },
];

const contributionSections: { title: string; fields: CFieldDef[] }[] = [
  {
    title: 'Contribution Info',
    fields: [
      { key: 'donationId', label: 'ID' },
      { key: 'supporterId', label: 'Supporter ID' },
      { key: 'donationType', label: 'Type' },
      { key: 'donationDate', label: 'Date' },
      { key: 'status', label: 'Status' },
      { key: 'isRecurring', label: 'Recurring' },
    ],
  },
  {
    title: 'Amount & Payment',
    fields: [
      { key: 'amount', label: 'Amount' },
      { key: 'currencyCode', label: 'Currency' },
      { key: 'frequency', label: 'Frequency' },
      { key: 'channelSource', label: 'Payment Channel' },
      { key: 'estimatedValue', label: 'Est. Value' },
    ],
  },
  {
    title: 'Allocation',
    fields: [
      { key: 'safehouseAllocation', label: 'Safehouse' },
      { key: 'programArea', label: 'Program Area' },
      { key: 'description', label: 'Description' },
    ],
  },
  {
    title: 'Notes',
    fields: [
      { key: 'notes', label: 'Notes' },
      { key: 'createdAt', label: 'Created At' },
    ],
  },
];

// ── Field type sets ───────────────────────────────────────────────────────────

const sReadOnly: (keyof Supporter)[] = ['supporterId', 'createdAt'];
const sTextarea: (keyof Supporter)[] = ['notes', 'address'];
const sSelectMap: Partial<
  Record<keyof Supporter, { opts: string[]; nullable: boolean }>
> = {
  supporterType: { opts: SUPPORTER_TYPES, nullable: false },
  status: { opts: ['Active', 'Inactive'], nullable: false },
};

const cReadOnly: (keyof Contribution)[] = [
  'donationId',
  'createdAt',
  'supporterName',
];
const cBoolean: (keyof Contribution)[] = ['isRecurring'];
const cDate: (keyof Contribution)[] = ['donationDate'];
const cNumber: (keyof Contribution)[] = [
  'amount',
  'estimatedValue',
  'supporterId',
];
const cTextarea: (keyof Contribution)[] = ['description', 'notes'];
const cSelectMap: Partial<
  Record<keyof Contribution, { opts: string[]; nullable: boolean }>
> = {
  donationType: { opts: DONATION_TYPES, nullable: false },
  status: { opts: ['Pending', 'Confirmed', 'Cancelled'], nullable: false },
  channelSource: {
    opts: ['Card', 'PayPal', 'Bank Transfer', 'Cash'],
    nullable: true,
  },
  frequency: { opts: FREQUENCY_OPTIONS, nullable: true },
  programArea: {
    opts: ['General', 'Safe Haven', 'Education', 'Healthcare'],
    nullable: true,
  },
  safehouseAllocation: {
    opts: ['Manila', 'Quezon City', 'Davao'],
    nullable: true,
  },
};

// ── Blank templates ───────────────────────────────────────────────────────────

const blankSupporter: Supporter = {
  supporterId: 0,
  supporterType: 'Individual',
  status: 'Active',
  firstName: '',
  lastName: '',
  email: '',
  phone: null,
  organizationName: null,
  address: null,
  notes: null,
  createdAt: '',
};

const blankContribution: Contribution = {
  donationId: 0,
  supporterId: 0,
  supporterName: '',
  donationType: 'Monetary',
  amount: null,
  currencyCode: 'PHP',
  isRecurring: false,
  frequency: 'Once',
  channelSource: null,
  description: null,
  estimatedValue: null,
  donationDate: new Date().toISOString().slice(0, 10),
  safehouseAllocation: null,
  programArea: null,
  status: 'Pending',
  notes: null,
  createdAt: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function formatAmount(amount: number | null): string {
  if (amount === null || amount === undefined) return '—';
  return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

function typeIcon(type: string): string {
  switch (type) {
    case 'Monetary':
      return '💰';
    case 'InKind':
      return '📦';
    case 'Volunteer':
      return '🤝';
    case 'Skills':
      return '💡';
    case 'SocialMedia':
      return '📱';
    default:
      return '🎁';
  }
}

function supporterIcon(type: string): string {
  return type === 'Corporate' ? '🏢' : type === 'Anonymous' ? '🕊️' : '👤';
}

function badgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'confirmed')
    return 'donor-badge donor-badge-green';
  if (s === 'inactive' || s === 'cancelled')
    return 'donor-badge donor-badge-gray';
  if (s === 'pending') return 'donor-badge donor-badge-orange';
  return 'donor-badge';
}

// ── Supporter required fields ─────────────────────────────────────────────────

const supporterRequired: { key: keyof Supporter; label: string }[] = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'supporterType', label: 'Supporter Type' },
  { key: 'status', label: 'Status' },
];

const contributionRequired: { key: keyof Contribution; label: string }[] = [
  { key: 'supporterId', label: 'Supporter ID' },
  { key: 'donationType', label: 'Donation Type' },
  { key: 'donationDate', label: 'Date' },
  { key: 'status', label: 'Status' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function DonorPage() {
  const isLoggedIn = AuthService.isAuthenticated();

  const [activeTab, setActiveTab] = useState<
    'supporters' | 'contributions' | 'allocations'
  >('supporters');

  // shared
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [filterOptions, setFilterOptions] = useState<DonorFilterOptions | null>(
    null
  );
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // supporters
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [supporterFilters, setSupporterFilters] = useState<SupporterFilters>(
    {}
  );
  const [selectedSupporter, setSelectedSupporter] = useState<Supporter | null>(
    null
  );
  const [editSupData, setEditSupData] = useState<Supporter | null>(null);
  const [isEditingSup, setIsEditingSup] = useState(false);
  const [isAddingSup, setIsAddingSup] = useState(false);
  const [newSupData, setNewSupData] = useState<Supporter>({
    ...blankSupporter,
  });

  // contributions
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [contributionFilters, setContributionFilters] =
    useState<ContributionFilters>({});
  const [selectedContribution, setSelectedContribution] =
    useState<Contribution | null>(null);
  const [editConData, setEditConData] = useState<Contribution | null>(null);
  const [isEditingCon, setIsEditingCon] = useState(false);
  const [isAddingCon, setIsAddingCon] = useState(false);
  const [newConData, setNewConData] = useState<Contribution>({
    ...blankContribution,
  });

  // ── Debounce search ─────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (activeTab === 'supporters') {
      setSupporterFilters((p) => ({
        ...p,
        search: debouncedSearch || undefined,
      }));
    } else {
      setContributionFilters((p) => ({
        ...p,
        search: debouncedSearch || undefined,
      }));
    }
    setPage(1);
  }, [debouncedSearch, activeTab]);

  // ── Load filter options once ─────────────────────────────────────────────
  useEffect(() => {
    fetchDonorFilterOptions()
      .then(setFilterOptions)
      .catch((e) => console.error('Error loading filter options:', e));
  }, []);

  // ── Load data when tab / page / filters change ───────────────────────────
  const loadData = () => {
    if (!isLoggedIn) return;
    setLoading(true);
    setError(null);
    if (activeTab === 'supporters') {
      fetchSupporters(page, pageSize, supporterFilters)
        .then((res) => {
          setSupporters(res.data);
          setTotalPages(res.totalPages);
          setTotalCount(res.totalCount);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else {
      fetchContributions(page, pageSize, contributionFilters)
        .then((res) => {
          setContributions(res.data);
          setTotalPages(res.totalPages);
          setTotalCount(res.totalCount);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    loadData();
  }, [
    activeTab,
    page,
    pageSize,
    supporterFilters,
    contributionFilters,
    isLoggedIn,
  ]);

  // ── Tab switch resets ────────────────────────────────────────────────────
  const switchTab = (tab: 'supporters' | 'contributions' | 'allocations') => {
    setActiveTab(tab);
    setPage(1);
    setSearchInput('');
    setDebouncedSearch('');
  };

  // ── Supporter filter helpers ─────────────────────────────────────────────
  const updateSupporterFilter = (
    key: keyof SupporterFilters,
    value: string | undefined
  ) => {
    setSupporterFilters((p) => {
      const n = { ...p };
      if (value) (n as Record<string, unknown>)[key] = value;
      else delete (n as Record<string, unknown>)[key];
      return n;
    });
    setPage(1);
  };
  const clearSupporterFilters = () => {
    setSupporterFilters({});
    setSearchInput('');
    setDebouncedSearch('');
    setPage(1);
  };
  const hasSupporterFilters = !!(
    supporterFilters.status || supporterFilters.search
  );

  // ── Contribution filter helpers ──────────────────────────────────────────
  const updateContributionFilter = (
    key: keyof ContributionFilters,
    value: string | undefined
  ) => {
    setContributionFilters((p) => {
      const n = { ...p };
      if (value) (n as Record<string, unknown>)[key] = value;
      else delete (n as Record<string, unknown>)[key];
      return n;
    });
    setPage(1);
  };
  const clearContributionFilters = () => {
    setContributionFilters({});
    setSearchInput('');
    setDebouncedSearch('');
    setPage(1);
  };
  const hasContributionFilters = !!(
    contributionFilters.status ||
    contributionFilters.programArea ||
    contributionFilters.safehouseAllocation ||
    contributionFilters.search
  );

  // ── Supporter modal handlers ─────────────────────────────────────────────
  const openSupporter = (s: Supporter) => {
    setSelectedSupporter(s);
    setEditSupData({ ...s });
    setIsEditingSup(false);
  };
  const closeSupporter = () => {
    setSelectedSupporter(null);
    setEditSupData(null);
    setIsEditingSup(false);
  };
  const handleSaveSupporter = async () => {
    if (!editSupData) return;
    setSaving(true);
    try {
      const updated = await updateSupporter(
        editSupData.supporterId,
        editSupData
      );
      setSelectedSupporter(updated);
      setEditSupData({ ...updated });
      setIsEditingSup(false);
      loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };
  const handleDeleteSupporter = async () => {
    if (!selectedSupporter || !window.confirm('Delete this supporter profile?'))
      return;
    setSaving(true);
    try {
      await deleteSupporter(selectedSupporter.supporterId);
      closeSupporter();
      loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };
  const openAddSupporter = () => {
    setNewSupData({ ...blankSupporter });
    setIsAddingSup(true);
  };
  const closeAddSupporter = () => setIsAddingSup(false);
  const handleCreateSupporter = async () => {
    const missing = supporterRequired.filter((f) => !newSupData[f.key]);
    if (missing.length) {
      alert(
        `Fill in required fields:\n${missing.map((f) => f.label).join(', ')}`
      );
      return;
    }
    setSaving(true);
    try {
      await createSupporter(newSupData);
      closeAddSupporter();
      loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  // ── Contribution modal handlers ──────────────────────────────────────────
  const openContribution = (c: Contribution) => {
    setSelectedContribution(c);
    setEditConData({ ...c });
    setIsEditingCon(false);
  };
  const closeContribution = () => {
    setSelectedContribution(null);
    setEditConData(null);
    setIsEditingCon(false);
  };
  const handleSaveContribution = async () => {
    if (!editConData) return;
    setSaving(true);
    try {
      const updated = await updateContribution(
        editConData.donationId,
        editConData
      );
      setSelectedContribution(updated);
      setEditConData({ ...updated });
      setIsEditingCon(false);
      loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };
  const handleDeleteContribution = async () => {
    if (
      !selectedContribution ||
      !window.confirm('Delete this contribution record?')
    )
      return;
    setSaving(true);
    try {
      await deleteContribution(selectedContribution.donationId);
      closeContribution();
      loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };
  const openAddContribution = () => {
    setNewConData({
      ...blankContribution,
      donationDate: new Date().toISOString().slice(0, 10),
    });
    setIsAddingCon(true);
  };
  const closeAddContribution = () => setIsAddingCon(false);
  const handleCreateContribution = async () => {
    const missing = contributionRequired.filter((f) => {
      const v = newConData[f.key];
      return v === null || v === undefined || v === '' || v === 0;
    });
    if (missing.length) {
      alert(
        `Fill in required fields:\n${missing.map((f) => f.label).join(', ')}`
      );
      return;
    }
    setSaving(true);
    try {
      await createContribution(newConData);
      closeAddContribution();
      loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  // ── Input renderers ──────────────────────────────────────────────────────

  const renderSupporterInput = (
    col: SFieldDef,
    data: Supporter,
    onChange: (k: keyof Supporter, v: unknown) => void,
    isCreate = false
  ) => {
    const value = data[col.key];
    if (sReadOnly.includes(col.key)) {
      return (
        <span className="resident-modal-field-value">
          {isCreate ? 'Auto-generated' : formatCell(value)}
        </span>
      );
    }
    const sel = sSelectMap[col.key];
    if (sel) {
      return (
        <select
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(col.key, e.target.value || null)}
        >
          {sel.nullable && <option value="">— None —</option>}
          {sel.opts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }
    if (sTextarea.includes(col.key)) {
      return (
        <textarea
          rows={3}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(col.key, e.target.value || null)}
        />
      );
    }
    return (
      <input
        type="text"
        value={value === null || value === undefined ? '' : String(value)}
        onChange={(e) => onChange(col.key, e.target.value || null)}
      />
    );
  };

  const renderContributionInput = (
    col: CFieldDef,
    data: Contribution,
    onChange: (k: keyof Contribution, v: unknown) => void,
    isCreate = false
  ) => {
    const value = data[col.key];
    if (cReadOnly.includes(col.key)) {
      return (
        <span className="resident-modal-field-value">
          {isCreate ? 'Auto-generated' : formatCell(value)}
        </span>
      );
    }
    if (cBoolean.includes(col.key)) {
      return (
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(col.key, e.target.checked)}
        />
      );
    }
    if (cDate.includes(col.key)) {
      return (
        <input
          type="date"
          value={
            value === null || value === undefined
              ? ''
              : String(value).slice(0, 10)
          }
          onChange={(e) => onChange(col.key, e.target.value || null)}
        />
      );
    }
    const sel = cSelectMap[col.key];
    if (sel) {
      return (
        <select
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(col.key, e.target.value || null)}
        >
          {sel.nullable && <option value="">— None —</option>}
          {!sel.nullable && !value && <option value="">— Select —</option>}
          {sel.opts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }
    if (cNumber.includes(col.key)) {
      return (
        <input
          type="number"
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) =>
            onChange(col.key, e.target.value ? Number(e.target.value) : null)
          }
        />
      );
    }
    if (cTextarea.includes(col.key)) {
      return (
        <textarea
          rows={3}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(col.key, e.target.value || null)}
        />
      );
    }
    return (
      <input
        type="text"
        value={value === null || value === undefined ? '' : String(value)}
        onChange={(e) => onChange(col.key, e.target.value || null)}
      />
    );
  };

  // ── Sidebar active type ──────────────────────────────────────────────────
  const activeSupporterType = supporterFilters.supporterType;
  const activeDonationType = contributionFilters.donationType;

  // ── Access denied ────────────────────────────────────────────────────────
  const accessDeniedScreen = (
    <div className="donor-access-denied">
      <div className="donor-access-denied-card">
        <div className="donor-access-denied-icon">🔒</div>
        <h2>Staff Access Only</h2>
        <p>
          This section is restricted to authenticated staff and administrators.
        </p>
        <p className="donor-access-denied-sub">
          Please log in to access the Donors &amp; Contributions portal.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {!isLoggedIn ? (
        accessDeniedScreen
      ) : (
        <div className="case-layout">
          {/* ── SIDEBAR ───────────────────────────────────────────────────── */}
          <aside className="case-sidebar">
            <h2>
              {activeTab === 'supporters' ? 'Supporter Type' : 'Donation Type'}
            </h2>
            <ul>
              {activeTab === 'supporters' ? (
                <>
                  <li>
                    <button
                      className={!activeSupporterType ? 'active' : ''}
                      onClick={() =>
                        updateSupporterFilter('supporterType', undefined)
                      }
                    >
                      All Types
                    </button>
                  </li>
                  {SUPPORTER_TYPES.map((t) => (
                    <li key={t}>
                      <button
                        className={activeSupporterType === t ? 'active' : ''}
                        onClick={() =>
                          updateSupporterFilter('supporterType', t)
                        }
                      >
                        {supporterIcon(t)} {t}
                      </button>
                    </li>
                  ))}
                </>
              ) : (
                <>
                  <li>
                    <button
                      className={!activeDonationType ? 'active' : ''}
                      onClick={() =>
                        updateContributionFilter('donationType', undefined)
                      }
                    >
                      All Types
                    </button>
                  </li>
                  {DONATION_TYPES.map((t) => (
                    <li key={t}>
                      <button
                        className={activeDonationType === t ? 'active' : ''}
                        onClick={() =>
                          updateContributionFilter('donationType', t)
                        }
                      >
                        {typeIcon(t)} {t}
                      </button>
                    </li>
                  ))}
                </>
              )}
            </ul>
          </aside>

          {/* ── MAIN ──────────────────────────────────────────────────────── */}
          <div className="case-page">
            {/* Header */}
            <div className="case-header">
              <h1>
                {activeTab === 'supporters'
                  ? 'Supporter Profiles'
                  : 'Contribution Activity'}
              </h1>
              <div className="case-controls">
                {/* Tab toggle */}
                <div className="donor-tab-toggle">
                  <button
                    className={activeTab === 'supporters' ? 'active' : ''}
                    onClick={() => switchTab('supporters')}
                  >
                    👥 Supporters
                  </button>
                  <button
                    className={activeTab === 'contributions' ? 'active' : ''}
                    onClick={() => switchTab('contributions')}
                  >
                    🎁 Contributions
                  </button>
                  <button
                    className={activeTab === 'allocations' ? 'active' : ''}
                    onClick={() => switchTab('allocations')}
                  >
                    📊 Allocations
                  </button>
                </div>

                {/* Action button */}
                {activeTab === 'supporters' ? (
                  <button
                    className="resident-modal-btn resident-modal-btn-edit"
                    onClick={openAddSupporter}
                  >
                    + Add Supporter
                  </button>
                ) : (
                  <button
                    className="resident-modal-btn resident-modal-btn-edit"
                    onClick={openAddContribution}
                  >
                    + Record Contribution
                  </button>
                )}

                {/* Page size */}
                <label>
                  Per page:
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    {PAGE_SIZE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {/* Filter bar */}
            <div className="case-filter-bar">
              <div className="case-search">
                <input
                  type="text"
                  placeholder={
                    activeTab === 'supporters'
                      ? 'Search by name, email, organization...'
                      : 'Search by supporter, type, description...'
                  }
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>

              {filterOptions && activeTab === 'supporters' && (
                <div className="case-filters">
                  <select
                    value={supporterFilters.status || ''}
                    onChange={(e) =>
                      updateSupporterFilter(
                        'status',
                        e.target.value || undefined
                      )
                    }
                  >
                    <option value="">All Statuses</option>
                    {filterOptions.statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {hasSupporterFilters && (
                    <button
                      className="case-clear-filters"
                      onClick={clearSupporterFilters}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              )}

              {filterOptions && activeTab === 'contributions' && (
                <div className="case-filters">
                  <select
                    value={contributionFilters.status || ''}
                    onChange={(e) =>
                      updateContributionFilter(
                        'status',
                        e.target.value || undefined
                      )
                    }
                  >
                    <option value="">All Statuses</option>
                    {filterOptions.contributionStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <select
                    value={contributionFilters.programArea || ''}
                    onChange={(e) =>
                      updateContributionFilter(
                        'programArea',
                        e.target.value || undefined
                      )
                    }
                  >
                    <option value="">All Program Areas</option>
                    {filterOptions.programAreas.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <select
                    value={contributionFilters.safehouseAllocation || ''}
                    onChange={(e) =>
                      updateContributionFilter(
                        'safehouseAllocation',
                        e.target.value || undefined
                      )
                    }
                  >
                    <option value="">All Safehouses</option>
                    {filterOptions.safehouseAllocations.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                  {hasContributionFilters && (
                    <button
                      className="case-clear-filters"
                      onClick={clearContributionFilters}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {loading && <p className="case-status">Loading...</p>}
            {error && <p className="case-status case-error">Error: {error}</p>}

            {/* ── SUPPORTERS TABLE ───────────────────────────────────────── */}
            {activeTab === 'supporters' && !loading && !error && (
              <>
                {supporters.length === 0 ? (
                  <p className="case-status">No supporters found.</p>
                ) : (
                  <div className="case-table-wrap">
                    <table className="case-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Email</th>
                          <th>Organization</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supporters.map((s) => (
                          <tr
                            key={s.supporterId}
                            className="case-row-clickable"
                            onClick={() => openSupporter(s)}
                          >
                            <td>{s.supporterId}</td>
                            <td>
                              {s.firstName} {s.lastName}
                            </td>
                            <td>
                              {supporterIcon(s.supporterType)} {s.supporterType}
                            </td>
                            <td>
                              <span className={badgeClass(s.status)}>
                                {s.status}
                              </span>
                            </td>
                            <td>{s.email}</td>
                            <td>{formatCell(s.organizationName)}</td>
                            <td>
                              {s.createdAt ? s.createdAt.slice(0, 10) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* ── CONTRIBUTIONS TABLE ────────────────────────────────────── */}
            {activeTab === 'contributions' && !loading && !error && (
              <>
                {contributions.length === 0 ? (
                  <p className="case-status">No contributions found.</p>
                ) : (
                  <div className="case-table-wrap">
                    <table className="case-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Date</th>
                          <th>Supporter</th>
                          <th>Type</th>
                          <th>Amount / Value</th>
                          <th>Program Area</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contributions.map((c) => (
                          <tr
                            key={c.donationId}
                            className="case-row-clickable"
                            onClick={() => openContribution(c)}
                          >
                            <td>{c.donationId}</td>
                            <td>{c.donationDate}</td>
                            <td>{c.supporterName}</td>
                            <td>
                              {typeIcon(c.donationType)} {c.donationType}
                            </td>
                            <td>
                              {c.donationType === 'Monetary'
                                ? formatAmount(c.amount)
                                : c.estimatedValue
                                  ? `~${formatAmount(c.estimatedValue)}`
                                  : '—'}
                            </td>
                            <td>{formatCell(c.programArea)}</td>
                            <td>
                              <span className={badgeClass(c.status)}>
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* ── ALLOCATIONS TAB ───────────────────────────────────────── */}
            {activeTab === 'allocations' && <AllocationPage />}

            {/* Pagination */}
            {((activeTab === 'supporters' && supporters.length > 0) ||
              (activeTab === 'contributions' && contributions.length > 0)) && (
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
            )}
          </div>
        </div>
      )}

      {/* ── VIEW / EDIT SUPPORTER MODAL ──────────────────────────────────────── */}
      {selectedSupporter &&
        editSupData &&
        createPortal(
          <div className="resident-modal-overlay" onClick={closeSupporter}>
            <div
              className="resident-modal-body"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="resident-modal-top-bar">
                <div className="donor-avatar">
                  {supporterIcon(selectedSupporter.supporterType)}
                </div>
                <div className="resident-modal-profile-info">
                  <h2>
                    {selectedSupporter.firstName} {selectedSupporter.lastName}
                  </h2>
                  <p>
                    {selectedSupporter.supporterType}
                    {selectedSupporter.organizationName
                      ? ` · ${selectedSupporter.organizationName}`
                      : ''}
                    {' · '}
                    <span className={badgeClass(selectedSupporter.status)}>
                      {selectedSupporter.status}
                    </span>
                  </p>
                </div>
                <div className="resident-modal-actions">
                  {isEditingSup ? (
                    <>
                      <button
                        className="resident-modal-btn resident-modal-btn-save"
                        onClick={handleSaveSupporter}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className="resident-modal-btn resident-modal-btn-cancel"
                        onClick={() => {
                          setEditSupData({ ...selectedSupporter });
                          setIsEditingSup(false);
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
                        onClick={() => setIsEditingSup(true)}
                      >
                        Edit
                      </button>
                      <button
                        className="resident-modal-btn resident-modal-btn-delete"
                        onClick={handleDeleteSupporter}
                        disabled={saving}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
                <button
                  className="resident-modal-close"
                  onClick={closeSupporter}
                >
                  &times;
                </button>
              </div>

              {supporterSections.map((sec) => (
                <div className="resident-modal-section" key={sec.title}>
                  <h3 className="resident-modal-section-title">{sec.title}</h3>
                  <div className="resident-modal-fields">
                    {sec.fields.map((col) => (
                      <div className="resident-modal-field" key={col.key}>
                        <label>{col.label}</label>
                        {isEditingSup ? (
                          renderSupporterInput(col, editSupData, (k, v) =>
                            setEditSupData((p) => ({ ...p!, [k]: v }))
                          )
                        ) : (
                          <span className="resident-modal-field-value">
                            {formatCell(selectedSupporter[col.key])}
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

      {/* ── ADD SUPPORTER MODAL ──────────────────────────────────────────────── */}
      {isAddingSup &&
        createPortal(
          <div className="resident-modal-overlay" onClick={closeAddSupporter}>
            <div
              className="resident-modal-body"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="resident-modal-top-bar">
                <div className="donor-avatar">👤</div>
                <div className="resident-modal-profile-info">
                  <h2>New Supporter</h2>
                  <p>Add a new supporter profile</p>
                </div>
                <div className="resident-modal-actions">
                  <button
                    className="resident-modal-btn resident-modal-btn-save"
                    onClick={handleCreateSupporter}
                    disabled={saving}
                  >
                    {saving ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    className="resident-modal-btn resident-modal-btn-cancel"
                    onClick={closeAddSupporter}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
                <button
                  className="resident-modal-close"
                  onClick={closeAddSupporter}
                >
                  &times;
                </button>
              </div>

              {supporterSections.map((sec) => (
                <div className="resident-modal-section" key={sec.title}>
                  <h3 className="resident-modal-section-title">{sec.title}</h3>
                  <div className="resident-modal-fields">
                    {sec.fields.map((col) => (
                      <div className="resident-modal-field" key={col.key}>
                        <label>{col.label}</label>
                        {renderSupporterInput(
                          col,
                          newSupData,
                          (k, v) => setNewSupData((p) => ({ ...p, [k]: v })),
                          true
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

      {/* ── VIEW / EDIT CONTRIBUTION MODAL ───────────────────────────────────── */}
      {selectedContribution &&
        editConData &&
        createPortal(
          <div className="resident-modal-overlay" onClick={closeContribution}>
            <div
              className="resident-modal-body"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="resident-modal-top-bar">
                <div className="donor-avatar">
                  {typeIcon(selectedContribution.donationType)}
                </div>
                <div className="resident-modal-profile-info">
                  <h2>{selectedContribution.supporterName}</h2>
                  <p>
                    {selectedContribution.donationType} ·{' '}
                    {selectedContribution.donationDate}
                    {' · '}
                    <span className={badgeClass(selectedContribution.status)}>
                      {selectedContribution.status}
                    </span>
                  </p>
                </div>
                <div className="resident-modal-actions">
                  {isEditingCon ? (
                    <>
                      <button
                        className="resident-modal-btn resident-modal-btn-save"
                        onClick={handleSaveContribution}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className="resident-modal-btn resident-modal-btn-cancel"
                        onClick={() => {
                          setEditConData({ ...selectedContribution });
                          setIsEditingCon(false);
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
                        onClick={() => setIsEditingCon(true)}
                      >
                        Edit
                      </button>
                      <button
                        className="resident-modal-btn resident-modal-btn-delete"
                        onClick={handleDeleteContribution}
                        disabled={saving}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
                <button
                  className="resident-modal-close"
                  onClick={closeContribution}
                >
                  &times;
                </button>
              </div>

              {contributionSections.map((sec) => (
                <div className="resident-modal-section" key={sec.title}>
                  <h3 className="resident-modal-section-title">{sec.title}</h3>
                  <div className="resident-modal-fields">
                    {sec.fields.map((col) => (
                      <div className="resident-modal-field" key={col.key}>
                        <label>{col.label}</label>
                        {isEditingCon ? (
                          renderContributionInput(col, editConData, (k, v) =>
                            setEditConData((p) => ({ ...p!, [k]: v }))
                          )
                        ) : (
                          <span className="resident-modal-field-value">
                            {formatCell(selectedContribution[col.key])}
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

      {/* ── ADD CONTRIBUTION MODAL ───────────────────────────────────────────── */}
      {isAddingCon &&
        createPortal(
          <div
            className="resident-modal-overlay"
            onClick={closeAddContribution}
          >
            <div
              className="resident-modal-body"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="resident-modal-top-bar">
                <div className="donor-avatar">🎁</div>
                <div className="resident-modal-profile-info">
                  <h2>Record Contribution</h2>
                  <p>Log a new donation or contribution</p>
                </div>
                <div className="resident-modal-actions">
                  <button
                    className="resident-modal-btn resident-modal-btn-save"
                    onClick={handleCreateContribution}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Record'}
                  </button>
                  <button
                    className="resident-modal-btn resident-modal-btn-cancel"
                    onClick={closeAddContribution}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
                <button
                  className="resident-modal-close"
                  onClick={closeAddContribution}
                >
                  &times;
                </button>
              </div>

              {contributionSections.map((sec) => (
                <div className="resident-modal-section" key={sec.title}>
                  <h3 className="resident-modal-section-title">{sec.title}</h3>
                  <div className="resident-modal-fields">
                    {sec.fields.map((col) => (
                      <div className="resident-modal-field" key={col.key}>
                        <label>{col.label}</label>
                        {renderContributionInput(
                          col,
                          newConData,
                          (k, v) => setNewConData((p) => ({ ...p, [k]: v })),
                          true
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
    </>
  );
}
