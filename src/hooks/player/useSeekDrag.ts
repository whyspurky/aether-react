import { useRef, useState, useCallback } from 'react';
import { api } from '@lib/api';

interface Params {
  trackRef: React.MutableRefObject<HTMLElement | null>;
  effectiveDuration: number;
  onSeek: (pos: number) => void;
}

interface Result {
  isDragging: boolean;
  dragPosRef: React.MutableRefObject<number>;
  handleMouseDown: (e: React.MouseEvent<HTMLElement>) => void;
}

export function useSeekDrag({ trackRef, effectiveDuration, onSeek }: Params): Result {
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef(false);
  const dragPosRef = useRef(0);
  const durationRef = useRef(effectiveDuration);
  durationRef.current = effectiveDuration;

  const posFromClientX = useCallback((clientX: number): number | null => {
    const el = trackRef.current;
    if (!el) return null;
    const d = durationRef.current;
    if (!d) return null;
    const rect = el.getBoundingClientRect();
    let percent = (clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));
    return percent * d;
  }, [trackRef]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!durationRef.current) return;
    const pos = posFromClientX(e.clientX);
    if (pos === null) return;

    draggingRef.current = true;
    setIsDragging(true);
    dragPosRef.current = pos;
    e.preventDefault();

    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const p = posFromClientX(ev.clientX);
      if (p !== null) dragPosRef.current = p;
    };

    const onUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (!draggingRef.current) return;
      draggingRef.current = false;

      const p = posFromClientX(ev.clientX);
      setIsDragging(false);
      if (p !== null) {
        onSeek(p);
        api.seekAudio(p).catch(() => {});
        import('@lib/store/tauriStorage').then(({ saveNow }) => saveNow());
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [posFromClientX, onSeek]);

  return { isDragging, dragPosRef, handleMouseDown };
}