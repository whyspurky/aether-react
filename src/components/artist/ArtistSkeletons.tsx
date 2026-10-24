const LINE = 'bg-white/[0.06] rounded';

export function ArtistHeroSkeleton() {
  return (
    <div className="px-6 pt-1 pb-4" aria-hidden="true">
      <div className="flex gap-6 items-start">
        <div className="w-36 lg:w-48 aspect-square rounded-full bg-white/[0.06] flex-shrink-0 animate-pulse" />

        <div className="flex-1 min-w-0 pt-1 space-y-2 animate-pulse">
          <div className="h-9 w-64 max-w-full bg-white/[0.08] rounded-lg" />
          <div className="h-4 w-40 max-w-full bg-white/[0.05] rounded" />
          <div className="h-3 w-56 max-w-full bg-white/[0.04] rounded mt-2" />
          <div className="h-3 w-44 max-w-full bg-white/[0.04] rounded" />

          <div className="flex gap-2 pt-4">
            <div className="h-9 w-32 bg-white/[0.07] rounded-full" />
            <div className="h-9 w-9 bg-white/[0.04] rounded-full" />
            <div className="h-9 w-9 bg-white/[0.04] rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// строка повторяет TrackList, без колонки номера
export function ArtistRowsSkeleton({ count = 6 }: { count?: number }) {
  const widths = [46, 62, 38, 54, 44, 58, 41, 50];
  return (
    <div className="space-y-1" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
          <div className="w-10 h-10 rounded-md bg-white/[0.06] flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className={`h-3.5 ${LINE}`} style={{ width: `${widths[i % widths.length]}%` }} />
            <div className="h-2.5 w-24 bg-white/[0.04] rounded" />
          </div>
          <div className="w-10 h-3 bg-white/[0.04] rounded" />
        </div>
      ))}
    </div>
  );
}

interface CardsProps {
  count?: number;
  layout?: 'row' | 'grid';
  width?: number;
}

export function ArtistCardsSkeleton({ count = 5, layout = 'row', width = 150 }: CardsProps) {
  if (layout === 'grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-square rounded-xl bg-white/[0.06]" />
            <div className="h-3 w-3/4 bg-white/[0.06] rounded mt-3" />
            <div className="h-2.5 w-1/2 bg-white/[0.04] rounded mt-2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-hidden" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex-shrink-0 animate-pulse" style={{ width }}>
          <div className="aspect-square rounded-xl bg-white/[0.06]" />
          <div className="h-3 w-24 bg-white/[0.06] rounded mt-3" />
          <div className="h-2.5 w-16 bg-white/[0.04] rounded mt-2" />
        </div>
      ))}
    </div>
  );
}

export function ArtistCompactSkeleton() {
  return (
    <div className="flex items-center gap-3 px-6 pt-3 pb-1 animate-pulse" aria-hidden="true">
      <div className="w-10 h-10 rounded-full bg-white/[0.06]" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-40 bg-white/[0.07] rounded" />
        <div className="h-2.5 w-24 bg-white/[0.04] rounded" />
      </div>
      <div className="w-9 h-9 rounded-full bg-white/[0.06]" />
      <div className="w-9 h-9 rounded-full bg-white/[0.06]" />
    </div>
  );
}

// блоков столько же, сколько секций в ArtistOverviewTab
export function ArtistOverviewSkeleton() {
  return (
    <div className="space-y-8 px-6 pt-4 pb-8" aria-hidden="true">
      <div>
        <div className="h-4 w-24 bg-white/[0.06] rounded mb-4 animate-pulse" />
        <ArtistCardsSkeleton count={5} width={160} />
      </div>
      <div>
        <div className="h-4 w-20 bg-white/[0.06] rounded mb-4 animate-pulse" />
        <ArtistCardsSkeleton count={5} />
      </div>
      <div>
        <div className="h-4 w-20 bg-white/[0.06] rounded mb-4 animate-pulse" />
        <ArtistCardsSkeleton count={5} />
      </div>
      <div>
        <div className="h-4 w-32 bg-white/[0.06] rounded mb-4 animate-pulse" />
        <ArtistRowsSkeleton count={4} />
      </div>
    </div>
  );
}
