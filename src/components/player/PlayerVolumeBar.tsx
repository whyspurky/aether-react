import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@components/ui/Icon';
import { useStore } from '@store/store';

interface Props {
  volume: number;
  isAudioReady: boolean;
  isLoading: boolean;
  onVolumeChange: (volume: number) => void;
}

const APPLY_THROTTLE_MS = 30;

export function PlayerVolumeBar({ volume, isAudioReady, isLoading, onVolumeChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [showKnob, setShowKnob] = useState(false);

  const onVolumeChangeRef = useRef(onVolumeChange);
  const isAudioReadyRef = useRef(isAudioReady);
  const volumeBeforeMuteRef = useRef(0.8);

  const lastApplyRef = useRef(0);
  const lastValueRef = useRef(volume);
  const isDraggingRef = useRef(false);

  useEffect(() => { onVolumeChangeRef.current = onVolumeChange; }, [onVolumeChange]);
  useEffect(() => { isAudioReadyRef.current = isAudioReady; }, [isAudioReady]);

  const paintVolume = useCallback((v: number) => {
    if (fillRef.current) fillRef.current.style.transform = `scaleX(${v})`;
    if (knobRef.current) knobRef.current.style.left = `${v * 100}%`;
  }, []);

  useEffect(() => {
    paintVolume(volume / 100);
    lastValueRef.current = volume;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isDraggingRef.current) return;
    paintVolume(volume / 100);
    lastValueRef.current = volume;
  }, [volume, paintVolume]);

  const apply = useCallback((v: number, force: boolean) => {
    if (!isAudioReadyRef.current) return;
    const final = Math.round(Math.max(0, Math.min(100, v)));
    lastValueRef.current = final;

    const now = performance.now();
    if (!force && now - lastApplyRef.current < APPLY_THROTTLE_MS) return;
    lastApplyRef.current = now;

    onVolumeChangeRef.current(final);
    useStore.getState().setVolumeRust(final);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isAudioReadyRef.current) return;
    const el = trackRef.current;
    if (!el) return;

    el.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    setIsDragging(true);
    lastApplyRef.current = 0;

    const rect = el.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    paintVolume(percent);
    apply(percent * 100, true);
    if (percent > 0) volumeBeforeMuteRef.current = percent;
    e.preventDefault();
  }, [paintVolume, apply]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    paintVolume(percent);
    apply(percent * 100, false);
    if (percent > 0) volumeBeforeMuteRef.current = percent;
  }, [paintVolume, apply]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    apply(lastValueRef.current, true);
    import('@lib/store/tauriStorage').then(({ saveNow }) => saveNow());

    if (trackRef.current) {
      try { trackRef.current.releasePointerCapture(e.pointerId); } catch {}
    }
  }, [apply]);

  const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAudioReadyRef.current || isDraggingRef.current) return;
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    paintVolume(percent);
    apply(percent * 100, true);
    import('@lib/store/tauriStorage').then(({ saveNow }) => saveNow());
    if (percent > 0) volumeBeforeMuteRef.current = percent;
  }, [paintVolume, apply]);

  const handleMuteToggle = useCallback(() => {
    if (!isAudioReadyRef.current) return;
    const current = volume;
    if (current === 0) {
      const v = volumeBeforeMuteRef.current || 0.8;
      paintVolume(v);
      apply(v * 100, true);
    } else {
      volumeBeforeMuteRef.current = current / 100;
      paintVolume(0);
      apply(0, true);
    }
    import('@lib/store/tauriStorage').then(({ saveNow }) => saveNow());
  }, [volume, paintVolume, apply]);

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
          <div className="relative h-1 bg-[#333333] rounded-full overflow-hidden">
            <div
              ref={fillRef}
              className="absolute left-0 top-0 h-full w-full bg-white rounded-full origin-left will-change-transform"
              style={{
                transform: 'scaleX(0)',
                transition: isDragging ? 'none' : 'transform 0.1s linear',
              }}
            />
          </div>

          <div
            ref={knobRef}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-lg pointer-events-none will-change-transform ${
              isDragging || showKnob ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
            }`}
            style={{
              left: '0%',
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