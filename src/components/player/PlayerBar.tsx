import { useEffect, useRef } from 'react';
import { Icon } from '@components/ui/Icon';
import { VolumeSlider } from '../track/VolumeSlider';
import { AnimatedTrackInfo } from '../track/AnimatedTrackInfo';
import { useStore } from '@store/store';
import { useNavigate } from 'react-router-dom';
import { usePlayerProgress } from '@hooks/player/usePlayerProgress';
import { useSeekDrag } from '@hooks/player/useSeekDrag';

export function PlayerBar() {
  const navigate = useNavigate();
  const currentTrack = useStore((s) => s.player.currentTrack);
  const isPlaying = useStore((s) => s.player.isPlaying);
  const volume = useStore((s) => s.player.volume);
  const duration = useStore((s) => s.player.duration);
  const isLoading = useStore((s) => s.player.isLoading);
  const isAudioReady = useStore((s) => s.player.isAudioReady);
  const togglePlay = useStore((s) => s.togglePlay);
  const nextTrack = useStore((s) => s.nextTrack);
  const prevTrack = useStore((s) => s.prevTrack);
  const setVolume = useStore((s) => s.setVolume);

  const barRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);

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
    isDragging: false,
    onTrackEnd: () => {
      useStore.getState().nextTrack();
    },
  });

  const { isDragging, dragPosRef, handleMouseDown } = useSeekDrag({
    trackRef: barRef,
    effectiveDuration,
    onSeek: (pos) => {
      seekTo(pos);
      useStore.getState().setPosition(pos);
    },
  });

  useEffect(() => {
    let raf: number;
    const tick = () => {
      const d = durationRef.current;
      const pos = isDragging ? dragPosRef.current : progressRef.current;
      const pct = d > 0 ? (pos / d) * 100 : 0;
      if (fillRef.current) fillRef.current.style.width = `${pct}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progressRef, isDragging, dragPosRef]);

  const handleOpenPlayer = () => navigate('/player');
  const handleOpenArtist = () => {
    const id = currentTrack?.user?.id;
    if (id) navigate(`/artist/${id}`);
  };

  const coverUrl = currentTrack?.artwork_url?.replace('-large', '-t300x300') || null;

  return (
    <div className="relative flex items-center justify-center px-6 py-3 w-full">
      <div className="absolute left-6 flex items-center gap-4 max-w-[calc(50%-80px)]">
        <div onClick={handleOpenPlayer} className="relative flex-shrink-0 cursor-pointer">
          {coverUrl ? (
            <img src={coverUrl} className="w-10 h-10 rounded-lg object-cover" alt="" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-bg-secondary flex items-center justify-center">
              <Icon name="music" size={18} className="text-text-tertiary" />
            </div>
          )}
          {isPlaying && (
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-text-secondary animate-pulse" />
          )}
        </div>

        <AnimatedTrackInfo
          track={currentTrack}
          className="min-w-0 flex-1 max-w-[200px]"
          onTitleClick={handleOpenPlayer}
          onArtistClick={handleOpenArtist}
        />
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <button
          onClick={() => prevTrack(true)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-glass-bg transition-all duration-200"
        >
          <Icon name="skip-back" size={16} />
        </button>

        <button
          onClick={togglePlay}
          disabled={isLoading}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
            isLoading
              ? 'bg-bg-secondary cursor-wait'
              : 'bg-bg-secondary text-text-primary hover:bg-text-secondary hover:text-bg-primary hover:scale-105'
          }`}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
          ) : (
            <Icon name={isPlaying ? 'pause' : 'play'} size={18} />
          )}
        </button>

        <button
          onClick={() => nextTrack(true)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-glass-bg transition-all duration-200"
        >
          <Icon name="skip-forward" size={16} />
        </button>
      </div>

      <div className="absolute right-6 flex-shrink-0 w-[100px] flex justify-end">
        <VolumeSlider volume={volume} onVolumeChange={setVolume} />
      </div>

      <div
        ref={barRef}
        onMouseDown={handleMouseDown}
        className="absolute bottom-0 left-0 right-0 h-3 cursor-pointer group"
      >
        <div
          className={`absolute bottom-0 left-0 right-0 bg-[#333333] will-change-[height] transition-[height] duration-2 ease-out ${
            isDragging ? 'h-[4px]' : 'h-[2px] group-hover:h-[4px]'
          }`}
        >
          <div
            ref={fillRef}
            className="absolute left-0 top-0 h-full bg-white"
            style={{ width: '0%' }}
          />
        </div>
      </div>
    </div>
  );
}