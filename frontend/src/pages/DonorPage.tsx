import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import AllocationPage, { type AllocationPageHandle } from './AllocationPage';
import { Supporter, Contribution, DonorFilterOptions, SupporterFilters, ContributionFilters } from '../types/Donor';
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
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
  Building2,
  DollarSign,
  Package,
  HandHelping,
  GraduationCap,
  Share2,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart3,
} from 'lucide-react';
import { useAuthSession } from '../authSession';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const SUPPORTER_TYPES = ['MonetaryDonor', 'InKindDonor', 'Volunteer', 'SkillsContributor', 'SocialMediaAdvocate', 'PartnerOrganization'];

const DONATION_TYPES  = ['Monetary', 'InKind', 'Volunteer', 'Skills', 'SocialMedia'];
const FREQUENCY_OPTIONS = ['Once', 'Monthly'];

// ── Field section configs ─────────────────────────────────────────────────────

type SFieldDef = { key: keyof Supporter; label: string };
type CFieldDef = { key: keyof Contribution; label: string };

const supporterSections: { title: string; fields: SFieldDef[] }[] = [
  {
    title: 'Profile',
    fields: [
      { key: 'supporterId',     label: 'ID' },
      { key: 'supporterType',   label: 'Supporter Type' },
      { key: 'status',          label: 'Status' },
      { key: 'createdAt',       label: 'Created At' },
    ],
  },
  {
    title: 'Contact Details',
    fields: [
      { key: 'firstName',        label: 'First Name' },
      { key: 'lastName',         label: 'Last Name' },
      { key: 'email',            label: 'Email' },
      { key: 'phone',            label: 'Phone' },
      { key: 'organizationName', label: 'Organization' },
      { key: 'address',          label: 'Address' },
    ],
  },
  {
    title: 'Notes',
    fields: [
      { key: 'notes', label: 'Notes' },
    ],
  },
];

const contributionSections: { title: string; fields: CFieldDef[] }[] = [
  {
    title: 'Contribution Info',
    fields: [
      { key: 'donationId',   label: 'ID' },
      { key: 'supporterId',  label: 'Supporter ID' },
      { key: 'donationType', label: 'Type' },
      { key: 'donationDate', label: 'Date' },
      { key: 'status',       label: 'Status' },
      { key: 'isRecurring',  label: 'Recurring' },
    ],
  },
  {
    title: 'Amount & Payment',
    fields: [
      { key: 'amount',        label: 'Amount' },
      { key: 'currencyCode',  label: 'Currency' },
      { key: 'frequency',     label: 'Frequency' },
      { key: 'channelSource', label: 'Payment Channel' },
      { key: 'estimatedValue',label: 'Est. Value' },
    ],
  },
  {
    title: 'Allocation',
    fields: [
      { key: 'safehouseAllocation', label: 'Safehouse' },
      { key: 'programArea',         label: 'Program Area' },
      { key: 'description',         label: 'Description' },
    ],
  },
  {
    title: 'Notes',
    fields: [
      { key: 'notes',     label: 'Notes' },
      { key: 'createdAt', label: 'Created At' },
    ],
  },
];

// ── Field type sets ───────────────────────────────────────────────────────────

const sReadOnly:   (keyof Supporter)[]    = ['supporterId', 'createdAt'];
const sTextarea:   (keyof Supporter)[]    = ['notes', 'address'];
const sSelectMap:  Partial<Record<keyof Supporter,  { opts: string[]; nullable: boolean }>> = {
  supporterType: { opts: SUPPORTER_TYPES,                                nullable: false },
  status:        { opts: ['Active', 'Inactive'],                         nullable: false },
};

const cReadOnly:   (keyof Contribution)[] = ['donationId', 'createdAt', 'supporterName'];
const cBoolean:    (keyof Contribution)[] = ['isRecurring'];
const cDate:       (keyof Contribution)[] = ['donationDate'];
const cNumber:     (keyof Contribution)[] = ['amount', 'estimatedValue', 'supporterId'];
const cTextarea:   (keyof Contribution)[] = ['description', 'notes'];
const cSelectMap:  Partial<Record<keyof Contribution, { opts: string[]; nullable: boolean }>> = {
  donationType:        { opts: DONATION_TYPES,                               nullable: false },
  status:              { opts: ['Pending', 'Confirmed', 'Cancelled'],        nullable: false },
  channelSource:       { opts: ['Card', 'PayPal', 'Bank Transfer', 'Cash'], nullable: true  },
  frequency:           { opts: FREQUENCY_OPTIONS,                            nullable: true  },
  programArea:         { opts: ['General', 'Safe Haven', 'Education', 'Healthcare'], nullable: true },
  safehouseAllocation: { opts: ['Manila', 'Quezon City', 'Davao'],           nullable: true  },
};

// ── Blank templates ───────────────────────────────────────────────────────────

const blankSupporter: Supporter = {
  supporterId: 0, supporterType: 'MonetaryDonor', status: 'Active',
  firstName: '', lastName: '', email: '', phone: null,
  organizationName: null, address: null, notes: null, createdAt: '',
};

const blankContribution: Contribution = {
  donationId: 0, supporterId: 0, supporterName: '',
  donationType: 'Monetary', amount: null, currencyCode: 'USD',
  isRecurring: false, frequency: 'Once', channelSource: null,
  description: null, estimatedValue: null,
  donationDate: new Date().toISOString().slice(0, 10),
  safehouseAllocation: null, programArea: null,
  status: 'Pending', notes: null, createdAt: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '--';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function formatAmount(amount: number | null): string {
  if (amount === null || amount === undefined) return '--';
  return `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function TypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'Monetary':    return <DollarSign className="h-4 w-4 shrink-0 text-green-600" />;
    case 'InKind':      return <Package className="h-4 w-4 shrink-0 text-blue-600" />;
    case 'Volunteer':   return <HandHelping className="h-4 w-4 shrink-0 text-purple-600" />;
    case 'Skills':      return <GraduationCap className="h-4 w-4 shrink-0 text-amber-600" />;
    case 'SocialMedia': return <Share2 className="h-4 w-4 shrink-0 text-pink-600" />;
    default:            return <DollarSign className="h-4 w-4 shrink-0 text-gray-500" />;
  }
}

function SupporterIcon({ type }: { type: string }) {
  switch (type) {
    case 'MonetaryDonor':       return <DollarSign className="h-4 w-4 shrink-0 text-green-600" />;
    case 'InKindDonor':         return <Package className="h-4 w-4 shrink-0 text-blue-600" />;
    case 'Volunteer':           return <HandHelping className="h-4 w-4 shrink-0 text-purple-600" />;
    case 'SkillsContributor':   return <GraduationCap className="h-4 w-4 shrink-0 text-amber-600" />;
    case 'SocialMediaAdvocate': return <Share2 className="h-4 w-4 shrink-0 text-pink-600" />;
    case 'PartnerOrganization': return <Building2 className="h-4 w-4 shrink-0 text-indigo-600" />;
    default:                    return <Users className="h-4 w-4 shrink-0 text-gray-500" />;
  }
}

function badgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'confirmed') return 'badge bg-green-50 text-green-700';
  if (s === 'inactive' || s === 'cancelled') return 'badge bg-gray-100 text-gray-600';
  if (s === 'pending') return 'badge bg-orange-50 text-orange-700';
  return 'badge bg-gray-100 text-gray-600';
}

// ── Supporter required fields ─────────────────────────────────────────────────

const supporterRequired: { key: keyof Supporter; label: string }[] = [
  { key: 'firstName',    label: 'First Name' },
  { key: 'lastName',     label: 'Last Name' },
  { key: 'email',        label: 'Email' },
  { key: 'supporterType',label: 'Supporter Type' },
  { key: 'status',       label: 'Status' },
];

const contributionRequired: { key: keyof Contribution; label: string }[] = [
  { key: 'supporterId',  label: 'Supporter ID' },
  { key: 'donationType', label: 'Donation Type' },
  { key: 'donationDate', label: 'Date' },
  { key: 'status',       label: 'Status' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function DonorPage() {
  const { isAuthenticated, sessionReady } = useAuthSession();
  const location = useLocation();
  const allocationPageRef = useRef<AllocationPageHandle>(null);

  const locationState = location.state as { tab?: string; donationId?: number } | null;
  const [activeTab, setActiveTab] = useState<'supporters' | 'contributions' | 'allocations'>('supporters');
  const [pendingDonationId, setPendingDonationId] = useState<number | null>(null);

  useEffect(() => {
    if (locationState?.tab === 'contributions' || locationState?.tab === 'allocations') {
      setActiveTab('contributions');
    }
    if (locationState?.donationId) {
      setPendingDonationId(locationState.donationId);
    }
  }, [location.key]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // shared
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [page,       setPage]       = useState(1);
  const [pageSize,   setPageSize]   = useState(20);
  const [allocationPageSize, setAllocationPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [saving,     setSaving]     = useState(false);
  const [filterOptions, setFilterOptions] = useState<DonorFilterOptions | null>(null);
  const [searchInput,   setSearchInput]   = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // supporters
  const [supporters,          setSupporters]         = useState<Supporter[]>([]);
  const [supporterFilters,    setSupporterFilters]    = useState<SupporterFilters>({});
  const [selectedSupporter,   setSelectedSupporter]   = useState<Supporter | null>(null);
  const [editSupData,         setEditSupData]         = useState<Supporter | null>(null);
  const [isEditingSup,        setIsEditingSup]        = useState(false);
  const [isAddingSup,         setIsAddingSup]         = useState(false);
  const [newSupData,          setNewSupData]          = useState<Supporter>({ ...blankSupporter });

  // contributions
  const [contributions,       setContributions]       = useState<Contribution[]>([]);
  const [contributionFilters, setContributionFilters] = useState<ContributionFilters>({});
  const [selectedContribution,setSelectedContribution]= useState<Contribution | null>(null);
  const [editConData,         setEditConData]         = useState<Contribution | null>(null);
  const [isEditingCon,        setIsEditingCon]        = useState(false);
  const [isAddingCon,         setIsAddingCon]         = useState(false);
  const [newConData,          setNewConData]          = useState<Contribution>({ ...blankContribution });

  // delete confirmations
  const [showDeleteSupConfirm, setShowDeleteSupConfirm] = useState(false);
  const [showDeleteConConfirm, setShowDeleteConConfirm] = useState(false);

  // ── Debounce search ─────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (activeTab === 'supporters') {
      setSupporterFilters((p) => ({ ...p, search: debouncedSearch || undefined }));
    } else {
      setContributionFilters((p) => ({ ...p, search: debouncedSearch || undefined }));
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

    if (!sessionReady || !isAuthenticated) return;
    setLoading(true);
    setError(null);
    if (activeTab === 'supporters') {
      fetchSupporters(page, pageSize, supporterFilters)
        .then((res) => {
          console.log("Supporters from API:", res.data); // 👈 ADD THIS LINE
          setSupporters(res.data);
          setTotalPages(res.totalPages);
          setTotalCount(res.totalCount);
        })
                
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else {
      fetchContributions(page, pageSize, contributionFilters)
        .then((res) => { setContributions(res.data); setTotalPages(res.totalPages); setTotalCount(res.totalCount); })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => { loadData(); }, [activeTab, page, pageSize, supporterFilters, contributionFilters, isAuthenticated, sessionReady]);

  // ── Open contribution modal from navigation state ───────────────────────
  useEffect(() => {
    if (pendingDonationId && contributions.length > 0) {
      const match = contributions.find((c) => c.donationId === pendingDonationId);
      if (match) {
        openContribution(match);
        setPendingDonationId(null);
      }
    }
  }, [pendingDonationId, contributions]);

  // ── Tab switch resets ────────────────────────────────────────────────────
  const switchTab = (tab: 'supporters' | 'contributions' | 'allocations') => {
    setActiveTab(tab);
    setPage(1);
    setSearchInput('');
    setDebouncedSearch('');
  };

  const ANONYMOUS_SUPPORTER_ID = 62;

  // ── Supporter filter helpers ─────────────────────────────────────────────
  const updateSupporterFilter = (key: keyof SupporterFilters, value: string | undefined) => {
    setSupporterFilters((p) => { const n = { ...p }; if (value) (n as Record<string,unknown>)[key] = value; else delete (n as Record<string,unknown>)[key]; return n; });
    setPage(1);
  };

  const setSupporterTypeFilter = (t: string | undefined) => {
    if (t === 'Anonymous') {
      setSupporterFilters((p) => ({ ...p, supporterId: ANONYMOUS_SUPPORTER_ID, supporterType: undefined }));
    } else if (t) {
      setSupporterFilters((p) => ({ ...p, supporterType: t, supporterId: undefined }));
    } else {
      setSupporterFilters((p) => { const { supporterType: _t, supporterId: _id, ...rest } = p; void _t; void _id; return rest; });
    }
    setPage(1);
  };
  const clearSupporterFilters = () => {
    setSupporterFilters({});
    setSearchInput('');
    setDebouncedSearch('');
    setPage(1);
  };
  const hasSupporterFilters = !!(supporterFilters.status || supporterFilters.search);

  // ── Contribution filter helpers ──────────────────────────────────────────
  const updateContributionFilter = (key: keyof ContributionFilters, value: string | undefined) => {
    setContributionFilters((p) => { const n = { ...p }; if (value) (n as Record<string,unknown>)[key] = value; else delete (n as Record<string,unknown>)[key]; return n; });
    setPage(1);
  };
  const clearContributionFilters = () => {
    setContributionFilters({});
    setSearchInput('');
    setDebouncedSearch('');
    setPage(1);
  };
  const hasContributionFilters = !!(
    contributionFilters.status || contributionFilters.programArea ||
    contributionFilters.safehouseAllocation || contributionFilters.search
  );

  // ── Supporter modal handlers ─────────────────────────────────────────────
  const openSupporter = (s: Supporter) => { setSelectedSupporter(s); setEditSupData({ ...s }); setIsEditingSup(false); };
  const closeSupporter = () => { setSelectedSupporter(null); setEditSupData(null); setIsEditingSup(false); };
  const handleSaveSupporter = async () => {
    if (!editSupData) return;
    setSaving(true);
    try {
      const updated = await updateSupporter(editSupData.supporterId, editSupData);
      setSelectedSupporter(updated);
      setEditSupData({ ...updated });
      setIsEditingSup(false);
      loadData();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed to save'); }
    finally { setSaving(false); }
  };
  const handleDeleteSupporter = async () => {
    if (!selectedSupporter) return;
    console.log("Deleting supporter ID:", selectedSupporter?.supporterId);
    setSaving(true);
    try { await deleteSupporter(selectedSupporter.supporterId); closeSupporter(); loadData(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed to delete'); }
    finally { setSaving(false); }
  };
  const openAddSupporter = () => { setNewSupData({ ...blankSupporter }); setIsAddingSup(true); };
  const closeAddSupporter = () => setIsAddingSup(false);
  const handleCreateSupporter = async () => {
    const missing = supporterRequired.filter((f) => !newSupData[f.key]);
    if (missing.length) { alert(`Fill in required fields:\n${missing.map((f) => f.label).join(', ')}`); return; }
    setSaving(true);
    try { await createSupporter(newSupData); closeAddSupporter(); loadData(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed to create'); }
    finally { setSaving(false); }
  };

  // ── Contribution modal handlers ──────────────────────────────────────────
  const openContribution = (c: Contribution) => { setSelectedContribution(c); setEditConData({ ...c }); setIsEditingCon(false); };
  const closeContribution = () => { setSelectedContribution(null); setEditConData(null); setIsEditingCon(false); };
  const handleSaveContribution = async () => {
    if (!editConData) return;
    setSaving(true);
    try {
      const updated = await updateContribution(editConData.donationId, editConData);
      setSelectedContribution(updated);
      setEditConData({ ...updated });
      setIsEditingCon(false);
      loadData();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed to save'); }
    finally { setSaving(false); }
  };
  const handleDeleteContribution = async () => {
    if (!selectedContribution) return;
    setSaving(true);
    try { await deleteContribution(selectedContribution.donationId); closeContribution(); loadData(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed to delete'); }
    finally { setSaving(false); }
  };
  const openAddContribution = () => {
    setNewConData({ ...blankContribution, donationDate: new Date().toISOString().slice(0, 10) });
    setIsAddingCon(true);
  };
  const closeAddContribution = () => setIsAddingCon(false);
  const handleCreateContribution = async () => {
    const missing = contributionRequired.filter((f) => {
      const v = newConData[f.key];
      return v === null || v === undefined || v === '' || v === 0;
    });
    if (missing.length) { alert(`Fill in required fields:\n${missing.map((f) => f.label).join(', ')}`); return; }
    setSaving(true);
    try { await createContribution(newConData); closeAddContribution(); loadData(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed to create'); }
    finally { setSaving(false); }
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
      return <span className="text-sm text-gray-500 dark:text-gray-400 italic">{isCreate ? 'Auto-generated' : formatCell(value)}</span>;
    }
    const sel = sSelectMap[col.key];
    if (sel) {
      return (
        <select className="select-field" value={value === null || value === undefined ? '' : String(value)} onChange={(e) => onChange(col.key, e.target.value || null)}>
          {sel.nullable && <option value="">-- None --</option>}
          {sel.opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (sTextarea.includes(col.key)) {
      return <textarea className="input-field" rows={3} value={value === null || value === undefined ? '' : String(value)} onChange={(e) => onChange(col.key, e.target.value || null)} />;
    }
    return <input className="input-field" type="text" value={value === null || value === undefined ? '' : String(value)} onChange={(e) => onChange(col.key, e.target.value || null)} />;
  };

  const renderContributionInput = (
    col: CFieldDef,
    data: Contribution,
    onChange: (k: keyof Contribution, v: unknown) => void,
    isCreate = false
  ) => {
    const value = data[col.key];
    if (cReadOnly.includes(col.key)) {
      return <span className="text-sm text-gray-500 dark:text-gray-400 italic">{isCreate ? 'Auto-generated' : formatCell(value)}</span>;
    }
    if (cBoolean.includes(col.key)) {
      return <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500" checked={!!value} onChange={(e) => onChange(col.key, e.target.checked)} />;
    }
    if (cDate.includes(col.key)) {
      return <input className="input-field" type="date" value={value === null || value === undefined ? '' : String(value).slice(0, 10)} onChange={(e) => onChange(col.key, e.target.value || null)} />;
    }
    const sel = cSelectMap[col.key];
    if (sel) {
      return (
        <select className="select-field" value={value === null || value === undefined ? '' : String(value)} onChange={(e) => onChange(col.key, e.target.value || null)}>
          {sel.nullable && <option value="">-- None --</option>}
          {!sel.nullable && !value && <option value="">-- Select --</option>}
          {sel.opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (cNumber.includes(col.key)) {
      return <input className="input-field" type="number" value={value === null || value === undefined ? '' : String(value)} onChange={(e) => onChange(col.key, e.target.value ? Number(e.target.value) : null)} />;
    }
    if (cTextarea.includes(col.key)) {
      return <textarea className="input-field" rows={3} value={value === null || value === undefined ? '' : String(value)} onChange={(e) => onChange(col.key, e.target.value || null)} />;
    }
    return <input className="input-field" type="text" value={value === null || value === undefined ? '' : String(value)} onChange={(e) => onChange(col.key, e.target.value || null)} />;
  };

  // ── Sidebar active type ──────────────────────────────────────────────────
  const activeSupporterType = supporterFilters.supporterId === 62 ? 'Anonymous' : supporterFilters.supporterType;
  const activeDonationType    = contributionFilters.donationType;

  // ── Access denied ────────────────────────────────────────────────────────
  const accessDeniedScreen = (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-10 text-center shadow-md">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <X className="h-8 w-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Staff Access Only</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">This section is restricted to authenticated staff and administrators.</p>
        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">Please log in to access the Donors &amp; Contributions portal.</p>
      </div>
    </div>
  );

  return (
    <>
      {!isAuthenticated ? accessDeniedScreen : (
        <div className="flex flex-col lg:flex-row">

          {/* ── SIDEBAR ───────────────────────────────────────────────────── */}
          <aside className={`w-full shrink-0 border-b border-gray-200 bg-white transition-all duration-200 dark:border-gray-700 dark:bg-gray-900 lg:border-b-0 lg:border-r ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-60'}`}>
            {/* Header with collapse toggle */}
            <div className={`flex items-center pt-6 pb-2 ${sidebarCollapsed ? 'lg:justify-center lg:px-2 px-5' : 'justify-between px-5'}`}>
              {!sidebarCollapsed && (
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {activeTab === 'supporters' ? 'Supporter Type' : 'Donation Type'}
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
                {activeTab === 'supporters' ? (
                  <>
                    <li>
                      <button
                        title={sidebarCollapsed ? 'All Types' : undefined}
                        className={`flex w-full min-w-max items-center gap-3 whitespace-nowrap rounded-lg py-2 text-sm font-medium transition lg:min-w-0 ${
                          sidebarCollapsed ? 'lg:justify-center lg:px-2 px-3' : 'px-3 text-left'
                        } ${!activeSupporterType ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-700' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}
                        onClick={() => setSupporterTypeFilter(undefined)}
                      >
                        <Filter className="h-4 w-4 shrink-0" />
                        <span className={sidebarCollapsed ? 'lg:hidden' : ''}>All Types</span>
                      </button>
                    </li>
                    {(filterOptions?.supporterTypes ?? SUPPORTER_TYPES).map((t) => (
                      <li key={t}>
                        <button
                          title={sidebarCollapsed ? t : undefined}
                          className={`flex w-full min-w-max items-center gap-3 whitespace-nowrap rounded-lg py-2 text-sm font-medium transition lg:min-w-0 ${
                            sidebarCollapsed ? 'lg:justify-center lg:px-2 px-3' : 'px-3 text-left'
                          } ${activeSupporterType?.toLowerCase() === t.toLowerCase() ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-700' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}
                          onClick={() => setSupporterTypeFilter(t)}
                        >
                          <SupporterIcon type={t} />
                          <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{t}</span>
                        </button>
                      </li>
                    ))}
                  </>
                ) : (
                  <>
                    <li>
                      <button
                        title={sidebarCollapsed ? 'All Types' : undefined}
                        className={`flex w-full min-w-max items-center gap-3 whitespace-nowrap rounded-lg py-2 text-sm font-medium transition lg:min-w-0 ${
                          sidebarCollapsed ? 'lg:justify-center lg:px-2 px-3' : 'px-3 text-left'
                        } ${!activeDonationType ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-700' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}
                        onClick={() => updateContributionFilter('donationType', undefined)}
                      >
                        <Filter className="h-4 w-4 shrink-0" />
                        <span className={sidebarCollapsed ? 'lg:hidden' : ''}>All Types</span>
                      </button>
                    </li>
                    {DONATION_TYPES.map((t) => (
                      <li key={t}>
                        <button
                          title={sidebarCollapsed ? t : undefined}
                          className={`flex w-full min-w-max items-center gap-3 whitespace-nowrap rounded-lg py-2 text-sm font-medium transition lg:min-w-0 ${
                            sidebarCollapsed ? 'lg:justify-center lg:px-2 px-3' : 'px-3 text-left'
                          } ${activeDonationType === t ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-700' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}
                          onClick={() => updateContributionFilter('donationType', t)}
                        >
                          <TypeIcon type={t} />
                          <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{t}</span>
                        </button>
                      </li>
                    ))}
                  </>
                )}
              </ul>
            </div>
          </aside>

          {/* ── MAIN ──────────────────────────────────────────────────────── */}
          <div className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">

            {/* Header */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeTab === 'supporters' ? 'Supporter Profiles' : activeTab === 'contributions' ? 'Contribution Activity' : 'Allocations'}
              </h1>
              <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto lg:justify-end">
                <Link to="/donor-analytics" className="btn-secondary w-full no-underline sm:w-auto">
                  <BarChart3 className="h-4 w-4" /> Analytics
                </Link>

                {/* Tab toggle */}
                <div className="w-full overflow-x-auto lg:w-auto">
                  <div className="inline-flex min-w-max overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
                  <button
                    className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition ${activeTab === 'supporters' ? 'bg-orange-500 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    onClick={() => switchTab('supporters')}
                  >
                    <Users className="h-4 w-4" /> Supporters
                  </button>
                  <button
                    className={`inline-flex items-center gap-1.5 border-l border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium transition ${activeTab === 'contributions' ? 'bg-orange-500 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    onClick={() => switchTab('contributions')}
                  >
                    <DollarSign className="h-4 w-4" /> Contributions
                  </button>
                  <button
                    className={`inline-flex items-center gap-1.5 border-l border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium transition ${activeTab === 'allocations' ? 'bg-orange-500 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    onClick={() => switchTab('allocations')}
                  >
                    <Filter className="h-4 w-4" /> Allocations
                  </button>
                  </div>
                </div>

                {/* Action button */}
                {activeTab === 'supporters' ? (
                  <button className="btn-primary w-full sm:w-auto" onClick={openAddSupporter}>
                    <Plus className="h-4 w-4" /> Add Supporter
                  </button>
                ) : activeTab === 'contributions' ? (
                  <button className="btn-primary w-full sm:w-auto" onClick={openAddContribution}>
                    <Plus className="h-4 w-4" /> Record Contribution
                  </button>
                ) : activeTab === 'allocations' ? (
                  <>
                    <button className="btn-primary w-full sm:w-auto" onClick={() => allocationPageRef.current?.openCreate()}>
                      <Plus className="h-4 w-4" /> Add Allocation
                    </button>
                    <label className="flex w-full items-center gap-2 text-sm text-gray-600 dark:text-gray-400 sm:w-auto">
                      Per page:
                      <select
                        className="select-field w-full sm:w-auto"
                        value={allocationPageSize}
                        onChange={(e) => setAllocationPageSize(Number(e.target.value))}
                        aria-label="Allocations per page"
                      >
                        {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </label>
                  </>
                ) : null}

                {/* Page size */}
                {activeTab !== 'allocations' && (
                  <label className="flex w-full items-center gap-2 text-sm text-gray-600 dark:text-gray-400 sm:w-auto">
                    Per page:
                    <select className="select-field w-full sm:w-auto" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} aria-label={activeTab === 'supporters' ? 'Supporters per page' : 'Contributions per page'}>
                      {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                )}
              </div>
            </div>

            {/* Filter bar */}
            {activeTab !== 'allocations' && (
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    className="input-field pl-9"
                    type="text"
                    placeholder={activeTab === 'supporters' ? 'Search by name, email, organization...' : 'Search by supporter, type, description...'}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    aria-label={activeTab === 'supporters' ? 'Search supporters' : 'Search contributions'}
                  />
                </div>

                {filterOptions && activeTab === 'supporters' && (
                  <div className="flex items-center gap-2">
                    <select className="select-field w-auto" value={supporterFilters.status || ''} onChange={(e) => updateSupporterFilter('status', e.target.value || undefined)} aria-label="Filter supporters by status">
                      <option value="">All Statuses</option>
                      {filterOptions.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {hasSupporterFilters && (
                      <button className="btn-ghost text-orange-600" onClick={clearSupporterFilters}>
                        <X className="h-4 w-4" /> Clear
                      </button>
                    )}
                  </div>
                )}

                {filterOptions && activeTab === 'contributions' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <select className="select-field w-auto" value={contributionFilters.status || ''} onChange={(e) => updateContributionFilter('status', e.target.value || undefined)} aria-label="Filter contributions by status">
                      <option value="">All Statuses</option>
                      {filterOptions.contributionStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select className="select-field w-auto" value={contributionFilters.programArea || ''} onChange={(e) => updateContributionFilter('programArea', e.target.value || undefined)} aria-label="Filter contributions by program area">
                      <option value="">All Program Areas</option>
                      {filterOptions.programAreas.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select className="select-field w-auto" value={contributionFilters.safehouseAllocation || ''} onChange={(e) => updateContributionFilter('safehouseAllocation', e.target.value || undefined)} aria-label="Filter contributions by safehouse">
                      <option value="">All Safehouses</option>
                      {filterOptions.safehouseAllocations.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                    {hasContributionFilters && (
                      <button className="btn-ghost text-orange-600" onClick={clearContributionFilters}>
                        <X className="h-4 w-4" /> Clear
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {loading && <p className="py-10 text-center text-sm text-gray-500">Loading...</p>}
            {error   && <p className="py-10 text-center text-sm text-red-500">Error: {error}</p>}

            {/* ── SUPPORTERS TABLE ───────────────────────────────────────── */}
            {activeTab === 'supporters' && !loading && !error && (
              <>
                {supporters.length === 0
                  ? <p className="py-10 text-center text-sm text-gray-500">No supporters found.</p>
                  : (
                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-md">
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
                          {supporters.map((s) => (
                            <tr key={s.supporterId} className="cursor-pointer" onClick={() => openSupporter(s)}>
                              <td>{s.supporterId}</td>
                              <td className="font-medium text-gray-900 dark:text-white">{s.firstName} {s.lastName}</td>
                              <td>
                                <span className="inline-flex items-center gap-1.5">
                                  <SupporterIcon type={s.supporterType} /> {s.supporterType}
                                </span>
                              </td>
                              <td><span className={badgeClass(s.status)}>{s.status}</span></td>
                              <td>{s.email}</td>
                              <td>{formatCell(s.organizationName)}</td>
                              <td>{s.createdAt ? s.createdAt.slice(0, 10) : '--'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                }
              </>
            )}

            {/* ── CONTRIBUTIONS TABLE ────────────────────────────────────── */}
            {activeTab === 'contributions' && !loading && !error && (
              <>
                {contributions.length === 0
                  ? <p className="py-10 text-center text-sm text-gray-500">No contributions found.</p>
                  : (
                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-md">
                      <table className="table-base">
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
                            <tr key={c.donationId} className="cursor-pointer" onClick={() => openContribution(c)}>
                              <td>{c.donationId}</td>
                              <td>{c.donationDate}</td>
                              <td className="font-medium text-gray-900 dark:text-white">{c.supporterName}</td>
                              <td>
                                <span className="inline-flex items-center gap-1.5">
                                  <TypeIcon type={c.donationType} /> {c.donationType}
                                </span>
                              </td>
                              <td>{c.donationType === 'Monetary' ? formatAmount(c.amount) : (c.estimatedValue ? `~${formatAmount(c.estimatedValue)}` : '--')}</td>
                              <td>{formatCell(c.programArea)}</td>
                              <td><span className={badgeClass(c.status)}>{c.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                }
              </>
            )}

            {/* ── ALLOCATIONS TAB ───────────────────────────────────────── */}
            {activeTab === 'allocations' && (
              <AllocationPage
                ref={allocationPageRef}
                pageSize={allocationPageSize}
                onPageSizeChange={setAllocationPageSize}
                showPageSizeControl={false}
              />
            )}

            {/* Pagination */}
            {((activeTab === 'supporters' && supporters.length > 0) || (activeTab === 'contributions' && contributions.length > 0)) && (
              <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 shadow-md">
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
          </div>
        </div>
      )}

      {/* ── VIEW / EDIT SUPPORTER MODAL ──────────────────────────────────────── */}
      {selectedSupporter && editSupData && createPortal(
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="supporter-dialog-title" onClick={closeSupporter}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            {/* Top bar */}
            <div className="mb-6 flex items-start gap-4 border-b border-gray-100 pb-5 dark:border-gray-700">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-500/10">
                <SupporterIcon type={selectedSupporter.supporterType} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="supporter-dialog-title" className="text-lg font-bold text-gray-900 dark:text-white">{selectedSupporter.firstName} {selectedSupporter.lastName}</h2>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {selectedSupporter.supporterType}
                  {selectedSupporter.organizationName ? ` / ${selectedSupporter.organizationName}` : ''}
                  {' '}
                  <span className={badgeClass(selectedSupporter.status)}>{selectedSupporter.status}</span>
                </p>
              </div>
              <div className="ml-4 flex items-center gap-2">
                {isEditingSup ? (
                  <>
                    <button
                      className="inline-flex items-center justify-center rounded-lg bg-orange-500 p-2 text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 cursor-pointer"
                      onClick={handleSaveSupporter}
                      disabled={saving}
                      aria-label={saving ? 'Saving record' : 'Save record'}
                      title="Save"
                    >
                      {saving ? <span className="text-xs font-medium">Saving...</span> : <Check size={16} />}
                    </button>
                    <button
                      className="inline-flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-2 text-gray-600 dark:text-gray-400 transition hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 cursor-pointer"
                      onClick={() => { setEditSupData({ ...selectedSupporter }); setIsEditingSup(false); }}
                      disabled={saving}
                      aria-label="Cancel editing"
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn-icon"
                      onClick={() => setIsEditingSup(true)}
                      aria-label="Edit record"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="inline-flex items-center justify-center rounded-lg p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 disabled:opacity-50 cursor-pointer"
                      onClick={() => setShowDeleteSupConfirm(true)}
                      aria-label="Delete record"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
              {!isEditingSup && (
                <button
                  className="ml-2 inline-flex items-center justify-center rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                  onClick={closeSupporter}
                  aria-label="Close dialog"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Sections */}
            {supporterSections.map((sec) => (
              <div className="mb-6" key={sec.title}>
                <h3 className="mb-3 border-b border-gray-100 dark:border-gray-700 pb-2 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{sec.title}</h3>
                <div className="grid grid-cols-1 gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-2 dark:bg-white/5">
                  {sec.fields.map((col) => (
                    <div className="flex flex-col gap-1.5" key={col.key}>
                      <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{col.label}</label>
                      {isEditingSup
                        ? renderSupporterInput(col, editSupData, (k, v) => setEditSupData((p) => ({ ...p!, [k]: v })))
                        : <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCell(selectedSupporter[col.key])}</span>
                      }
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
      {isAddingSup && createPortal(
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="new-supporter-dialog-title" onClick={closeAddSupporter}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            {/* Top bar */}
            <div className="mb-6 flex items-start gap-4 border-b border-gray-100 pb-5 dark:border-gray-700">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-500/10">
                <Users className="h-5 w-5 text-orange-500" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="new-supporter-dialog-title" className="text-lg font-bold text-gray-900 dark:text-white">New Supporter</h2>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Add a new supporter profile</p>
              </div>
              <div className="ml-4 flex items-center gap-2">
                <button
                  className="inline-flex items-center justify-center rounded-lg bg-orange-500 p-2 text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 cursor-pointer"
                  onClick={handleCreateSupporter}
                  disabled={saving}
                  aria-label={saving ? 'Creating record' : 'Create record'}
                  title="Create"
                >
                  {saving ? <span className="text-xs font-medium">Creating...</span> : <Check size={16} />}
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-2 text-gray-600 dark:text-gray-400 transition hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 cursor-pointer"
                  onClick={closeAddSupporter}
                  disabled={saving}
                  aria-label="Cancel creating record"
                  title="Cancel"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Sections */}
            {supporterSections.map((sec) => (
              <div className="mb-6" key={sec.title}>
                <h3 className="mb-3 border-b border-gray-100 dark:border-gray-700 pb-2 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{sec.title}</h3>
                <div className="grid grid-cols-1 gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-2 dark:bg-white/5">
                  {sec.fields.map((col) => (
                    <div className="flex flex-col gap-1.5" key={col.key}>
                      <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{col.label}</label>
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

      {/* ── VIEW / EDIT CONTRIBUTION MODAL ───────────────────────────────────── */}
      {selectedContribution && editConData && createPortal(
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="contribution-dialog-title" onClick={closeContribution}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            {/* Top bar */}
            <div className="mb-6 flex items-start gap-4 border-b border-gray-100 pb-5 dark:border-gray-700">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-500/10">
                <TypeIcon type={selectedContribution.donationType} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="contribution-dialog-title" className="text-lg font-bold text-gray-900 dark:text-white">{selectedContribution.supporterName}</h2>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {selectedContribution.donationType} / {selectedContribution.donationDate}
                  {' '}
                  <span className={badgeClass(selectedContribution.status)}>{selectedContribution.status}</span>
                </p>
              </div>
              <div className="ml-4 flex items-center gap-2">
                {isEditingCon ? (
                  <>
                    <button
                      className="inline-flex items-center justify-center rounded-lg bg-orange-500 p-2 text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 cursor-pointer"
                      onClick={handleSaveContribution}
                      disabled={saving}
                      aria-label={saving ? 'Saving record' : 'Save record'}
                      title="Save"
                    >
                      {saving ? <span className="text-xs font-medium">Saving...</span> : <Check size={16} />}
                    </button>
                    <button
                      className="inline-flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-2 text-gray-600 dark:text-gray-400 transition hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 cursor-pointer"
                      onClick={() => { setEditConData({ ...selectedContribution }); setIsEditingCon(false); }}
                      disabled={saving}
                      aria-label="Cancel editing"
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn-icon"
                      onClick={() => setIsEditingCon(true)}
                      aria-label="Edit record"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="inline-flex items-center justify-center rounded-lg p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 disabled:opacity-50 cursor-pointer"
                      onClick={() => setShowDeleteConConfirm(true)}
                      aria-label="Delete record"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
              {!isEditingCon && (
                <button
                  className="ml-2 inline-flex items-center justify-center rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                  onClick={closeContribution}
                  aria-label="Close dialog"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Sections */}
            {contributionSections.map((sec) => (
              <div className="mb-6" key={sec.title}>
                <h3 className="mb-3 border-b border-gray-100 dark:border-gray-700 pb-2 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{sec.title}</h3>
                <div className="grid grid-cols-1 gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-2 dark:bg-white/5">
                  {sec.fields.map((col) => (
                    <div className="flex flex-col gap-1.5" key={col.key}>
                      <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{col.label}</label>
                      {isEditingCon
                        ? renderContributionInput(col, editConData, (k, v) => setEditConData((p) => ({ ...p!, [k]: v })))
                        : <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCell(selectedContribution[col.key])}</span>
                      }
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
      {isAddingCon && createPortal(
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="new-contribution-dialog-title" onClick={closeAddContribution}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            {/* Top bar */}
            <div className="mb-6 flex items-start gap-4 border-b border-gray-100 pb-5 dark:border-gray-700">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-500/10">
                <DollarSign className="h-5 w-5 text-orange-500" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="new-contribution-dialog-title" className="text-lg font-bold text-gray-900 dark:text-white">Record Contribution</h2>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Log a new donation or contribution</p>
              </div>
              <div className="ml-4 flex items-center gap-2">
                <button
                  className="inline-flex items-center justify-center rounded-lg bg-orange-500 p-2 text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 cursor-pointer"
                  onClick={handleCreateContribution}
                  disabled={saving}
                  aria-label={saving ? 'Creating record' : 'Create record'}
                  title="Create"
                >
                  {saving ? <span className="text-xs font-medium">Creating...</span> : <Check size={16} />}
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-2 text-gray-600 dark:text-gray-400 transition hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 cursor-pointer"
                  onClick={closeAddContribution}
                  disabled={saving}
                  aria-label="Cancel creating record"
                  title="Cancel"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Sections */}
            {contributionSections.map((sec) => (
              <div className="mb-6" key={sec.title}>
                <h3 className="mb-3 border-b border-gray-100 dark:border-gray-700 pb-2 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{sec.title}</h3>
                <div className="grid grid-cols-1 gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-2 dark:bg-white/5">
                  {sec.fields.map((col) => (
                    <div className="flex flex-col gap-1.5" key={col.key}>
                      <label className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{col.label}</label>
                      {renderContributionInput(col, newConData, (k, v) => setNewConData((p) => ({ ...p, [k]: v })), true)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* ── DELETE SUPPORTER CONFIRMATION ────────────────────────────────────────── */}
      {showDeleteSupConfirm && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" role="alertdialog" aria-modal="true" onClick={() => setShowDeleteSupConfirm(false)}>
          <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Supporter</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Are you sure you want to delete this supporter? This action cannot be undone.</p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button className="btn-secondary" onClick={() => setShowDeleteSupConfirm(false)}>Cancel</button>
              <button className="btn-danger" onClick={() => { setShowDeleteSupConfirm(false); handleDeleteSupporter(); }}>Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── DELETE CONTRIBUTION CONFIRMATION ─────────────────────────────────────── */}
      {showDeleteConConfirm && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" role="alertdialog" aria-modal="true" onClick={() => setShowDeleteConConfirm(false)}>
          <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Contribution</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Are you sure you want to delete this contribution? This action cannot be undone.</p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button className="btn-secondary" onClick={() => setShowDeleteConConfirm(false)}>Cancel</button>
              <button className="btn-danger" onClick={() => { setShowDeleteConConfirm(false); handleDeleteContribution(); }}>Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
