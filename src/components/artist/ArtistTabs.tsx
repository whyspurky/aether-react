import { useEffect, useRef, useState } from 'react';
import { ArtistTabButton } from './ArtistTabButton';

type Tab = 'all' | 'tracks' | 'playlists' | 'reposts';

interface Props {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'все' },
  { id: 'tracks', label: 'треки' },
  { id: 'playlists', label: 'плейлисты' },
  { id: 'reposts', label: 'репосты' },
];

export function ArtistTabs({ activeTab, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<Record<Tab, HTMLButtonElement | null>>({
    all: null,
    tracks: null,
    playlists: null,
    reposts: null,
  });

  const [indicator, setIndicator] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useEffect(() => {
    const update = () => {
      const btn = buttonsRef.current[activeTab];
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
  }, [activeTab]);

  return (
    <div data-artist-tabs className="sticky top-0 z-30 bg-bg-primary/95 backdrop-blur-xl border-b border-border-subtle">
      <div ref={containerRef} className="relative flex gap-6 px-6">
        {TABS.map((t) => (
          <ArtistTabButton
            key={t.id}
            ref={(el) => { buttonsRef.current[t.id] = el; }}
            active={activeTab === t.id}
            onClick={() => onChange(t.id)}
          >
            {t.label}
          </ArtistTabButton>
        ))}

        <div
          className="absolute bottom-0 h-[2px] bg-text-primary rounded-full pointer-events-none"
          style={{
            left: indicator.left,
            width: indicator.width,
            transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
    </div>
  );
}