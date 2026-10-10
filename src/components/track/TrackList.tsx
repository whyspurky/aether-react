import { useRef, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@components/ui/Icon';
import { useStore } from '@store/store';
import { useSmoothScroll } from '@hooks/ui/useSmoothScroll';
import { useTrackContextMenu } from '@hooks/ui/useTrackContextMenu';
import type { Track } from '@store/types';
import { formatMs } from '@lib/format';

interface TrackListProps {
  tracks: Track[];
  virtualize?: boolean;
  scrollRef?: React.RefObject<HTMLElement | null>;
  showQueueButton?: boolean;
  showNumber?: boolean;
  onTrackClick?: (track: Track, index: number) => void;
  onRemove?: (track: Track) => void;
}

const ITEM_HEIGHT = 56;
const SMOOTH_DURATION = 300;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function TrackList({
  tracks,
  virtualize = false,
  scrollRef,
  showQueueButton = true,
  showNumber = true,
  onTrackClick,
  onRemove,
}: TrackListProps) {
  const navigate = useNavigate();
  const playTrack = useStore((s) => s.playTrack);
  const currentTrack = useStore((s) => s.player.currentTrack);
  const isPlaying = useStore((s) => s.player.isPlaying);
  const favorites = useStore((s) => s.library.favorites);
  const addToFavorites = useStore((s) => s.addToFavorites);
  const removeFromFavorites = useStore((s) => s.removeFromFavorites);
  const { openTrackMenu } = useTrackContextMenu();

  const internalRef = useRef<HTMLDivElement | null>(null);
  const isExternal = !!scrollRef;

  const smoothRef = useSmoothScroll<HTMLDivElement>({ sensitivity: 1.5, duration: SMOOTH_DURATION });

  const setRefs = useCallback((node: HTMLDivElement | null) => {
    if (isExternal) return;
    smoothRef(node);
    internalRef.current = node;
  }, [smoothRef, isExternal]);

  const scrollElementRef: React.RefObject<HTMLElement | null> = isExternal && scrollRef ? scrollRef : internalRef;

  const scrollingRef = useRef<number | undefined>(undefined);
  const rafRef = useRef<number | null>(null);

  const scrollToFn = useCallback((offset: number) => {
    const el = scrollElementRef.current;
    if (!el) return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const start = el.scrollTop;
    const startTime = (scrollingRef.current = Date.now());

    const run = () => {
      if (scrollingRef.current !== startTime) return;
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = easeOutCubic(Math.min(elapsed / SMOOTH_DURATION, 1));
      const interpolated = start + (offset - start) * progress;

      el.scrollTop = interpolated;

      if (elapsed < SMOOTH_DURATION) {
        rafRef.current = requestAnimationFrame(run);
      } else {
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(run);
  }, [scrollElementRef]);

  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
    scrollToFn,
  });

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handlePlay = (track: Track, index: number) => {
    if (onTrackClick) {
      onTrackClick(track, index);
      return;
    }
    playTrack(track, tracks, index);
  };

  const handleArtistClick = (track: Track, e: React.MouseEvent) => {
    e.stopPropagation();
    const id = track.user?.id;
    if (id) navigate(`/artist/${id}`);
  };

  if (!tracks.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
        <Icon name="music" size={48} className="mb-4 opacity-30" />
        <p className="text-sm">нет треков</p>
      </div>
    );
  }

  const renderItem = (track: Track, index: number) => {
    const isCurrent = currentTrack?.id === track.id;
    const coverUrl =
      track.artwork_url?.replace('-large', '-t300x300') ||
      track.user?.avatar_url?.replace('-large', '-t300x300') ||
      null;

    return (
      <div
        onClick={() => handlePlay(track, index)}
        onContextMenu={(e) => {
          e.preventDefault();
          openTrackMenu(track, e, { onRemove });
        }}
        className={`group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-[var(--accent-muted)] ${
          isCurrent ? 'bg-[var(--accent-muted)]' : ''
        }`}
      >
        {showNumber && (
          <div className="w-8 text-center text-sm text-text-tertiary">
            {isCurrent && isPlaying ? (
              <div className="flex items-center justify-center gap-0.5">
                <span className="w-1 h-2 bg-text-secondary rounded-full animate-[eqBar_0.8s_ease_infinite]" />
                <span className="w-1 h-3 bg-text-secondary rounded-full animate-[eqBar_0.8s_ease_infinite_0.15s]" />
                <span className="w-1 h-4 bg-text-secondary rounded-full animate-[eqBar_0.8s_ease_infinite_0.3s]" />
              </div>
            ) : (
              <span className="tabular-nums">{index + 1}</span>
            )}
          </div>
        )}

        {coverUrl ? (
          <img src={coverUrl} className="w-10 h-10 rounded-md object-cover flex-shrink-0" alt="" />
        ) : (
          <div className="w-10 h-10 rounded-md bg-bg-secondary flex items-center justify-center flex-shrink-0">
            <Icon name="music" size={16} className="text-text-tertiary" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h4
            className={`text-sm font-medium truncate transition-colors duration-150 ${
              isCurrent
                ? 'text-text-secondary'
                : 'text-text-primary group-hover:text-[var(--accent-primary)]'
            }`}
          >
            {track.title || 'без названия'}
          </h4>
          <p className="text-xs text-text-tertiary truncate">
            {track.user?.id ? (
              <span
                onClick={(e) => handleArtistClick(track, e)}
                className="cursor-pointer hover:text-text-secondary transition-colors"
              >
                {track.user.username}
              </span>
            ) : (
              track.user?.username || ''
            )}
          </p>
        </div>

        <div className="flex items-center flex-shrink-0 mr-4">
          <div className="flex items-center gap-1 justify-end w-[84px]">
            {(() => {
              const isFav = favorites.some((f) => f.id === track.id);
              return (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isFav) removeFromFavorites(track.id);
                    else addToFavorites(track);
                  }}
                  className={`p-1.5 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100 ${
                    isFav
                      ? 'text-[var(--accent-primary)] hover:bg-[var(--accent-muted)]'
                      : 'text-text-tertiary hover:text-[var(--accent-primary)] hover:bg-[var(--accent-muted)]'
                  }`}
                  aria-label={isFav ? 'убрать из избранного' : 'в избранное'}
                >
            <Icon
              name="heart"
              size={16}
              className={isFav ? 'fill-current' : ''}
            />
          </button>
              );
            })()}

            {showQueueButton && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openTrackMenu(track, e, { onRemove, below: true });
                }}
                className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-glass-bg transition-all duration-200 opacity-0 group-hover:opacity-100"
                aria-label="меню трека"
              >
                <Icon name="ellipsis-vertical" size={16} />
              </button>
            )}
          </div>

          <span className="tabular-nums text-xs text-text-tertiary text-right w-[4.1ch]">
            {formatMs(track.duration || 0)}
          </span>
        </div>
      </div>
    );
  };

  if (virtualize) {
    const inner = (
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={tracks[virtualRow.index].id}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderItem(tracks[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
    );

    if (isExternal) {
      return inner;
    }

    return (
      <div ref={setRefs} className="h-full w-full overflow-auto scrollbar-thin">
        {inner}
      </div>
    );
  }

  return (
    <div className="space-y-1 w-full">
      {tracks.map((_, index) => (
        <div key={tracks[index].id} className="w-full">{renderItem(tracks[index], index)}</div>
      ))}
    </div>
  );
}