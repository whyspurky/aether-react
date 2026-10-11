import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  cancelText = 'отмена',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] animate-modal-backdrop"
      onClick={onCancel}
    >
      <div
        className="bg-bg-card/80 backdrop-blur-xl rounded-xl w-[400px] max-w-[90%] shadow-2xl border border-border-subtle animate-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border-subtle">
          <h3 className="text-base font-medium text-text-primary">{title}</h3>
          <button
            onClick={onCancel}
            className="p-1 rounded-md text-text-tertiary hover:text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] transition-colors"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm text-text-secondary leading-relaxed">{message}</p>
        </div>

        <div className="flex justify-end gap-3 px-5 pb-5">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 rounded-lg text-sm text-text-tertiary hover:bg-[var(--accent-muted)] hover:text-[var(--accent-primary)] transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 rounded-lg text-sm bg-white/[0.08] text-text-primary hover:bg-white/[0.16] transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}