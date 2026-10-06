import { useEffect, useRef, useState } from 'react';
import { Icon } from '@components/ui/Icon';
import { useStore } from '@store/store';
import { useNavigate } from 'react-router-dom';
import { useTrackAnimation } from '@hooks/player/useTrackAnimation';
import { PlayerProgressBar } from '@components/player/PlayerProgressBar';
import { PlayerVolumeBar } from '@components/player/PlayerVolumeBar';
import { PlayerQueue } from '@components/player/PlayerQueue';
import { usePlayerProgress } from '@hooks/player/usePlayerProgress';
import { api } from '@lib/api';
import { useSmoothScroll } from '@hooks/ui/useSmoothScroll';

export default function PlayerPage() {
  const player = useStore((s) => s.player);
  const queue = useStore((s) => s.queue);
  const togglePlay = useStore((s) => s.togglePlay);
  const nextTrack = useStore((s) => s.nextTrack);
  const prevTrack = useStore((s) => s.prevTrack);
  const setShuffle = useStore((s) => s.setShuffle);
    const queueScrollRef = useSmoothScroll<HTMLDivElement>();
  const setRepeat = useStore((s) => s.setRepeat);
  const setVolume = useStore((s) => s.setVolume);
  const navigate = useNavigate();
  const removeFromQueue = useStore((s) => s.removeFromQueue);
  const { currentTrack, isPlaying, volume, shuffle, repeat, duration, isLoading, isAudioReady } = player;

  const trackRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef(false);
  const dragPosRef = useRef(0);

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

  useEffect(() => {
    let raf: number;
    const tick = () => {
      const d = durationRef.current;
      const pos = draggingRef.current ? dragPosRef.current : progressRef.current;
      const pct = d > 0 ? (pos / d) * 100 : 0;
      if (fillRef.current) fillRef.current.style.width = `${pct}%`;
      if (knobRef.current) knobRef.current.style.left = `${pct}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progressRef]);

  const posFromClientX = (clientX: number): number | null => {
    const el = trackRef.current;
    if (!el || !effectiveDuration) return null;
    const rect = el.getBoundingClientRect();
    let percent = (clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));
    return percent * effectiveDuration;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!effectiveDuration) return;
    const pos = posFromClientX(e.clientX);
    if (pos === null) return;

    draggingRef.current = true;
    setIsDragging(true);
    dragPosRef.current = pos;
    e.preventDefault();

    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const p = posFromClientX(ev.clientX);
      if (p !== null) dragPosRef.current = p;
    };

    const onUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (!draggingRef.current) return;
      draggingRef.current = false;

      const p = posFromClientX(ev.clientX);
      setIsDragging(false);
      if (p !== null) {
        seekTo(p);
        useStore.getState().setPosition(p);
        api.seekAudio(p).catch(() => {});
        import('@lib/store/tauriStorage').then(({ saveNow }) => saveNow());
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  if (!currentTrack) {
    return (
      <div className="h-full overflow-auto p-6 bg-bg-primary">
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

  const coverSize = 'calc(50vh - 120px)';

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 flex-1 flex flex-col min-h-0">
        <div className="flex gap-8 flex-shrink-0" style={{ minHeight: coverSize }}>
          <div
            className={`flex-shrink-0 rounded-2xl overflow-hidden relative transition-shadow duration-300 ${
              !isTrackChanging && displayCover
                ? 'shadow-2xl shadow-white/5'
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
            <div className="overflow-hidden relative">
              <h1
                className={`font-bold text-text-primary mb-2 transition-all duration-200 ease-out will-change-transform ${
                  isTrackChanging ? 'opacity-0 -translate-x-8' : 'opacity-100 translate-x-0'
                }`}
                style={{ fontSize: 'clamp(1.2rem, 3vw, 2.5rem)', lineHeight: '1.2', wordBreak: 'break-word' }}
              >
                {displayTrack?.title || currentTrack.title || 'без названия'}
              </h1>
            </div>

            <div className="overflow-hidden relative">
              <p
                className={`text-text-secondary transition-all duration-200 ease-out delay-75 will-change-transform ${
                  isTrackChanging ? 'opacity-0 -translate-x-6' : 'opacity-100 translate-x-0'
                }`}
                style={{ fontSize: 'clamp(0.8rem, 1.5vw, 1.2rem)', wordBreak: 'break-word' }}
              >
                {currentTrack?.user?.id ? (
                  <span
                    onClick={() => navigate(`/artist/${currentTrack.user!.id}`)}
                    className="cursor-pointer hover:text-text-primary transition-colors"
                  >
                    {displayTrack?.user?.username || currentTrack.user.username || ''}
                  </span>
                ) : (
                  displayTrack?.user?.username || currentTrack.user?.username || ''
                )}
              </p>
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

            <div className="flex items-center justify-center gap-2 mt-2">
              <button
                onClick={() => setShuffle(!shuffle)}
                className={`p-1.5 rounded-full transition-all ${shuffle ? 'text-text-secondary' : 'text-text-tertiary hover:text-text-secondary'}`}
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
                  isLoading ? 'bg-bg-secondary cursor-wait' : 'bg-bg-secondary hover:scale-105'
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

            <PlayerVolumeBar
              volume={volume}
              isAudioReady={isAudioReady}
              isLoading={isLoading}
              onVolumeChange={setVolume}
            />
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