// src/components/PlayerBar.tsx

import { Icon } from './Icon';
import { VolumeSlider } from './VolumeSlider';
import { AnimatedTrackInfo } from './AnimatedTrackInfo';
import { useStore } from '../store/store';

export function PlayerBar() {
  const currentTrack = useStore((s) => s.player.currentTrack);
  const isPlaying = useStore((s) => s.player.isPlaying);
  const volume = useStore((s) => s.player.volume);
  const togglePlay = useStore((s) => s.togglePlay);
  const nextTrack = useStore((s) => s.nextTrack);
  const prevTrack = useStore((s) => s.prevTrack);
  const setVolume = useStore((s) => s.setVolume);

  const coverUrl = currentTrack?.artwork_url?.replace('-large', '-t300x300') || null;

  return (
    <div className="relative flex items-center justify-center px-6 py-3 w-full">
      <div className="absolute left-6 flex items-center gap-4 max-w-[calc(50%-80px)]">
        <div className="relative flex-shrink-0">
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

        <AnimatedTrackInfo track={currentTrack} className="min-w-0 flex-1 max-w-[200px]" />
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <button
          onClick={prevTrack}
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
          onClick={nextTrack}
          className="w-8 h-8 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-glass-bg transition-all duration-200"
        >
          <Icon name="skip-forward" size={16} />
        </button>
      </div>

      <div className="absolute right-6 flex-shrink-0 w-[100px] flex justify-end">
        <VolumeSlider volume={volume} onVolumeChange={setVolume} />
      </div>
    </div>
  );
}