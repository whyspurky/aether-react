import { useCallback, useEffect, useState } from 'react';
import { api } from '@lib/api';

interface Params {
  effectiveDuration: number;
  position: number;
  onSeek: (position: number) => void;
}

interface Result {
  isDragging: boolean;
  dragPosition: number;
  handleMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
}

export function useProgressDrag({ effectiveDuration, position, onSeek }: Params): Result {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);

  useEffect(() => {
    if (!isDragging) setDragPosition(position);
  }, [position, isDragging]);

  const calcFromClientX = (clientX: number, rect: DOMRect): number => {
    let percent = (clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));
    return percent * effectiveDuration;
  };

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!effectiveDuration) return;
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragPosition(calcFromClientX(e.clientX, rect));
    e.preventDefault();
  }, [effectiveDuration]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!effectiveDuration) return;
    setIsDragging(true);
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    setDragPosition(calcFromClientX(touch.clientX, rect));
    e.preventDefault();
  }, [effectiveDuration]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!effectiveDuration) return;
      const el = document.getElementById('progress-track');
      if (!el) return;
      setDragPosition(calcFromClientX(e.clientX, el.getBoundingClientRect()));
    };

    const handleMouseUp = async (e: MouseEvent) => {
      if (!effectiveDuration) {
        setIsDragging(false);
        return;
      }
      const el = document.getElementById('progress-track');
      if (el) {
        const pos = calcFromClientX(e.clientX, el.getBoundingClientRect());
        onSeek(pos);
        try { await api.seekAudio(pos); } catch {}
      }
      setIsDragging(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!effectiveDuration) return;
      const el = document.getElementById('progress-track');
      if (!el) return;
      const touch = e.touches[0];
      setDragPosition(calcFromClientX(touch.clientX, el.getBoundingClientRect()));
    };

    const handleTouchEnd = async (e: TouchEvent) => {
      if (!effectiveDuration) {
        setIsDragging(false);
        return;
      }
      const el = document.getElementById('progress-track');
      if (el) {
        const touch = e.changedTouches[0];
        const pos = calcFromClientX(touch.clientX, el.getBoundingClientRect());
        onSeek(pos);
        try { await api.seekAudio(pos); } catch {}
      }
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, effectiveDuration, onSeek]);

  return { isDragging, dragPosition, handleMouseDown, handleTouchStart };
}