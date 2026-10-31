import type { CSSProperties } from 'react';
import { useStore } from '@store/store';
import { useCoverBackground } from '@hooks/ui/useCoverBackground';

// слой рисуется уменьшенным и растягивается, растр заметно дешевле полного
const SCALE = 4;
const SOURCE_PERCENT = 40;
// ниже этого радиуса растянутый растр заметен, рисуем в размер контейнера
const OPTIMIZED_FROM = 12;

function CoverLayer({
  url,
  amount,
  outgoing = false,
}: {
  url: string;
  amount: number;
  outgoing?: boolean;
}) {
  const optimized = amount >= OPTIMIZED_FROM;
  const radius = optimized ? amount / SCALE : amount;

  const geometry: CSSProperties = optimized
    ? {
        width: `${SOURCE_PERCENT}%`,
        height: `${SOURCE_PERCENT}%`,
        left: '50%',
        top: '50%',
        transform: `translate(-50%, -50%) scale(${SCALE})`,
      }
    : { inset: '-24px' };

  return (
    <div
      className={`cover-layer absolute ${outgoing ? 'cover-layer-exit' : 'cover-layer-enter'}`}
      style={{
        ...geometry,
        backgroundImage: `url("${url}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        filter: `blur(${radius}px) saturate(var(--cover-saturate, 1.25))`,
      }}
    />
  );
}

export function CoverBackground() {
  const enabled = useStore((s) => s.coverBackground.enabled);
  const amount = useStore((s) => s.coverBackground.amount);
  const opacity = useStore((s) => s.coverBackground.opacity);
  const coverQuality = useStore((s) => s.perf.coverQuality);
  const artwork = useStore(
    (s) => s.player.currentTrack?.artwork_url || s.player.currentTrack?.user?.avatar_url || null
  );

  const active = enabled && opacity > 0;
  const { current, previous } = useCoverBackground(active ? artwork : null, coverQuality);

  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ ['--cover-opacity' as string]: String(opacity) }}
    >
      {previous && previous !== current && (
        <CoverLayer key={`prev-${previous}`} url={previous} amount={amount} outgoing />
      )}
      {current && <CoverLayer key={`curr-${current}`} url={current} amount={amount} />}

      {/* затемнение снизу, сверху его даёт полупрозрачный тайтлбар */}
      {current && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(180deg, transparent, transparent 45%, color-mix(in srgb, var(--bg-primary) 45%, transparent))',
          }}
        />
      )}
    </div>
  );
}
