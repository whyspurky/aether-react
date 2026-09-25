interface Props {
  filter: 'tracks' | 'artists' | 'playlists';
}

export function SearchSkeletons({ filter }: Props) {
  if (filter === 'tracks') {
    return (
      <div className="space-y-1">
        {[...Array(8)].map((_, i) => {
          const tw = 20 + Math.random() * 30;
          const aw = 12 + Math.random() * 20;
          return (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl animate-pulse">
              <div className="w-12 h-12 rounded-md bg-bg-secondary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-bg-secondary rounded mb-2" style={{ width: `${tw}%` }} />
                <div className="h-3 bg-bg-secondary rounded" style={{ width: `${aw}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {[...Array(16)].map((_, i) => {
        const nameW = 30 + Math.random() * 30;
        const subsW = 25 + Math.random() * 20;
        return (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-bg-card animate-pulse">
            <div className="w-10 h-10 rounded-full bg-bg-secondary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-bg-secondary rounded mb-1.5" style={{ width: `${nameW}%` }} />
              <div className="h-3 bg-bg-secondary rounded" style={{ width: `${subsW}%` }} />
            </div>
            <div className="w-4 h-4 rounded bg-bg-secondary flex-shrink-0" />
          </div>
        );
      })}
    </div>
  );
}