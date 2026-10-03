import { useRef } from 'react';
import { TrackList } from '../track/TrackList';
import { ArtistEmpty } from './ArtistEmpty';
import { useSmoothScroll } from '@hooks/ui/useSmoothScroll';
import type { Track } from '@store/types';

interface Props {
  reposts: Track[];
}

export function ArtistRepostsTab({ reposts }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const setSmoothRef = useSmoothScroll<HTMLDivElement>({ sensitivity: 1.5, duration: 300 });

  const setRefs = (node: HTMLDivElement | null) => {
    setSmoothRef(node);
    scrollRef.current = node;
  };

  if (!reposts.length) return <ArtistEmpty text="нет репостов" />;

  return (
    <div ref={setRefs} className="h-[calc(100vh-140px)] overflow-auto scrollbar-thin">
      <TrackList
        tracks={reposts}
        virtualize
        scrollRef={scrollRef}
      />
    </div>
  );
}