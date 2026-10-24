import { useEffect, useRef } from 'react';
import { ArtistPlaylistCard } from './ArtistPlaylistCard';
import { ArtistEmpty, ArtistSectionError } from './ArtistEmpty';
import { ArtistCardsSkeleton } from './ArtistSkeletons';
import type { ArtistSectionMeta, Playlist } from '@store/types';

interface Props {
  items: Playlist[];
  meta: ArtistSectionMeta;
  variant: 'release' | 'playlist';
  scrollRef: React.RefObject<HTMLDivElement | null>;
  emptyTitle: string;
  emptyHint?: string;
  onLoadMore: () => void;
  onRetry: () => void;
}

export function ArtistPlaylistsTab({
  items,
  meta,
  variant,
  scrollRef,
  emptyTitle,
  emptyHint,
  onLoadMore,
  onRetry,
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
      { root, rootMargin: '300px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [scrollRef, onLoadMore, meta.status, meta.hasMore, items.length]);

  const isEmpty = items.length === 0;
  const isLoading = meta.status === 'loading' || meta.status === 'idle';
  const isError = meta.status === 'error';
  // релизы и плейлисты это один запрос, пустая страница при hasMore ещё не пустота
  const showEmpty = isEmpty && !isError && !isLoading && !meta.hasMore;
  const showFooter = meta.hasMore && meta.status !== 'error';

  return (
    <div className="px-6 pb-6 pt-2">
      {isEmpty && isLoading && <ArtistCardsSkeleton layout="grid" count={8} />}

      {isEmpty && isError && (
        <ArtistSectionError message={meta.error || 'не удалось загрузить'} onRetry={onRetry} />
      )}

      {showEmpty && <ArtistEmpty icon="folder" title={emptyTitle} hint={emptyHint} />}

      {!isEmpty && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <ArtistPlaylistCard key={item.id} playlist={item} variant={variant} />
          ))}
        </div>
      )}

      {showFooter && !(isEmpty && isLoading) && (
        <div ref={sentinelRef} className="flex flex-col items-center gap-1 py-4">
          {meta.status === 'loading' ? (
            <div
              role="status"
              aria-label="догрузка"
              className="w-6 h-6 border-2 border-text-secondary border-t-transparent rounded-full animate-spin"
            />
          ) : (
            <>
              {isEmpty && (
                <p className="text-xs text-text-tertiary">на этой странице ничего не нашлось</p>
              )}
              <button
                type="button"
                onClick={onLoadMore}
                className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
              >
                загрузить ещё
              </button>
            </>
          )}
        </div>
      )}

      {!isEmpty && isError && (
        <ArtistSectionError
          message={meta.error || 'не удалось загрузить ещё'}
          onRetry={meta.hasMore ? onLoadMore : onRetry}
          compact
        />
      )}
    </div>
  );
}
