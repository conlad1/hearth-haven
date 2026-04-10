import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  Supporter,
  Contribution,
  ContributionFilters,
} from '../../types/Donor';
import {
  fetchSupporters,
  fetchContributions,
  updateSupporter,
  deleteSupporter,
  createContribution,
  updateContribution,
  deleteContribution,
} from '../../api/donationManager/DonorAPI';
import {
  fetchDonorPrediction,
  DonorPrediction,
} from '../../api/donationManager/MLDonorAPI';
import { API_BASE_URL } from '../../api/core/config';
import { apiFetch } from '../../api/core/http';
import RecordModal, { RecordFieldDef } from '../../components/RecordModal';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  TrendingUp,
  DollarSign,
  Package,
  HandHelping,
  GraduationCap,
  Share2,
  Users,
  Building2,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Constants ────────────────────────────────────────────────────────────────

const SUPPORTER_TYPES = [
  'MonetaryDonor',
  'InKindDonor',
  'Volunteer',
  'SkillsContributor',
  'SocialMediaAdvocate',
  'PartnerOrganization',
];

const DONATION_TYPES = ['Monetary', 'InKind', 'Volunteer', 'Skills', 'SocialMedia'];
const FREQUENCY_OPTIONS = ['Once', 'Monthly'];
const PROGRAM_AREAS = ['General', 'Safe Haven', 'Education', 'Healthcare'];

const contributionFields: RecordFieldDef[] = [
  { key: 'donationId', label: 'ID', type: 'text', readOnly: true },
  { key: 'donationType', label: 'Type', type: 'select', options: DONATION_TYPES, required: true },
  { key: 'donationDate', label: 'Date', type: 'date', required: true },
  { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Confirmed', 'Cancelled'], required: true },
  { key: 'amount', label: 'Amount', type: 'number' },
  { key: 'currencyCode', label: 'Currency', type: 'text' },
  { key: 'isRecurring', label: 'Recurring', type: 'checkbox' },
  { key: 'frequency', label: 'Frequency', type: 'select', options: FREQUENCY_OPTIONS },
  { key: 'channelSource', label: 'Payment Channel', type: 'select', options: ['Card', 'PayPal', 'Bank Transfer', 'Cash'] },
  { key: 'estimatedValue', label: 'Est. Value', type: 'number' },
  { key: 'safehouseAllocation', label: 'Safehouse', type: 'text' },
  { key: 'programArea', label: 'Program Area', type: 'select', options: PROGRAM_AREAS },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
  { key: 'createdAt', label: 'Created At', type: 'text', readOnly: true },
];

const allocationFields: RecordFieldDef[] = [
  { key: 'allocationId', label: 'ID', type: 'text', readOnly: true },
  { key: 'donationId', label: 'Donation ID', type: 'number', readOnly: true },
  { key: 'safehouseName', label: 'Safehouse', type: 'text', readOnly: true },
  { key: 'safeHouseId', label: 'Safehouse ID', type: 'number' },
  { key: 'programArea', label: 'Program Area', type: 'select', options: ['Education', 'Wellbeing', 'Operations', 'Transport', 'Maintenance', 'Outreach'] },
  { key: 'amountAllocated', label: 'Amount Allocated', type: 'number', required: true },
  { key: 'allocationDate', label: 'Allocation Date', type: 'date', required: true },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(amount: number | null): string {
  if (amount === null || amount === undefined) return '--';
  return `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function badgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'confirmed') return 'badge bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400';
  if (s === 'inactive' || s === 'cancelled') return 'badge bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
  if (s === 'pending') return 'badge bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400';
  return 'badge bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
}

function TypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'Monetary': return <DollarSign className="h-4 w-4 shrink-0 text-green-600" />;
    case 'InKind': return <Package className="h-4 w-4 shrink-0 text-blue-600" />;
    case 'Volunteer': return <HandHelping className="h-4 w-4 shrink-0 text-purple-600" />;
    case 'Skills': return <GraduationCap className="h-4 w-4 shrink-0 text-amber-600" />;
    case 'SocialMedia': return <Share2 className="h-4 w-4 shrink-0 text-pink-600" />;
    default: return <DollarSign className="h-4 w-4 shrink-0 text-gray-500" />;
  }
}

function SupporterIcon({ type }: { type: string }) {
  switch (type) {
    case 'MonetaryDonor': return <DollarSign className="h-5 w-5 text-green-600" />;
    case 'InKindDonor': return <Package className="h-5 w-5 text-blue-600" />;
    case 'Volunteer': return <HandHelping className="h-5 w-5 text-purple-600" />;
    case 'SkillsContributor': return <GraduationCap className="h-5 w-5 text-amber-600" />;
    case 'SocialMediaAdvocate': return <Share2 className="h-5 w-5 text-pink-600" />;
    case 'PartnerOrganization': return <Building2 className="h-5 w-5 text-indigo-600" />;
    default: return <Users className="h-5 w-5 text-gray-500" />;
  }
}

// ── Profile field config ─────────────────────────────────────────────────────

type SFieldDef = { key: keyof Supporter; label: string };

const profileSections: { title: string; fields: SFieldDef[] }[] = [
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

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '--';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

type TabKey = 'profile' | 'contributions' | 'allocations';
const tabList: { key: TabKey; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'contributions', label: 'Contributions' },
  { key: 'allocations', label: 'Allocations' },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function DonorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const supporterId = Number(id);

  const [supporter, setSupporter] = useState<Supporter | null>(null);
  const [editData, setEditData] = useState<Supporter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('profile');

  // ML
  const [prediction, setPrediction] = useState<DonorPrediction | null>(null);

  // Contributions
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [conPage, setConPage] = useState(1);
  const [conTotalPages, setConTotalPages] = useState(1);
  const [conTotalCount, setConTotalCount] = useState(0);
  const [conLoading, setConLoading] = useState(false);

  // Contribution modal
  const [conModal, setConModal] = useState<{
    mode: 'view' | 'edit' | 'create';
    data: Record<string, unknown>;
  } | null>(null);
  const [conSaving, setConSaving] = useState(false);

  // Allocations for selected contribution
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [allocPage, setAllocPage] = useState(1);
  const [allocTotalPages, setAllocTotalPages] = useState(1);
  const [allocTotalCount, setAllocTotalCount] = useState(0);
  const [allocLoading, setAllocLoading] = useState(false);

  // Allocation modal
  const [allocModal, setAllocModal] = useState<{
    mode: 'view' | 'edit' | 'create';
    data: Record<string, unknown>;
  } | null>(null);
  const [allocSaving, setAllocSaving] = useState(false);

  // Safehouses for allocation creation
  const [safehouses, setSafehouses] = useState<SafehouseOption[]>([]);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Error modal
  const [errorModal, setErrorModal] = useState<string | null>(null);

  // ── Load supporter ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchSupporters(1, 1, { supporterId })
      .then((res) => {
        const s = res.data[0];
        if (s) {
          setSupporter(s);
          setEditData({ ...s });
          fetchDonorPrediction(s.supporterId)
            .then(setPrediction)
            .catch(() => {});
        } else {
          setError('Supporter not found');
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Load contributions ─────────────────────────────────────────────────────

  useEffect(() => {
    if (activeTab !== 'contributions' || !supporter) return;
    setConLoading(true);
    fetchContributions(conPage, 20, { supporterId: supporter.supporterId })
      .then((res) => {
        setContributions(res.data);
        setConTotalPages(res.totalPages);
        setConTotalCount(res.totalCount);
      })
      .catch(console.error)
      .finally(() => setConLoading(false));
  }, [activeTab, conPage, supporter]);

  // ── Load allocations ───────────────────────────────────────────────────────

  // We need to know the supporter's donation IDs to fetch their allocations.
  // Fetch all contribution IDs first, then query allocations by donationId.
  const [allDonationIds, setAllDonationIds] = useState<number[]>([]);

  useEffect(() => {
    if (!supporter) return;
    // Fetch up to 500 contribution IDs for this supporter
    fetchContributions(1, 500, { supporterId: supporter.supporterId })
      .then((res) => setAllDonationIds(res.data.map((c) => c.donationId)))
      .catch(() => {});
  }, [supporter]);

  const loadAllocations = () => {
    if (activeTab !== 'allocations' || allDonationIds.length === 0) {
      if (activeTab === 'allocations' && allDonationIds.length === 0 && supporter) {
        setAllocations([]);
        setAllocTotalCount(0);
        setAllocLoading(false);
      }
      return;
    }
    setAllocLoading(true);
    // Fetch allocations for all of the supporter's donation IDs
    Promise.all(
      allDonationIds.map((dId) =>
        apiFetch(`${API_BASE_URL}/Allocation?donationId=${dId}&pageSize=100`, { credentials: 'include' })
          .then(async (res) => {
            if (!res.ok) return [];
            const json = await res.json();
            return (json.data ?? json) as Allocation[];
          })
          .catch(() => [] as Allocation[])
      )
    )
      .then((results) => {
        const all = results.flat();
        setAllocations(all);
        setAllocTotalCount(all.length);
        setAllocTotalPages(1);
      })
      .finally(() => setAllocLoading(false));
  };

  useEffect(loadAllocations, [activeTab, allDonationIds]);

  // Load safehouses for allocation form
  useEffect(() => {
    apiFetch(`${API_BASE_URL}/Allocation/Safehouses`, { credentials: 'include' })
      .then(async (res) => {
        if (res.ok) setSafehouses(await res.json());
      })
      .catch(() => {});
  }, []);

  // ── Supporter CRUD ─────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!editData) return;
    setSaving(true);
    try {
      const updated = await updateSupporter(editData.supporterId, editData);
      setSupporter(updated);
      setEditData({ ...updated });
      setIsEditing(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!supporter) return;
    setSaving(true);
    try {
      await deleteSupporter(supporter.supporterId);
      navigate('/donors');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  // ── Contribution CRUD ──────────────────────────────────────────────────────

  const openContribution = (c: Contribution) => {
    setConModal({ mode: 'view', data: { ...c } as unknown as Record<string, unknown> });
  };

  const openAddContribution = () => {
    setConModal({
      mode: 'create',
      data: {
        donationId: 0,
        supporterId: supporter?.supporterId ?? 0,
        supporterName: '',
        donationType: 'Monetary',
        amount: null,
        currencyCode: 'USD',
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
      },
    });
  };

  const handleConSave = async () => {
    if (!conModal) return;
    setConSaving(true);
    try {
      if (conModal.mode === 'create') {
        await createContribution(conModal.data as unknown as Partial<Contribution>);
      } else {
        const d = conModal.data as unknown as Contribution;
        await updateContribution(d.donationId, d);
      }
      setConModal(null);
      // reload
      setConPage(1);
      setConLoading(true);
      fetchContributions(1, 20, { supporterId: supporter!.supporterId })
        .then((res) => {
          setContributions(res.data);
          setConTotalPages(res.totalPages);
          setConTotalCount(res.totalCount);
        })
        .finally(() => setConLoading(false));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setConSaving(false);
    }
  };

  const handleConDelete = async () => {
    if (!conModal) return;
    setConSaving(true);
    try {
      await deleteContribution((conModal.data as unknown as Contribution).donationId);
      setConModal(null);
      setConPage(1);
      setConLoading(true);
      fetchContributions(1, 20, { supporterId: supporter!.supporterId })
        .then((res) => {
          setContributions(res.data);
          setConTotalPages(res.totalPages);
          setConTotalCount(res.totalCount);
        })
        .finally(() => setConLoading(false));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setConSaving(false);
    }
  };

  // ── Allocation CRUD ────────────────────────────────────────────────────────

  const openAllocation = (a: Allocation) => {
    setAllocModal({ mode: 'view', data: { ...a } as unknown as Record<string, unknown> });
  };

  const openAddAllocation = () => {
    setAllocModal({
      mode: 'create',
      data: {
        allocationId: 0,
        donationId: 0,
        donationType: '',
        donationAmount: null,
        safeHouseId: safehouses[0]?.safehouseId ?? 0,
        safehouseName: '',
        programArea: 'Education',
        amountAllocated: 0,
        allocationDate: new Date().toISOString().slice(0, 10),
        notes: '',
      },
    });
  };

  const handleAllocSave = async () => {
    if (!allocModal) return;
    setAllocSaving(true);
    try {
      const d = allocModal.data;
      // Backend expects snake_case AllocationRequest
      const payload = {
        donation_id: Number(d.donationId),
        safehouse_id: Number(d.safeHouseId),
        program_area: String(d.programArea),
        amount_allocated: Number(d.amountAllocated),
        allocation_date: String(d.allocationDate),
        notes: d.notes ?? null,
      };
      const url = allocModal.mode === 'create'
        ? `${API_BASE_URL}/Allocation`
        : `${API_BASE_URL}/Allocation/${d.allocationId}`;
      const method = allocModal.mode === 'create' ? 'POST' : 'PUT';
      const r = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const msg = await r.text();
        throw new Error(msg || `Failed: ${r.status}`);
      }
      setAllocModal(null);
      loadAllocations();
    } catch (e) {
      setErrorModal(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setAllocSaving(false);
    }
  };

  const handleAllocDelete = async () => {
    if (!allocModal) return;
    setAllocSaving(true);
    try {
      const r = await apiFetch(`${API_BASE_URL}/Allocation/${allocModal.data.allocationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!r.ok) throw new Error(`Failed: ${r.status}`);
      setAllocModal(null);
      loadAllocations();
    } catch (e) {
      setErrorModal(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setAllocSaving(false);
    }
  };

  // Dynamic allocation fields with safehouse + donation selects
  const getAllocFields = (): RecordFieldDef[] => {
    const shOpts = safehouses.map((s) => ({ value: String(s.safehouseId), label: `${s.name} (${s.city})` }));
    const donOpts = allDonationIds.map((id) => ({ value: String(id), label: `Donation #${id}` }));
    return allocationFields.map((f) => {
      if (f.key === 'safeHouseId') {
        return { ...f, type: 'select' as const, selectOptions: shOpts, readOnly: false };
      }
      if (f.key === 'donationId') {
        return { ...f, type: 'select' as const, selectOptions: donOpts, readOnly: false, required: true };
      }
      return f;
    });
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderProfileInput = (col: SFieldDef) => {
    if (!editData) return null;
    const value = editData[col.key];

    if (sReadOnly.includes(col.key)) {
      return <span className="text-sm text-gray-500 dark:text-gray-400 italic">{formatCell(value)}</span>;
    }
    const sel = sSelectMap[col.key];
    if (sel) {
      return (
        <select
          className="select-field"
          value={value == null ? '' : String(value)}
          onChange={(e) => setEditData({ ...editData, [col.key]: e.target.value || null })}
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
          value={value == null ? '' : String(value)}
          onChange={(e) => setEditData({ ...editData, [col.key]: e.target.value || null })}
        />
      );
    }
    return (
      <input
        className="input-field"
        type="text"
        value={value == null ? '' : String(value)}
        onChange={(e) => setEditData({ ...editData, [col.key]: e.target.value || null })}
      />
    );
  };

  // ── Loading / error states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !supporter || !editData) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <p className="text-center text-sm text-gray-500">{error ?? 'Supporter not found.'}</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        <button className="btn-ghost mb-4" onClick={() => navigate('/donors')}>
          <ArrowLeft size={16} />
          Back to Donors
        </button>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-md">
          {/* ── Header bar ──────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-start gap-4 border-b border-gray-100 p-4 sm:items-center sm:p-6 dark:border-gray-700">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <SupporterIcon type={supporter.supporterType} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                {supporter.firstName} {supporter.lastName}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {supporter.supporterType} &middot;{' '}
                <span className={badgeClass(supporter.status)}>{supporter.status}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activeTab === 'profile' &&
                (isEditing ? (
                  <>
                    <button className="btn-primary" onClick={handleSave} disabled={saving} title="Save">
                      {saving ? 'Saving...' : <><Save size={16} /> Save</>}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => { setEditData({ ...supporter }); setIsEditing(false); }}
                      disabled={saving}
                      title="Cancel"
                    >
                      <X size={16} /> Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn-icon" onClick={() => setIsEditing(true)} title="Edit">
                      <Pencil size={16} />
                    </button>
                    <button
                      className="inline-flex items-center justify-center rounded-lg p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 cursor-pointer"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={saving}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ))}
            </div>
          </div>

          {/* ── ML Lapse Risk Banner ────────────────────────────────────── */}
          {prediction?.lapse && (
            <div
              className={`flex flex-wrap items-center gap-4 border-b border-gray-100 dark:border-gray-700 px-4 py-3 sm:px-6 ${
                prediction.lapse.lapse_score >= 70
                  ? 'bg-red-50 dark:bg-red-500/5'
                  : prediction.lapse.lapse_score >= 40
                    ? 'bg-yellow-50 dark:bg-yellow-500/5'
                    : 'bg-green-50 dark:bg-green-500/5'
              }`}
            >
              <ShieldAlert
                className={`h-5 w-5 shrink-0 ${
                  prediction.lapse.lapse_score >= 70
                    ? 'text-red-500'
                    : prediction.lapse.lapse_score >= 40
                      ? 'text-yellow-500'
                      : 'text-green-500'
                }`}
              />
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Lapse Risk</span>
                <span
                  className={`text-2xl font-bold ${
                    prediction.lapse.lapse_score >= 70
                      ? 'text-red-600 dark:text-red-400'
                      : prediction.lapse.lapse_score >= 40
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-green-600 dark:text-green-400'
                  }`}
                >
                  {prediction.lapse.lapse_score}
                  <span className="ml-0.5 text-sm font-normal text-gray-400">/100</span>
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {prediction.lapse.recommendation}
                </span>
              </div>
              <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                ML &middot; {new Date(prediction.lapse.predicted_at).toLocaleTimeString()}
              </span>
            </div>
          )}

          {/* ── ML Upgrade Potential Banner ─────────────────────────────── */}
          {prediction?.upgrade && (
            <div
              className={`flex flex-wrap items-center gap-4 border-b border-gray-100 dark:border-gray-700 px-4 py-3 sm:px-6 ${
                prediction.upgrade.upgrade_score >= 60
                  ? 'bg-green-50 dark:bg-green-500/5'
                  : prediction.upgrade.upgrade_score >= 35
                    ? 'bg-yellow-50 dark:bg-yellow-500/5'
                    : 'bg-gray-50 dark:bg-gray-800/50'
              }`}
            >
              <TrendingUp
                className={`h-5 w-5 shrink-0 ${
                  prediction.upgrade.upgrade_score >= 60
                    ? 'text-green-500'
                    : prediction.upgrade.upgrade_score >= 35
                      ? 'text-yellow-500'
                      : 'text-gray-400'
                }`}
              />
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Upgrade Potential</span>
                <span
                  className={`text-2xl font-bold ${
                    prediction.upgrade.upgrade_score >= 60
                      ? 'text-green-600 dark:text-green-400'
                      : prediction.upgrade.upgrade_score >= 35
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {prediction.upgrade.upgrade_score}
                  <span className="ml-0.5 text-sm font-normal text-gray-400">/100</span>
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {prediction.upgrade.recommendation}
                </span>
              </div>
              <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                ML &middot; {new Date(prediction.upgrade.predicted_at).toLocaleTimeString()}
              </span>
            </div>
          )}

          {/* ── Tab bar ─────────────────────────────────────────────────── */}
          <div className="overflow-x-auto border-b border-gray-100 dark:border-gray-700">
            <div className="flex min-w-max">
              {tabList.map((tab) => (
                <button
                  key={tab.key}
                  className={`relative whitespace-nowrap px-4 py-3 text-sm font-medium transition sm:px-5 ${
                    activeTab === tab.key
                      ? 'text-orange-500 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-orange-500'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                  onClick={() => { setActiveTab(tab.key); setIsEditing(false); }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab content ─────────────────────────────────────────────── */}
          <div className="p-4 sm:p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-8">
                {profileSections.map((sec) => (
                  <div key={sec.title}>
                    <h3 className="mb-3 border-b border-gray-100 dark:border-gray-700 pb-2 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {sec.title}
                    </h3>
                    <div className="grid grid-cols-1 gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-2 dark:bg-white/5">
                      {sec.fields.map((col) => (
                        <div className="flex flex-col gap-1.5" key={col.key}>
                          <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            {col.label}
                          </label>
                          {isEditing ? (
                            renderProfileInput(col)
                          ) : (
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatCell(supporter[col.key])}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Contributions Tab */}
            {activeTab === 'contributions' && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Contributions ({conTotalCount})
                  </h3>
                  <button className="btn-primary" onClick={openAddContribution}>
                    <Plus size={16} /> New
                  </button>
                </div>

                {conLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                  </div>
                ) : contributions.length === 0 ? (
                  <p className="py-12 text-center text-sm text-gray-400">No contributions found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table-base">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Program</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contributions.map((c) => (
                          <tr
                            key={c.donationId}
                            className="cursor-pointer"
                            onClick={() => openContribution(c)}
                          >
                            <td>
                              <div className="flex items-center gap-2">
                                <TypeIcon type={c.donationType} />
                                {c.donationType}
                              </div>
                            </td>
                            <td>{c.donationDate?.slice(0, 10)}</td>
                            <td>{formatAmount(c.amount)}</td>
                            <td><span className={badgeClass(c.status)}>{c.status}</span></td>
                            <td>{c.programArea ?? '--'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {conTotalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 px-2 py-3 mt-2">
                    <button className="btn-ghost" disabled={conPage <= 1} onClick={() => setConPage(conPage - 1)}>
                      <ChevronLeft size={16} /> Previous
                    </button>
                    <span className="text-sm text-gray-500">
                      Page {conPage} of {conTotalPages} ({conTotalCount} total)
                    </span>
                    <button className="btn-ghost" disabled={conPage >= conTotalPages} onClick={() => setConPage(conPage + 1)}>
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Allocations Tab */}
            {activeTab === 'allocations' && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Allocations ({allocTotalCount})
                  </h3>
                  <button className="btn-primary" onClick={openAddAllocation}>
                    <Plus size={16} /> New
                  </button>
                </div>

                {allocLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                  </div>
                ) : allocations.length === 0 ? (
                  <p className="py-12 text-center text-sm text-gray-400">No allocations found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table-base">
                      <thead>
                        <tr>
                          <th>Donation ID</th>
                          <th>Safehouse</th>
                          <th>Program</th>
                          <th>Amount</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allocations.map((a) => (
                          <tr
                            key={a.allocationId}
                            className="cursor-pointer"
                            onClick={() => openAllocation(a)}
                          >
                            <td>{a.donationId}</td>
                            <td>{a.safehouseName}</td>
                            <td>{a.programArea}</td>
                            <td>{formatAmount(a.amountAllocated)}</td>
                            <td>{a.allocationDate?.slice(0, 10)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {allocTotalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 px-2 py-3 mt-2">
                    <button className="btn-ghost" disabled={allocPage <= 1} onClick={() => setAllocPage(allocPage - 1)}>
                      <ChevronLeft size={16} /> Previous
                    </button>
                    <span className="text-sm text-gray-500">
                      Page {allocPage} of {allocTotalPages} ({allocTotalCount} total)
                    </span>
                    <button className="btn-ghost" disabled={allocPage >= allocTotalPages} onClick={() => setAllocPage(allocPage + 1)}>
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Delete supporter confirmation ──────────────────────────────── */}
      {showDeleteConfirm &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Supporter</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Are you sure you want to delete this supporter? This action cannot be undone.
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)} disabled={saving}>Cancel</button>
                <button className="btn-danger" onClick={() => { setShowDeleteConfirm(false); handleDelete(); }} disabled={saving}>
                  {saving ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── Contribution modal ─────────────────────────────────────────── */}
      {conModal && (
        <RecordModal
          title="Contribution"
          fields={contributionFields}
          data={conModal.data}
          mode={conModal.mode}
          saving={conSaving}
          onFieldChange={(key, value) =>
            setConModal({ ...conModal, data: { ...conModal.data, [key]: value } })
          }
          onSave={handleConSave}
          onDelete={conModal.mode === 'view' ? handleConDelete : undefined}
          onEdit={conModal.mode === 'view' ? () => setConModal({ ...conModal, mode: 'edit' }) : undefined}
          onCancel={() =>
            conModal.mode === 'edit'
              ? setConModal({ ...conModal, mode: 'view' })
              : setConModal(null)
          }
          onClose={() => setConModal(null)}
        />
      )}

      {/* ── Allocation modal ───────────────────────────────────────────── */}
      {allocModal && (
        <RecordModal
          title="Allocation"
          fields={getAllocFields()}
          data={allocModal.data}
          mode={allocModal.mode}
          saving={allocSaving}
          onFieldChange={(key, value) =>
            setAllocModal({ ...allocModal, data: { ...allocModal.data, [key]: value } })
          }
          onSave={handleAllocSave}
          onDelete={allocModal.mode === 'view' ? handleAllocDelete : undefined}
          onEdit={allocModal.mode === 'view' ? () => setAllocModal({ ...allocModal, mode: 'edit' }) : undefined}
          onCancel={() =>
            allocModal.mode === 'edit'
              ? setAllocModal({ ...allocModal, mode: 'view' })
              : setAllocModal(null)
          }
          onClose={() => setAllocModal(null)}
        />
      )}

      {/* ── Error modal ────────────────────────────────────────────────── */}
      {errorModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setErrorModal(null)}
          >
            <div
              className="relative mx-4 w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">
                <X size={20} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Allocation Error</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {errorModal}
              </p>
              <div className="mt-6 flex justify-end">
                <button className="btn-secondary" onClick={() => setErrorModal(null)}>
                  OK
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
