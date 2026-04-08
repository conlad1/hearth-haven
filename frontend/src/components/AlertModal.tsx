import { createPortal } from 'react-dom';
import { AlertCircle, AlertTriangle } from 'lucide-react';

interface AlertModalProps {
  open: boolean;
  title: string;
  message: string;
  variant?: 'error' | 'warning';
  onClose: () => void;
}

export default function AlertModal({
  open, title, message, variant = 'error', onClose,
}: AlertModalProps) {
  if (!open) return null;

  const Icon = variant === 'error' ? AlertCircle : AlertTriangle;
  const iconBg = variant === 'error'
    ? 'bg-red-100 dark:bg-red-500/10'
    : 'bg-yellow-100 dark:bg-yellow-500/10';
  const iconColor = variant === 'error' ? 'text-red-500' : 'text-yellow-500';

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative mx-4 w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full ${iconBg}`}>
          <Icon size={20} className={iconColor} />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
        <p className="mt-1 whitespace-pre-line text-sm text-gray-500 dark:text-gray-400">{message}</p>
        <div className="mt-6 flex items-center justify-end">
          <button className="btn-secondary" onClick={onClose}>OK</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
