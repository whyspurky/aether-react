import { useRef } from 'react';
import { TrackList } from '../track/TrackList';
import { ArtistEmpty } from './ArtistEmpty';
import { useSmoothScroll } from '@hooks/ui/useSmoothScroll';
import type { Track } from '@store/types';

interface Props {
  tracks: Track[];
}

export function ArtistTracksTab({ tracks }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const setSmoothRef = useSmoothScroll<HTMLDivElement>({ sensitivity: 1.5, duration: 300 });

  const setRefs = (node: HTMLDivElement | null) => {
    setSmoothRef(node);
    scrollRef.current = node;
  };

  if (!tracks.length) return <ArtistEmpty text="у этого артиста нет треков" />;

  return (
    <div ref={setRefs} className="h-full w-full overflow-auto scrollbar-thin">
      <TrackList
        tracks={tracks}
        virtualize
        scrollRef={scrollRef}
      />
    </div>
  );
}