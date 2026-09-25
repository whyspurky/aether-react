import { Icon } from '@components/ui/Icon';
import { MyWaveTrackItem } from './MyWaveTrackItem';
import { useSmoothScroll } from '@hooks/ui/useSmoothScroll';
import type { Track } from '@store/types';

interface Props {
  tracks: Track[];
  isLoading: boolean;
  onPlay: () => void;
}

export function MyWaveSection({ tracks, isLoading, onPlay }: Props) {
  const scrollRef = useSmoothScroll<HTMLDivElement>();

  const renderSkeletons = () =>
    [...Array(6)].map((_, i) => {
      const titleWidth = 30 + Math.random() * 40;
      const artistWidth = 25 + Math.random() * 35;
      return (
        <div key={i} className="flex items-center gap-3 p-2">
          <div className="w-10 h-10 rounded-md bg-bg-secondary flex items-center justify-center">
            <Icon name="music" size={16} className="text-text-tertiary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="h-4 bg-bg-secondary rounded mb-1" style={{ width: `${titleWidth}%` }} />
            <div className="h-3 bg-bg-secondary rounded" style={{ width: `${artistWidth}%` }} />
          </div>
        </div>
      );
    });

  return (
    <div className="w-1/3 flex-shrink-0">
      <div className="relative overflow-hidden rounded-2xl bg-bg-secondary/50 backdrop-blur-sm border border-border-subtle p-4 h-96 transition-all duration-200 hover:border-border-visible">
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-text-secondary animate-pulse" />
              <h2 className="mb-1 text-base font-bold text-text-primary">моя волна</h2>
            </div>
            <button
              onClick={onPlay}
              disabled={!tracks.length || isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-secondary text-text-secondary rounded-full text-xs font-medium hover:bg-text-secondary hover:text-bg-primary transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Icon name="play" size={12} />
              <span>слушать</span>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-hidden">
            {isLoading ? (
              <div className="space-y-1">{renderSkeletons()}</div>
            ) : tracks.length ? (
              <div className="space-y-1 animate-content-fade-in">
                {tracks.map((track) => (
                  <MyWaveTrackItem key={track.id} track={track} tracks={tracks} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-text-tertiary">
                <Icon name="music" size={32} className="mb-3 opacity-30" />
                <p className="text-xs">нет рекомендаций</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}