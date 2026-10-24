import { useId } from 'react';
import { Icon } from '@components/ui/Icon';
import { formatCount } from '@lib/format';

interface Props {
  title: string;
  count?: number;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}

export function ArtistSection({ title, count, actionLabel, onAction, children }: Props) {
  const titleId = useId();

  return (
    <section className="px-6" aria-labelledby={titleId}>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 id={titleId} className="text-lg font-bold text-text-primary truncate">
            {title}
          </h2>
          {count !== undefined && count > 0 && (
            <span className="text-xs text-text-tertiary tabular-nums">{formatCount(count)}</span>
          )}
        </div>

        {onAction && (
          <button
            type="button"
            onClick={onAction}
            className="flex-shrink-0 whitespace-nowrap flex items-center gap-0.5 py-1 text-xs text-text-tertiary hover:text-[var(--accent-primary)] transition-colors outline-none focus-visible:text-[var(--accent-primary)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_35%,transparent)] rounded"
          >
            {actionLabel ?? 'все'}
            <Icon name="chevron-right" size={14} />
          </button>
        )}
      </div>

      {children}
    </section>
  );
}
