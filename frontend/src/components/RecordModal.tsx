import { useState } from 'react';
import { createPortal } from 'react-dom';

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
  title,
  fields,
  data,
  mode,
  saving,
  onFieldChange,
  onSave,
  onDelete,
  onEdit,
  onCancel,
  onClose,
}: RecordModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const renderField = (f: RecordFieldDef) => {
    const value = data[f.key];

    if (mode === 'view' || f.readOnly) {
      return <span className="resident-modal-field-value">{fmt(value)}</span>;
    }

    if (f.type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onFieldChange(f.key, e.target.checked)}
        />
      );
    }
    if (f.type === 'date') {
      return (
        <input
          type="date"
          value={value == null ? '' : String(value).slice(0, 10)}
          onChange={(e) => onFieldChange(f.key, e.target.value || null)}
        />
      );
    }
    if (f.type === 'textarea') {
      return (
        <textarea
          rows={3}
          value={value == null ? '' : String(value)}
          onChange={(e) => onFieldChange(f.key, e.target.value || null)}
        />
      );
    }
    if (f.type === 'select') {
      return (
        <select
          value={value == null ? '' : String(value)}
          onChange={(e) => onFieldChange(f.key, e.target.value || null)}
        >
          <option value="">— Select —</option>
          {(f.options || []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }
    if (f.type === 'number') {
      return (
        <input
          type="number"
          step="any"
          value={value == null ? '' : String(value)}
          onChange={(e) =>
            onFieldChange(
              f.key,
              e.target.value === '' ? null : Number(e.target.value)
            )
          }
        />
      );
    }
    return (
      <input
        type="text"
        value={value == null ? '' : String(value)}
        onChange={(e) => onFieldChange(f.key, e.target.value || null)}
      />
    );
  };

  return createPortal(
    <>
      <div className="resident-modal-overlay" onClick={onClose}>
        <div
          className="resident-modal-body"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="resident-modal-top-bar">
            <div className="resident-modal-profile-info">
              <h2>{mode === 'create' ? `New ${title}` : title}</h2>
              <p>
                {mode === 'create'
                  ? 'Fill in the details below'
                  : mode === 'edit'
                    ? 'Editing record'
                    : 'Viewing record'}
              </p>
            </div>
            <div className="resident-modal-actions">
              {mode === 'view' && (
                <>
                  {onEdit && (
                    <button
                      className="resident-modal-btn resident-modal-btn-edit"
                      onClick={onEdit}
                      title="Edit"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        <path d="m15 5 4 4" />
                      </svg>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      className="resident-modal-btn resident-modal-btn-delete"
                      onClick={() => setShowDeleteConfirm(true)}
                      title="Delete"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  )}
                </>
              )}
              {mode === 'edit' && (
                <>
                  <button
                    className="resident-modal-btn resident-modal-btn-save"
                    onClick={onSave}
                    disabled={saving}
                    title="Save"
                  >
                    {saving ? (
                      'Saving...'
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                  <button
                    className="resident-modal-btn resident-modal-btn-cancel"
                    onClick={onCancel}
                    disabled={saving}
                    title="Cancel"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </>
              )}
              {mode === 'create' && (
                <>
                  <button
                    className="resident-modal-btn resident-modal-btn-save"
                    onClick={onSave}
                    disabled={saving}
                    title="Create"
                  >
                    {saving ? (
                      'Creating...'
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                  <button
                    className="resident-modal-btn resident-modal-btn-cancel"
                    onClick={onCancel}
                    disabled={saving}
                    title="Cancel"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </>
              )}
            </div>
            <button className="resident-modal-close" onClick={onClose}>
              &times;
            </button>
          </div>

          <div className="resident-modal-section">
            <div className="resident-modal-fields">
              {fields.map((f) => (
                <div className="resident-modal-field" key={f.key}>
                  <label>{f.label}</label>
                  {renderField(f)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div
          className="resident-modal-overlay"
          style={{ zIndex: 1001 }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="delete-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Delete Record</h3>
            <p>
              Are you sure you want to delete this record? This action cannot be
              undone.
            </p>
            <div className="delete-confirm-actions">
              <button
                className="resident-modal-btn resident-modal-btn-delete"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete?.();
                }}
                disabled={saving}
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
              <button
                className="resident-modal-btn resident-modal-btn-cancel"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
