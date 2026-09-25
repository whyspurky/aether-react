import { TrackList } from '../track/TrackList';
import type { Track } from '@store/types';

interface Props {
  tracks: Track[];
  scrollRef: React.Ref<HTMLDivElement>;
  onRemove: (trackId: number) => void;
}

export function PlayerQueue({ tracks, scrollRef, onRemove }: Props) {
  if (!tracks.length) return null;

  return (
    <div className="mt-3 flex-1 min-h-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-text-tertiary uppercase tracking-wider">
          ОЧЕРЕДЬ - {tracks.length} ТРЕКОВ
        </h3>
      </div>
      <div ref={scrollRef} className="h-full max-h-[calc(50vh-41.6px)] overflow-y-auto scrollbar-thin">
        <TrackList
          tracks={tracks}
          showQueueButton
          onRemove={(track) => onRemove(track.id)}
        />
      </div>
    </div>
  );
}