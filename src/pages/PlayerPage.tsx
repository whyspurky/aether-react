import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Icon } from '../components/Icon';
import { useStore } from '../store/store';
import { api } from '../lib/api';
import { formatSec } from '../lib/format';
import { TrackList } from '../components/TrackList';
import { useNavigate } from 'react-router-dom';
import { useSmoothScroll } from '../hooks/useSmoothScroll';

function throttle<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let last = 0;
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn(...args);
    }
  }) as T;
}

export default function PlayerPage() {
  const player = useStore((s) => s.player);
  const queue = useStore((s) => s.queue);
  const togglePlay = useStore((s) => s.togglePlay);
  const nextTrack = useStore((s) => s.nextTrack);
  const prevTrack = useStore((s) => s.prevTrack);
  const setShuffle = useStore((s) => s.setShuffle);
  const setRepeat = useStore((s) => s.setRepeat);
  const setVolume = useStore((s) => s.setVolume);
  const setPosition = useStore((s) => s.setPosition);
  const navigate = useNavigate();
  const queueScrollRef = useSmoothScroll<HTMLDivElement>();
  const { currentTrack, isPlaying, volume, shuffle, repeat, position, duration, isLoading, isAudioReady } = player;

  const isAudioReadyRef = useRef(isAudioReady);
  useEffect(() => { isAudioReadyRef.current = isAudioReady; }, [isAudioReady]);

  const [isTrackChanging, setIsTrackChanging] = useState(false);
  const [displayTrack, setDisplayTrack] = useState(currentTrack);
  const [displayCover, setDisplayCover] = useState<string | null>(
    currentTrack?.artwork_url?.replace('-large', '-t500x500') ||
    currentTrack?.user?.avatar_url?.replace('-large', '-t500x500') ||
    null
  );
  const prevTrackId = useRef<number | null>(null);
  const isFirstTrack = useRef(true);

  useEffect(() => {
    if (!currentTrack) {
      setDisplayTrack(null);
      setDisplayCover(null);
      return;
    }

    const cover =
      currentTrack.artwork_url?.replace('-large', '-t500x500') ||
      currentTrack.user?.avatar_url?.replace('-large', '-t500x500') ||
      null;

    if (isFirstTrack.current) {
      setDisplayTrack(currentTrack);
      setDisplayCover(cover);
      prevTrackId.current = currentTrack.id;
      isFirstTrack.current = false;
      return;
    }

    if (prevTrackId.current !== currentTrack.id) {
      setIsTrackChanging(true);
      prevTrackId.current = currentTrack.id;

      const t = setTimeout(() => {
        setDisplayTrack(currentTrack);
        setDisplayCover(cover);
        setIsTrackChanging(false);
      }, 200);

      return () => clearTimeout(t);
    }
  }, [currentTrack]);

  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [dragProgressPosition, setDragProgressPosition] = useState(0);

  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [dragVolume, setDragVolume] = useState(volume / 100);
  const [volumeBeforeMute, setVolumeBeforeMute] = useState(0.8);
  const [showVolumeKnob, setShowVolumeKnob] = useState(false);

  const positionInterval = useRef<NodeJS.Timeout | null>(null);

  const coverUrl =
    currentTrack?.artwork_url?.replace('-large', '-t500x500') ||
    currentTrack?.user?.avatar_url?.replace('-large', '-t500x500') ||
    null;

  const throttledSetVolume = useRef(
    throttle((value: number) => {
      if (!isAudioReadyRef.current) return;
      setVolume(Math.round(value * 100));
    }, 100)
  ).current;

  const displayPosition = isDraggingProgress ? dragProgressPosition : position;
  const displayVolume = isDraggingVolume ? dragVolume : volume / 100;

  const effectiveDuration = duration > 0
    ? duration
    : (currentTrack?.duration ? currentTrack.duration / 1000 : 0);

  const progressPercent = effectiveDuration > 0
    ? (displayPosition / effectiveDuration) * 100
    : 0;


  const handleProgressMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!effectiveDuration) return;
    setIsDraggingProgress(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setDragProgressPosition(percent * effectiveDuration);
    e.preventDefault();
  }, [effectiveDuration]);

  const handleProgressMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingProgress || !effectiveDuration) return;
    const el = document.getElementById('progress-track');
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let percent = (e.clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));
    setDragProgressPosition(percent * effectiveDuration);
  }, [isDraggingProgress, effectiveDuration]);

  const handleProgressMouseUp = useCallback(async (e: MouseEvent) => {
    if (!isDraggingProgress || !effectiveDuration) {
      setIsDraggingProgress(false);
      return;
    }
    const el = document.getElementById('progress-track');
    if (el) {
      const rect = el.getBoundingClientRect();
      let percent = (e.clientX - rect.left) / rect.width;
      percent = Math.max(0, Math.min(1, percent));
      const pos = percent * effectiveDuration;
      setPosition(pos);
      try { await api.seekAudio(pos); } catch {}
    }
    setIsDraggingProgress(false);
  }, [isDraggingProgress, effectiveDuration, setPosition]);

  const handleProgressTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!effectiveDuration) return;
    setIsDraggingProgress(true);
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    setDragProgressPosition(percent * effectiveDuration);
    e.preventDefault();
  }, [effectiveDuration]);

  const handleProgressTouchMove = useCallback((e: TouchEvent) => {
    if (!isDraggingProgress || !effectiveDuration) return;
    const el = document.getElementById('progress-track');
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const touch = e.touches[0];
    let percent = (touch.clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));
    setDragProgressPosition(percent * effectiveDuration);
  }, [isDraggingProgress, effectiveDuration]);

  const handleProgressTouchEnd = useCallback(async (e: TouchEvent) => {
    if (!isDraggingProgress || !effectiveDuration) {
      setIsDraggingProgress(false);
      return;
    }
    const el = document.getElementById('progress-track');
    if (el) {
      const rect = el.getBoundingClientRect();
      const touch = e.changedTouches[0];
      let percent = (touch.clientX - rect.left) / rect.width;
      percent = Math.max(0, Math.min(1, percent));
      const pos = percent * effectiveDuration;
      setPosition(pos);
      try { await api.seekAudio(pos); } catch {}
    }
    setIsDraggingProgress(false);
  }, [isDraggingProgress, effectiveDuration, setPosition]);


  const updateVolume = useCallback((percent: number) => {
    const v = Math.max(0, Math.min(1, percent));
    setDragVolume(v);
    throttledSetVolume(v);
    if (v > 0) setVolumeBeforeMute(v);
  }, [throttledSetVolume]);

  const handleMuteToggle = useCallback(() => {
    if (!isAudioReadyRef.current) return;
    if (volume === 0) {
      setVolume(Math.round((volumeBeforeMute || 0.8) * 100));
    } else {
      setVolumeBeforeMute(volume / 100);
      setVolume(0);
    }
  }, [volume, volumeBeforeMute, setVolume]);

  const handleVolumeTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAudioReadyRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    let percent = (e.clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));
    setVolume(Math.round(percent * 100));
    if (percent > 0) setVolumeBeforeMute(percent);
  }, [setVolume]);

  const handleVolumeMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAudioReadyRef.current) return;
    setIsDraggingVolume(true);
    const rect = e.currentTarget.getBoundingClientRect();
    let percent = (e.clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));
    updateVolume(percent);
    e.preventDefault();
  }, [updateVolume]);

  const handleVolumeMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingVolume) return;
    const el = document.getElementById('volume-track');
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let percent = (e.clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));
    updateVolume(percent);
  }, [isDraggingVolume, updateVolume]);

  const handleVolumeMouseUp = useCallback(() => {
    if (!isDraggingVolume) return;
    setIsDraggingVolume(false);
    setVolume(Math.round(dragVolume * 100));
  }, [isDraggingVolume, dragVolume, setVolume]);

  const handleVolumeTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isAudioReadyRef.current) return;
    setIsDraggingVolume(true);
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    let percent = (touch.clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));
    updateVolume(percent);
    e.preventDefault();
  }, [updateVolume]);

  const handleVolumeTouchMove = useCallback((e: TouchEvent) => {
    if (!isDraggingVolume) return;
    const el = document.getElementById('volume-track');
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const touch = e.touches[0];
    let percent = (touch.clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));
    updateVolume(percent);
  }, [isDraggingVolume, updateVolume]);

  const handleVolumeTouchEnd = useCallback(() => {
    if (!isDraggingVolume) return;
    setIsDraggingVolume(false);
    setVolume(Math.round(dragVolume * 100));
  }, [isDraggingVolume, dragVolume, setVolume]);


  useEffect(() => {
    if (!isDraggingProgress) return;
    document.addEventListener('mousemove', handleProgressMouseMove);
    document.addEventListener('mouseup', handleProgressMouseUp);
    document.addEventListener('touchmove', handleProgressTouchMove);
    document.addEventListener('touchend', handleProgressTouchEnd);
    return () => {
      document.removeEventListener('mousemove', handleProgressMouseMove);
      document.removeEventListener('mouseup', handleProgressMouseUp);
      document.removeEventListener('touchmove', handleProgressTouchMove);
      document.removeEventListener('touchend', handleProgressTouchEnd);
    };
  }, [isDraggingProgress, handleProgressMouseMove, handleProgressMouseUp, handleProgressTouchMove, handleProgressTouchEnd]);

  useEffect(() => {
    if (!isDraggingVolume) return;
    document.addEventListener('mousemove', handleVolumeMouseMove);
    document.addEventListener('mouseup', handleVolumeMouseUp);
    document.addEventListener('touchmove', handleVolumeTouchMove);
    document.addEventListener('touchend', handleVolumeTouchEnd);
    return () => {
      document.removeEventListener('mousemove', handleVolumeMouseMove);
      document.removeEventListener('mouseup', handleVolumeMouseUp);
      document.removeEventListener('touchmove', handleVolumeTouchMove);
      document.removeEventListener('touchend', handleVolumeTouchEnd);
    };
  }, [isDraggingVolume, handleVolumeMouseMove, handleVolumeMouseUp, handleVolumeTouchMove, handleVolumeTouchEnd]);

  useEffect(() => {
    if (!isDraggingProgress) setDragProgressPosition(position);
  }, [position, isDraggingProgress]);

  useEffect(() => {
    if (!isDraggingVolume) setDragVolume(volume / 100);
  }, [volume, isDraggingVolume]);


  useEffect(() => {
    if (!currentTrack) return;

    const tick = async () => {
      if (isLoading) return;
      try {
        const pos = await api.getPosition();
        if (!isDraggingProgress && useStore.getState().player.pendingSeek === null) {
          setPosition(pos);
        }
      } catch {}
    };

    positionInterval.current = setInterval(tick, 500);
    return () => {
      if (positionInterval.current) clearInterval(positionInterval.current);
      positionInterval.current = null;
    };
  }, [currentTrack, isDraggingProgress, setPosition, isLoading]);

  const memoizedTrackList = useMemo(
    () => queue.tracks.length ? <TrackList tracks={queue.tracks} showQueueButton /> : null,
    [queue.tracks]
  );

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
    <div className="h-full overflow-auto">
      <div className="p-4">
        <div className="flex gap-8" style={{ minHeight: coverSize }}>
          <div
            className="flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl shadow-white/5 relative"
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

            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm text-text-tertiary">
                <span>{formatSec(displayPosition)}</span>
                <span>{formatSec(effectiveDuration)}</span>
              </div>

              <div className="relative group py-1 -my-1">
                <div
                  className="absolute inset-0 -top-3 -bottom-3 cursor-pointer z-10"
                  onMouseDown={handleProgressMouseDown}
                  onTouchStart={handleProgressTouchStart}
                />
                <div id="progress-track" className="relative h-1.5 bg-[#333333] rounded-full">
                  <div
                    id="progress-fill"
                    className="absolute left-0 top-0 h-full bg-white rounded-full will-change-transform"
                    style={{ width: `${progressPercent}%`, transition: 'none' }}
                  />
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg pointer-events-none will-change-transform ${
                      isDraggingProgress
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100'
                    }`}
                    style={{
                      left: `calc(${progressPercent}% - 8px)`,
                      transition: 'opacity 0.15s ease, transform 0.15s ease',
                    }}
                  />
                </div>
              </div>
            </div>

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

            <div className="w-full mt-2">
              <div className="flex items-center gap-2">
                <button
                  className="text-text-tertiary hover:text-text-primary transition-all"
                  onClick={handleMuteToggle}
                  disabled={isLoading}
                >
                  <Icon name={displayVolume === 0 ? 'volume-x' : 'volume-2'} size={16} />
                </button>

                <div
                  className="flex-1 relative group py-2 -my-2"
                  onMouseEnter={() => setShowVolumeKnob(true)}
                  onMouseLeave={() => setShowVolumeKnob(false)}
                >
                  <div
                    className="absolute inset-0 -top-3 -bottom-3 cursor-pointer z-10"
                    onMouseDown={handleVolumeMouseDown}
                    onTouchStart={handleVolumeTouchStart}
                    onClick={handleVolumeTrackClick}
                  />

                  <div id="volume-track" className="relative h-1 bg-[#333333] rounded-full">
                    <div
                      id="volume-fill"
                      className="absolute left-0 top-0 h-full bg-white rounded-full will-change-transform"
                      style={{ width: `${displayVolume * 100}%`, transition: 'none' }}
                    />
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg pointer-events-none will-change-transform ${
                        isDraggingVolume || showVolumeKnob ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                      }`}
                      style={{
                        left: `calc(${displayVolume * 100}% - 8px)`,
                        transition: 'opacity 0.15s ease, transform 0.15s ease',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {queue.tracks.length > 0 && (
          <div className="mt-3 flex-1 min-h-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-text-tertiary uppercase tracking-wider">
                ОЧЕРЕДЬ - {queue.tracks.length} ТРЕКОВ
              </h3>
            </div>
            <div ref={queueScrollRef} className="h-full max-h-[calc(50vh-41.6px)] overflow-y-auto scrollbar-thin">
              {memoizedTrackList}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}