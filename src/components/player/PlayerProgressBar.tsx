import { useEffect, useRef } from 'react';
import { formatSec } from '@lib/format';

interface Props {
  trackRef: React.MutableRefObject<HTMLDivElement | null>;
  fillRef: React.MutableRefObject<HTMLDivElement | null>;
  knobRef: React.MutableRefObject<HTMLDivElement | null>;
  progressRef: React.MutableRefObject<number>;
  dragPosRef: React.MutableRefObject<number>;
  effectiveDuration: number;
  isPlaying: boolean;
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function PlayerProgressBar({
  trackRef,
  fillRef,
  knobRef,
  progressRef,
  dragPosRef,
  effectiveDuration,
  isPlaying,
  isDragging,
  onMouseDown,
}: Props) {
  const timeRef = useRef<HTMLSpanElement>(null);
  const durationRef = useRef(effectiveDuration);
  durationRef.current = effectiveDuration;
  // значения читаем через ref: цикл отрисовки не должен перезапускаться
  const liveRef = useRef({ isPlaying, isDragging });
  liveRef.current.isPlaying = isPlaying;
  liveRef.current.isDragging = isDragging;

  useEffect(() => {
    let raf = 0;
    let timer = 0;
    let lastPct = -1;
    let lastSec = -1;

    const draw = () => {
      const duration = durationRef.current;
      const dragging = liveRef.current.isDragging;
      const pos = dragging ? dragPosRef.current : progressRef.current;

      // ширину двигаем только при реальном изменении, иначе каждый кадр в дрипе
      const pct = duration > 0 ? (pos / duration) * 100 : 0;
      if (pct !== lastPct) {
        lastPct = pct;
        if (fillRef.current) fillRef.current.style.width = `${pct}%`;
        if (knobRef.current) knobRef.current.style.left = `${pct}%`;
      }

      const sec = Math.floor(pos);
      if (sec !== lastSec && timeRef.current) {
        lastSec = sec;
        timeRef.current.textContent = formatSec(pos);
      }
    };

    // на драге кадры, в остальное время редкий опрос: позиция приходит раз в 100 мс
    const loop = () => {
      draw();
      if (liveRef.current.isDragging) {
        raf = requestAnimationFrame(loop);
      } else {
        timer = window.setTimeout(loop, liveRef.current.isPlaying ? 100 : 250);
      }
    };

    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [fillRef, knobRef, progressRef, dragPosRef]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm text-text-tertiary">
        <span ref={timeRef} className="tabular-nums">0:00</span>
        <span className="tabular-nums">{formatSec(effectiveDuration)}</span>
      </div>

      <div className="relative group py-1 -my-1">
        <div
          className="absolute inset-0 -top-3 -bottom-3 cursor-pointer z-10"
          onMouseDown={onMouseDown}
        />
        <div ref={trackRef} className="relative h-1.5 bg-[var(--accent-muted)] rounded-full">
          <div
            ref={fillRef}
            className="absolute left-0 top-0 h-full bg-[var(--accent-primary)] rounded-full"
            style={{ boxShadow: '0 0 10px var(--accent-muted)', width: '0%' }}
          />
          <div
            ref={knobRef}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-[var(--accent-primary)] rounded-full shadow-lg pointer-events-none transition-[box-shadow] ${
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
