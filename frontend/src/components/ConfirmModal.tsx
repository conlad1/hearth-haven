import { createPortal } from 'react-dom';
import { Trash2, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open, title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel',
  variant = 'danger', loading = false, onConfirm, onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  const Icon = variant === 'danger' ? Trash2 : AlertTriangle;
  const iconBg = variant === 'danger'
    ? 'bg-red-100 dark:bg-red-500/10'
    : 'bg-yellow-100 dark:bg-yellow-500/10';
  const iconColor = variant === 'danger' ? 'text-red-500' : 'text-yellow-500';
  const btnClass = variant === 'danger' ? 'btn-danger' : 'btn-primary';

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="relative mx-4 w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full ${iconBg}`}>
          <Icon size={20} className={iconColor} />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button className="btn-secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button className={btnClass} onClick={onConfirm} disabled={loading}>
            {loading ? `${confirmLabel}...` : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
