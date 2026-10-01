import { useRef, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@components/ui/Icon';
import { useStore } from '@store/store';
import { useAddToPlaylist } from '../playlist/AddToPlaylistProvider';
import { useSmoothScroll } from '@hooks/ui/useSmoothScroll';
import type { Track } from '@store/types';
import { formatMs } from '@lib/format';

interface TrackListProps {
  tracks: Track[];
  virtualize?: boolean;
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
  showQueueButton = true,
  showNumber = true,
  onTrackClick,
  onRemove,
}: TrackListProps) {
  const navigate = useNavigate();
  const playTrack = useStore((s) => s.playTrack);
  const currentTrack = useStore((s) => s.player.currentTrack);
  const isPlaying = useStore((s) => s.player.isPlaying);
  const { open: openAddToPlaylist, close: closeAddToPlaylist, openTrackId } = useAddToPlaylist();

  const smoothRef = useSmoothScroll<HTMLDivElement>({ sensitivity: 1.5, duration: SMOOTH_DURATION });
  const parentRef = useRef<HTMLDivElement | null>(null);
  const scrollingRef = useRef<number | undefined>(undefined);
  const rafRef = useRef<number | null>(null);

  const setRefs = useCallback((node: HTMLDivElement | null) => {
    smoothRef(node);
    parentRef.current = node;
  }, [smoothRef]);

  const scrollToFn = useCallback((offset: number) => {
    const el = parentRef.current;
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
  }, []);

  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
    scrollToFn: virtualize ? scrollToFn : undefined,
  });

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handlePlay = async (track: Track, index: number) => {
    if (onTrackClick) {
      onTrackClick(track, index);
      return;
    }
    await playTrack(track, tracks, index);
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
        className={`group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-bg-secondary ${
          isCurrent ? 'bg-bg-secondary' : ''
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
          <h4 className={`text-sm font-medium truncate ${isCurrent ? 'text-text-secondary' : 'text-text-primary'}`}>
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
          <div className="flex items-center gap-1 w-[60px] justify-end">
            {showQueueButton && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (openTrackId === track.id) {
                    closeAddToPlaylist();
                  } else {
                    openAddToPlaylist(track, e.currentTarget as HTMLElement);
                  }
                }}
                className={`p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-glass-bg transition-all duration-200 ${
                  openTrackId === track.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                title="добавить в плейлист"
              >
                <span className={`inline-block transition-transform duration-200 ${openTrackId === track.id ? 'rotate-45' : ''}`}>
                  <Icon name="plus" size={16} />
                </span>
              </button>
            )}

            {onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(track);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-text-tertiary hover:text-red-400 hover:bg-glass-bg transition-all duration-200"
                title="убрать из плейлиста"
              >
                <Icon name="minus" size={16} />
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
    return (
      <div ref={setRefs} className="h-full overflow-auto scrollbar-thin">
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
      </div>
    );
  }

  return (
    <div className="space-y-1 pr-2">
      {tracks.map((_, index) => (
        <div key={tracks[index].id}>{renderItem(tracks[index], index)}</div>
      ))}
    </div>
  );
}