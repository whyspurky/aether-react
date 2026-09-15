import { useEffect } from 'react';
import { Icon } from '../../components/Icon';

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

  return (
    <div
      className="fixed inset-0 bg-bg-primary/60 backdrop-blur-sm flex items-center justify-center z-[2100] animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-bg-card rounded-xl w-[400px] max-w-[90%] shadow-2xl border border-border-subtle animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border-subtle">
          <h3 className="text-base font-medium text-text-primary">{title}</h3>
          <button
            onClick={onCancel}
            className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
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
            className="px-4 py-1.5 rounded-lg text-sm text-text-tertiary hover:bg-bg-secondary transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 rounded-lg text-sm bg-bg-secondary text-text-secondary hover:bg-text-secondary hover:text-bg-primary transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}