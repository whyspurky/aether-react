import { useCallback, useRef, useState } from 'react';
import { Icon } from '@components/ui/Icon';
import { VolumeSlider } from '../track/VolumeSlider';
import { AnimatedTrackInfo } from '../track/AnimatedTrackInfo';
import { useStore } from '@store/store';
import { api } from '@lib/api';
import { useNavigate } from 'react-router-dom';

export function PlayerBar() {
  const navigate = useNavigate();
  const currentTrack = useStore((s) => s.player.currentTrack);
  const isPlaying = useStore((s) => s.player.isPlaying);
  const volume = useStore((s) => s.player.volume);
  const position = useStore((s) => s.player.position);
  const duration = useStore((s) => s.player.duration);
  const togglePlay = useStore((s) => s.togglePlay);
  const nextTrack = useStore((s) => s.nextTrack);
  const prevTrack = useStore((s) => s.prevTrack);
  const setVolume = useStore((s) => s.setVolume);
  const setPosition = useStore((s) => s.setPosition);

  const barRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState(0);

  const effectiveDuration = duration > 0
    ? duration
    : (currentTrack?.duration ? currentTrack.duration / 1000 : 0);

  const displayPosition = isDragging ? dragPos : position;
  const progressPercent = effectiveDuration > 0
    ? (displayPosition / effectiveDuration) * 100
    : 0;

  const posFromClientX = (clientX: number): number | null => {
    const el = barRef.current;
    if (!el || !effectiveDuration) return null;
    const rect = el.getBoundingClientRect();
    let percent = (clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));
    return percent * effectiveDuration;
  };

  const handleOpenPlayer = () => {
    navigate('/player');
  };

  const handleOpenArtist = () => {
    const id = currentTrack?.user?.id;
    if (id) navigate(`/artist/${id}`);
  };


  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!effectiveDuration) return;
    const pos = posFromClientX(e.clientX);
    if (pos === null) return;

    draggingRef.current = true;
    setIsDragging(true);
    setDragPos(pos);
    e.preventDefault();

    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const p = posFromClientX(ev.clientX);
      if (p !== null) setDragPos(p);
    };

    const onUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (!draggingRef.current) return;
      draggingRef.current = false;

      const p = posFromClientX(ev.clientX);
      setIsDragging(false);
      if (p !== null) {
        setPosition(p);
        api.seekAudio(p).catch(() => {});
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [effectiveDuration, setPosition]);

  const coverUrl = currentTrack?.artwork_url?.replace('-large', '-t300x300') || null;

  return (
    <div className="relative flex items-center justify-center px-6 py-3 w-full">
      <div className="absolute left-6 flex items-center gap-4 max-w-[calc(50%-80px)]">
        <div
          onClick={handleOpenPlayer}
          className="relative flex-shrink-0 cursor-pointer"
        >
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
          className="w-10 h-10 rounded-full flex items-center justify-center bg-bg-secondary text-text-primary hover:bg-text-secondary hover:text-bg-primary hover:scale-105 transition-all duration-200"
        >
          <Icon name={isPlaying ? 'pause' : 'play'} size={18} />
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
            className="absolute left-0 top-0 h-full bg-white"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}