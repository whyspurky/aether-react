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
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!currentTrack) return;
    if (displayTrack?.id !== currentTrack.id) return;

    if (
      displayTrack.genre !== currentTrack.genre ||
      displayTrack.playback_count !== currentTrack.playback_count ||
      displayTrack.title !== currentTrack.title
    ) {
      setDisplayTrack(currentTrack);
    }
  }, [currentTrack, displayTrack]);

  useEffect(() => {
    if (!currentTrack) {
      setDisplayTrack(null);
      setDisplayCover(null);
      setIsTrackChanging(false);
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
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
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      setIsTrackChanging(true);
      prevTrackId.current = currentTrack.id;

      timerRef.current = setTimeout(() => {
        setDisplayTrack(currentTrack);
        setDisplayCover(cover);
        setIsTrackChanging(false);
        timerRef.current = null;
      }, 200);
    }
  }, [currentTrack]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { displayTrack, displayCover, isTrackChanging };
}