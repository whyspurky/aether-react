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

    // пересчёт после смены шрифта или анимации лейаута
    const observer =
      typeof ResizeObserver !== 'undefined' && containerRef.current
        ? new ResizeObserver(update)
        : null;
    if (observer && containerRef.current) observer.observe(containerRef.current);

    return () => {
      window.removeEventListener('resize', update);
      observer?.disconnect();
    };
  }, [filter]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const index = FILTERS.findIndex((f) => f.id === filter);
    const step = e.key === 'ArrowRight' ? 1 : -1;
    const next = FILTERS[(index + step + FILTERS.length) % FILTERS.length];
    onChange(next.id);
    buttonsRef.current[next.id]?.focus();
  };

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label="тип результатов поиска"
      className="relative flex items-center gap-1"
    >
      {/* подвижная подсветка */}
      <div
        className="absolute inset-y-0 rounded-full bg-[var(--accent-muted)] pointer-events-none"
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
          type="button"
          role="tab"
          aria-selected={filter === f.id}
          tabIndex={filter === f.id ? 0 : -1}
          ref={(el) => {
            buttonsRef.current[f.id] = el;
          }}
          onClick={(e) => {
            onChange(f.id);
            // после клика мышью фильтры не должны висеть из-за focus-within
            if (e.detail > 0) e.currentTarget.blur();
          }}
          onKeyDown={handleKeyDown}
          className={`relative z-10 flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_35%,transparent)] ${
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
  );
}
