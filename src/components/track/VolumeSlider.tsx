import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@components/ui/Icon';
import { useStore } from '@store/store';

interface VolumeSliderProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
}

const WHEEL_STEP = 5;
const STORE_THROTTLE_MS = 100;
const BAR_WIDTH = 140;
const BUTTON_SIZE = 36;
const GAP = 8;

function volumeIcon(v: number): string {
  if (v === 0) return 'volume-x';
  if (v < 34) return 'volume-1';
  return 'volume-2';
}

export function VolumeSlider({ volume, onVolumeChange }: VolumeSliderProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);

  const onVolumeChangeRef = useRef(onVolumeChange);
  useEffect(() => { onVolumeChangeRef.current = onVolumeChange; }, [onVolumeChange]);

  const isDraggingRef = useRef(false);
  const lastValueRef = useRef(volume);
  const lastStoreTimeRef = useRef(0);
  const wheelEndTimerRef = useRef<number | null>(null);

  const paintVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, v));
    if (fillRef.current) fillRef.current.style.transform = `scaleX(${clamped / 100})`;
    if (knobRef.current) knobRef.current.style.left = `${clamped}%`;
  }, []);

  useEffect(() => {
    if (isDraggingRef.current) return;
    paintVolume(volume);
    lastValueRef.current = volume;
  }, [volume, paintVolume]);

  const applyVisual = useCallback((v: number) => {
    paintVolume(v);
    lastValueRef.current = v;
  }, [paintVolume]);

  const pushToBackend = useCallback((v: number, force: boolean) => {
    const now = performance.now();
    if (!force && now - lastStoreTimeRef.current < STORE_THROTTLE_MS) return;
    lastStoreTimeRef.current = now;

    const final = Math.round(v);
    onVolumeChangeRef.current(final);
    useStore.getState().setVolumeRust(final);
  }, []);

  useEffect(() => {
    return () => {
      if (wheelEndTimerRef.current !== null) {
        window.clearTimeout(wheelEndTimerRef.current);
      }
    };
  }, []);

  const calcFromPointer = (clientX: number): number => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const rel = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(100, rel * 100));
  };

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el) return;

    el.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;

    const v = calcFromPointer(e.clientX);
    applyVisual(v);
    pushToBackend(v, true);
    e.preventDefault();
  }, [applyVisual, pushToBackend]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const v = calcFromPointer(e.clientX);
    applyVisual(v);
    pushToBackend(v, false);
  }, [applyVisual, pushToBackend]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    pushToBackend(lastValueRef.current, true);
    import('@lib/store/tauriStorage').then(({ saveNow }) => saveNow());

    if (trackRef.current) {
      try { trackRef.current.releasePointerCapture(e.pointerId); } catch {}
    }
  }, [pushToBackend]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dir = e.deltaY > 0 ? -1 : 1;
    const base = lastValueRef.current;
    const next = Math.max(0, Math.min(100, base + dir * WHEEL_STEP));
    applyVisual(next);
    pushToBackend(next, false);

    if (wheelEndTimerRef.current !== null) {
      window.clearTimeout(wheelEndTimerRef.current);
    }
    wheelEndTimerRef.current = window.setTimeout(() => {
      wheelEndTimerRef.current = null;
      pushToBackend(lastValueRef.current, true);
      import('@lib/store/tauriStorage').then(({ saveNow }) => saveNow());
    }, 250);
  }, [applyVisual, pushToBackend]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      ref={wrapperRef}
      className="relative flex items-center"
      style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
    >
      <div
        className={`absolute flex items-center h-9 px-3 rounded-full bg-bg-secondary/40 border border-border-subtle transition-all duration-200 ease-out origin-right ${
          open
            ? 'opacity-100 translate-x-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-x-2 scale-90 pointer-events-none'
        }`}
        style={{
          width: BAR_WIDTH,
          right: BUTTON_SIZE + GAP,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
        onWheel={handleWheel}
      >
        <div
          ref={trackRef}
          className="flex-1 relative cursor-pointer py-2 -my-2 touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="relative h-1 bg-[#333333] rounded-full overflow-hidden">
            <div
              ref={fillRef}
              className="absolute left-0 top-0 h-full w-full bg-white rounded-full origin-left will-change-transform"
              style={{ transform: 'scaleX(0)' }}
            />
          </div>

          <div
            ref={knobRef}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-md pointer-events-none will-change-transform"
            style={{ left: '0%' }}
          />
        </div>
      </div>

      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors duration-200 z-10"
        title={`громкость ${volume}%`}
      >
        <Icon name={volumeIcon(volume)} size={18} />
      </button>
    </div>
  );
}