import { useEffect, useRef } from 'react';
import { Icon } from '@components/ui/Icon';
import { useStore } from '@store/store';
import { useNavigate } from 'react-router-dom';
import { useTrackAnimation } from '@hooks/player/useTrackAnimation';
import { PlayerProgressBar } from '@components/player/PlayerProgressBar';
import { PlayerVolumeBar } from '@components/player/PlayerVolumeBar';
import { PlayerQueue } from '@components/player/PlayerQueue';
import { usePlayerProgress } from '@hooks/player/usePlayerProgress';
import { useSeekDrag } from '@hooks/player/useSeekDrag';
import { useSmoothScroll } from '@hooks/ui/useSmoothScroll';
import { MarqueeText } from '@components/track/AnimatedTrackInfo';
import { useAddToPlaylist } from '@components/playlist/AddToPlaylistProvider';
import { usePlayerControlsLayout } from '@hooks/player/usePlayerControlsLayout';

export default function PlayerPage() {
  const player = useStore((s) => s.player);
  const queue = useStore((s) => s.queue);
  const togglePlay = useStore((s) => s.togglePlay);
  const nextTrack = useStore((s) => s.nextTrack);
  const prevTrack = useStore((s) => s.prevTrack);
  const setShuffle = useStore((s) => s.setShuffle);
  const setRepeat = useStore((s) => s.setRepeat);
  const setVolume = useStore((s) => s.setVolume);
  const navigate = useNavigate();
  const removeFromQueue = useStore((s) => s.removeFromQueue);
  const queueScrollRef = useSmoothScroll<HTMLDivElement>();
  const { currentTrack, isPlaying, volume, shuffle, repeat, duration, isLoading, isAudioReady } = player;
  const favorites = useStore((s) => s.library.favorites);
  const addToFavorites = useStore((s) => s.addToFavorites);
  const removeFromFavorites = useStore((s) => s.removeFromFavorites);
  const { open: openAddToPlaylist } = useAddToPlaylist();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);

  const { displayTrack, displayCover, isTrackChanging } = useTrackAnimation(currentTrack);

  const coverUrl =
    currentTrack?.artwork_url?.replace('-large', '-t500x500') ||
    currentTrack?.user?.avatar_url?.replace('-large', '-t500x500') ||
    null;

  const effectiveDuration = duration > 0
    ? duration
    : (currentTrack?.duration ? currentTrack.duration / 1000 : 0);

  const durationRef = useRef(effectiveDuration);
  durationRef.current = effectiveDuration;
  const seekToRef = useRef<(pos: number) => void>(() => {});

  const { isDragging, dragPosRef, handleMouseDown } = useSeekDrag({
    trackRef,
    effectiveDuration,
    onSeek: (pos) => {
      seekToRef.current(pos);
      useStore.getState().setPosition(pos);
    },
  });

  const controlsContainerRef = useRef<HTMLDivElement | null>(null);
  const shuffleRef = useRef<HTMLButtonElement | null>(null);
  const rightButtonsRef = useRef<HTMLDivElement | null>(null);

  const { volumeWidth, volumeMode } = usePlayerControlsLayout({
    containerRef: controlsContainerRef,
    shuffleRef,
    rightButtonsRef,
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
  seekToRef.current = seekTo;

  useEffect(() => {
    let raf: number;
    const tick = () => {
      const d = durationRef.current;
      const pos = isDragging ? dragPosRef.current : progressRef.current;
      const pct = d > 0 ? (pos / d) * 100 : 0;
      if (fillRef.current) fillRef.current.style.width = `${pct}%`;
      if (knobRef.current) knobRef.current.style.left = `${pct}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progressRef, isDragging, dragPosRef]);

  if (!currentTrack) {
    return (
      <div className="h-full overflow-auto p-6 bg-bg-primary/40">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-bg-secondary rounded-full blur-xl" />
              <div className="relative w-24 h-24 rounded-full bg-bg-secondary flex items-center justify-center">
                <Icon name="music" size={40} className="text-text-tertiary" />
              </div>
            </div>
            <h2 className="text-2xl font-medium text-text-secondary mb-2">ничего не играет</h2>
            <p className="text-text-tertiary text-sm max-w-sm">добавьте треки из поиска, чтобы начать слушать</p>
          </div>
        </div>
      </div>
    );
  }

  const coverSize = 'min(250px, calc(50vh - 120px))';

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="relative flex gap-8 min-h-0" style={{ minHeight: coverSize }}>
          <div
            className={`flex-shrink-0 rounded-2xl overflow-hidden relative transition-all duration-500 z-10 ${
              !isTrackChanging && displayCover
                ? 'shadow-[0_25px_100px_-15px_rgba(255,255,255,0.4)] ring-1 ring-white/5'
                : 'shadow-none'
            }`}
            style={{ width: coverSize, height: coverSize }}
          >
            <div
              className={`absolute inset-0 transition-all duration-200 ease-out will-change-transform ${
                isTrackChanging ? 'opacity-0 -translate-x-12' : 'opacity-100 translate-x-0'
              }`}
            >
              {displayCover ? (
                <img src={displayCover} alt="" className="w-full h-full object-cover" draggable={false} />
              ) : (
                <div className="w-full h-full bg-bg-secondary flex items-center justify-center">
                  <Icon name="music" size={64} className="text-text-tertiary" />
                </div>
              )}
            </div>

            <div
              className={`absolute inset-0 transition-all duration-200 ease-out will-change-transform ${
                isTrackChanging ? 'opacity-0 translate-x-12' : 'opacity-100 translate-x-0'
              }`}
            >
              {coverUrl ? (
                <img src={coverUrl} alt={currentTrack.title || 'track'} className="w-full h-full object-cover" draggable={false} />
              ) : (
                <div className="w-full h-full bg-bg-secondary flex items-center justify-center">
                  <Icon name="music" size={64} className="text-text-tertiary" />
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col" style={{ height: coverSize }}>
            <div
              className={`transition-all duration-200 ease-out will-change-transform ${
                isTrackChanging ? 'opacity-0 -translate-x-8' : 'opacity-100 translate-x-0'
              }`}
            >
              <MarqueeText
                text={displayTrack?.title || currentTrack.title || 'без названия'}
                className="font-black tracking-tight text-text-primary"
                style={{ fontSize: 'clamp(1.4rem, 3.5vw, 3rem)', lineHeight: '1.15' }}
              />
            </div>

            <div
              className={`mt-1 transition-all duration-200 ease-out delay-75 will-change-transform ${
                isTrackChanging ? 'opacity-0 -translate-x-6' : 'opacity-100 translate-x-0'
              }`}
            >
              <MarqueeText
                text={currentTrack?.user?.username || displayTrack?.user?.username || ''}
                className="text-text-secondary"
                style={{ fontSize: 'clamp(0.85rem, 1.5vw, 1.25rem)' }}
                onClick={
                  currentTrack?.user?.id
                    ? () => navigate(`/artist/${currentTrack.user!.id}`)
                    : undefined
                }
              />

              {(currentTrack?.playback_count || currentTrack?.genre) && (
                <div className="flex items-center gap-3 mt-2 text-xs text-text-tertiary">
                  {currentTrack?.playback_count !== undefined && (
                    <span className="flex items-center gap-1">
                      <Icon name="play" size={12} />
                      {currentTrack.playback_count.toLocaleString()}
                    </span>
                  )}
                  {currentTrack?.genre && (
                    <span className="px-2 py-0.5 rounded-full bg-white/[0.08]">
                      {currentTrack.genre}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1" />

            <PlayerProgressBar
              trackRef={trackRef}
              fillRef={fillRef}
              knobRef={knobRef}
              effectiveDuration={effectiveDuration}
              isDragging={isDragging}
              onMouseDown={handleMouseDown}
            />

            <div ref={controlsContainerRef} className="relative flex items-center mt-2 h-12 min-w-0">
              <div className="flex items-center min-w-0" style={{ width: volumeWidth }}>
                <PlayerVolumeBar
                  volume={volume}
                  isAudioReady={isAudioReady}
                  isLoading={isLoading}
                  onVolumeChange={setVolume}
                  mode={volumeMode}
                />
              </div>

              <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                <button
                  ref={shuffleRef}
                  onClick={() => setShuffle(!shuffle)}
                  className={`flex-shrink-0 p-1.5 rounded-full transition-all ${shuffle ? 'text-text-secondary' : 'text-text-tertiary hover:text-text-secondary'}`}
                >
                  <Icon name="shuffle" size={18} />
                </button>
                <button
                  onClick={() => prevTrack(true)}
                  className="p-1.5 rounded-full text-text-tertiary hover:text-text-primary transition-all"
                >
                  <Icon name="skip-back" size={22} />
                </button>
                <button
                  onClick={() => { if (!isLoading) togglePlay(); }}
                  disabled={isLoading}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    isLoading ? 'bg-white/[0.08] cursor-wait' : 'bg-white/[0.08] hover:bg-white/[0.14] hover:scale-105'
                  }`}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Icon name={isPlaying ? 'pause' : 'play'} size={24} className="text-text-primary" />
                  )}
                </button>
                <button
                  onClick={() => nextTrack(true)}
                  className="p-1.5 rounded-full text-text-tertiary hover:text-text-primary transition-all"
                >
                  <Icon name="skip-forward" size={22} />
                </button>
                <button
                  onClick={() => {
                    const modes = ['none', 'all', 'one'] as const;
                    setRepeat(modes[(modes.indexOf(repeat) + 1) % 3]);
                  }}
                  className={`p-1.5 rounded-full transition-all ${repeat !== 'none' ? 'text-text-secondary' : 'text-text-tertiary hover:text-text-secondary'}`}
                >
                  <Icon name={repeat === 'one' ? 'repeat-1' : 'repeat'} size={18} />
                </button>
              </div>

              <div ref={rightButtonsRef} className="flex items-center justify-end gap-2 ml-auto">
                {currentTrack && (
                  <button
                    onClick={() => {
                      const isFav = favorites.some((f) => f.id === currentTrack.id);
                      if (isFav) removeFromFavorites(currentTrack.id);
                      else addToFavorites(currentTrack);
                    }}
                    className={`flex-shrink-0 p-1.5 rounded-full transition-all ${
                      favorites.some((f) => f.id === currentTrack.id)
                        ? 'text-[var(--accent-primary)] hover:bg-[var(--accent-muted)]'
                        : 'text-text-tertiary hover:text-[var(--accent-primary)] hover:bg-[var(--accent-muted)]'
                    }`}
                  >
                    <Icon
                      name="heart"
                      size={18}
                      className={favorites.some((f) => f.id === currentTrack.id) ? 'fill-current' : ''}
                    />
                  </button>
                )}

                {currentTrack && (
                  <button
                    onClick={(e) => openAddToPlaylist(currentTrack, e.currentTarget as HTMLElement)}
                    className="flex-shrink-0 p-1.5 rounded-full text-text-tertiary hover:text-text-secondary transition-all"
                  >
                    <Icon name="plus-circle" size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <PlayerQueue
          tracks={queue.tracks}
          scrollRef={queueScrollRef}
          onRemove={removeFromQueue}
        />
      </div>
    </div>
  );
}