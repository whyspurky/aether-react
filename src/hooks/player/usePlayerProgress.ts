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
const END_CALL_GUARD_MS = 2000;

export function usePlayerProgress({
  currentTrackId,
  isPlaying,
  isAudioReady,
  duration,
  isDragging,
  onTrackEnd,
}: Params): Result {
  const progressRef = useRef(0);
  const durationRef = useRef(duration);
  durationRef.current = duration;

  // синхронная инициализация при первом рендере с треком
  const initializedRef = useRef(false);
  if (!initializedRef.current && currentTrackId) {
    initializedRef.current = true;
    const saved = useStore.getState().player.position;
    if (saved > 0) {
      progressRef.current = saved;
    }
  }

  const isPlayingRef = useRef(isPlaying);
  const isReadyRef = useRef(false);
  const endedRef = useRef(false);
  const seekLockUntilRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastStoreSyncRef = useRef(0);
  const lastEndCallRef = useRef(0);
  const currentTrackIdRef = useRef(currentTrackId);
  currentTrackIdRef.current = currentTrackId;

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isReadyRef.current = isAudioReady;
  }, [isAudioReady]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    listen<{ state: string; position: number }>('playback:state', (event) => {
      const { state, position } = event.payload;

      if (state === 'playing') {
        endedRef.current = false;
        if (position < 1.0) {
          // не сбрасываем если это cold start с сохранённой позицией
          const storePos = useStore.getState().player.position;
          if (storePos < 5.0) {
            progressRef.current = 0;
          }
          seekLockUntilRef.current = performance.now() + 300;
        }
      }
    }).then((fn) => { unlisten = fn; });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    listen<{ position: number; track_id: number }>('position-tick', (event) => {
      const { position: pos, track_id: tickTrackId } = event.payload;
      const d = durationRef.current;

      // игнорируем tick от старого трека
      const activeId = currentTrackIdRef.current;
      if (activeId && tickTrackId !== activeId) {
        return;
      }

      if (!isReadyRef.current) return;
      if (endedRef.current) return;
      if (isDraggingRef.current) return;
      if (performance.now() < seekLockUntilRef.current) return;

      if (d > 0 && pos >= d - END_THRESHOLD) {
        const now = performance.now();
        if (now - lastEndCallRef.current < END_CALL_GUARD_MS) {
          return;
        }
        lastEndCallRef.current = now;

        endedRef.current = true;
        progressRef.current = d;
        onTrackEnd();
        return;
      }

      if (isPlayingRef.current) {
        progressRef.current = pos;
      }

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

    if (prevTrackIdRef.current !== undefined && prevTrackIdRef.current !== currentTrackId) {
      progressRef.current = 0;
      endedRef.current = false;
      seekLockUntilRef.current = performance.now() + 500;
      prevTrackIdRef.current = currentTrackId;
      return;
    }

    prevTrackIdRef.current = currentTrackId;
    endedRef.current = false;
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