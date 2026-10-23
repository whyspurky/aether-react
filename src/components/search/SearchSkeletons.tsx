interface Props {
  filter: 'tracks' | 'artists' | 'playlists';
}

const TRACK_SKELETON_WIDTHS = [
  { tw: 38, aw: 18 },
  { tw: 52, aw: 24 },
  { tw: 31, aw: 15 },
  { tw: 46, aw: 21 },
  { tw: 27, aw: 13 },
  { tw: 58, aw: 26 },
  { tw: 35, aw: 17 },
  { tw: 44, aw: 20 },
];

const CARD_SKELETON_WIDTHS = [
  { nameW: 42, subsW: 30 },
  { nameW: 56, subsW: 24 },
  { nameW: 34, subsW: 27 },
  { nameW: 48, subsW: 33 },
  { nameW: 38, subsW: 22 },
  { nameW: 60, subsW: 29 },
  { nameW: 33, subsW: 25 },
  { nameW: 51, subsW: 31 },
];

export function SearchSkeletons({ filter }: Props) {
  if (filter === 'tracks') {
    return (
      <div className="space-y-1" aria-hidden="true">
        {TRACK_SKELETON_WIDTHS.map(({ tw, aw }, i) => {
          return (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl animate-pulse">
              <div className="w-12 h-12 rounded-md bg-white/[0.06] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-white/[0.06] rounded mb-2" style={{ width: `${tw}%` }} />
                <div className="h-3 bg-white/[0.04] rounded" style={{ width: `${aw}%` }} />
              </div>
              <div className="w-10 h-3 rounded bg-white/[0.04]" />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3" aria-hidden="true">
      {CARD_SKELETON_WIDTHS.map(({ nameW, subsW }, i) => {
        return (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] animate-pulse">
            <div
              className={`w-10 h-10 bg-white/[0.06] flex-shrink-0 ${
                filter === 'artists' ? 'rounded-full' : 'rounded-md'
              }`}
            />
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
