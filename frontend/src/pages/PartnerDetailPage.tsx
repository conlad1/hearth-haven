import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Pencil, Trash2, X, Save, Plus,
  ChevronLeft, ChevronRight, Filter,
} from 'lucide-react';
import { Partner } from '../types/Partner';
import { Safehouse } from '../types/Safehouse';
import { PartnerAssignment } from '../types/PartnerAssignment';
import RecordModal, { RecordFieldDef } from '../components/RecordModal';
import ConfirmModal from '../components/ConfirmModal';
import AlertModal from '../components/AlertModal';
import {
  fetchPartner, updatePartner, deletePartner,
  fetchPartnerSafehouses, fetchSafehouses,
  fetchAssignmentFilterOptions, createAssignment, updateAssignment, deleteAssignment,
  AssignmentFilters, AssignmentFilterOptions,
} from '../api/NetworkAPI';

// -- Field configs --

type FieldDef = { key: keyof Partner; label: string };
interface FieldSection { title: string; fields: FieldDef[] }

const detailSections: FieldSection[] = [
  {
    title: 'Partner Information',
    fields: [
      { key: 'partnerId', label: 'ID' },
      { key: 'partnerName', label: 'Name' },
      { key: 'partnerType', label: 'Type' },
      { key: 'roleType', label: 'Role' },
      { key: 'contactName', label: 'Contact Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'region', label: 'Region' },
      { key: 'status', label: 'Status' },
      { key: 'startDate', label: 'Start Date' },
      { key: 'endDate', label: 'End Date' },
    ],
  },
  {
    title: 'Notes',
    fields: [{ key: 'notes', label: 'Notes' }],
  },
];

const readOnlyFields: (keyof Partner)[] = ['partnerId'];
const dateFields: (keyof Partner)[] = ['startDate', 'endDate'];
const textareaFields: (keyof Partner)[] = ['notes'];

const selectFieldMap: Record<string, { options: string[]; nullable: boolean }> = {
  partnerType: { options: ['Organization', 'Individual'], nullable: false },
  roleType: { options: ['Education', 'Evaluation', 'SafehouseOps', 'FindSafehouse', 'Logistics', 'Transport', 'Maintenance'], nullable: false },
  status: { options: ['Active', 'Inactive'], nullable: false },
};

const programAreas = ['Education', 'Wellbeing', 'Operations', 'Transport', 'Maintenance'];
const assignmentStatuses = ['Active', 'Ended'];

const assignmentColumns = [
  { key: 'safehouseName', label: 'Safehouse' },
  { key: 'programArea', label: 'Program Area' },
  { key: 'assignmentStart', label: 'Start' },
  { key: 'assignmentEnd', label: 'End' },
  { key: 'isPrimary', label: 'Primary' },
  { key: 'status', label: 'Status' },
];

function fmt(value: unknown): string {
  if (value === null || value === undefined) return '\u2014';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

type TabKey = 'details' | 'safehouses';
const tabList: { key: TabKey; label: string }[] = [
  { key: 'details', label: 'Details' },
  { key: 'safehouses', label: 'Assigned Safehouses' },
];

export default function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const backTo = (location.state as { from?: string })?.from || '/safehouse-management';
  const backLabel = backTo === '/admin' ? 'Back to Dashboard' : 'Back to Safehouse Management';
  const partnerId = Number(id);

  // -- Partner state --
  const [partner, setPartner] = useState<Partner | null>(null);
  const [editData, setEditData] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null);

  // -- Safehouses tab state --
  const [assignments, setAssignments] = useState<PartnerAssignment[]>([]);
  const [aLoading, setALoading] = useState(false);
  const [aPage, setAPage] = useState(1);
  const [aTotalPages, setATotalPages] = useState(1);
  const [aTotalCount, setATotalCount] = useState(0);
  const [aFilters, setAFilters] = useState<AssignmentFilters>({});
  const [aFilterOpts, setAFilterOpts] = useState<AssignmentFilterOptions | null>(null);

  // -- Record modal state --
  const [recordModal, setRecordModal] = useState<{
    mode: 'view' | 'edit' | 'create';
    data: Record<string, unknown>;
    original?: Record<string, unknown>;
  } | null>(null);
  const [recordSaving, setRecordSaving] = useState(false);

  // -- Safehouse list for dropdown --
  const [allSafehouses, setAllSafehouses] = useState<Safehouse[]>([]);

  // -- Load partner --
  useEffect(() => {
    setLoading(true);
    fetchPartner(partnerId)
      .then((p) => { setPartner(p); setEditData({ ...p }); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [partnerId]);

  // -- Load assignment filter options + safehouse list --
  useEffect(() => {
    fetchAssignmentFilterOptions().then(setAFilterOpts).catch(console.error);
    fetchSafehouses(1, 500).then((res) => setAllSafehouses(res.data)).catch(console.error);
  }, []);

  // -- Load assignments --
  const loadAssignments = () => {
    setALoading(true);
    fetchPartnerSafehouses(partnerId, aPage, 20, aFilters)
      .then((res) => { setAssignments(res.data); setATotalPages(res.totalPages); setATotalCount(res.totalCount); })
      .catch(console.error)
      .finally(() => setALoading(false));
  };
  useEffect(() => { loadAssignments(); }, [partnerId, aPage, aFilters]);

  // -- Edit handlers --
  const startEdit = () => { setEditData(partner ? { ...partner } : null); setIsEditing(true); };
  const cancelEdit = () => { setEditData(partner ? { ...partner } : null); setIsEditing(false); };

  const handleSave = async () => {
    if (!editData) return;
    setSaving(true);
    try {
      const updated = await updatePartner(partnerId, editData);
      setPartner(updated);
      setEditData({ ...updated });
      setIsEditing(false);
    } catch (err) {
      setAlertModal({ title: 'Error', message: err instanceof Error ? err.message : 'Failed to update partner' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deletePartner(partnerId);
      navigate('/safehouse-management');
    } catch (err) {
      setAlertModal({ title: 'Error', message: err instanceof Error ? err.message : 'Failed to delete partner' });
    }
  };

  const handleFieldChange = (key: keyof Partner, value: unknown) => {
    setEditData((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  // -- Assignment modal --
  const safehouseSelectOptions = allSafehouses.map((s) => ({
    value: String(s.safehouseId),
    label: s.name,
  }));

  const getAssignmentFields = (): RecordFieldDef[] => [
    { key: 'safehouseId', label: 'Safehouse', type: 'select', selectOptions: safehouseSelectOptions, required: true },
    { key: 'programArea', label: 'Program Area', type: 'select', options: programAreas, required: true },
    { key: 'assignmentStart', label: 'Start Date', type: 'date', required: true },
    { key: 'assignmentEnd', label: 'End Date', type: 'date' },
    { key: 'responsibilityNotes', label: 'Responsibility Notes', type: 'textarea' },
    { key: 'isPrimary', label: 'Primary Contact', type: 'checkbox' },
    { key: 'status', label: 'Status', type: 'select', options: assignmentStatuses, required: true },
  ];

  const openAssignmentCreate = () => {
    setRecordModal({
      mode: 'create',
      data: {
        partnerId, safehouseId: null, programArea: '', assignmentStart: new Date().toISOString().slice(0, 10),
        assignmentEnd: null, responsibilityNotes: null, isPrimary: false, status: 'Active',
      },
    });
  };

  const openAssignmentView = (a: PartnerAssignment) => {
    setRecordModal({ mode: 'view', data: { ...a }, original: { ...a } });
  };

  const handleRecordSave = async () => {
    if (!recordModal) return;
    setRecordSaving(true);
    try {
      if (recordModal.mode === 'create') {
        await createAssignment(recordModal.data as Partial<PartnerAssignment>);
      } else {
        await updateAssignment(
          recordModal.data.assignmentId as number,
          recordModal.data as unknown as PartnerAssignment
        );
      }
      setRecordModal(null);
      loadAssignments();
    } catch (err) {
      setAlertModal({ title: 'Error', message: err instanceof Error ? err.message : 'Failed to save assignment' });
    } finally {
      setRecordSaving(false);
    }
  };

  const handleRecordDelete = async () => {
    if (!recordModal) return;
    setRecordSaving(true);
    try {
      await deleteAssignment(recordModal.data.assignmentId as number);
      setRecordModal(null);
      loadAssignments();
    } catch (err) {
      setAlertModal({ title: 'Error', message: err instanceof Error ? err.message : 'Failed to delete assignment' });
    } finally {
      setRecordSaving(false);
    }
  };

  // -- Render field (detail tab) --
  const renderField = (col: FieldDef) => {
    const data = isEditing ? editData : partner;
    if (!data) return null;
    const value = data[col.key];

    if (!isEditing || readOnlyFields.includes(col.key)) {
      return <span className="text-sm text-gray-700 dark:text-gray-300">{fmt(value)}</span>;
    }

    const selectCfg = selectFieldMap[col.key];
    if (selectCfg) {
      return (
        <select value={value == null ? '' : String(value)} onChange={(e) => handleFieldChange(col.key, e.target.value || null)} className="select-field">
          {selectCfg.nullable && <option value="">-- None --</option>}
          {!selectCfg.nullable && !value && <option value="">-- Select --</option>}
          {selectCfg.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }

    if (dateFields.includes(col.key)) {
      return <input type="date" value={value == null ? '' : String(value).slice(0, 10)} onChange={(e) => handleFieldChange(col.key, e.target.value || null)} className="input-field" />;
    }

    if (textareaFields.includes(col.key)) {
      return <textarea rows={3} value={value == null ? '' : String(value)} onChange={(e) => handleFieldChange(col.key, e.target.value || null)} className="input-field resize-y" />;
    }

    return <input type="text" value={value == null ? '' : String(value)} onChange={(e) => handleFieldChange(col.key, e.target.value || null)} className="input-field" />;
  };

  if (loading) return <p className="py-12 text-center text-sm text-gray-500">Loading partner...</p>;
  if (error) return <p className="py-12 text-center text-sm text-red-500">Error: {error}</p>;
  if (!partner) return <p className="py-12 text-center text-sm text-gray-500">Partner not found.</p>;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Back button */}
      <button className="btn-ghost mb-4" onClick={() => navigate(backTo)}>
        <ArrowLeft className="h-4 w-4" /> {backLabel}
      </button>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{partner.partnerName}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{partner.partnerType} &middot; {partner.roleType}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`badge ${partner.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {partner.status}
            </span>
            {!isEditing ? (
              <>
                <button className="btn-icon" onClick={startEdit} title="Edit"><Pencil size={16} /></button>
                <button className="inline-flex items-center justify-center rounded-lg p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 cursor-pointer" onClick={() => setShowDeleteConfirm(true)} title="Delete"><Trash2 size={16} /></button>
              </>
            ) : (
              <>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : <><Save size={16} /> Save</>}</button>
                <button className="btn-secondary" onClick={cancelEdit} disabled={saving}><X size={16} /> Cancel</button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 px-6">
          {tabList.map((tab) => (
            <button
              key={tab.key}
              className={`px-4 py-3 text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'border-b-2 border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'details' && (
            <>
              {detailSections.map((section) => (
                <div className="mb-6" key={section.title}>
                  <h3 className="mb-4 border-b border-gray-100 dark:border-gray-700 pb-2 text-sm font-bold uppercase tracking-wide text-gray-900 dark:text-white">
                    {section.title}
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {section.fields.map((col) => (
                      <div className="flex flex-col gap-1" key={col.key}>
                        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">{col.label}</label>
                        {renderField(col)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {activeTab === 'safehouses' && (
            <>
              {/* Filters + create */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Filter className="h-4 w-4 text-gray-400" />
                  {aFilterOpts && (
                    <>
                      <select
                        value={aFilters.programArea || ''}
                        onChange={(e) => { setAFilters((p) => ({ ...p, programArea: e.target.value || undefined })); setAPage(1); }}
                        className="select-field w-auto"
                      >
                        <option value="">All Program Areas</option>
                        {aFilterOpts.programAreas.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                      <select
                        value={aFilters.status || ''}
                        onChange={(e) => { setAFilters((p) => ({ ...p, status: e.target.value || undefined })); setAPage(1); }}
                        className="select-field w-auto"
                      >
                        <option value="">All Statuses</option>
                        {aFilterOpts.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </>
                  )}
                </div>
                <button className="btn-primary" onClick={openAssignmentCreate}>
                  <Plus className="h-4 w-4" /> Assign to Safehouse
                </button>
              </div>

              {aLoading && <p className="py-8 text-center text-sm text-gray-500">Loading assignments...</p>}

              {!aLoading && assignments.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-500">No safehouses assigned to this partner.</p>
              )}

              {!aLoading && assignments.length > 0 && (
                <>
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <table className="table-base">
                      <thead>
                        <tr>
                          {assignmentColumns.map((col) => <th key={col.key}>{col.label}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {assignments.map((a) => (
                          <tr key={a.assignmentId} onClick={() => openAssignmentView(a)} className="cursor-pointer">
                            <td>{a.safehouse?.name ?? '\u2014'}</td>
                            <td>{a.programArea}</td>
                            <td>{a.assignmentStart}</td>
                            <td>{a.assignmentEnd ?? '\u2014'}</td>
                            <td>{a.isPrimary ? 'Yes' : 'No'}</td>
                            <td>{a.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {aTotalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 px-2 py-3 mt-2">
                      <button className="btn-ghost" disabled={aPage <= 1} onClick={() => setAPage(aPage - 1)}><ChevronLeft size={16} /> Previous</button>
                      <span className="text-sm text-gray-500">Page {aPage} of {aTotalPages} ({aTotalCount} total)</span>
                      <button className="btn-ghost" disabled={aPage >= aTotalPages} onClick={() => setAPage(aPage + 1)}>Next <ChevronRight size={16} /></button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Assignment Record Modal */}
      {recordModal && (
        <RecordModal
          title="Safehouse Assignment"
          fields={getAssignmentFields()}
          data={recordModal.data}
          mode={recordModal.mode}
          saving={recordSaving}
          onFieldChange={(key, value) => setRecordModal((prev) =>
            prev ? { ...prev, data: { ...prev.data, [key]: value } } : prev
          )}
          onSave={handleRecordSave}
          onDelete={recordModal.mode !== 'create' ? handleRecordDelete : undefined}
          onEdit={recordModal.mode === 'view' ? () => setRecordModal((prev) =>
            prev ? { ...prev, mode: 'edit' } : prev
          ) : undefined}
          onCancel={() => {
            if (recordModal.original) {
              setRecordModal({ ...recordModal, mode: 'view', data: { ...recordModal.original } });
            } else {
              setRecordModal(null);
            }
          }}
          onClose={() => setRecordModal(null)}
        />
      )}

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete Partner"
        message="Are you sure you want to delete this partner? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { setShowDeleteConfirm(false); handleDelete(); }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <AlertModal
        open={!!alertModal}
        title={alertModal?.title ?? ''}
        message={alertModal?.message ?? ''}
        onClose={() => setAlertModal(null)}
      />
    </div>
  );
}
