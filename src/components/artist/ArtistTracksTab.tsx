import { TrackList } from '../track/TrackList';
import { ArtistEmpty } from './ArtistEmpty';
import type { Track } from '@store/types';

interface Props {
  tracks: Track[];
  visibleCount: number;
  onShowMore: () => void;
}

export function ArtistTracksTab({ tracks, visibleCount, onShowMore }: Props) {
  if (!tracks.length) return <ArtistEmpty text="у этого артиста нет треков" />;

  return (
    <>
      <TrackList tracks={tracks.slice(0, visibleCount)} />
      {visibleCount < tracks.length && (
        <button
          onClick={onShowMore}
          className="w-full mt-4 py-2 rounded-lg text-sm text-text-secondary bg-bg-secondary hover:bg-text-secondary hover:text-bg-primary transition-colors"
        >
          показать ещё {Math.min(100, tracks.length - visibleCount)}
        </button>
      )}
    </>
  );
}