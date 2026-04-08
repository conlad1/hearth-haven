import { useEffect, useState } from 'react';
import './AllocationPage.css';

const API = 'https://localhost:7052';

const PROGRAM_AREAS = [
  'Education',
  'Wellbeing',
  'Operations',
  'Transport',
  'Maintenance',
  'Outreach',
];

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

const blank = (): Omit<
  Allocation,
  'allocationId' | 'safehouseName' | 'donationType' | 'donationAmount'
> => ({
  donationId: 0,
  safeHouseId: 0,
  programArea: PROGRAM_AREAS[0],
  amountAllocated: 0,
  allocationDate: new Date().toISOString().slice(0, 10),
  notes: '',
});

export default function AllocationPage() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [safehouses, setSafehouses] = useState<SafehouseOption[]>([]);
  const [donations, setDonations] = useState<DonationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Allocation | null>(null);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [aRes, sRes, dRes] = await Promise.all([
        fetch(`${API}/Allocation`),
        fetch(`${API}/Allocation/Safehouses`),
        fetch(`${API}/Allocation/Donations`),
      ]);
      if (!aRes.ok) throw new Error(await aRes.text());
      setAllocations(await aRes.json());
      setSafehouses(await sRes.json());
      setDonations(await dRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(blank());
    setFormError(null);
    setModalOpen(true);
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
      const url = editing
        ? `${API}/Allocation/${editing.allocationId}`
        : `${API}/Allocation`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return setFormError(await res.text());
      setModalOpen(false);
      loadAll();
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
      loadAll();
    } catch {
      alert('Network error.');
    }
  }

  return (
    <div className="alloc-page">
      <div className="alloc-header">
        <div>
          <h1>Donation Allocations</h1>
          <p>
            Manage how donations are distributed across safehouses and program
            areas.
          </p>
        </div>
        <button className="alloc-btn-primary" onClick={openCreate}>
          + New Allocation
        </button>
      </div>

      {loading && <p className="alloc-status">Loading…</p>}
      {error && <p className="alloc-status error">{error}</p>}

      {!loading && !error && (
        <div className="alloc-table-wrap">
          <table className="alloc-table">
            <thead>
              <tr>
                <th>Donation&nbsp;ID</th>
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
              {allocations.length === 0 && (
                <tr>
                  <td colSpan={8} className="alloc-empty">
                    No allocations yet.
                  </td>
                </tr>
              )}
              {allocations.map((a) => (
                <tr key={a.allocationId}>
                  <td>#{a.donationId}</td>
                  <td>
                    <span className="alloc-badge">{a.donationType}</span>
                  </td>
                  <td>{a.safehouseName}</td>
                  <td>{a.programArea}</td>
                  <td>₱{Number(a.amountAllocated).toLocaleString()}</td>
                  <td>{a.allocationDate}</td>
                  <td className="alloc-notes">{a.notes || '—'}</td>
                  <td className="alloc-actions">
                    <button
                      className="alloc-btn-edit"
                      onClick={() => openEdit(a)}
                    >
                      Edit
                    </button>
                    <button
                      className="alloc-btn-delete"
                      onClick={() => handleDelete(a.allocationId)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="alloc-overlay" onClick={() => setModalOpen(false)}>
          <div className="alloc-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Edit Allocation' : 'New Allocation'}</h2>

            <label>Donation</label>
            <select
              value={form.donationId}
              onChange={(e) =>
                setForm({ ...form, donationId: Number(e.target.value) })
              }
              disabled={!!editing}
            >
              <option value={0}>— Select donation —</option>
              {donations.map((d) => (
                <option key={d.donationId} value={d.donationId}>
                  {d.label}
                </option>
              ))}
            </select>

            <label>Safehouse</label>
            <select
              value={form.safeHouseId}
              onChange={(e) =>
                setForm({ ...form, safeHouseId: Number(e.target.value) })
              }
            >
              <option value={0}>— Select safehouse —</option>
              {safehouses.map((s) => (
                <option key={s.safehouseId} value={s.safehouseId}>
                  {s.name} — {s.city}
                </option>
              ))}
            </select>

            <label>Program Area</label>
            <select
              value={form.programArea}
              onChange={(e) =>
                setForm({ ...form, programArea: e.target.value })
              }
            >
              {PROGRAM_AREAS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <label>Amount Allocated (₱)</label>
            <input
              type="number"
              min={0}
              value={form.amountAllocated}
              onChange={(e) =>
                setForm({ ...form, amountAllocated: Number(e.target.value) })
              }
            />

            <label>Allocation Date</label>
            <input
              type="date"
              value={form.allocationDate}
              onChange={(e) =>
                setForm({ ...form, allocationDate: e.target.value })
              }
            />

            <label>Notes (optional)</label>
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
            />

            {formError && <p className="alloc-form-error">{formError}</p>}

            <div className="alloc-modal-actions">
              <button
                className="alloc-btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
              </button>
              <button
                className="alloc-btn-cancel"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
