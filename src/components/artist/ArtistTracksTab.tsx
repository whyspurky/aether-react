import { useEffect, useRef } from 'react';
import { Icon } from '@components/ui/Icon';
import { TrackList } from '@components/track/TrackList';
import { formatCount } from '@lib/format';
import { ArtistEmpty, ArtistSectionError } from './ArtistEmpty';
import { ArtistRowsSkeleton } from './ArtistSkeletons';
import type { ArtistSectionMeta, ArtistTracksSort, Track } from '@store/types';

interface Props {
  tracks: Track[];
  meta: ArtistSectionMeta;
  sort: ArtistTracksSort;
  onSortChange: (sort: ArtistTracksSort) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onPlay: () => void;
  onShuffle: () => void;
  onLoadMore: () => void;
  onRetry: () => void;
  // сколько всего треков у артиста по профилю
  total?: number;
}

const SORTS: { id: ArtistTracksSort; label: string }[] = [
  { id: 'popular', label: 'популярные' },
  { id: 'new', label: 'новые' },
];

// во вкладке треков нужен весь список, но без бесконечного цикла на битом ответе
const AUTO_LOAD_LIMIT = 600;

export function ArtistTracksTab({
  tracks,
  meta,
  sort,
  onSortChange,
  scrollRef,
  onPlay,
  onShuffle,
  onLoadMore,
  onRetry,
  total,
}: Props) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;
    if (meta.status !== 'ready' || !meta.hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { root, rootMargin: '400px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [scrollRef, onLoadMore, meta.status, meta.hasMore, tracks.length]);

  // во вкладке новые дочитываем до конца, популярные остаются как есть
  useEffect(() => {
    if (sort !== 'new') return;
    if (meta.status !== 'ready' || !meta.hasMore) return;
    if (tracks.length >= AUTO_LOAD_LIMIT) return;
    const timer = window.setTimeout(onLoadMore, 350);
    return () => window.clearTimeout(timer);
  }, [sort, onLoadMore, meta.status, meta.hasMore, tracks.length]);

  // новый порядок это новый список, читать дальше с прошлой позиции не нужно
  const handleSortChange = (next: ArtistTracksSort) => {
    if (next === sort) return;
    onSortChange(next);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  const hasTracks = tracks.length > 0;
  const isLoading = meta.status === 'loading' || meta.status === 'idle';
  const showSkeleton = !hasTracks && isLoading;
  const showError = !hasTracks && meta.status === 'error';
  const showEmpty = !hasTracks && meta.status === 'ready' && !meta.hasMore;

  return (
    <div className="px-6 pb-2">
      <div className="flex items-center justify-between gap-3 py-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onPlay}
            disabled={!hasTracks}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_45%,transparent)]"
          >
            <Icon name="play" size={13} />
            играть все
          </button>
          <button
            type="button"
            onClick={onShuffle}
            disabled={!hasTracks}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-text-secondary border border-white/[0.1] bg-white/[0.04] hover:text-text-primary hover:bg-white/[0.08] transition-colors disabled:opacity-30 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_35%,transparent)]"
          >
            <Icon name="shuffle" size={13} />
            перемешать
          </button>
          <span className="text-xs text-text-tertiary tabular-nums ml-1">
            {sort === 'new' && total
              ? meta.hasMore && total > tracks.length
                ? `${formatCount(tracks.length)} из ${formatCount(total)}`
                : formatCount(tracks.length)
              : `${formatCount(tracks.length)} треков`}
          </span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {SORTS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSortChange(item.id)}
              aria-pressed={sort === item.id}
              className={`px-2.5 py-1 rounded-full text-[11px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_35%,transparent)] ${
                sort === item.id
                  ? 'bg-white/[0.1] text-text-primary'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {showSkeleton && <ArtistRowsSkeleton count={8} />}
      {showError && <ArtistSectionError message={meta.error || 'не удалось загрузить треки'} onRetry={onRetry} />}
      {showEmpty && <ArtistEmpty icon="music" title="у этого артиста нет треков" />}

      {hasTracks && (
        <TrackList tracks={tracks} virtualize scrollRef={scrollRef} showQueueButton showArtist={false} />
      )}

      {meta.hasMore && meta.status !== 'error' && !showSkeleton && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {meta.status === 'loading' ? (
            <div
              role="status"
              aria-label="догрузка треков"
              className="w-6 h-6 border-2 border-text-secondary border-t-transparent rounded-full animate-spin"
            />
          ) : (
            <button
              type="button"
              onClick={onLoadMore}
              className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
            >
              загрузить ещё
            </button>
          )}
        </div>
      )}

      {hasTracks && meta.status === 'error' && (
        <ArtistSectionError
          message={meta.error || 'не удалось загрузить ещё'}
          onRetry={meta.hasMore ? onLoadMore : onRetry}
          compact
        />
      )}
    </div>
  );
}
