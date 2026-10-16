import { useRef } from 'react';
import { TrackList } from '../track/TrackList';
import { ArtistEmpty } from './ArtistEmpty';
import type { Track } from '@store/types';

interface Props {
  tracks: Track[];
}

export function ArtistTracksTab({ tracks }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  if (!tracks.length) return <ArtistEmpty text="у этого артиста нет треков" />;

  return (
    <div ref={scrollRef} className="h-full w-full overflow-auto overscroll-contain">
      <TrackList
        tracks={tracks}
        virtualize
        scrollRef={scrollRef}
      />
    </div>
  );
}