import { useState } from 'react';

interface Props {
  value: number;
  min: number;
  max: number;
  step: number;
  ariaLabel: string;
  onChange: (value: number) => void;
}

export function PrecisionSlider({ value, min, max, step, ariaLabel, onChange }: Props) {
  const [dragging, setDragging] = useState(false);
  const percent = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <div
      className={`group relative flex h-9 min-w-0 flex-1 select-none items-center rounded-full outline-none ${
        dragging ? 'cursor-grabbing' : 'cursor-pointer'
      }`}
    >
      <div className="absolute inset-x-0 h-[3px] rounded-full bg-white/[0.14]" />
      <div
        className="absolute left-0 h-[3px] rounded-full bg-[var(--accent-primary)]"
        style={{ width: `${percent}%` }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-[2px]">
        {Array.from({ length: 33 }).map((_, index) => (
          <span
            key={index}
            className={`w-px transition-colors ${
              index % 4 === 0 ? 'h-2 bg-white/30' : 'h-1.5 bg-white/10'
            } ${(index / 32) * 100 <= percent ? 'bg-white/40' : ''}`}
          />
        ))}
      </div>
      <div
        className={`pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50 bg-white shadow-[0_0_0_3px_rgba(0,0,0,0.25),0_0_14px_rgba(255,255,255,0.35)] ${
          dragging ? 'scale-125' : 'group-hover:scale-110'
        } transition-transform duration-75`}
        style={{ left: `${percent}%` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerDown={(event) => {
          setDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onBlur={() => setDragging(false)}
        aria-label={ariaLabel}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 outline-none"
      />
    </div>
  );
}
