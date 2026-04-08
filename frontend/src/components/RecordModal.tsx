import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Trash2, Check, X } from 'lucide-react';

export interface RecordFieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'checkbox' | 'textarea' | 'select';
  options?: string[];
  required?: boolean;
  readOnly?: boolean;
}

interface RecordModalProps {
  title: string;
  fields: RecordFieldDef[];
  data: Record<string, unknown>;
  mode: 'view' | 'edit' | 'create';
  saving: boolean;
  onFieldChange: (key: string, value: unknown) => void;
  onSave: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onCancel: () => void;
  onClose: () => void;
}

function fmt(value: unknown): string {
  if (value === null || value === undefined) return '\u2014';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export default function RecordModal({
  title, fields, data, mode, saving,
  onFieldChange, onSave, onDelete, onEdit, onCancel, onClose,
}: RecordModalProps) {

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const renderField = (f: RecordFieldDef) => {
    const value = data[f.key];

    if (mode === 'view' || f.readOnly) {
      return <span className="text-sm text-gray-700 dark:text-gray-300">{fmt(value)}</span>;
    }

    if (f.type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onFieldChange(f.key, e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500/20"
        />
      );
    }
    if (f.type === 'date') {
      return (
        <input
          type="date"
          value={value == null ? '' : String(value).slice(0, 10)}
          onChange={(e) => onFieldChange(f.key, e.target.value || null)}
          className="input-field"
        />
      );
    }
    if (f.type === 'textarea') {
      return (
        <textarea
          rows={3}
          value={value == null ? '' : String(value)}
          onChange={(e) => onFieldChange(f.key, e.target.value || null)}
          className="input-field resize-y"
        />
      );
    }
    if (f.type === 'select') {
      return (
        <select
          value={value == null ? '' : String(value)}
          onChange={(e) => onFieldChange(f.key, e.target.value || null)}
          className="select-field"
        >
          <option value="">-- Select --</option>
          {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (f.type === 'number') {
      return (
        <input
          type="number"
          step="any"
          value={value == null ? '' : String(value)}
          onChange={(e) => onFieldChange(f.key, e.target.value === '' ? null : Number(e.target.value))}
          className="input-field"
        />
      );
    }
    return (
      <input
        type="text"
        value={value == null ? '' : String(value)}
        onChange={(e) => onFieldChange(f.key, e.target.value || null)}
        className="input-field"
      />
    );
  };

  return createPortal(
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-body" onClick={(e) => e.stopPropagation()}>
          {/* Top bar */}
          <div className="mb-6 flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {mode === 'create' ? `New ${title}` : title}
              </h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {mode === 'create' ? 'Fill in the details below' : mode === 'edit' ? 'Editing record' : 'Viewing record'}
              </p>
            </div>

            <div className="ml-4 flex items-center gap-2">
              {mode === 'view' && (
                <>
                  {onEdit && (
                    <button
                      className="btn-icon"
                      onClick={onEdit}
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      className="inline-flex items-center justify-center rounded-lg p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 disabled:opacity-50 cursor-pointer"
                      onClick={() => setShowDeleteConfirm(true)}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </>
              )}
              {mode === 'edit' && (
                <>
                  <button
                    className="inline-flex items-center justify-center rounded-lg bg-orange-500 p-2 text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 cursor-pointer"
                    onClick={onSave}
                    disabled={saving}
                    title="Save"
                  >
                    {saving ? <span className="text-xs font-medium">Saving...</span> : <Check size={16} />}
                  </button>
                  <button
                    className="inline-flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-2 text-gray-600 dark:text-gray-400 transition hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 cursor-pointer"
                    onClick={onCancel}
                    disabled={saving}
                    title="Cancel"
                  >
                    <X size={16} />
                  </button>
                </>
              )}
              {mode === 'create' && (
                <>
                  <button
                    className="inline-flex items-center justify-center rounded-lg bg-orange-500 p-2 text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 cursor-pointer"
                    onClick={onSave}
                    disabled={saving}
                    title="Create"
                  >
                    {saving ? <span className="text-xs font-medium">Creating...</span> : <Check size={16} />}
                  </button>
                  <button
                    className="inline-flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-2 text-gray-600 dark:text-gray-400 transition hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 cursor-pointer"
                    onClick={onCancel}
                    disabled={saving}
                    title="Cancel"
                  >
                    <X size={16} />
                  </button>
                </>
              )}
            </div>

            {mode === 'view' && (
              <button
                className="ml-2 inline-flex items-center justify-center rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                onClick={onClose}
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Fields */}
          <div className="space-y-4">
            {fields.map((f) => (
              <div className="flex flex-col gap-1.5" key={f.key}>
                <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">{f.label}{f.required && <span className="ml-0.5 text-orange-500">*</span>}</label>
                {renderField(f)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Delete confirmation nested modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="relative mx-4 w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Record</h3>
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
                onClick={() => { setShowDeleteConfirm(false); onDelete?.(); }}
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
  );
}
