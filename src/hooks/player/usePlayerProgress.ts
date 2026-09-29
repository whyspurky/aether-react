import { useEffect, useRef } from 'react';
import { api } from '@lib/api';
import { useStore } from '@store/store';

interface Params {
  currentTrackId: number | null | undefined;
  isPlaying: boolean;
  isLoading: boolean;
  isAudioReady: boolean;
  duration: number;
  onTrackEnd: () => void;
  onSyncPosition: (pos: number) => void;
}

interface Result {
  progressRef: React.MutableRefObject<number>;
  seekTo: (pos: number) => void;
}

const SYNC_INTERVAL_MS = 3000;
const END_THRESHOLD = 0.5;

export function usePlayerProgress({
  currentTrackId,
  isPlaying,
  isLoading,
  isAudioReady,
  duration,
  onTrackEnd,
  onSyncPosition,
}: Params): Result {
  const progressRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const syncRef = useRef<number | null>(null);

  const basePosRef = useRef(0);
  const baseTimeRef = useRef(0);
  const playingRef = useRef(false);
  const durationRef = useRef(duration);
  const isReadyRef = useRef(false);
  const endedRef = useRef(false);

  useEffect(() => { durationRef.current = duration; }, [duration]);

  useEffect(() => {
    isReadyRef.current = isAudioReady;
    if (!isAudioReady) {
      basePosRef.current = 0;
      progressRef.current = 0;
    }
  }, [isAudioReady]);

  useEffect(() => {
    playingRef.current = isPlaying;

    if (isPlaying) {
      baseTimeRef.current = performance.now();
    } else {
      basePosRef.current = progressRef.current;
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!currentTrackId) {
      progressRef.current = 0;
      basePosRef.current = 0;
      return;
    }

    endedRef.current = false;

    // при первом монтировании берём сохранённую позицию из стора
    if (progressRef.current === 0 && basePosRef.current === 0) {
      const saved = useStore.getState().player.position;
      if (saved > 0) {
        progressRef.current = saved;
        basePosRef.current = saved;
      }
    }

    const tick = () => {
      if (playingRef.current && isReadyRef.current) {
        const elapsed = (performance.now() - baseTimeRef.current) / 1000;
        const pos = basePosRef.current + elapsed;
        const d = durationRef.current;

        if (d > 0 && pos >= d - END_THRESHOLD && !endedRef.current) {
          endedRef.current = true;
          progressRef.current = d;
          onTrackEnd();
          return;
        }

        progressRef.current = pos;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    const sync = async () => {
      if (!playingRef.current || !isReadyRef.current) return;
      try {
        const rustPos = await api.getPosition();
        const frontPos = progressRef.current;
        const diff = Math.abs(rustPos - frontPos);

        if (diff > 0.5) {
          basePosRef.current = rustPos;
          baseTimeRef.current = performance.now();
          progressRef.current = rustPos;
        }

        onSyncPosition(rustPos);
      } catch {}
    };

    syncRef.current = window.setInterval(sync, SYNC_INTERVAL_MS);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (syncRef.current !== null) clearInterval(syncRef.current);
      rafRef.current = null;
      syncRef.current = null;
    };
  }, [currentTrackId, onTrackEnd, onSyncPosition]);

  
  const seekTo = (pos: number) => {
    basePosRef.current = pos;
    baseTimeRef.current = performance.now();
    progressRef.current = pos;
    endedRef.current = false;
  };

  return { progressRef, seekTo };
}