import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Pencil, Trash2, Save, Check, X, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { API_BASE_URL as API } from '../api/config';

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

      const res = await fetch(`${API}/Allocation?${params.toString()}`);
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
      fetch(`${API}/Allocation/Safehouses`),
      fetch(`${API}/Allocation/Donations`),
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

  function openEdit(a: Allocation) {
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
      const res = await fetch(url, {
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
    if (!window.confirm('Delete this allocation?')) return;

    try {
      const res = await fetch(`${API}/Allocation/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        alert(await res.text());
        return;
      }

      loadAllocations();
    } catch {
      alert('Network error.');
    }
  }

  return (
    <>
      {loading && <p className="py-10 text-center text-sm text-gray-500">Loading...</p>}
      {error && <p className="py-10 text-center text-sm text-red-500">Error: {error}</p>}

      {!loading && !error && (
        <>
          {showPageSizeControl && (
            <div className="mb-6 flex justify-end">
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
            </div>
          )}

          <div className="mb-4 flex flex-wrap items-center gap-3">
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

              {(search || programAreaFilter) && (
                <button className="btn-ghost text-orange-600" onClick={clearFilters}>
                  <X className="h-4 w-4" /> Clear
                </button>
              )}
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
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map((a) => (
                    <tr key={a.allocationId}>
                      <td>#{a.donationId}</td>
                      <td>
                        <span className="badge bg-purple-100 text-purple-700">{a.donationType}</span>
                      </td>
                      <td>{a.safehouseName}</td>
                      <td>{a.programArea}</td>
                      <td>&#x20B1;{Number(a.amountAllocated).toLocaleString()}</td>
                      <td>{a.allocationDate}</td>
                      <td className="max-w-[200px] text-xs text-gray-500 dark:text-gray-400">
                        {a.notes || '\u2014'}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button className="btn-ghost" onClick={() => openEdit(a)}>
                            <Pencil className="h-4 w-4" /> Edit
                          </button>
                          <button
                            className="btn-ghost text-red-500 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleDelete(a.allocationId)}
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </button>
                        </div>
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

      {modalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="allocation-dialog-title" onClick={() => setModalOpen(false)}>
          <div className="modal-body max-w-lg flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 id="allocation-dialog-title" className="text-lg font-bold text-gray-900 dark:text-white">
                {editing ? 'Edit Allocation' : 'New Allocation'}
              </h2>
              <button className="btn-icon" onClick={() => setModalOpen(false)} aria-label="Close dialog">
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mt-2 text-xs font-medium text-gray-700 dark:text-gray-300">Donation</label>
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

            <label className="mt-2 text-xs font-medium text-gray-700 dark:text-gray-300">Safehouse</label>
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

            <label className="mt-2 text-xs font-medium text-gray-700 dark:text-gray-300">Program Area</label>
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

            <label className="mt-2 text-xs font-medium text-gray-700 dark:text-gray-300">
              Amount Allocated (&#x20B1;)
            </label>
            <input
              className="input-field"
              type="number"
              min={0}
              value={form.amountAllocated}
              onChange={(e) => setForm({ ...form, amountAllocated: Number(e.target.value) })}
            />

            <label className="mt-2 text-xs font-medium text-gray-700 dark:text-gray-300">Allocation Date</label>
            <input
              className="input-field"
              type="date"
              value={form.allocationDate}
              onChange={(e) => setForm({ ...form, allocationDate: e.target.value })}
            />

            <label className="mt-2 text-xs font-medium text-gray-700 dark:text-gray-300">Notes (optional)</label>
            <textarea
              className="input-field resize-y"
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
            />

            {formError && <p className="my-1 text-xs text-red-600">{formError}</p>}

            <div className="mt-4 flex gap-3">
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? (
                  'Saving...'
                ) : (
                  <>
                    {editing ? <Save className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    {editing ? 'Save Changes' : 'Create'}
                  </>
                )}
              </button>
              <button className="btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default AllocationPage;
