import { useEffect, useRef, useState } from 'react';
import { Icon } from '@components/ui/Icon';
import { VolumeControl } from './VolumeControl';
import { AnimatedTrackInfo } from '../track/AnimatedTrackInfo';
import { useStore } from '@store/store';
import { api } from '@lib/api';
import { useNavigate } from 'react-router-dom';
import { usePlayerProgress } from '@hooks/player/usePlayerProgress';
import { useSeekDrag } from '@hooks/player/useSeekDrag';
import { useAddToPlaylist } from '@components/playlist/AddToPlaylistProvider';
import type { Track } from '@store/types';
import { upgradeCoverUrl } from '@lib/format';

const MAX_VOLUME_WIDTH = 120;
const MIN_VOLUME_WIDTH = 80;
const MIN_LEFT_WIDTH = 150;
const INITIAL_LEFT_WIDTH = 200;
const CONTROLS_GAP_PX = 24;

export function PlayerBar() {
  const navigate = useNavigate();
  const currentTrack = useStore((s) => s.player.currentTrack);
  const isPlaying = useStore((s) => s.player.isPlaying);
  const volume = useStore((s) => s.player.volume);
  const duration = useStore((s) => s.player.duration);
  const isLoading = useStore((s) => s.player.isLoading);
  const isAudioReady = useStore((s) => s.player.isAudioReady);
  const shuffle = useStore((s) => s.player.shuffle);
  const repeat = useStore((s) => s.player.repeat);
  const togglePlay = useStore((s) => s.togglePlay);
  const nextTrack = useStore((s) => s.nextTrack);
  const prevTrack = useStore((s) => s.prevTrack);
  const setVolume = useStore((s) => s.setVolume);
  const setShuffle = useStore((s) => s.setShuffle);
  const setRepeat = useStore((s) => s.setRepeat);
  const favorites = useStore((s) => s.library.favorites);
  const addToFavorites = useStore((s) => s.addToFavorites);
  const removeFromFavorites = useStore((s) => s.removeFromFavorites);
  const offlineEntry = useStore((s) =>
    s.player.currentTrack ? s.offline.entries[s.player.currentTrack.id] : undefined
  );
  const offlineProgress = useStore((s) =>
    s.player.currentTrack ? s.offline.progress[s.player.currentTrack.id] : undefined
  );
  const { open: openAddToPlaylist } = useAddToPlaylist();

  const barRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const repeatRef = useRef<HTMLButtonElement | null>(null);
  const volIconRef = useRef<HTMLDivElement | null>(null);
  const shuffleRef = useRef<HTMLButtonElement | null>(null);
  const leftBlockRef = useRef<HTMLDivElement | null>(null);

  const [leftMaxWidth, setLeftMaxWidth] = useState(INITIAL_LEFT_WIDTH);
  const [volumeMaxWidth, setVolumeMaxWidth] = useState(MAX_VOLUME_WIDTH);

  const effectiveDuration = duration > 0
    ? duration
    : (currentTrack?.duration ? currentTrack.duration / 1000 : 0);

  const durationRef = useRef(effectiveDuration);
  durationRef.current = effectiveDuration;

  const { isDragging, dragPosRef, handleMouseDown } = useSeekDrag({
    trackRef: barRef,
    effectiveDuration,
    onSeek: (pos) => {
      seekTo(pos);
      useStore.getState().setPosition(pos);
    },
  });

  const { progressRef, seekTo } = usePlayerProgress({
    currentTrackId: currentTrack?.id,
    isPlaying,
    isLoading,
    isAudioReady,
    duration,
    isDragging,
    onTrackEnd: () => {
      useStore.getState().nextTrack();
    },
  });

  // в цикле отрисовки читаем через ref, чтобы он не перезапускался на каждый рендер
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const isDraggingRef = useRef(isDragging);
  isDraggingRef.current = isDragging;

  useEffect(() => {
    let raf = 0;
    let timer = 0;
    let lastPct = -1;

    const draw = () => {
      const d = durationRef.current;
      const pos = isDraggingRef.current ? dragPosRef.current : progressRef.current;
      const pct = d > 0 ? (pos / d) * 100 : 0;
      if (pct === lastPct) return;
      lastPct = pct;
      if (fillRef.current) fillRef.current.style.width = `${pct}%`;
    };

    // на драге кадр каждый кадр, иначе редкий опрос: без него полоса
    // остается на позиции прошлого трека, пока грузится следующий
    const loop = () => {
      draw();
      if (isDraggingRef.current) {
        raf = requestAnimationFrame(loop);
      } else {
        timer = window.setTimeout(loop, isPlayingRef.current ? 100 : 250);
      }
    };

    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [progressRef, dragPosRef]);
  useEffect(() => {
    const measure = () => {
      const repeatEl = repeatRef.current;
      const volEl = volIconRef.current;
      const shuffleEl = shuffleRef.current;
      const leftEl = leftBlockRef.current;

      if (repeatEl && volEl) {
        const rr = repeatEl.getBoundingClientRect();
        const vr = volEl.getBoundingClientRect();
        const available = vr.left - rr.right - CONTROLS_GAP_PX;
        setVolumeMaxWidth(Math.min(MAX_VOLUME_WIDTH, Math.max(MIN_VOLUME_WIDTH, available)));
      }

      if (shuffleEl && leftEl) {
        const sr = shuffleEl.getBoundingClientRect();
        const lr = leftEl.getBoundingClientRect();
        const available = sr.left - lr.left - CONTROLS_GAP_PX;
        setLeftMaxWidth(Math.max(MIN_LEFT_WIDTH, available));
      }
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [currentTrack, volume]);
  const handleOpenPlayer = () => navigate('/player');
  const handleOpenArtist = () => {
    const id = currentTrack?.user?.id;
    if (id) navigate(`/artist/${id}`);
  };

  const cycleRepeat = () => {
    const modes = ['none', 'all', 'one'] as const;
    setRepeat(modes[(modes.indexOf(repeat) + 1) % 3]);
  };

  const coverUrl =
    upgradeCoverUrl(currentTrack?.artwork_url, 't300x300') ||
    upgradeCoverUrl(currentTrack?.user?.avatar_url, 't300x300') ||
    null;
  const isFav = currentTrack ? favorites.some((f: Track) => f.id === currentTrack.id) : false;

  return (
    <div className="relative flex items-center justify-center px-6 py-3 w-full bg-bg-primary/70 backdrop-blur-xl">
      {/* левый блок: обложка + название + сердечко */}
      <div
        ref={leftBlockRef}
        className="absolute left-6 flex items-center gap-3"
        style={{ maxWidth: leftMaxWidth }}
      >
        <div onClick={handleOpenPlayer} className="relative flex-shrink-0 cursor-pointer">
          {coverUrl ? (
            <img src={coverUrl} className="w-10 h-10 rounded-lg object-cover" alt="" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-bg-secondary flex items-center justify-center">
              <Icon name="music" size={18} />
            </div>
          )}
          {isPlaying && (
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-text-secondary animate-pulse" />
          )}
        </div>

        <AnimatedTrackInfo
          track={currentTrack}
          className="min-w-0 flex-1"
          onTitleClick={handleOpenPlayer}
          onArtistClick={handleOpenArtist}
        />

        {currentTrack && (
          <button
            onClick={() => {
              if (isFav) removeFromFavorites(currentTrack.id);
              else addToFavorites(currentTrack);
            }}
            className={`flex-shrink-0 p-1.5 rounded-md transition-all duration-200 ${
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
        )}

        {currentTrack && (
          <button
            onClick={() => {
              const state = useStore.getState();
              if (offlineEntry?.offline) {
                void api
                  .trackRemoveCached(currentTrack.id, true)
                  .then(() => {
                    state.removeCacheEntry(currentTrack.id);
                    state.refreshCacheSizes();
                  })
                  .catch(() => {});
                return;
              }
              void api
                .trackEnsureCached(currentTrack.id, {
                  quality: state.offline.quality,
                  durationMs: currentTrack.duration,
                  offline: true,
                })
                .then((result) => {
                  state.setCacheEntry(result.entry);
                  state.refreshCacheSizes();
                })
                .catch(() => {});
            }}
            className={`flex-shrink-0 p-1.5 rounded-md transition-all duration-200 ${
              offlineEntry?.offline
                ? 'text-[var(--accent-primary)]'
                : 'text-text-tertiary hover:text-[var(--accent-primary)] hover:bg-[var(--accent-muted)]'
            }`}
            aria-label={
              offlineEntry?.offline
                ? 'убрать из офлайн'
                : offlineEntry
                  ? 'в кэше, сохранить офлайн'
                  : 'сохранить офлайн'
            }
          >
            {offlineProgress !== undefined && offlineProgress < 1 ? (
              <span className="text-[10px] tabular-nums">
                {Math.round(offlineProgress * 100)}%
              </span>
            ) : (
              <Icon
                name={
                  offlineEntry?.offline
                    ? 'check-circle'
                    : offlineEntry
                      ? 'database'
                      : 'download-cloud'
                }
                size={16}
              />
            )}
          </button>
        )}
      </div>

      {/* центр: кнопки управления */}
      <div className="flex items-center gap-3">
        <button
          ref={shuffleRef}
          onClick={() => setShuffle(!shuffle)}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
            shuffle
              ? 'text-[var(--accent-primary)]'
              : 'text-text-tertiary hover:text-[var(--accent-primary)] hover:bg-[var(--accent-muted)]'
          }`}
          aria-label="перемешать"
        >
          <Icon name="shuffle" size={16} />
        </button>

        <button
          onClick={() => prevTrack(true)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-glass-bg transition-all duration-200"
        >
          <Icon name="skip-back" size={16} filled/>
        </button>

        <button
          onClick={() => void togglePlay()}
          disabled={isLoading}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
            isLoading
              ? 'bg-white/[0.08] cursor-wait'
              : 'bg-white/[0.08] text-text-primary hover:bg-white/[0.16] hover:scale-105'
          }`}
        >
          {isLoading ? (
<div className="w-5 h-5 border-2 border-[var(--accent-primary)]/40 border-t-[var(--accent-primary)] rounded-full animate-spin" />
          ) : (
            <Icon name={isPlaying ? 'pause' : 'play'} size={18} filled/>
          )}
        </button>

        <button
          onClick={() => nextTrack(true)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-glass-bg transition-all duration-200"
        >
          <Icon name="skip-forward" size={16} filled/>
        </button>

        <button
          ref={repeatRef}
          onClick={cycleRepeat}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
            repeat !== 'none'
              ? 'text-text-secondary'
              : 'text-text-tertiary hover:text-text-primary hover:bg-glass-bg'
          }`}
          aria-label="повтор"
        >
          <Icon name={repeat === 'one' ? 'repeat-1' : 'repeat'} size={16} />
        </button>
      </div>

      {/* правый блок: громкость + плюс */}
      <div ref={volIconRef} className="absolute right-6 flex items-center gap-2">
        <VolumeControl volume={volume} onVolumeChange={setVolume} variant="capsule" maxWidth={volumeMaxWidth} />
        {currentTrack && (
          <button
            onClick={(e) => openAddToPlaylist(currentTrack, e.currentTarget as HTMLElement)}
            className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-glass-bg transition-all duration-200"
            aria-label="добавить в плейлист"
          >
            <Icon name="plus" size={16} />
          </button>
        )}
      </div>

      {/* progress bar внизу */}
      <div
        ref={barRef}
        onMouseDown={handleMouseDown}
        className="absolute bottom-0 left-0 right-0 h-3 cursor-pointer group"
      >
        <div
          className={`absolute bottom-0 left-0 right-0 bg-[var(--accent-muted)] will-change-[height] transition-[height] duration-2 ease-out ${
            isDragging ? 'h-[4px]' : 'h-[2px] group-hover:h-[4px]'
          }`}
        >
          <div
            ref={fillRef}
            className="absolute left-0 top-0 h-full bg-[var(--accent-primary)]"
            style={{ width: '0%' }}
          />
        </div>
      </div>
    </div>
  );
}