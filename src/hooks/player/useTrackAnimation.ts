import { useEffect, useRef, useState } from 'react';
import type { Track } from '@store/types';

interface Result {
  displayTrack: Track | null;
  displayCover: string | null;
  isTrackChanging: boolean;
}

export function useTrackAnimation(currentTrack: Track | null): Result {
  const [isTrackChanging, setIsTrackChanging] = useState(false);
  const [displayTrack, setDisplayTrack] = useState<Track | null>(currentTrack);
  const [displayCover, setDisplayCover] = useState<string | null>(
    currentTrack?.artwork_url?.replace('-large', '-t500x500') ||
    currentTrack?.user?.avatar_url?.replace('-large', '-t500x500') ||
    null
  );
  const prevTrackId = useRef<number | null>(null);
  const isFirstTrack = useRef(true);

  useEffect(() => {
    if (!currentTrack) {
      setDisplayTrack(null);
      setDisplayCover(null);
      return;
    }

    const cover =
      currentTrack.artwork_url?.replace('-large', '-t500x500') ||
      currentTrack.user?.avatar_url?.replace('-large', '-t500x500') ||
      null;

    if (isFirstTrack.current) {
      setDisplayTrack(currentTrack);
      setDisplayCover(cover);
      prevTrackId.current = currentTrack.id;
      isFirstTrack.current = false;
      return;
    }

    if (prevTrackId.current !== currentTrack.id) {
      setIsTrackChanging(true);
      prevTrackId.current = currentTrack.id;

      const t = setTimeout(() => {
        setDisplayTrack(currentTrack);
        setDisplayCover(cover);
        setIsTrackChanging(false);
      }, 200);

      return () => clearTimeout(t);
    }
  }, [currentTrack]);

  return { displayTrack, displayCover, isTrackChanging };
}