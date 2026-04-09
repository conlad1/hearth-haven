import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Pencil, Check, X, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { API_BASE_URL as API } from '../api/config';
import { apiFetch } from '../api/http';

const PROGRAM_AREAS = ['Education', 'Wellbeing', 'Operations', 'Transport', 'Maintenance', 'Outreach'];

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

interface SafehouseOption {
  safehouseId: number;
  name: string;
  city: string;
}

interface DonationOption {
  donationId: number;
  label: string;
  amount: number | null;
}

const blank = (): Omit<Allocation, 'allocationId' | 'safehouseName' | 'donationType' | 'donationAmount'> => ({
  donationId: 0,
  safeHouseId: 0,
  programArea: PROGRAM_AREAS[0],
  amountAllocated: 0,
  allocationDate: new Date().toISOString().slice(0, 10),
  notes: '',
});

export interface AllocationPageHandle {
  openCreate: () => void;
}

interface AllocationPageProps {
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  showPageSizeControl?: boolean;
}

const AllocationPage = forwardRef<AllocationPageHandle, AllocationPageProps>(function AllocationPage(
  { pageSize: controlledPageSize, onPageSizeChange, showPageSizeControl = true },
  ref
) {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [safehouses, setSafehouses] = useState<SafehouseOption[]>([]);
  const [donations, setDonations] = useState<DonationOption[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [programAreaFilter, setProgramAreaFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSizeState, setPageSizeState] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Allocation | null>(null);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('create');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const pageSize = controlledPageSize ?? pageSizeState;
  const setPageSize = onPageSizeChange ?? setPageSizeState;

  useImperativeHandle(ref, () => ({
    openCreate() {
      openCreate();
    },
  }));

  function openCreate() {
    setEditing(null);
    setForm(blank());
    setFormError(null);
    setModalMode('create');
    setModalOpen(true);
  }

  async function loadAllocations() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      if (debouncedSearch.trim()) {
        params.set('search', debouncedSearch.trim());
      }

      if (programAreaFilter) {
        params.set('programArea', programAreaFilter);
      }

      const res = await apiFetch(`${API}/Allocation?${params.toString()}`);
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
    Promise.all([
      apiFetch(`${API}/Allocation/Safehouses`),
      apiFetch(`${API}/Allocation/Donations`),
    ]).then(async ([sRes, dRes]) => {
      if (sRes.ok) setSafehouses(await sRes.json());
      if (dRes.ok) setDonations(await dRes.json());
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, programAreaFilter]);

  useEffect(() => {
    loadAllocations();
  }, [page, pageSize, debouncedSearch, programAreaFilter]);

  function clearFilters() {
    setSearch('');
    setDebouncedSearch('');
    setProgramAreaFilter('');
    setPage(1);
  }

  function openView(a: Allocation) {
    setEditing(a);
    setForm({
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
    if (!form.donationId) return setFormError('Select a donation.');
    if (!form.safeHouseId) return setFormError('Select a safehouse.');
    if (form.amountAllocated <= 0) return setFormError('Enter a valid amount.');

    setSaving(true);
    setFormError(null);

    const body = {
      donation_id: form.donationId,
      safehouse_id: form.safeHouseId,
      program_area: form.programArea,
      amount_allocated: form.amountAllocated,
      allocation_date: new Date(form.allocationDate).toISOString(),
      notes: form.notes || null,
    };

    try {
      const url = editing ? `${API}/Allocation/${editing.allocationId}` : `${API}/Allocation`;
      const method = editing ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        return setFormError(await res.text());
      }

      setModalOpen(false);
      loadAllocations();
    } catch {
      setFormError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await apiFetch(`${API}/Allocation/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        alert(await res.text());
        return;
      }

      setModalOpen(false);
      loadAllocations();
    } catch {
      alert('Network error.');
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {loading && <p className="py-10 text-center text-sm text-gray-500">Loading...</p>}
      {error && <p className="py-10 text-center text-sm text-red-500">Error: {error}</p>}

      {!loading && !error && (
        <>
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-900">
            <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="input-field pl-9"
                type="text"
                placeholder="Search by safehouse, type, program area, amount..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search allocations"
              />
            </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="select-field w-auto"
                  value={programAreaFilter}
                  onChange={(e) => setProgramAreaFilter(e.target.value)}
                  aria-label="Filter allocations by program area"
                >
                  <option value="">All Program Areas</option>
                  {PROGRAM_AREAS.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>

                {showPageSizeControl && (
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    Per page:
                    <select
                      className="select-field w-auto"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      aria-label="Allocations per page"
                    >
                      {PAGE_SIZE_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {(search || programAreaFilter) && (
                  <button className="btn-ghost text-orange-600" onClick={clearFilters}>
                    <X className="h-4 w-4" /> Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {allocations.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">No allocations found.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-900">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Donation ID</th>
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
                        <span className="badge bg-purple-100 text-purple-700">{a.donationType}</span>
                      </td>
                      <td>{a.safehouseName}</td>
                      <td>{a.programArea}</td>
                      <td>USD {Number(a.amountAllocated).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td>{a.allocationDate}</td>
                      <td className="max-w-[200px] text-xs text-gray-500 dark:text-gray-400">
                        {a.notes || '\u2014'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {allocations.length > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-md dark:border-gray-700 dark:bg-gray-900">
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
          )}
        </>
      )}

      {modalOpen && createPortal(
        <>
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="allocation-dialog-title" onClick={() => setModalOpen(false)}>
            <div className="modal-body" onClick={(e) => e.stopPropagation()}>
              {/* Top bar */}
              <div className="mb-6 flex items-start justify-between border-b border-gray-100 pb-5 dark:border-gray-700">
                <div className="min-w-0 flex-1">
                  <h2 id="allocation-dialog-title" className="text-lg font-bold text-gray-900 dark:text-white">
                    {modalMode === 'create' ? 'New Allocation' : 'Allocation'}
                  </h2>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {modalMode === 'create' ? 'Fill in the details below' : modalMode === 'edit' ? 'Editing record' : 'Viewing record'}
                  </p>
                </div>

                <div className="ml-4 flex items-center gap-2">
                  {modalMode === 'view' && (
                    <>
                      <button
                        className="btn-icon"
                        onClick={() => setModalMode('edit')}
                        aria-label="Edit record"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="inline-flex items-center justify-center rounded-lg p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 disabled:opacity-50 cursor-pointer"
                        onClick={() => setShowDeleteConfirm(true)}
                        aria-label="Delete record"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                  {modalMode === 'edit' && (
                    <>
                      <button
                        className="inline-flex items-center justify-center rounded-lg bg-orange-500 p-2 text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 cursor-pointer"
                        onClick={handleSave}
                        disabled={saving}
                        aria-label={saving ? 'Saving record' : 'Save record'}
                        title="Save"
                      >
                        {saving ? <span className="text-xs font-medium">Saving...</span> : <Check size={16} />}
                      </button>
                      <button
                        className="inline-flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-2 text-gray-600 dark:text-gray-400 transition hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 cursor-pointer"
                        onClick={() => {
                          if (editing) {
                            setForm({
                              donationId: editing.donationId,
                              safeHouseId: editing.safeHouseId,
                              programArea: editing.programArea,
                              amountAllocated: editing.amountAllocated,
                              allocationDate: editing.allocationDate,
                              notes: editing.notes ?? '',
                            });
                          }
                          setFormError(null);
                          setModalMode('view');
                        }}
                        disabled={saving}
                        aria-label="Cancel editing"
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </>
                  )}
                  {modalMode === 'create' && (
                    <>
                      <button
                        className="inline-flex items-center justify-center rounded-lg bg-orange-500 p-2 text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 cursor-pointer"
                        onClick={handleSave}
                        disabled={saving}
                        aria-label={saving ? 'Creating record' : 'Create record'}
                        title="Create"
                      >
                        {saving ? <span className="text-xs font-medium">Creating...</span> : <Check size={16} />}
                      </button>
                      <button
                        className="inline-flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-2 text-gray-600 dark:text-gray-400 transition hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 cursor-pointer"
                        onClick={() => setModalOpen(false)}
                        disabled={saving}
                        aria-label="Cancel creating record"
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </>
                  )}
                </div>

                {modalMode === 'view' && (
                  <button
                    className="ml-2 inline-flex items-center justify-center rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                    onClick={() => setModalOpen(false)}
                    aria-label="Close dialog"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>

              {/* Fields */}
              <div className="space-y-4 rounded-xl bg-gray-50 p-4 dark:bg-white/5">
                {/* Donation */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Donation<span className="ml-0.5 text-orange-500">*</span></label>
                  {modalMode === 'view' ? (
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {donations.find((d) => d.donationId === form.donationId)?.label ?? '\u2014'}
                    </span>
                  ) : (
                    <select
                      className="select-field"
                      value={form.donationId}
                      onChange={(e) => setForm({ ...form, donationId: Number(e.target.value) })}
                      disabled={!!editing}
                    >
                      <option value={0}>-- Select donation --</option>
                      {donations.map((d) => (
                        <option key={d.donationId} value={d.donationId}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Safehouse */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Safehouse<span className="ml-0.5 text-orange-500">*</span></label>
                  {modalMode === 'view' ? (
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {safehouses.find((s) => s.safehouseId === form.safeHouseId)?.name ?? '\u2014'}
                    </span>
                  ) : (
                    <select
                      className="select-field"
                      value={form.safeHouseId}
                      onChange={(e) => setForm({ ...form, safeHouseId: Number(e.target.value) })}
                    >
                      <option value={0}>-- Select safehouse --</option>
                      {safehouses.map((s) => (
                        <option key={s.safehouseId} value={s.safehouseId}>
                          {s.name} - {s.city}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Program Area */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Program Area</label>
                  {modalMode === 'view' ? (
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{form.programArea}</span>
                  ) : (
                    <select
                      className="select-field"
                      value={form.programArea}
                      onChange={(e) => setForm({ ...form, programArea: e.target.value })}
                    >
                      {PROGRAM_AREAS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Amount Allocated */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Amount Allocated<span className="ml-0.5 text-orange-500">*</span></label>
                  {modalMode === 'view' ? (
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      &#x20B1;{Number(form.amountAllocated).toLocaleString()}
                    </span>
                  ) : (
                    <input
                      className="input-field"
                      type="number"
                      min={0}
                      value={form.amountAllocated}
                      onChange={(e) => setForm({ ...form, amountAllocated: Number(e.target.value) })}
                    />
                  )}
                </div>

                {/* Allocation Date */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Allocation Date</label>
                  {modalMode === 'view' ? (
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{form.allocationDate}</span>
                  ) : (
                    <input
                      className="input-field"
                      type="date"
                      value={form.allocationDate}
                      onChange={(e) => setForm({ ...form, allocationDate: e.target.value })}
                    />
                  )}
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Notes</label>
                  {modalMode === 'view' ? (
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{form.notes || '\u2014'}</span>
                  ) : (
                    <textarea
                      className="input-field resize-y"
                      value={form.notes ?? ''}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      rows={3}
                    />
                  )}
                </div>
              </div>

              {formError && <p className="my-1 text-xs text-red-600">{formError}</p>}
            </div>
          </div>

          {/* Delete confirmation nested modal */}
          {showDeleteConfirm && (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="allocation-delete-title"
              onClick={() => setShowDeleteConfirm(false)}
            >
              <div
                className="relative mx-4 w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">
                  <Trash2 size={20} className="text-red-500" />
                </div>
                <h3 id="allocation-delete-title" className="text-lg font-bold text-gray-900 dark:text-white">Delete Record</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete this record? This action cannot be undone.
                </p>
                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    className="btn-secondary"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => { setShowDeleteConfirm(false); handleDelete(editing!.allocationId); }}
                    disabled={saving}
                  >
                    {saving ? 'Deleting...' : 'Delete'}
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
});

export default AllocationPage;

