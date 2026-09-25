import { useEffect } from 'react';
import { useStore } from '@store/store';
import { Icon } from './Icon';

const icons = {
  info: 'info',
  success: 'check',
  error: 'alert-circle',
} as const;

export function Toast() {
  const toast = useStore((s) => s.toast);
  const hideToast = useStore((s) => s.hideToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(hideToast, 4000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
      <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-bg-card border border-border-visible shadow-xl backdrop-blur-sm text-text-primary">
        <Icon name={icons[toast.type]} size={20} className="text-text-secondary" />
        <span className="text-sm font-medium">{toast.message}</span>
      </div>
    </div>
  );
}