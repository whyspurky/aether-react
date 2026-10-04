import { useEffect, useRef } from 'react';
import { api } from '@lib/api';
import { listen } from '@tauri-apps/api/event';
import { useStore } from '@store/store';

interface Params {
  currentTrackId: number | null | undefined;
  isPlaying: boolean;
  isLoading: boolean;
  isAudioReady: boolean;
  duration: number;
  isDragging: boolean;
  onTrackEnd: () => void;
}

interface Result {
  progressRef: React.MutableRefObject<number>;
  seekTo: (pos: number) => void;
}

const END_THRESHOLD = 0.5;
const SEEK_LOCK_MS = 400;

export function usePlayerProgress({
  currentTrackId,
  isPlaying,
  isLoading,
  isAudioReady,
  duration,
  isDragging,
  onTrackEnd,
}: Params): Result {
  const progressRef = useRef(0);
  const durationRef = useRef(duration);
  const isPlayingRef = useRef(isPlaying);
  const isReadyRef = useRef(false);
  const endedRef = useRef(false);
  const seekLockUntilRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastStoreSyncRef = useRef(0);

  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { isReadyRef.current = isAudioReady; }, [isAudioReady]);
  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    listen<number>('position-tick', (event) => {
      if (!isReadyRef.current) return;
      if (endedRef.current) return;

      if (isDraggingRef.current) return;
      if (performance.now() < seekLockUntilRef.current) return;

      const pos = event.payload;
      const d = durationRef.current;

      if (d > 0 && pos >= d - END_THRESHOLD) {
        endedRef.current = true;
        progressRef.current = d;
        onTrackEnd();
        return;
      }

      if (isPlayingRef.current) {
        progressRef.current = pos;
      }

      // раз в секунду синхронизируем store чтобы при монтировании взять готовое
      const now = performance.now();
      if (now - lastStoreSyncRef.current > 1000) {
        lastStoreSyncRef.current = now;
        useStore.getState().setPosition(pos);
      }
    }).then((fn) => { unlisten = fn; });

    return () => {
      if (unlisten) unlisten();
    };
  }, [onTrackEnd]);

  const prevTrackIdRef = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (!currentTrackId) {
      progressRef.current = 0;
      prevTrackIdRef.current = currentTrackId;
      return;
    }

    // если трек сменился — сбрасываем в 0
    if (prevTrackIdRef.current !== undefined && prevTrackIdRef.current !== currentTrackId) {
      progressRef.current = 0;
      endedRef.current = false;
      prevTrackIdRef.current = currentTrackId;
      return;
    }

    // первый монтаж — берём из стора (при переключении страницы)
    prevTrackIdRef.current = currentTrackId;
    endedRef.current = false;
    const saved = useStore.getState().player.position;
    if (saved > 0) {
      progressRef.current = saved;
    }
  }, [currentTrackId]);

  useEffect(() => {
    if (!currentTrackId) return;
    (async () => {
      try {
        const rustPos = await api.getPosition();
        if (rustPos > 0 && !isPlayingRef.current) {
          progressRef.current = rustPos;
        }
      } catch {}
    })();
  }, [currentTrackId]);

  const seekTo = (pos: number) => {
    progressRef.current = pos;
    endedRef.current = false;
    seekLockUntilRef.current = performance.now() + SEEK_LOCK_MS;
  };

  return { progressRef, seekTo };
}