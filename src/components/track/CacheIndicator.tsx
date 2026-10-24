import { Icon } from '@components/ui/Icon';
import type { TrackCacheEntry } from '@store/types';

interface Props {
  entry?: TrackCacheEntry | null;
  size?: number;
  className?: string;
}

export function CacheIndicator({ entry, size = 13, className = '' }: Props) {
  if (!entry) return null;

  const offline = entry.offline;
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center justify-center ${
        offline ? 'text-[var(--accent-primary)]' : 'text-text-tertiary'
      } ${className}`}
      aria-label={offline ? 'сохранено офлайн' : 'в кэше'}
    >
      <Icon name={offline ? 'download-cloud' : 'database'} size={size} />
    </span>
  );
}
