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
const STORE_SYNC_FALLBACK_SECS = 1;
const PLAYBACK_STATE_LOCK_MS = 300;
const TRACK_CHANGE_LOCK_MS = 500;
const RESET_POSITION_THRESHOLD = 1.0;
const STORE_RESET_THRESHOLD = 5.0;

let lastEndHandledTrackId: number | null = null;
let lastEndHandledAt = 0;

export function usePlayerProgress({
  currentTrackId,
  isPlaying,
  isLoading,
  isAudioReady,
  duration,
  isDragging,
  onTrackEnd,
}: Params): Result {
  const persistSecs =
    useStore((s) => s.perf.persistSecs) || STORE_SYNC_FALLBACK_SECS;
  const progressRef = useRef(0);
  const durationRef = useRef(duration);
  durationRef.current = duration;

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
  const persistSecsRef = useRef(persistSecs);
  const onTrackEndRef = useRef(onTrackEnd);
  const isLoadingRef = useRef(isLoading);
  currentTrackIdRef.current = currentTrackId;
  persistSecsRef.current = persistSecs;
  onTrackEndRef.current = onTrackEnd;
  isLoadingRef.current = isLoading;

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isReadyRef.current = isAudioReady;
  }, [isAudioReady]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  // подписки ставим один раз: раньше они пересоздавались на каждый рендер
  const handleEnd = () => {
    const now = performance.now();
    if (now - lastEndCallRef.current < END_CALL_GUARD_MS) return;
    lastEndCallRef.current = now;

    const handledId = currentTrackIdRef.current ?? null;
    if (
      handledId &&
      lastEndHandledTrackId === handledId &&
      now - lastEndHandledAt < END_CALL_GUARD_MS
    ) {
      endedRef.current = true;
      return;
    }
    lastEndHandledTrackId = handledId;
    lastEndHandledAt = now;

    endedRef.current = true;
    const d = durationRef.current;
    if (d > 0) progressRef.current = d;

    // фиксируем завершение трека
    const current = useStore.getState().player.currentTrack;
    if (current) {
      useStore.getState().addTrackCompleted({
        user: current.user,
        duration: current.duration,
        genre: current.genre,
      });
    }

    onTrackEndRef.current();
  };
  const endHandlerRef = useRef<() => void>(() => {});
  endHandlerRef.current = handleEnd;

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | null = null;

    listen<{ state: string; position: number }>('playback:state', (event) => {
      const { state, position } = event.payload;

      if (state === 'ended') {
        // rust сам увидел конец файла: метаданные sc могли быть длиннее
        if (useStore.getState().player.autoAdvancePending) return;
        if (!isReadyRef.current) return;
        endHandlerRef.current();
        return;
      }

      if (state === 'stopped') {
        endedRef.current = false;
        return;
      }

      if (state === 'playing') {
        endedRef.current = false;
        if (position < RESET_POSITION_THRESHOLD) {
          const storePos = useStore.getState().player.position;
          if (storePos < STORE_RESET_THRESHOLD) {
            progressRef.current = 0;
          }
          seekLockUntilRef.current = performance.now() + PLAYBACK_STATE_LOCK_MS;
        }
      }
    }).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });

    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | null = null;

    listen<{ position: number; track_id: number }>('position-tick', (event) => {
      const { position: pos, track_id: tickTrackId } = event.payload;
      const d = durationRef.current;

      const activeId = currentTrackIdRef.current;
      if (activeId && tickTrackId !== activeId) {
        return;
      }

      if (!isReadyRef.current) return;
      if (endedRef.current) return;
      if (isDraggingRef.current) return;
      if (performance.now() < seekLockUntilRef.current) return;

      if (d > 0 && pos >= d - END_THRESHOLD && !useStore.getState().player.autoAdvancePending) {
        endHandlerRef.current();
        return;
      }

      if (isPlayingRef.current) {
        progressRef.current = pos;
      }

      const now = performance.now();
      if (now - lastStoreSyncRef.current > persistSecsRef.current * 1000) {
        lastStoreSyncRef.current = now;
        useStore.getState().setPosition(pos);
      }
    }).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });

    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
  }, []);

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
      seekLockUntilRef.current = performance.now() + TRACK_CHANGE_LOCK_MS;
      prevTrackIdRef.current = currentTrackId;
      return;
    }

    prevTrackIdRef.current = currentTrackId;
    endedRef.current = false;
  }, [currentTrackId]);

  useEffect(() => {
    if (!currentTrackId) return;
    // нужен только для восстановленного трека: при переключении и загрузке
    // в rust еще лежит позиция прошлого трека
    if (isLoading || isAudioReady) return;
    (async () => {
      try {
        const rustPos = await api.getPosition();
        if (rustPos > 0 && !isPlayingRef.current && !isLoadingRef.current) {
          progressRef.current = rustPos;
        }
      } catch {}
    })();
  }, [currentTrackId, isLoading, isAudioReady]);

  const seekTo = (pos: number) => {
    progressRef.current = pos;
    endedRef.current = false;
    seekLockUntilRef.current = performance.now() + SEEK_LOCK_MS;
  };

  return { progressRef, seekTo };
}
