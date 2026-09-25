import { TrackList } from '../track/TrackList';
import { ArtistEmpty } from './ArtistEmpty';
import type { Track } from '@store/types';

interface Props {
  reposts: Track[];
  visibleCount: number;
  onShowMore: () => void;
}

export function ArtistRepostsTab({ reposts, visibleCount, onShowMore }: Props) {
  if (!reposts.length) return <ArtistEmpty text="нет репостов" />;

  return (
    <>
      <TrackList tracks={reposts.slice(0, visibleCount)} />
      {visibleCount < reposts.length && (
        <button
          onClick={onShowMore}
          className="w-full mt-4 py-2 rounded-lg text-sm text-text-secondary bg-bg-secondary hover:bg-text-secondary hover:text-bg-primary transition-colors"
        >
          показать ещё {Math.min(100, reposts.length - visibleCount)}
        </button>
      )}
    </>
  );
}