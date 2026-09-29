import { useEffect, useRef } from 'react';
import { formatSec } from '@lib/format';

interface Props {
  progressRef: React.MutableRefObject<number>;
  effectiveDuration: number;
  isDragging: boolean;
  dragPosition: number;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
}

export function PlayerProgressBar({
  progressRef,
  effectiveDuration,
  isDragging,
  dragPosition,
  onMouseDown,
  onTouchStart,
}: Props) {
  const fillRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);

  const durationRef = useRef(effectiveDuration);
  const isDraggingRef = useRef(isDragging);
  const dragPositionRef = useRef(dragPosition);

  useEffect(() => { durationRef.current = effectiveDuration; }, [effectiveDuration]);
  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);
  useEffect(() => { dragPositionRef.current = dragPosition; }, [dragPosition]);

  useEffect(() => {
    let raf: number;

    const tick = () => {
      const d = durationRef.current;
      const pos = isDraggingRef.current ? dragPositionRef.current : progressRef.current;
      const pct = d > 0 ? (pos / d) * 100 : 0;

      if (fillRef.current) fillRef.current.style.width = `${pct}%`;
      if (knobRef.current) knobRef.current.style.left = `${pct}%`;
      if (timeRef.current) timeRef.current.textContent = formatSec(pos);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progressRef]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm text-text-tertiary">
        <span ref={timeRef}>{formatSec(progressRef.current)}</span>
        <span>{formatSec(effectiveDuration)}</span>
      </div>

      <div className="relative group py-1 -my-1">
        <div
          className="absolute inset-0 -top-3 -bottom-3 cursor-pointer z-10"
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        />
        <div id="progress-track" className="relative h-1.5 bg-[#333333] rounded-full">
          <div
            ref={fillRef}
            className="absolute left-0 top-0 h-full bg-white rounded-full will-change-transform"
            style={{ width: '0%', transition: 'none' }}
          />
          <div
            ref={knobRef}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-lg pointer-events-none will-change-transform ${
              isDragging
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100'
            }`}
            style={{
              left: '0%',
              transition: 'opacity 0.15s ease, transform 0.15s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
}