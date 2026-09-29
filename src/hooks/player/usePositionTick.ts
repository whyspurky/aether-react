import { useEffect, useRef } from 'react';
import { api } from '@lib/api';

interface Params {
  currentTrackId: number | null | undefined;
  isLoading: boolean;
  isDragging: boolean;
  setPosition: (pos: number) => void;
  getPendingSeek: () => number | null;
  duration: number;
  onTrackEnd: () => void;
}

export function usePositionTick({
  currentTrackId,
  isLoading,
  isDragging,
  setPosition,
  getPendingSeek,
  duration,
  onTrackEnd,
}: Params) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isEndingRef = useRef(false);

  const isLoadingRef = useRef(isLoading);
  const isDraggingRef = useRef(isDragging);
  const durationRef = useRef(duration);
  const setPositionRef = useRef(setPosition);
  const getPendingSeekRef = useRef(getPendingSeek);
  const onTrackEndRef = useRef(onTrackEnd);

  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);
  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { setPositionRef.current = setPosition; }, [setPosition]);
  useEffect(() => { getPendingSeekRef.current = getPendingSeek; }, [getPendingSeek]);
  useEffect(() => { onTrackEndRef.current = onTrackEnd; }, [onTrackEnd]);

  useEffect(() => {
    if (!currentTrackId) return;

    isEndingRef.current = false;

    const tick = async () => {
      if (isLoadingRef.current) return;
      try {
        const pos = await api.getPosition();
        const d = durationRef.current;

        if (d > 0 && pos >= d - 0.3 && !isEndingRef.current) {
          isEndingRef.current = true;
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          onTrackEndRef.current();
          return;
        }

        if (!isDraggingRef.current && getPendingSeekRef.current() === null) {
          setPositionRef.current(pos);
        }
      } catch {}
    };

    intervalRef.current = setInterval(tick, 250);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [currentTrackId]);
}