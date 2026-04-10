import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Trash2,
  Pencil,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { API_BASE_URL as API } from '../../api/core/config';
import { apiFetch } from '../../api/core/http';
import {
  fetchDonorAllocations,
  fetchCaseManager,
  type DonorAllocationsData,
  type SafehouseOccupancyItem,
} from '../../api/admin/RoleDashboardAPI';

const PROGRAM_AREAS = [
  'Education',
  'Wellbeing',
  'Operations',
  'Transport',
  'Maintenance',
  'Outreach',
];

const PAGE_SIZE_OPTIONS = [20, 50, 100];

interface Allocation {
  allocationId: number;
  donationId: number;
  donationType: string;
  donationAmount: number | null;
  safeHouseId: number;
  safehouseName: string;
  programArea: string;
  amountAllocated: number;
  allocationDate: string;
  notes: string | null;
}

const blankForm = () => ({
  donationId: 0,
  safeHouseId: 0,
  programArea: PROGRAM_AREAS[0],
  amountAllocated: 0,
  allocationDate: new Date().toISOString().slice(0, 10),
  notes: '',
});

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AllocationPage() {
  // ── banner / stats state ──────────────────────────────────────────────────
  const [allocData, setAllocData] = useState<DonorAllocationsData | null>(null);
  const [occupancy, setOccupancy] = useState<SafehouseOccupancyItem[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // ── allocations table state ───────────────────────────────────────────────
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [programAreaFilter, setProgramAreaFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // ── inline create form state ──────────────────────────────────────────────
  const [createForm, setCreateForm] = useState(blankForm());
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // ── edit/view modal state ─────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Allocation | null>(null);
  const [editForm, setEditForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── load banner / options ─────────────────────────────────────────────────
  useEffect(() => {
    setStatsLoading(true);
    Promise.all([fetchDonorAllocations(), fetchCaseManager()])
      .then(([ad, cm]) => {
        setAllocData(ad);
        setOccupancy(cm.safehouseOccupancy);
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  // ── debounce search ───────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, programAreaFilter]);

  // ── load allocations table ────────────────────────────────────────────────
  async function loadAllocations() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (programAreaFilter) params.set('programArea', programAreaFilter);
      const res = await apiFetch(`${API}/Allocation?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setAllocations(json.data);
      setTotalCount(json.totalCount);
      setTotalPages(json.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load allocations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllocations();
  }, [page, pageSize, debouncedSearch, programAreaFilter]);

  // ── inline create ─────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!createForm.donationId) return setCreateError('Select a donation.');
    if (!createForm.safeHouseId) return setCreateError('Select a safehouse.');
    if (createForm.amountAllocated <= 0) return setCreateError('Enter a valid amount.');
    setCreating(true);
    setCreateError(null);
    try {
      const res = await apiFetch(`${API}/Allocation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donation_id: createForm.donationId,
          safehouse_id: createForm.safeHouseId,
          program_area: createForm.programArea,
          amount_allocated: createForm.amountAllocated,
          allocation_date: new Date(createForm.allocationDate).toISOString(),
          notes: createForm.notes || null,
        }),
      });
      if (!res.ok) return setCreateError(await res.text());
      setCreateForm(blankForm());
      // refresh both table and stats
      loadAllocations();
      fetchDonorAllocations().then(setAllocData).catch(() => {});
    } catch {
      setCreateError('Network error.');
    } finally {
      setCreating(false);
    }
  }

  // ── open edit/view modal ──────────────────────────────────────────────────
  function openView(a: Allocation) {
    setEditing(a);
    setEditForm({
      donationId: a.donationId,
      safeHouseId: a.safeHouseId,
      programArea: a.programArea,
      amountAllocated: a.amountAllocated,
      allocationDate: a.allocationDate,
      notes: a.notes ?? '',
    });
    setFormError(null);
    setModalMode('view');
    setModalOpen(true);
  }

  async function handleSave() {
    if (!editForm.safeHouseId) return setFormError('Select a safehouse.');
    if (editForm.amountAllocated <= 0) return setFormError('Enter a valid amount.');
    setSaving(true);
    setFormError(null);
    try {
      const res = await apiFetch(`${API}/Allocation/${editing!.allocationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donation_id: editForm.donationId,
          safehouse_id: editForm.safeHouseId,
          program_area: editForm.programArea,
          amount_allocated: editForm.amountAllocated,
          allocation_date: new Date(editForm.allocationDate).toISOString(),
          notes: editForm.notes || null,
        }),
      });
      if (!res.ok) return setFormError(await res.text());
      setModalOpen(false);
      loadAllocations();
      fetchDonorAllocations().then(setAllocData).catch(() => {});
    } catch {
      setFormError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await apiFetch(`${API}/Allocation/${id}`, { method: 'DELETE' });
      if (!res.ok) { alert(await res.text()); return; }
      setModalOpen(false);
      loadAllocations();
      fetchDonorAllocations().then(setAllocData).catch(() => {});
    } catch {
      alert('Network error.');
    }
  }

  // ── derived ───────────────────────────────────────────────────────────────
  const unallocated = allocData?.unallocated ?? 0;
  const totalReceived = allocData?.totalReceived ?? 0;
  const totalAllocated = allocData?.totalAllocated ?? 0;
  const byProgramArea = allocData?.byProgramArea ?? [];
  const maxProgramArea = Math.max(...byProgramArea.map((b) => b.totalAllocated), 1);
  const unallocatedDonations = allocData?.unallocatedDonations ?? [];
  const safehouses = allocData?.safehouses ?? [];
  const hasFilters = !!(search || programAreaFilter);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Allocation Manager</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Allocate donations to safehouses and program areas.
        </p>
      </div>

      {/* Unallocated funds banner */}
      {!statsLoading && unallocated > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-500/30 dark:bg-orange-500/10">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
          <div>
            <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">
              USD {fmt(unallocated)} unallocated
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-400">
              Use the form below to allocate these funds to a safehouse and program area.
            </p>
          </div>
        </div>
      )}

      {/* KPI row */}
      {!statsLoading && allocData && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Received</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">USD {fmt(totalReceived)}</p>
          </div>
          <div className="card">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Allocated</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">USD {fmt(totalAllocated)}</p>
          </div>
          <div className="card">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Unallocated</p>
            <p className={`mt-1 text-2xl font-bold ${unallocated > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
              USD {fmt(unallocated)}
            </p>
          </div>
        </div>
      )}

      {/* Two-column: stats panel + create form */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: program area + safehouse occupancy */}
        <div className="space-y-4">
          {/* Program area breakdown */}
          {byProgramArea.length > 0 && (
            <div className="card">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Allocation by Program Area</h3>
              <div className="space-y-2.5">
                {byProgramArea.map((b) => (
                  <div key={b.programArea}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-gray-700 dark:text-gray-300">{b.programArea}</span>
                      <span className="font-medium text-gray-900 dark:text-white">USD {fmt(b.totalAllocated)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                      <div
                        className="h-2 rounded-full bg-orange-500"
                        style={{ width: `${(b.totalAllocated / maxProgramArea) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Safehouse occupancy */}
          {occupancy.length > 0 && (
            <div className="card overflow-x-auto">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Safehouse Occupancy</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    <th className="pb-2 pr-3 font-medium">Safehouse</th>
                    <th className="pb-2 pr-3 font-medium">Region</th>
                    <th className="pb-2 pr-3 text-right font-medium">Residents</th>
                    <th className="pb-2 font-medium">Utilisation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {occupancy.map((s) => {
                    const pct = s.capacityGirls > 0 ? Math.round((s.activeResidents / s.capacityGirls) * 100) : 0;
                    return (
                      <tr key={s.safehouseId}>
                        <td className="py-2 pr-3 font-medium text-gray-900 dark:text-white">{s.name}</td>
                        <td className="py-2 pr-3 text-gray-500 dark:text-gray-400">{s.region}</td>
                        <td className="py-2 pr-3 text-right text-gray-700 dark:text-gray-300">
                          {s.activeResidents}/{s.capacityGirls}
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                              <div
                                className={`h-1.5 rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-500' : 'bg-green-500'}`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-gray-600 dark:text-gray-400">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: inline create form */}
        <div className="card">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">New Allocation</h3>
          <div className="space-y-3">
            {/* Donation */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Donation <span className="text-orange-500">*</span>
              </label>
              <select
                className="select-field"
                value={createForm.donationId}
                onChange={(e) => setCreateForm({ ...createForm, donationId: Number(e.target.value) })}
              >
                <option value={0}>-- Select donation --</option>
                {unallocatedDonations.map((d) => (
                  <option key={d.donationId} value={d.donationId}>
                    #{d.donationId} · {d.supporterName ?? 'Unknown'} · USD {fmt(d.remaining)} remaining
                  </option>
                ))}
              </select>
            </div>

            {/* Safehouse */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Safehouse <span className="text-orange-500">*</span>
              </label>
              <select
                className="select-field"
                value={createForm.safeHouseId}
                onChange={(e) => setCreateForm({ ...createForm, safeHouseId: Number(e.target.value) })}
              >
                <option value={0}>-- Select safehouse --</option>
                {safehouses.map((s) => (
                  <option key={s.safehouseId} value={s.safehouseId}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Program Area */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Program Area
              </label>
              <select
                className="select-field"
                value={createForm.programArea}
                onChange={(e) => setCreateForm({ ...createForm, programArea: e.target.value })}
              >
                {PROGRAM_AREAS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Amount (USD) <span className="text-orange-500">*</span>
              </label>
              <input
                className="input-field"
                type="number"
                min={0}
                placeholder="0.00"
                value={createForm.amountAllocated || ''}
                onChange={(e) => setCreateForm({ ...createForm, amountAllocated: Number(e.target.value) })}
              />
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Allocation Date
              </label>
              <input
                className="input-field"
                type="date"
                value={createForm.allocationDate}
                onChange={(e) => setCreateForm({ ...createForm, allocationDate: e.target.value })}
              />
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Notes
              </label>
              <textarea
                className="input-field resize-y"
                rows={2}
                placeholder="Optional notes..."
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              />
            </div>

            {createError && <p className="text-xs text-red-600">{createError}</p>}

            <button
              className="btn-primary w-full"
              onClick={handleCreate}
              disabled={creating}
            >
              <Plus className="h-4 w-4" />
              {creating ? 'Creating...' : 'Create Allocation'}
            </button>
          </div>
        </div>
      </div>

      {/* Allocations table */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">Recent Allocations</h2>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="input-field pl-9"
              type="text"
              placeholder="Search safehouse, type, area, amount..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="select-field w-auto"
            value={programAreaFilter}
            onChange={(e) => setProgramAreaFilter(e.target.value)}
          >
            <option value="">All Program Areas</option>
            {PROGRAM_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
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
            <button
              className="btn-ghost text-orange-600"
              onClick={() => { setSearch(''); setDebouncedSearch(''); setProgramAreaFilter(''); setPage(1); }}
            >
              <X className="h-4 w-4" /> Clear
            </button>
          )}
        </div>

        {loading && <p className="py-10 text-center text-sm text-gray-500">Loading...</p>}
        {error && <p className="py-10 text-center text-sm text-red-500">Error: {error}</p>}

        {!loading && !error && allocations.length === 0 && (
          <p className="py-10 text-center text-sm text-gray-500">No allocations found.</p>
        )}

        {!loading && !error && allocations.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Donation</th>
                    <th>Type</th>
                    <th>Safehouse</th>
                    <th>Program Area</th>
                    <th>Amount Allocated</th>
                    <th>Date</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map((a) => (
                    <tr key={a.allocationId} className="cursor-pointer" onClick={() => openView(a)}>
                      <td>#{a.donationId}</td>
                      <td>
                        <span className="badge bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">
                          {a.donationType}
                        </span>
                      </td>
                      <td>{a.safehouseName}</td>
                      <td>{a.programArea}</td>
                      <td>USD {fmt(Number(a.amountAllocated))}</td>
                      <td>{a.allocationDate?.slice(0, 10)}</td>
                      <td className="max-w-[200px] text-xs text-gray-500 dark:text-gray-400">
                        {a.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-900">
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
      </div>

      {/* Edit/view modal */}
      {modalOpen && editing && createPortal(
        <>
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="allocation-dialog-title"
            onClick={() => setModalOpen(false)}
          >
            <div className="modal-body" onClick={(e) => e.stopPropagation()}>
              {/* Top bar */}
              <div className="mb-6 flex items-start justify-between border-b border-gray-100 pb-5 dark:border-gray-700">
                <div className="min-w-0 flex-1">
                  <h2 id="allocation-dialog-title" className="text-lg font-bold text-gray-900 dark:text-white">
                    Allocation #{editing.allocationId}
                  </h2>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {modalMode === 'edit' ? 'Editing record' : 'Viewing record'}
                  </p>
                </div>

                <div className="ml-4 flex items-center gap-2">
                  {modalMode === 'view' && (
                    <>
                      <button className="btn-icon" onClick={() => setModalMode('edit')} title="Edit">
                        <Pencil size={16} />
                      </button>
                      <button
                        className="inline-flex items-center justify-center rounded-lg p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10"
                        onClick={() => setShowDeleteConfirm(true)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        className="inline-flex items-center justify-center rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => setModalOpen(false)}
                      >
                        <X size={20} />
                      </button>
                    </>
                  )}
                  {modalMode === 'edit' && (
                    <>
                      <button
                        className="inline-flex items-center justify-center rounded-lg bg-orange-500 p-2 text-white transition hover:bg-orange-600 disabled:opacity-50"
                        onClick={handleSave}
                        disabled={saving}
                        title="Save"
                      >
                        {saving ? <span className="text-xs">Saving…</span> : <Check size={16} />}
                      </button>
                      <button
                        className="inline-flex items-center justify-center rounded-lg bg-gray-100 p-2 text-gray-600 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                        onClick={() => {
                          setEditForm({
                            donationId: editing.donationId,
                            safeHouseId: editing.safeHouseId,
                            programArea: editing.programArea,
                            amountAllocated: editing.amountAllocated,
                            allocationDate: editing.allocationDate,
                            notes: editing.notes ?? '',
                          });
                          setFormError(null);
                          setModalMode('view');
                        }}
                        disabled={saving}
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-4 rounded-xl bg-gray-50 p-4 dark:bg-white/5">
                {/* Donation */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Donation</label>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    #{editing.donationId}
                  </span>
                </div>

                {/* Safehouse */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Safehouse <span className="text-orange-500">*</span>
                  </label>
                  {modalMode === 'view' ? (
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{editing.safehouseName}</span>
                  ) : (
                    <select
                      className="select-field"
                      value={editForm.safeHouseId}
                      onChange={(e) => setEditForm({ ...editForm, safeHouseId: Number(e.target.value) })}
                    >
                      <option value={0}>-- Select safehouse --</option>
                      {safehouses.map((s) => (
                        <option key={s.safehouseId} value={s.safehouseId}>{s.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Program Area */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Program Area</label>
                  {modalMode === 'view' ? (
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{editing.programArea}</span>
                  ) : (
                    <select
                      className="select-field"
                      value={editForm.programArea}
                      onChange={(e) => setEditForm({ ...editForm, programArea: e.target.value })}
                    >
                      {PROGRAM_AREAS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  )}
                </div>

                {/* Amount */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Amount (USD) <span className="text-orange-500">*</span>
                  </label>
                  {modalMode === 'view' ? (
                    <span className="text-sm font-medium text-gray-900 dark:text-white">USD {fmt(editing.amountAllocated)}</span>
                  ) : (
                    <input
                      className="input-field"
                      type="number"
                      min={0}
                      value={editForm.amountAllocated}
                      onChange={(e) => setEditForm({ ...editForm, amountAllocated: Number(e.target.value) })}
                    />
                  )}
                </div>

                {/* Date */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Allocation Date</label>
                  {modalMode === 'view' ? (
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{editing.allocationDate?.slice(0, 10)}</span>
                  ) : (
                    <input
                      className="input-field"
                      type="date"
                      value={editForm.allocationDate}
                      onChange={(e) => setEditForm({ ...editForm, allocationDate: e.target.value })}
                    />
                  )}
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Notes</label>
                  {modalMode === 'view' ? (
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{editing.notes || '—'}</span>
                  ) : (
                    <textarea
                      className="input-field resize-y"
                      rows={3}
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    />
                  )}
                </div>
              </div>

              {formError && <p className="mt-2 text-xs text-red-600">{formError}</p>}
            </div>
          </div>

          {/* Delete confirm */}
          {showDeleteConfirm && (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
              role="alertdialog"
              aria-modal="true"
              onClick={() => setShowDeleteConfirm(false)}
            >
              <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">
                  <Trash2 size={20} className="text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Allocation</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete this record? This cannot be undone.
                </p>
                <div className="mt-6 flex items-center justify-end gap-3">
                  <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                  <button
                    className="btn-danger"
                    onClick={() => { setShowDeleteConfirm(false); handleDelete(editing!.allocationId); }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </>,
        document.body
      )}
    </div>
  );
}
