import { useRef, useCallback, useMemo, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@components/ui/Icon';
import { useStore } from '@store/store';
import { useTrackContextMenu } from '@hooks/ui/useTrackContextMenu';
import type { Track } from '@store/types';
import { formatMs, formatCount, getCoverUrl } from '@lib/format';

interface TrackListProps {
  tracks: Track[];
  virtualize?: boolean;
  scrollRef?: React.RefObject<HTMLElement | null>;
  showQueueButton?: boolean;
  showNumber?: boolean;
  // на странице артиста имя под треком лишнее, вместо него прослушивания
  showArtist?: boolean;
  onTrackClick?: (track: Track, index: number) => void;
  onRemove?: (track: Track) => void;
}

const ITEM_HEIGHT = 56;
const ITEM_GAP_PX = 4;

export function TrackList({
  tracks,
  virtualize = false,
  scrollRef,
  showQueueButton = true,
  showArtist = true,
  onTrackClick,
  onRemove,
}: TrackListProps) {
  const navigate = useNavigate();
  const playTrack = useStore((s) => s.playTrack);
  const currentTrack = useStore((s) => s.player.currentTrack);
  const favorites = useStore((s) => s.library.favorites);
  const addToFavorites = useStore((s) => s.addToFavorites);
  const removeFromFavorites = useStore((s) => s.removeFromFavorites);
  const { openTrackMenu } = useTrackContextMenu();

  const favIds = useMemo(() => new Set(favorites.map((f) => f.id)), [favorites]);

  const internalRef = useRef<HTMLDivElement | null>(null);
  const isExternal = !!scrollRef;

  const setRefs = useCallback((node: HTMLDivElement | null) => {
    if (isExternal) return;
    internalRef.current = node;
  }, [isExternal]);

  const scrollElementRef: React.RefObject<HTMLElement | null> =
    isExternal && scrollRef ? scrollRef : internalRef;

  // не даём скроллу "просачиваться" на страницу
  useEffect(() => {
    const el = internalRef.current;
    if (!el) return;
    if (isExternal) return;

    const onWheel = (e: WheelEvent) => {
      const canScrollDown = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
      const canScrollUp = el.scrollTop > 0;
      const goingDown = e.deltaY > 0;

      if ((goingDown && canScrollDown) || (!goingDown && canScrollUp)) {
        e.stopPropagation();
      }
    };

    el.addEventListener('wheel', onWheel, { passive: true });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isExternal]);

  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => ITEM_HEIGHT + ITEM_GAP_PX,
    getItemKey: (index) => tracks[index]?.id ?? index,
    overscan: 12,
  });

  // при смене списка старые замеры высот невалидны, пересчитываем
  useEffect(() => {
    virtualizer.measure();
  }, [virtualizer, tracks.length]);

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
    const isFav = favIds.has(track.id);
    const coverUrl = getCoverUrl(track, 't300x300');

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
        style={{
          animation: 'contentFadeIn 0.2s ease-out backwards',
          animationDelay: `${Math.min(index, 15) * 25}ms`,
        }}
      >

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
            {showArtist ? (
              track.user?.id ? (
                <span
                  onClick={(e) => handleArtistClick(track, e)}
                  className="cursor-pointer hover:text-text-secondary transition-colors"
                >
                  {track.user.username}
                </span>
              ) : (
                track.user?.username || ''
              )
            ) : (
              `${formatCount(track.playback_count)} прослушиваний`
            )}
          </p>
        </div>

        <div className="flex items-center flex-shrink-0 mr-4">
          <div className="flex items-center gap-1 justify-end w-[84px]">
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
              <Icon name="heart" size={16} className={isFav ? 'fill-current' : ''} />
            </button>

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
    const items = virtualizer.getVirtualItems();

    // позицию задаёт react, императивные transform от virtualizer ломались при смене списка
    const inner = (
      <div
        style={{
          width: '100%',
          height: virtualizer.getTotalSize(),
          position: 'relative',
        }}
      >
        {items.map((virtualRow) => {
          const track = tracks[virtualRow.index];
          if (!track) return null;

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                paddingBottom: ITEM_GAP_PX,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderItem(track, virtualRow.index)}
            </div>
          );
        })}
      </div>
    );

    if (isExternal) {
      return inner;
    }

    return (
      <div ref={setRefs} className="h-full w-full overflow-auto overscroll-contain scrollbar-hidden">
        {inner}
      </div>
    );
  }

  return (
    <div className="w-full">
      {tracks.map((_, index) => (
        <div key={tracks[index].id} className="w-full" style={{ paddingBottom: ITEM_GAP_PX }}>
          {renderItem(tracks[index], index)}
        </div>
      ))}
    </div>
  );
}