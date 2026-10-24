import { useEffect, useRef } from 'react';
import { Icon } from '@components/ui/Icon';
import { TrackList } from '@components/track/TrackList';
import { useStore } from '@store/store';
import { ArtistEmpty, ArtistSectionError } from './ArtistEmpty';
import { ArtistRowsSkeleton } from './ArtistSkeletons';
import { ArtistPlaylistCard } from './ArtistPlaylistCard';
import type { ArtistSectionMeta, Playlist, Track } from '@store/types';

interface Props {
  reposts: Track[];
  repostPlaylists: Playlist[];
  meta: ArtistSectionMeta;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onLoadMore: () => void;
  onRetry: () => void;
  artistName: string;
}

export function ArtistRepostsTab({
  reposts,
  repostPlaylists,
  meta,
  scrollRef,
  onLoadMore,
  onRetry,
  artistName,
}: Props) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const playTrack = useStore((s) => s.playTrack);

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
  }, [scrollRef, onLoadMore, meta.status, meta.hasMore, reposts.length, repostPlaylists.length]);

  const isEmpty = !reposts.length && !repostPlaylists.length;
  const isLoading = meta.status === 'loading' || meta.status === 'idle';
  const isError = meta.status === 'error';
  const showEmpty = isEmpty && !isError && !isLoading && !meta.hasMore;
  const showFooter = meta.hasMore && meta.status !== 'error';

  return (
    <div className="px-6 pb-2">
      {!isEmpty && (
        <div className="flex items-center justify-between py-2 mb-1">
          <button
            type="button"
            disabled={!reposts.length}
            onClick={() => playTrack(reposts[0], reposts, 0, `репосты ${artistName}`)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_45%,transparent)]"
          >
            <Icon name="play" size={13} />
            играть все
          </button>
          <span className="text-xs text-text-tertiary tabular-nums">
            {reposts.length + repostPlaylists.length} {meta.hasMore ? 'загружено' : 'репостов'}
          </span>
        </div>
      )}

      {isEmpty && isLoading && <ArtistRowsSkeleton count={8} />}

      {isEmpty && isError && (
        <ArtistSectionError message={meta.error || 'не удалось загрузить репосты'} onRetry={onRetry} />
      )}

      {showEmpty && <ArtistEmpty icon="repeat" title="у этого артиста нет репостов" />}

      {repostPlaylists.length > 0 && (
        <section className="mb-4">
          <h3 className="text-sm font-semibold text-text-primary mb-2">альбомы и плейлисты</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {repostPlaylists.map((playlist) => (
              <ArtistPlaylistCard key={playlist.id} playlist={playlist} showUser />
            ))}
          </div>
        </section>
      )}

      {reposts.length > 0 && (
        <section>
          {repostPlaylists.length > 0 && (
            <h3 className="text-sm font-semibold text-text-primary mb-2">треки</h3>
          )}
          <TrackList tracks={reposts} virtualize scrollRef={scrollRef} />
        </section>
      )}

      {showFooter && (
        <div ref={sentinelRef} className="flex flex-col items-center gap-1 py-4">
          {meta.status === 'loading' ? (
            <div
              role="status"
              aria-label="догрузка репостов"
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
