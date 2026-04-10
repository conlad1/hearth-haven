import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);
import {
  Supporter,
  DonorFilterOptions,
  SupporterFilters,
} from '../../types/Donor';
import {
  fetchSupporters,
  fetchDonorFilterOptions,
  fetchDonorAnalytics,
  createSupporter,
} from '../../api/donationManager/DonorAPI';
import type { DonorAnalyticsResponse } from '../../types/Donor';
import {
  Plus,
  Check,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  Building2,
  DollarSign,
  Package,
  HandHelping,
  GraduationCap,
  Share2,
  Mail,
} from 'lucide-react';
import { useAuthSession } from '../../authSession';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const SUPPORTER_TYPES = [
  'MonetaryDonor',
  'InKindDonor',
  'Volunteer',
  'SkillsContributor',
  'SocialMediaAdvocate',
  'PartnerOrganization',
];

// ── Field definitions ──────────────────────────────────────────────────────────

type SFieldDef = { key: keyof Supporter; label: string };

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

const sReadOnly: (keyof Supporter)[] = ['supporterId', 'createdAt'];
const sTextarea: (keyof Supporter)[] = ['notes', 'address'];
const sSelectMap: Partial<Record<keyof Supporter, { opts: string[]; nullable: boolean }>> = {
  supporterType: { opts: SUPPORTER_TYPES, nullable: false },
  status: { opts: ['Active', 'Inactive'], nullable: false },
};

const supporterRequired: { key: keyof Supporter; label: string }[] = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'supporterType', label: 'Supporter Type' },
  { key: 'status', label: 'Status' },
];

const blankSupporter: Supporter = {
  supporterId: 0,
  supporterType: 'MonetaryDonor',
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

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '--';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function SupporterIcon({ type }: { type: string }) {
  switch (type) {
    case 'MonetaryDonor': return <DollarSign className="h-4 w-4 shrink-0 text-green-600" />;
    case 'InKindDonor': return <Package className="h-4 w-4 shrink-0 text-blue-600" />;
    case 'Volunteer': return <HandHelping className="h-4 w-4 shrink-0 text-purple-600" />;
    case 'SkillsContributor': return <GraduationCap className="h-4 w-4 shrink-0 text-amber-600" />;
    case 'SocialMediaAdvocate': return <Share2 className="h-4 w-4 shrink-0 text-pink-600" />;
    case 'PartnerOrganization': return <Building2 className="h-4 w-4 shrink-0 text-indigo-600" />;
    default: return <Users className="h-4 w-4 shrink-0 text-gray-500" />;
  }
}

function badgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'active') return 'badge bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400';
  if (s === 'inactive') return 'badge bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
  return 'badge bg-gray-100 text-gray-600';
}

function fmtMoney(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function DonorPage() {
  const { isAuthenticated, sessionReady } = useAuthSession();
  const location = useLocation();
  const navigate = useNavigate();

  const locationState = location.state as { supporterId?: number } | null;

  // ── Stats ──────────────────────────────────────────────────────────────────
  const [analytics, setAnalytics] = useState<DonorAnalyticsResponse | null>(null);

  // ── Supporters list ────────────────────────────────────────────────────────
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [filterOptions, setFilterOptions] = useState<DonorFilterOptions | null>(null);
  const [supporterFilters, setSupporterFilters] = useState<SupporterFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Supporter CRUD ─────────────────────────────────────────────────────────
  const [isAddingSup, setIsAddingSup] = useState(false);
  const [newSupData, setNewSupData] = useState<Supporter>({ ...blankSupporter });
  const [saving, setSaving] = useState(false);

  // ── Load stats on mount ────────────────────────────────────────────────────
  useEffect(() => {
    fetchDonorAnalytics().then(setAnalytics).catch(() => {});
    fetchDonorFilterOptions().then(setFilterOptions).catch(() => {});
  }, []);

  // ── Navigate from location state ──────────────────────────────────────────
  useEffect(() => {
    if (!locationState?.supporterId || !sessionReady || !isAuthenticated) return;
    navigate(`/donors/${locationState.supporterId}`, { replace: true });
  }, [locationState?.supporterId, sessionReady, isAuthenticated]);

  // ── Debounce search ────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setSupporterFilters((p) => ({ ...p, search: debouncedSearch || undefined }));
    setPage(1);
  }, [debouncedSearch]);

  // ── Load supporters ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionReady || !isAuthenticated) return;
    setLoading(true);
    setError(null);
    fetchSupporters(page, pageSize, supporterFilters)
      .then((res) => {
        setSupporters(res.data);
        setTotalPages(res.totalPages);
        setTotalCount(res.totalCount);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, pageSize, supporterFilters, isAuthenticated, sessionReady]);

  // ── Filter helpers ─────────────────────────────────────────────────────────
  const ANONYMOUS_SUPPORTER_ID = 62;

  const activeSupporterType =
    supporterFilters.supporterId === ANONYMOUS_SUPPORTER_ID
      ? 'Anonymous'
      : supporterFilters.supporterType;

  const setSupporterTypeFilter = (t: string | undefined) => {
    if (t === 'Anonymous') {
      setSupporterFilters((p) => ({ ...p, supporterId: ANONYMOUS_SUPPORTER_ID, supporterType: undefined }));
    } else if (t) {
      setSupporterFilters((p) => ({ ...p, supporterType: t, supporterId: undefined }));
    } else {
      setSupporterFilters((p) => {
        const { supporterType: _t, supporterId: _id, ...rest } = p;
        void _t; void _id;
        return rest;
      });
    }
    setPage(1);
  };

  const clearFilters = () => {
    setSupporterFilters({});
    setSearchInput('');
    setDebouncedSearch('');
    setPage(1);
  };

  const hasFilters = !!(
    supporterFilters.status || supporterFilters.supporterType ||
    supporterFilters.supporterId || supporterFilters.search
  );

  const handleCreateSupporter = async () => {
    const missing = supporterRequired.filter((f) => !newSupData[f.key]);
    if (missing.length) {
      alert(`Fill in required fields:\n${missing.map((f) => f.label).join(', ')}`);
      return;
    }
    setSaving(true);
    try {
      await createSupporter(newSupData);
      setIsAddingSup(false);
      setSupporterFilters((p) => ({ ...p }));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  // ── Input renderer ─────────────────────────────────────────────────────────
  const renderSupporterInput = (
    col: SFieldDef,
    data: Supporter,
    onChange: (k: keyof Supporter, v: unknown) => void,
    isCreate = false
  ) => {
    const value = data[col.key];
    if (sReadOnly.includes(col.key)) {
      return (
        <span className="text-sm italic text-gray-500 dark:text-gray-400">
          {isCreate ? 'Auto-generated' : formatCell(value)}
        </span>
      );
    }
    const sel = sSelectMap[col.key];
    if (sel) {
      return (
        <select
          className="select-field"
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(col.key, e.target.value || null)}
        >
          {sel.nullable && <option value="">-- None --</option>}
          {sel.opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (sTextarea.includes(col.key)) {
      return (
        <textarea
          className="input-field"
          rows={3}
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(col.key, e.target.value || null)}
        />
      );
    }
    return (
      <input
        className="input-field"
        type="text"
        value={value === null || value === undefined ? '' : String(value)}
        onChange={(e) => onChange(col.key, e.target.value || null)}
      />
    );
  };

  // ── Derived stats ──────────────────────────────────────────────────────────
  const summary = analytics?.summary;
  const typeBreakdown = analytics?.supporterTypeBreakdown ?? [];

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-md dark:border-gray-700 dark:bg-gray-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <X className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Staff Access Only</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            This section is restricted to authenticated staff.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Supporters &amp; Contributions</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage supporter profiles and track contribution activity.
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setNewSupData({ ...blankSupporter }); setIsAddingSup(true); }}>
          <Plus className="h-4 w-4" /> Add Supporter
        </button>
      </div>

      {/* Stats + type breakdown */}
      {(summary || typeBreakdown.length > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Left: 2x2 stat cards */}
          {summary && (
            <div className="grid grid-cols-2 gap-4">
              <div className="card flex flex-col items-center justify-center text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Supporters</p>
                <p className="mt-2 text-4xl font-bold text-gray-900 dark:text-white">{summary.totalSupporters.toLocaleString()}</p>
              </div>
              <div className="card flex flex-col items-center justify-center text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Active</p>
                <p className="mt-2 text-4xl font-bold text-green-600 dark:text-green-400">{summary.activeSupporters.toLocaleString()}</p>
              </div>
              <div className="card flex flex-col items-center justify-center text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Donations</p>
                <p className="mt-2 text-4xl font-bold text-gray-900 dark:text-white">{summary.totalDonations.toLocaleString()}</p>
              </div>
              <div className="card flex flex-col items-center justify-center text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Donation Value</p>
                <p className="mt-2 text-4xl font-bold text-gray-900 dark:text-white">${fmtMoney(summary.totalDonationValue)}</p>
              </div>
            </div>
          )}

          {/* Right: Supporter Breakdown donut chart */}
          {typeBreakdown.length > 0 && (
            <div className="card flex flex-col items-center">
              <p className="mb-4 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Supporter Breakdown</p>
              <div className="flex flex-1 items-center justify-center gap-6">
                <div className="w-48 shrink-0">
                  <Doughnut
                    data={{
                      labels: typeBreakdown.map((b) => b.supporterType),
                      datasets: [{
                        data: typeBreakdown.map((b) => b.supporterCount),
                        backgroundColor: [
                          '#16a34a', // MonetaryDonor - green
                          '#2563eb', // InKindDonor - blue
                          '#9333ea', // Volunteer - purple
                          '#d97706', // SkillsContributor - amber
                          '#db2777', // SocialMediaAdvocate - pink
                          '#4f46e5', // PartnerOrganization - indigo
                        ],
                        borderWidth: 2,
                        borderColor: 'transparent',
                      }],
                    }}
                    options={{
                      responsive: true,
                      cutout: '62%',
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (ctx) => {
                              const b = typeBreakdown[ctx.dataIndex];
                              return ` ${b.supporterCount} total (${b.activeCount} active)`;
                            },
                          },
                        },
                      },
                    }}
                  />
                </div>
                <ul className="flex flex-col gap-2 text-sm">
                  {typeBreakdown.map((b, i) => (
                    <li key={b.supporterType} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: ['#16a34a','#2563eb','#9333ea','#d97706','#db2777','#4f46e5'][i] }} />
                      <span className="text-gray-700 dark:text-gray-300">{b.supporterType}</span>
                      <span className="ml-auto pl-3 tabular-nums text-gray-500 dark:text-gray-400">{b.supporterCount}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="input-field pl-9"
            type="text"
            placeholder="Search by name, email, organization..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <select
          className="select-field w-auto"
          value={activeSupporterType || ''}
          onChange={(e) => setSupporterTypeFilter(e.target.value || undefined)}
        >
          <option value="">All Types</option>
          <option value="Anonymous">Anonymous</option>
          {(filterOptions?.supporterTypes ?? SUPPORTER_TYPES).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {filterOptions && (
          <select
            className="select-field w-auto"
            value={supporterFilters.status || ''}
            onChange={(e) => {
              const val = e.target.value || undefined;
              setSupporterFilters((p) => {
                const n = { ...p };
                if (val) n.status = val; else delete n.status;
                return n;
              });
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            {filterOptions.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          Per page:
          <select
            className="select-field w-auto"
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          >
            {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        {hasFilters && (
          <button className="btn-ghost text-orange-600" onClick={clearFilters}>
            <X className="h-4 w-4" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading && <p className="py-10 text-center text-sm text-gray-500">Loading...</p>}
      {error && <p className="py-10 text-center text-sm text-red-500">Error: {error}</p>}

      {!loading && !error && supporters.length === 0 && (
        <p className="py-10 text-center text-sm text-gray-500">No supporters found.</p>
      )}

      {!loading && !error && supporters.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <table className="table-base">
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
                {supporters.map((s) => {
                  return (
                    <tr
                      key={s.supporterId}
                      className="cursor-pointer"
                      onClick={() => navigate(`/donors/${s.supporterId}`)}
                    >
                      <td>{s.supporterId}</td>
                      <td className="font-medium text-gray-900 dark:text-white">
                        {s.firstName} {s.lastName}
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1.5">
                          <SupporterIcon type={s.supporterType} />
                          {s.supporterType}
                        </span>
                      </td>
                      <td>
                        <span className={badgeClass(s.status)}>{s.status}</span>
                      </td>
                      <td>
                        {s.email ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">{s.email}</span>
                            <a
                              href={`mailto:${s.email}`}
                              className="flex-shrink-0 rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-orange-500 dark:hover:bg-gray-800"
                              onClick={(e) => e.stopPropagation()}
                              title={`Email ${s.firstName}`}
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        ) : '--'}
                      </td>
                      <td className="text-gray-600 dark:text-gray-400">{formatCell(s.organizationName)}</td>
                      <td className="text-gray-500 dark:text-gray-400">
                        {s.createdAt ? s.createdAt.slice(0, 10) : '--'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {page} of {totalPages} ({totalCount} total)
            </span>
            <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}

      {/* ── ADD SUPPORTER MODAL ────────────────────────────────────────────────── */}
      {isAddingSup && createPortal(
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-supporter-dialog-title"
          onClick={() => setIsAddingSup(false)}
        >
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-start gap-4 border-b border-gray-100 pb-5 dark:border-gray-700">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-500/10">
                <Users className="h-5 w-5 text-orange-500" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="new-supporter-dialog-title" className="text-lg font-bold text-gray-900 dark:text-white">
                  New Supporter
                </h2>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Add a new supporter profile</p>
              </div>
              <div className="ml-4 flex items-center gap-2">
                <button
                  className="inline-flex items-center justify-center rounded-lg bg-orange-500 p-2 text-white transition hover:bg-orange-600 disabled:opacity-50"
                  onClick={handleCreateSupporter}
                  disabled={saving}
                  title="Create"
                >
                  {saving ? <span className="text-xs">Creating…</span> : <Check size={16} />}
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-lg bg-gray-100 p-2 text-gray-600 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  onClick={() => setIsAddingSup(false)}
                  disabled={saving}
                  title="Cancel"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {supporterSections.map((sec) => (
              <div className="mb-6" key={sec.title}>
                <h3 className="mb-3 border-b border-gray-100 pb-2 text-sm font-bold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  {sec.title}
                </h3>
                <div className="grid grid-cols-1 gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-2 dark:bg-white/5">
                  {sec.fields.map((col) => (
                    <div className="flex flex-col gap-1.5" key={col.key}>
                      <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {col.label}
                      </label>
                      {renderSupporterInput(col, newSupData, (k, v) => setNewSupData((p) => ({ ...p, [k]: v })), true)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}


    </div>
  );
}
