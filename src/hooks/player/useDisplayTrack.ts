import { useEffect, useRef, useState } from 'react';
import type { Track } from '@store/types';

const TRACK_SWAP_MS = 200;

export function useDisplayTrack(currentTrack: Track | null): {
  displayTrack: Track | null;
  isChanging: boolean;
} {
  const [displayTrack, setDisplayTrack] = useState<Track | null>(currentTrack);
  const [isChanging, setIsChanging] = useState(false);
  const prevTrackIdRef = useRef<number | null>(null);
  const isFirstRef = useRef(true);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!currentTrack) {
      setDisplayTrack(null);
      setIsChanging(false);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (isFirstRef.current) {
      setDisplayTrack(currentTrack);
      prevTrackIdRef.current = currentTrack.id;
      isFirstRef.current = false;
      return;
    }

    if (prevTrackIdRef.current !== currentTrack.id) {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }

      setIsChanging(true);
      prevTrackIdRef.current = currentTrack.id;

      timerRef.current = window.setTimeout(() => {
        setDisplayTrack(currentTrack);
        setIsChanging(false);
        timerRef.current = null;
      }, TRACK_SWAP_MS);
    } else {
      // метаданные обновились у того же трека
      if (displayTrack?.genre !== currentTrack.genre ||
          displayTrack?.playback_count !== currentTrack.playback_count ||
          displayTrack?.title !== currentTrack.title) {
        setDisplayTrack(currentTrack);
      }
    }
  }, [currentTrack, displayTrack]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { displayTrack, isChanging };
}