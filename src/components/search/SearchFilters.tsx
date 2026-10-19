import { useEffect, useRef, useState } from 'react';
import { Icon } from '@components/ui/Icon';

export type FilterType = 'tracks' | 'artists' | 'playlists';

interface Props {
  filter: FilterType;
  onChange: (filter: FilterType) => void;
}

const FILTERS: { id: FilterType; label: string; icon: string }[] = [
  { id: 'tracks', label: 'треки', icon: 'music' },
  { id: 'artists', label: 'артисты', icon: 'mic' },
  { id: 'playlists', label: 'плейлисты', icon: 'folder' },
];

export function SearchFilters({ filter, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<Record<FilterType, HTMLButtonElement | null>>({
    tracks: null,
    artists: null,
    playlists: null,
  });

  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const update = () => {
      const btn = buttonsRef.current[filter];
      const container = containerRef.current;
      if (!btn || !container) return;

      const btnRect = btn.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      setIndicator({
        left: btnRect.left - containerRect.left,
        width: btnRect.width,
      });
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [filter]);

  return (
    <div className="flex items-center justify-center mt-3">
      <div
        ref={containerRef}
        className="relative flex gap-1 p-1 rounded-full border border-white/[0.06]"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg-primary) 50%, transparent)',
          backdropFilter: 'blur(12px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(12px) saturate(1.5)',
        }}
      >
        {/* подвижная подсветка */}
        <div
          className="absolute top-1 bottom-1 rounded-full bg-[var(--accent-muted)] pointer-events-none"
          style={{
            left: indicator.left,
            width: indicator.width,
            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 0 1px color-mix(in srgb, var(--accent-primary) 30%, transparent)',
          }}
        />

        {FILTERS.map((f) => (
          <button
            key={f.id}
            ref={(el) => { buttonsRef.current[f.id] = el; }}
            onClick={() => onChange(f.id)}
            className={`relative z-10 flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${
              filter === f.id
                ? 'text-[var(--accent-primary)]'
                : 'text-text-tertiary hover:text-text-primary'
            }`}
          >
            <Icon name={f.icon} size={14} />
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}