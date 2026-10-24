import { useEffect, useMemo, useRef, useState } from 'react';
import { ArtistTabButton } from './ArtistTabButton';
import { formatCount } from '@lib/format';
import type { ArtistTab } from '@store/types';

interface Props {
  activeTab: ArtistTab;
  counts?: Partial<Record<ArtistTab, number>>;
  onChange: (tab: ArtistTab) => void;
  // пустые разделы не показываем совсем
  hidden?: ArtistTab[];
}

const TABS: { id: ArtistTab; label: string }[] = [
  { id: 'overview', label: 'все' },
  { id: 'tracks', label: 'треки' },
  { id: 'releases', label: 'альбомы' },
  { id: 'playlists', label: 'плейлисты' },
  { id: 'reposts', label: 'репосты' },
];

export function ArtistTabs({ activeTab, counts = {}, onChange, hidden = [] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<Partial<Record<ArtistTab, HTMLButtonElement | null>>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const tabs = useMemo(() => TABS.filter((tab) => !hidden.includes(tab.id)), [hidden]);
  const tabIds = useMemo(() => tabs.map((tab) => tab.id), [tabs]);
  const countsKey = tabs.map((tab) => counts[tab.id] ?? '').join('|');

  useEffect(() => {
    const update = () => {
      const btn = buttonsRef.current[activeTab];
      const container = containerRef.current;
      if (!btn || !container) return;

      const btnRect = btn.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      setIndicator({
        left: btnRect.left - containerRect.left + container.scrollLeft,
        width: btnRect.width,
      });
    };

    update();

    const observer = new ResizeObserver(update);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', update);
    // шрифт может подъехать после первого кадра, индикатор не должен уехать
    document.fonts?.ready.then(update).catch(() => {});

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [activeTab, countsKey, tabIds]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const index = tabIds.indexOf(activeTab);
    let next: ArtistTab | null = null;

    if (e.key === 'ArrowRight') next = tabIds[(index + 1) % tabIds.length];
    else if (e.key === 'ArrowLeft') next = tabIds[(index - 1 + tabIds.length) % tabIds.length];
    else if (e.key === 'Home') next = tabIds[0];
    else if (e.key === 'End') next = tabIds[tabIds.length - 1];

    if (!next) return;
    e.preventDefault();
    onChange(next);
    buttonsRef.current[next]?.focus();
  };

  return (
    <div className="bg-bg-primary/95">
      <div
        ref={containerRef}
        role="tablist"
        aria-label="разделы артиста"
        onKeyDown={handleKeyDown}
        className="relative flex gap-6 px-6 overflow-x-auto scrollbar-hidden"
      >
        {tabs.map((tab) => {
          const count = counts[tab.id];
          return (
            <ArtistTabButton
              key={tab.id}
              ref={(el) => {
                buttonsRef.current[tab.id] = el;
              }}
              active={activeTab === tab.id}
              onClick={() => onChange(tab.id)}
            >
              {tab.label}
              {count !== undefined && count > 0 && (
                <span className="ml-1.5 text-[11px] tabular-nums text-text-tertiary">
                  {formatCount(count)}
                </span>
              )}
            </ArtistTabButton>
          );
        })}

        <div
          className="absolute bottom-0 h-[2px] bg-[var(--accent-primary)] rounded-full pointer-events-none"
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
