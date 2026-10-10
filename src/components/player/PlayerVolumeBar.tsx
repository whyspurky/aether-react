import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icon } from '@components/ui/Icon';
import { useVolumeChannel } from '@hooks/player/useVolumeChannel';

interface Props {
  volume: number;
  isAudioReady: boolean;
  isLoading: boolean;
  onVolumeChange: (volume: number) => void;
  mode?: 'full' | 'icon';
}

const WHEEL_STEP = 3;
const STORE_THROTTLE_MS = 100;
const SHOW_PERCENT_MS = 800;

function volumeIcon(v: number): string {
  if (v === 0) return 'volume-x';
  if (v < 34) return 'volume-1';
  if (v < 67) return 'volume-2';
  return 'volume-3';
}

export function PlayerVolumeBar({
  volume,
  isLoading,
  onVolumeChange,
  mode = 'full',
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const iconButtonRef = useRef<HTMLButtonElement>(null);
  const containerDivRef = useRef<HTMLDivElement>(null);

  const [showPercent, setShowPercent] = useState(false);
  const [displayVolume, setDisplayVolume] = useState(volume);
  const percentTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!showPercent) setDisplayVolume(volume);
  }, [volume, showPercent]);

  const onVolumeChangeRef = useRef(onVolumeChange);
  useEffect(() => { onVolumeChangeRef.current = onVolumeChange; }, [onVolumeChange]);

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

    const final = Math.round(v);
    onVolumeChangeRef.current(final);
    invoke('set_volume', { volume: final }).catch(() => {});
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
    const els = [iconButtonRef.current, containerDivRef.current].filter(Boolean) as HTMLElement[];
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
        import('@lib/store/tauriStorage').then(({ saveNow }) => saveNow());
      }, 250);
    };

    for (const el of els) {
      el.addEventListener('wheel', onWheel, { passive: false });
    }
    return () => {
      for (const el of els) {
        el.removeEventListener('wheel', onWheel);
      }
    };
  }, [applyVisual, pushVolume]);

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
    import('@lib/store/tauriStorage').then(({ saveNow }) => saveNow());

    if (trackRef.current) {
      try { trackRef.current.releasePointerCapture(e.pointerId); } catch {}
    }
  }, [pushVolume]);

  if (mode === 'icon') {
    return (
      <button
        ref={iconButtonRef}
        className="w-9 h-9 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors"
        disabled={isLoading}
        aria-label="громкость"
      >
        {showPercent ? (
          <span className="text-[10px] tabular-nums text-text-primary font-medium leading-none">
            {displayVolume}
          </span>
        ) : (
          <Icon name={volumeIcon(volume)} size={18} />
        )}
      </button>
    );
  }

  return (
    <div
      ref={containerDivRef}
      className="group flex items-center gap-2 h-9 px-3 rounded-full bg-white/[0.04] border border-border-subtle select-none w-full min-w-0 overflow-hidden"
    >
      <button
        className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors"
        disabled={isLoading}
        aria-label="громкость"
      >
        {showPercent ? (
          <span className="text-[10px] tabular-nums text-text-primary font-medium leading-none">
            {displayVolume}
          </span>
        ) : (
          <Icon name={volumeIcon(volume)} size={14} />
        )}
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