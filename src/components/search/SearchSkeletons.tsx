interface Props {
  filter: 'tracks' | 'artists' | 'playlists';
}

const TRACK_SKELETON_WIDTHS = Array.from({ length: 8 }, () => ({
  tw: 20 + Math.random() * 30,
  aw: 12 + Math.random() * 20,
}));

const CARD_SKELETON_WIDTHS = Array.from({ length: 16 }, () => ({
  nameW: 30 + Math.random() * 30,
  subsW: 25 + Math.random() * 20,
}));

export function SearchSkeletons({ filter }: Props) {
  if (filter === 'tracks') {
    return (
      <div className="space-y-1">
        {TRACK_SKELETON_WIDTHS.map(({ tw, aw }, i) => {
          return (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl animate-pulse">
              <div className="w-12 h-12 rounded-md bg-white/[0.06] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-white/[0.06] rounded mb-2" style={{ width: `${tw}%` }} />
                <div className="h-3 bg-white/[0.04] rounded" style={{ width: `${aw}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {CARD_SKELETON_WIDTHS.map(({ nameW, subsW }, i) => {
        return (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] animate-pulse">
            <div className="w-10 h-10 rounded-full bg-white/[0.06] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-white/[0.06] rounded mb-1.5" style={{ width: `${nameW}%` }} />
              <div className="h-3 bg-white/[0.04] rounded" style={{ width: `${subsW}%` }} />
            </div>
            <div className="w-4 h-4 rounded bg-white/[0.06] flex-shrink-0" />
          </div>
        );
      })}
    </div>
  );
}