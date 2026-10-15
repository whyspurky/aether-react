import { Icon } from '@components/ui/Icon';
import { useStore } from '@store/store';

export function HomeStats() {
  const totalTracks = useStore((s) => s.tracksCompletedCount);
  const totalListenedMs = useStore((s) => s.totalListenedMs);
  const artistScores = useStore((s) => s.artistScores);

  const totalMinutes = Math.floor(totalListenedMs / 1000 / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  if (totalTracks === 0 && Object.keys(artistScores).length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-bg-primary/40 rounded-2xl border border-border-subtle p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
            <Icon name="music" size={14} className="text-[var(--accent-primary)]" />
          </div>
          <p className="text-xs text-text-tertiary">прослушано</p>
        </div>
        <p className="text-2xl font-bold text-text-primary tabular-nums">{totalTracks}</p>
        <p className="text-xs text-text-tertiary mt-0.5">до конца</p>
      </div>

      <div className="bg-bg-primary/40 rounded-2xl border border-border-subtle p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
            <Icon name="clock" size={14} className="text-[var(--accent-primary)]" />
          </div>
          <p className="text-xs text-text-tertiary">всего</p>
        </div>
        <p className="text-2xl font-bold text-text-primary tabular-nums">
          {totalHours > 0 ? (
            <>
              {totalHours}<span className="text-base text-text-tertiary font-normal">ч</span>
              {' '}
              {remainingMinutes}<span className="text-base text-text-tertiary font-normal">м</span>
            </>
          ) : (
            <>
              {totalMinutes}<span className="text-base text-text-tertiary font-normal">м</span>
            </>
          )}
        </p>
        <p className="text-xs text-text-tertiary mt-0.5">музыки</p>
      </div>
    </div>
  );
}