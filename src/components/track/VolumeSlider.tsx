import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@components/ui/Icon';

interface VolumeSliderProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
}

const STORE_THROTTLE_MS = 80;

export function VolumeSlider({ volume, onVolumeChange }: VolumeSliderProps) {
  const [visible, setVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);
  const unmountTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingHide = useRef(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);

  const onVolumeChangeRef = useRef(onVolumeChange);
  useEffect(() => { onVolumeChangeRef.current = onVolumeChange; }, [onVolumeChange]);

  const isDraggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const pendingVolumeRef = useRef<number | null>(null);
  const lastStoreRef = useRef(0);

  const clearTimers = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    if (unmountTimer.current) {
      clearTimeout(unmountTimer.current);
      unmountTimer.current = null;
    }
  };

  const show = () => {
    clearTimers();
    pendingHide.current = false;
    setVisible(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsAnimating(true));
    });
  };

  const hide = () => {
    clearTimers();
    pendingHide.current = true;
    hideTimer.current = setTimeout(() => {
      if (!pendingHide.current) return;
      setIsAnimating(false);
      unmountTimer.current = setTimeout(() => setVisible(false), 200);
    }, 220);
  };

  useEffect(() => {
    if (!visible) return;
    const id = requestAnimationFrame(() => setIsAnimating(true));
    return () => cancelAnimationFrame(id);
  }, [visible]);

  useEffect(() => {
    return () => {
      clearTimers();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const paintVolume = useCallback((v: number) => {
    const pct = Math.max(0, Math.min(100, v));
    if (fillRef.current) fillRef.current.style.height = `${pct}%`;
    if (knobRef.current) knobRef.current.style.bottom = `${pct}%`;
  }, []);

  useEffect(() => {
    if (isDraggingRef.current) return;
    paintVolume(volume);
  }, [volume, paintVolume]);

  const flushToStore = useCallback(() => {
    rafRef.current = null;
    if (pendingVolumeRef.current === null) return;
    const v = pendingVolumeRef.current;
    pendingVolumeRef.current = null;

    const now = performance.now();
    if (now - lastStoreRef.current < STORE_THROTTLE_MS) {
      rafRef.current = requestAnimationFrame(flushToStore);
      return;
    }
    lastStoreRef.current = now;
    onVolumeChangeRef.current(Math.round(v));
  }, []);

  const scheduleToStore = useCallback((v: number) => {
    pendingVolumeRef.current = v;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(flushToStore);
  }, [flushToStore]);

  const calcFromClientY = useCallback((clientY: number): number | null => {
    const el = trackRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const pct = ((rect.bottom - clientY) / rect.height) * 100;
    return Math.max(0, Math.min(100, pct));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el) return;

    el.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;

    const v = calcFromClientY(e.clientY);
    if (v !== null) {
      paintVolume(v);
      scheduleToStore(v);
    }
    e.preventDefault();
  }, [calcFromClientY, paintVolume, scheduleToStore]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const v = calcFromClientY(e.clientY);
    if (v !== null) {
      paintVolume(v);
      scheduleToStore(v);
    }
  }, [calcFromClientY, paintVolume, scheduleToStore]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (pendingVolumeRef.current !== null) {
      const v = pendingVolumeRef.current;
      pendingVolumeRef.current = null;
      lastStoreRef.current = 0;
      onVolumeChangeRef.current(Math.round(v));
    }

    if (trackRef.current) {
      try { trackRef.current.releasePointerCapture(e.pointerId); } catch {}
    }
  }, []);

  const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) return;
    const v = calcFromClientY(e.clientY);
    if (v !== null) {
      paintVolume(v);
      lastStoreRef.current = 0;
      onVolumeChangeRef.current(Math.round(v));
    }
  }, [calcFromClientY, paintVolume]);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={show}
        onMouseLeave={hide}
        className="w-9 h-9 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors duration-200"
      >
        <Icon name={volume === 0 ? 'volume-x' : 'volume-2'} size={18} />
      </div>

      <div
        onMouseEnter={show}
        onMouseLeave={hide}
        className="absolute bottom-full left-1/2 -translate-x-1/2 w-full h-2"
      />

      {visible && (
        <div
          onMouseEnter={show}
          onMouseLeave={hide}
className={`absolute bottom-full left-1/2 mb-2 px-4 py-3 bg-bg-card rounded-2xl border border-border-subtle shadow-xl transition-all duration-200 ease-out ${
  isAnimating
    ? 'opacity-100 translate-y-0 scale-100 -translate-x-[24px]'
    : 'opacity-0 translate-y-2 scale-95 -translate-x-[24px]'
}`}
          style={{ transformOrigin: 'bottom center' }}
        >
          <div className="w-full flex justify-center">
            <div
              ref={trackRef}
              className="relative touch-none cursor-pointer"
              style={{ height: '140px', width: '14px' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onClick={handleTrackClick}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[6px] h-full bg-[#333333] rounded-full" />
              <div
                ref={fillRef}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[6px] bg-white rounded-full"
                style={{ height: `${volume}%`, transition: 'none' }}
              />
              <div
                ref={knobRef}
                className="absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg pointer-events-none will-change-transform"
                style={{
                  bottom: `${volume}%`,
                  transform: 'translate(-50%, 50%)',
                  transition: 'none',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}