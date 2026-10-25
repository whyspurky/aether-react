import { Icon } from '@components/ui/Icon';

interface Props {
  icon?: string;
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export function ArtistEmpty({
  icon = 'music',
  title,
  hint,
  actionLabel,
  onAction,
  compact = false,
}: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 text-center animate-content-fade-in ${
        compact ? 'py-6' : 'py-12'
      }`}
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center border border-white/[0.08] bg-white/[0.04]">
        <Icon name={icon} size={20}  />
      </div>
      <p className="text-sm text-text-secondary">{title}</p>
      {hint && <p className="text-xs text-text-tertiary max-w-[320px]">{hint}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-1 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-text-primary border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_35%,transparent)]"
        >
          <Icon name="rotate-ccw" size={14} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

interface ErrorProps {
  message: string;
  onRetry: () => void;
  compact?: boolean;
}

export function ArtistSectionError({ message, onRetry, compact = false }: ErrorProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 text-center animate-content-fade-in ${
        compact ? 'py-6' : 'py-10'
      }`}
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center border border-white/[0.08] bg-white/[0.04]">
        <Icon name="alert-circle" size={20} />
      </div>
      <p className="text-sm text-text-secondary">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-text-primary border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_35%,transparent)]"
      >
        <Icon name="rotate-ccw" size={14} />
        повторить
      </button>
    </div>
  );
}
