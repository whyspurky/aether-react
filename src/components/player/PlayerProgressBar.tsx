import { useEffect, useRef } from 'react';
import { formatSec } from '@lib/format';

interface Props {
  trackRef: React.MutableRefObject<HTMLDivElement | null>;
  fillRef: React.MutableRefObject<HTMLDivElement | null>;
  knobRef: React.MutableRefObject<HTMLDivElement | null>;
  effectiveDuration: number;
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function PlayerProgressBar({
  trackRef,
  fillRef,
  knobRef,
  effectiveDuration,
  isDragging,
  onMouseDown,
}: Props) {
  const timeRef = useRef<HTMLSpanElement>(null);
  const durationRef = useRef(effectiveDuration);

  useEffect(() => { durationRef.current = effectiveDuration; }, [effectiveDuration]);

  useEffect(() => {
    let raf: number;
    let lastSec = -1;
    const tick = () => {
      const el = fillRef.current;
      if (el && timeRef.current) {
        const pct = parseFloat(el.style.width) || 0;
        const pos = (pct / 100) * durationRef.current;
        const sec = Math.floor(pos);
        if (sec !== lastSec) {
          lastSec = sec;
          timeRef.current.textContent = formatSec(pos);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fillRef]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm text-text-tertiary">
        <span ref={timeRef}>0:00</span>
        <span>{formatSec(effectiveDuration)}</span>
      </div>

      <div className="relative group py-1 -my-1">
        <div
          className="absolute inset-0 -top-3 -bottom-3 cursor-pointer z-10"
          onMouseDown={onMouseDown}
        />
        <div ref={trackRef} className="relative h-1.5 bg-[var(--accent-muted)] rounded-full">
          <div
            ref={fillRef}
            className="absolute left-0 top-0 h-full bg-[var(--accent-primary)] rounded-full will-change-transform"
            style={{ boxShadow: '0 0 10px var(--accent-muted)', width: '0%' }}
          />
          <div
            ref={knobRef}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-[var(--accent-primary)] rounded-full shadow-lg pointer-events-none will-change-transform transition-[box-shadow] ${
              isDragging
                ? 'opacity-100 scale-125'
                : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-110'
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