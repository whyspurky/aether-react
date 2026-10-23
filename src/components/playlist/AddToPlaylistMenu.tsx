import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@components/ui/Icon';
import { useStore } from '@store/store';
import { upgradeCoverUrl } from '@lib/format';
import type { Track } from '@store/types';

export type AddToPlaylistAnchor = HTMLElement | { x: number; y: number };

interface Props {
  track: Track;
  anchorEl: AddToPlaylistAnchor | null;
  onClose: () => void;
  isClosing: boolean;
}

const MENU_WIDTH = 240;
const MENU_MAX_HEIGHT = 320;
const OFFSET = 6;
const CLICK_LOCK_MS = 200;

export function AddToPlaylistMenu({ track, anchorEl, onClose, isClosing }: Props) {
  const playlists = useStore((s) => s.library.playlists);
  const addToPlaylist = useStore((s) => s.addToPlaylist);
  const removeFromPlaylist = useStore((s) => s.removeFromPlaylist);

  const menuRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchorEl || !menuRef.current) return;

    const menuRect = menuRef.current.getBoundingClientRect();
    const menuH = menuRect.height || MENU_MAX_HEIGHT;

    let top: number;
    let left: number;

    if (anchorEl instanceof HTMLElement) {
      const rect = anchorEl.getBoundingClientRect();
      left = rect.left;
      if (rect.bottom + OFFSET + menuH <= window.innerHeight) {
        top = rect.bottom + OFFSET;
      } else {
        top = Math.max(OFFSET, rect.top - OFFSET - menuH);
      }
    } else {
      // открытие из контекстного меню: считаем от точки клика
      left = anchorEl.x;
      top = anchorEl.y;
      if (top + menuH > window.innerHeight - OFFSET) {
        top = Math.max(OFFSET, anchorEl.y - menuH);
      }
    }

    if (left + MENU_WIDTH > window.innerWidth - OFFSET) {
      left = window.innerWidth - MENU_WIDTH - OFFSET;
    }
    if (left < OFFSET) left = OFFSET;

    setPos({ top, left });
  }, [anchorEl]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;

      if (anchorEl instanceof HTMLElement && anchorEl.contains(target)) return;

      onClose();
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    const handleResize = () => onClose();

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [anchorEl]);

  const handleToggle = (playlistId: string | number, hasTrack: boolean) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setTimeout(() => { lockRef.current = false; }, CLICK_LOCK_MS);

    if (hasTrack) {
      removeFromPlaylist(playlistId, track.id);
    } else {
      addToPlaylist(playlistId, track);
    }
  };

  return createPortal(
    <div
      ref={menuRef}
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width: MENU_WIDTH,
        maxHeight: MENU_MAX_HEIGHT,
        visibility: pos ? 'visible' : 'hidden',
      }}
      className={`fixed z-[9999] bg-bg-card/80 backdrop-blur-xl rounded-xl border border-border-subtle shadow-2xl overflow-hidden ${
        isClosing ? 'animate-menu-exit' : 'animate-menu-enter'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="overflow-y-auto py-1" style={{ maxHeight: MENU_MAX_HEIGHT }}>
        {playlists.length === 0 ? (
          <p className="px-3 py-3 text-xs text-text-tertiary text-center">нет плейлистов</p>
        ) : (
          playlists.map((pl) => {
            const hasTrack = pl.tracks.some((t) => t.id === track.id);
            const cover =
              pl.artwork_url ||
              pl.tracks[0]?.artwork_url ||
              pl.tracks[0]?.user?.avatar_url;
            const coverUrl = upgradeCoverUrl(cover, 't300x300');

            return (
              <button
                key={pl.id}
                onClick={() => handleToggle(pl.id, hasTrack)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-white/[0.06] hover:text-text-primary transition text-left"
              >
                <div className="w-8 h-8 rounded-md bg-white/[0.06] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {coverUrl ? (
                    <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Icon name="folder" size={14} className="text-text-tertiary" />
                  )}
                </div>
                <span className="flex-1 truncate">{pl.name}</span>
                <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                  {hasTrack ? (
                    <Icon name="check" size={14} className="text-[var(--accent-primary)]" />
                  ) : null}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>,
    document.body
  );
}