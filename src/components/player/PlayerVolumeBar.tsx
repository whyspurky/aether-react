import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@components/ui/Icon';

interface Props {
  volume: number;
  isAudioReady: boolean;
  isLoading: boolean;
  onVolumeChange: (volume: number) => void;
}

const STORE_THROTTLE_MS = 80;

export function PlayerVolumeBar({ volume, isAudioReady, isLoading, onVolumeChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [showKnob, setShowKnob] = useState(false);

  const onVolumeChangeRef = useRef(onVolumeChange);
  const isAudioReadyRef = useRef(isAudioReady);
  const volumeBeforeMuteRef = useRef(0.8);

  const pendingVolumeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastStoreRef = useRef(0);
  const isDraggingRef = useRef(false);

  useEffect(() => { onVolumeChangeRef.current = onVolumeChange; }, [onVolumeChange]);
  useEffect(() => { isAudioReadyRef.current = isAudioReady; }, [isAudioReady]);

  useEffect(() => {
    if (isDraggingRef.current) return;
    paintVolume(volume / 100);
  }, [volume]);

  const paintVolume = useCallback((v: number) => {
    if (fillRef.current) fillRef.current.style.transform = `scaleX(${v})`;
    if (knobRef.current) knobRef.current.style.left = `${v * 100}%`;
  }, []);

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
    if (!isAudioReadyRef.current) return;
    onVolumeChangeRef.current(Math.round(v * 100));
  }, []);

  const scheduleToStore = useCallback((v: number) => {
    pendingVolumeRef.current = v;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(flushToStore);
  }, [flushToStore]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isAudioReadyRef.current) return;
    const el = trackRef.current;
    if (!el) return;

    el.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    setIsDragging(true);

    const rect = el.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    paintVolume(percent);
    scheduleToStore(percent);
    if (percent > 0) volumeBeforeMuteRef.current = percent;
    e.preventDefault();
  }, [paintVolume, scheduleToStore]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    paintVolume(percent);
    scheduleToStore(percent);
    if (percent > 0) volumeBeforeMuteRef.current = percent;
  }, [paintVolume, scheduleToStore]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (pendingVolumeRef.current !== null) {
      const v = pendingVolumeRef.current;
      pendingVolumeRef.current = null;
      lastStoreRef.current = 0;
      if (isAudioReadyRef.current) {
        onVolumeChangeRef.current(Math.round(v * 100));
      }
    }

    if (trackRef.current) {
      try { trackRef.current.releasePointerCapture(e.pointerId); } catch {}
    }
  }, []);

  const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAudioReadyRef.current || isDraggingRef.current) return;
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    paintVolume(percent);
    lastStoreRef.current = 0;
    onVolumeChangeRef.current(Math.round(percent * 100));
    if (percent > 0) volumeBeforeMuteRef.current = percent;
  }, [paintVolume]);

  const handleMuteToggle = useCallback(() => {
    if (!isAudioReadyRef.current) return;
    const current = volume;
    if (current === 0) {
      const v = volumeBeforeMuteRef.current || 0.8;
      paintVolume(v);
      onVolumeChangeRef.current(Math.round(v * 100));
    } else {
      volumeBeforeMuteRef.current = current / 100;
      paintVolume(0);
      onVolumeChangeRef.current(0);
    }
  }, [volume, paintVolume]);

  return (
    <div className="w-full mt-2">
      <div className="flex items-center gap-2">
        <button
          className="text-text-tertiary hover:text-text-primary transition-all"
          onClick={handleMuteToggle}
          disabled={isLoading}
        >
          <Icon name={volume === 0 ? 'volume-x' : 'volume-2'} size={16} />
        </button>

        <div
          ref={trackRef}
          className="flex-1 relative group py-2 -my-2 touch-none"
          onMouseEnter={() => setShowKnob(true)}
          onMouseLeave={() => setShowKnob(false)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={handleTrackClick}
        >
          {/* трек */}
          <div className="relative h-1 bg-[#333333] rounded-full overflow-hidden">
            <div
              ref={fillRef}
              className="absolute left-0 top-0 h-full w-full bg-white rounded-full origin-left will-change-transform"
              style={{
                transform: `scaleX(${volume / 100})`,
                transition: isDragging ? 'none' : 'transform 0.1s linear',
              }}
            />
          </div>

          {/* knob - absolute, не часть трека */}
          <div
            ref={knobRef}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-lg pointer-events-none will-change-transform ${
              isDragging || showKnob ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
            }`}
            style={{
              left: `${volume}%`,
              transition: isDragging
                ? 'opacity 0.15s ease, transform 0.15s ease'
                : 'opacity 0.15s ease, transform 0.15s ease, left 0.1s linear',
            }}
          />
        </div>
      </div>
    </div>
  );
}