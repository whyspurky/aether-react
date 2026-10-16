import { useRef } from 'react';
import { TrackList } from '../track/TrackList';
import { ArtistEmpty } from './ArtistEmpty';
import type { Track } from '@store/types';

interface Props {
  reposts: Track[];
}

export function ArtistRepostsTab({ reposts }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  if (!reposts.length) return <ArtistEmpty text="нет репостов" />;

  return (
    <div ref={scrollRef} className="h-full w-full overflow-auto overscroll-contain">
      <TrackList
        tracks={reposts}
        virtualize
        scrollRef={scrollRef}
      />
    </div>
  );
}