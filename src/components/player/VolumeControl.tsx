import { useCallback, useEffect, useRef, useState } from 'react';
import { saveNow } from '@lib/store/tauriStorage';
import { Icon } from '@components/ui/Icon';
import { useVolumeChannel } from '@hooks/player/useVolumeChannel';

type Variant = 'capsule' | 'inline' | 'icon';

interface Props {
  volume: number;
  onVolumeChange: (volume: number) => void;
  variant: Variant;
  maxWidth?: number;
  isLoading?: boolean;
}

const WHEEL_STEP = 3;
const STORE_THROTTLE_MS = 100;
const SHOW_PERCENT_MS = 800;
const WHEEL_END_MS = 250;
const MIN_BAR_WIDTH = 80;
const BUTTON_SIZE = 36;
const CAPSULE_GAP = 8;

function volumeIcon(v: number): string {
  if (v === 0) return 'volume-x';
  if (v < 34) return 'volume-1';
  if (v < 67) return 'volume-2';
  return 'volume-3';
}

export function VolumeControl({
  volume,
  onVolumeChange,
  variant,
  maxWidth = 140,
  isLoading = false,
}: Props) {
  const [open, setOpen] = useState(variant !== 'capsule');
  const [showPercent, setShowPercent] = useState(false);
  const [displayVolume, setDisplayVolume] = useState(volume);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const capsuleRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const percentTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!showPercent) setDisplayVolume(volume);
  }, [volume, showPercent]);

  const onVolumeChangeRef = useRef(onVolumeChange);
  useEffect(() => {
    onVolumeChangeRef.current = onVolumeChange;
  }, [onVolumeChange]);

  const isDraggingRef = useRef(false);
  const lastValueRef = useRef(volume);
  const lastPushRef = useRef(0);
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

  useVolumeChannel((v) => {
    if (isDraggingRef.current) return;
    paintVolume(v);
    lastValueRef.current = v;
  });

  const showPercentTemporarily = useCallback(() => {
    setShowPercent(true);
    if (percentTimerRef.current !== null) {
      window.clearTimeout(percentTimerRef.current);
    }
    percentTimerRef.current = window.setTimeout(() => {
      setShowPercent(false);
      percentTimerRef.current = null;
    }, SHOW_PERCENT_MS);
  }, []);

  const applyVisual = useCallback((v: number) => {
    paintVolume(v);
    lastValueRef.current = v;
    setDisplayVolume(Math.round(v));
    showPercentTemporarily();
  }, [paintVolume, showPercentTemporarily]);

  const pushVolume = useCallback((v: number, force: boolean) => {
    const now = performance.now();
    if (!force && now - lastPushRef.current < STORE_THROTTLE_MS) return;
    lastPushRef.current = now;

    // в rust значение уходит из стора, один путь вместо двух invoke подряд
    onVolumeChangeRef.current(Math.round(v));
  }, []);

  useEffect(() => {
    return () => {
      if (wheelEndTimerRef.current !== null) {
        window.clearTimeout(wheelEndTimerRef.current);
      }
      if (percentTimerRef.current !== null) {
        window.clearTimeout(percentTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const els = [buttonRef.current, capsuleRef.current].filter(Boolean) as HTMLElement[];
    if (!els.length) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dir = e.deltaY > 0 ? -1 : 1;
      const base = lastValueRef.current;
      const next = Math.max(0, Math.min(100, base + dir * WHEEL_STEP));
      applyVisual(next);
      pushVolume(next, false);

      if (wheelEndTimerRef.current !== null) {
        window.clearTimeout(wheelEndTimerRef.current);
      }
      wheelEndTimerRef.current = window.setTimeout(() => {
        wheelEndTimerRef.current = null;
        pushVolume(lastValueRef.current, true);
        saveNow().catch(() => {});
      }, WHEEL_END_MS);
    };

    for (const el of els) {
      el.addEventListener('wheel', onWheel, { passive: false });
    }
    return () => {
      for (const el of els) {
        el.removeEventListener('wheel', onWheel);
      }
    };
  }, [applyVisual, pushVolume, variant]);

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
    pushVolume(v, true);
    e.preventDefault();
  }, [applyVisual, pushVolume]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const v = calcFromPointer(e.clientX);
    applyVisual(v);
    pushVolume(v, false);
  }, [applyVisual, pushVolume]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    pushVolume(lastValueRef.current, true);
    saveNow().catch(() => {});

    if (trackRef.current) {
      try { trackRef.current.releasePointerCapture(e.pointerId); } catch {}
    }
  }, [pushVolume]);

  useEffect(() => {
    if (variant !== 'capsule') return;
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
  }, [open, variant]);

  const iconContent = showPercent ? (
    <span className="text-[10px] tabular-nums text-text-primary font-medium leading-none">
      {displayVolume}
    </span>
  ) : (
    <Icon name={volumeIcon(volume)} size={variant === 'inline' ? 14 : 18} />
  );

  if (variant === 'icon') {
    return (
      <button
        ref={buttonRef}
        className="w-9 h-9 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors"
        disabled={isLoading}
        aria-label="громкость"
      >
        {iconContent}
      </button>
    );
  }

  if (variant === 'capsule') {
    return (
      <div
        ref={wrapperRef}
        className="relative flex items-center"
        style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
      >
        <div
          ref={capsuleRef}
          className={`absolute flex items-center h-9 px-3 rounded-full bg-bg-secondary/40 border border-border-subtle transition-all duration-200 ease-out origin-right -translate-y-1/2 ${
            open
              ? 'opacity-100 translate-x-0 scale-100 pointer-events-auto'
              : 'opacity-0 translate-x-2 scale-90 pointer-events-none'
          }`}
          style={{
            width: Math.max(MIN_BAR_WIDTH, maxWidth),
            right: BUTTON_SIZE + CAPSULE_GAP,
            top: '50%',
          }}
        >
          <div
            ref={trackRef}
            className="flex-1 relative cursor-pointer py-2 -my-2 touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div className="relative h-1 bg-[var(--accent-muted)] rounded-full overflow-hidden">
              <div
                ref={fillRef}
                className="absolute left-0 top-0 h-full w-full bg-[var(--accent-primary)] rounded-full origin-left will-change-transform"
                style={{ transform: 'scaleX(0)' }}
              />
            </div>
            <div
              ref={knobRef}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-[var(--accent-primary)] rounded-full shadow-md pointer-events-none will-change-transform"
              style={{ left: '0%' }}
            />
          </div>
        </div>

        <button
          ref={buttonRef}
          onClick={() => setOpen((v) => !v)}
          className="relative w-9 h-9 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors duration-200 z-10"
          aria-label={`громкость ${volume}%`}
        >
          {iconContent}
        </button>
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="group flex items-center gap-2 h-9 px-3 rounded-full bg-white/[0.04] border border-border-subtle select-none w-full min-w-0 overflow-hidden"
    >
      <button
        className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors"
        disabled={isLoading}
        aria-label="громкость"
      >
        {iconContent}
      </button>

      <div
        ref={trackRef}
        className="flex-1 min-w-0 relative cursor-pointer py-2 -my-2 touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="relative h-1 bg-[var(--accent-muted)] rounded-full overflow-hidden">
          <div
            ref={fillRef}
            className="absolute left-0 top-0 h-full w-full bg-[var(--accent-primary)] rounded-full origin-left will-change-transform"
            style={{ transform: 'scaleX(0)' }}
          />
        </div>
        <div
          ref={knobRef}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-[var(--accent-primary)] rounded-full shadow-md pointer-events-none will-change-transform"
          style={{ left: '0%' }}
        />
      </div>
    </div>
  );
}