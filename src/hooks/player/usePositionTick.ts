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

  useEffect(() => {
    if (!currentTrackId) return;

    isEndingRef.current = false;

    const tick = async () => {
      if (isLoading) return;
      try {
        const pos = await api.getPosition();

        if (duration > 0 && pos >= duration - 0.3 && !isEndingRef.current) {
          isEndingRef.current = true;
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          onTrackEnd();
          return;
        }

        if (!isDragging && getPendingSeek() === null) {
          setPosition(pos);
        }
      } catch {}
    };

    intervalRef.current = setInterval(tick, 250);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [currentTrackId, isDragging, setPosition, isLoading, getPendingSeek, duration, onTrackEnd]);
}