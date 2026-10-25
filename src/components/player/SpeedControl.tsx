import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@components/ui/Icon';
import { PrecisionSlider } from '@components/ui/PrecisionSlider';
import { useStore } from '@store/store';

const SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5];
const MENU_WIDTH = 320;
const MENU_GAP = 10;

interface Coords {
  top: number;
  left: number;
  maxHeight: number;
}

export function SpeedControl() {
  const speed = useStore((s) => s.audio.speed);
  const pitch = useStore((s) => s.audio.pitchSemitones);
  const linked = useStore((s) => s.audio.linked);
  const setSpeed = useStore((s) => s.setSpeed);
  const setPitchSemitones = useStore((s) => s.setPitchSemitones);
  const setLinked = useStore((s) => s.setLinked);

  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    const update = () => {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const left = Math.min(
        Math.max(8, rect.right - MENU_WIDTH),
        window.innerWidth - MENU_WIDTH - 8
      );
      const top = rect.bottom + MENU_GAP;
      setCoords({
        top,
        left,
        maxHeight: Math.max(180, window.innerHeight - top - 12),
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const speedActive = Math.abs(speed - 1) > 0.001;
  const pitchActive = Math.abs(pitch) > 0.001;
  const active = speedActive || pitchActive;
  const badge = speedActive
    ? speed.toFixed(2).replace(/\.?0+$/, '') // Убирает лишние нули в конце (1.50 -> 1.5, 2.00 -> 2)
    : pitchActive
      ? `${pitch > 0 ? '+' : ''}${pitch.toFixed(1)}`
      : null;

  const stepSpeed = (delta: number) => setSpeed(speed + delta);
  const stepPitch = (delta: number) => setPitchSemitones(pitch + delta);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="скорость и питч"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
        className={`relative flex h-8 flex-shrink-0 items-center gap-1 rounded-full px-2 transition-all ${
          active || open
            ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
            : 'text-text-tertiary hover:bg-white/[0.06] hover:text-text-secondary'
        }`}
      >
        <Icon name="gauge" size={18} />
        {badge && (
          <span className="text-[10px] font-medium tabular-nums">{badge}</span>
        )}
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            role="dialog"
            aria-label="скорость и питч"
            style={{
              top: coords.top,
              left: coords.left,
              width: MENU_WIDTH,
              maxHeight: coords.maxHeight,
            }}
            className="fixed z-[90] origin-top-right overflow-y-auto rounded-2xl border border-border-subtle bg-bg-card/95 p-4 shadow-2xl backdrop-blur-2xl scrollbar-hidden animate-menu-enter select-none"
          >
            <div className="grid grid-cols-5 gap-1">
              {SPEED_PRESETS.map((preset) => {
                const selected = Math.abs(speed - preset) < 0.001;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSpeed(preset)}
                    className={`rounded-lg border px-1 py-1.5 text-[10px] tabular-nums transition-all duration-150 active:scale-95 ${
                      selected
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                        : 'border-border-subtle bg-white/[0.02] text-text-tertiary hover:border-border-visible hover:text-text-secondary'
                    }`}
                  >
                    {preset}x
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-primary">скорость</p>
                <span className="text-sm font-medium tabular-nums text-text-primary">
                  {speed.toFixed(2)}x
                </span>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => stepSpeed(-0.05)}
                  aria-label="уменьшить скорость"
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-white/[0.02] text-text-tertiary transition-colors hover:border-border-visible hover:text-text-secondary active:scale-95"
                >
                  <Icon name="minus" size={14} />
                </button>
                <PrecisionSlider
                  value={speed}
                  min={0.5}
                  max={2}
                  step={0.05}
                  ariaLabel="скорость воспроизведения"
                  onChange={setSpeed}
                />
                <button
                  type="button"
                  onClick={() => stepSpeed(0.05)}
                  aria-label="увеличить скорость"
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-white/[0.02] text-text-tertiary transition-colors hover:border-border-visible hover:text-text-secondary active:scale-95"
                >
                  <Icon name="plus" size={14} />
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-white/[0.03] px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] text-text-primary">связать скорость с питчем</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-text-tertiary">
                    режим винила, скорость меняет высоту звука
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={linked}
                  aria-label="связать скорость с питчем"
                  onClick={() => setLinked(!linked)}
                  className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 ${
                    linked
                      ? 'bg-[var(--accent-primary)]'
                      : 'bg-white/[0.14] hover:bg-white/[0.2]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                      linked ? 'left-[18px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="mt-4 border-t border-border-subtle pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-primary">питч</p>
                <span className="text-sm font-medium tabular-nums text-text-primary">
                  {pitch > 0 ? '+' : ''}
                  {pitch.toFixed(1)} st
                </span>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => stepPitch(-0.5)}
                  aria-label="уменьшить питч"
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-white/[0.02] text-text-tertiary transition-colors hover:border-border-visible hover:text-text-secondary active:scale-95"
                >
                  <Icon name="minus" size={14} />
                </button>
                <PrecisionSlider
                  value={pitch}
                  min={-12}
                  max={12}
                  step={0.1}
                  ariaLabel="питч в полутонах"
                  onChange={setPitchSemitones}
                />
                <button
                  type="button"
                  onClick={() => stepPitch(0.5)}
                  aria-label="увеличить питч"
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-white/[0.02] text-text-tertiary transition-colors hover:border-border-visible hover:text-text-secondary active:scale-95"
                >
                  <Icon name="plus" size={14} />
                </button>
              </div>
            </div>

          </div>,
          document.body
        )}
    </>
  );
}
