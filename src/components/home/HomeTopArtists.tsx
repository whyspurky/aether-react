import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@components/ui/Icon';
import { useStore } from '@store/store';
import { upgradeCoverUrl } from '@lib/format';

export function HomeTopArtists() {
  const artistScores = useStore((s) => s.artistScores);
  const navigate = useNavigate();

  const artists = useMemo(() => {
    return Object.values(artistScores)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [artistScores]);

  if (artists.length < 3) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon name="mic" size={16}  />
          <h2 className="text-sm font-bold text-text-primary">топ артистов</h2>
        </div>
      </div>

      <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
        {artists.map((a, i) => {
          const avatar = upgradeCoverUrl(a.avatar_url, 't300x300') || null;

          // затухание от 100% (первый) до 10% (последний)
          const total = Math.max(artists.length - 1, 1);
          const intensity = 1 - i / total; // 1 → 0
          const ringOpacity = Math.max(0.1, intensity);
          const glowOpacity = Math.max(0, intensity * 0.5);

          return (
            <button
              key={a.id}
              onClick={() => navigate(`/artist/${a.id}`)}
              className="group flex flex-col items-center gap-2 animate-content-fade-in"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="relative">
                {/* accent glow, угасает по позиции */}
                {glowOpacity > 0 && (
                  <div
                    className="absolute -inset-1 rounded-full bg-[var(--accent-primary)] blur-md transition-opacity duration-300"
                    style={{ opacity: glowOpacity }}
                  />
                )}
                <div
                  className="relative w-16 h-16 rounded-full overflow-hidden transition-all duration-200 group-hover:scale-105 ring-2 ring-offset-2 ring-offset-bg-primary"
                  style={{
                    '--tw-ring-color': `color-mix(in srgb, var(--accent-primary) ${Math.round(ringOpacity * 100)}%, transparent)`,
                  } as React.CSSProperties}
                >
                  {avatar ? (
                    <img src={avatar} alt={a.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-bg-secondary flex items-center justify-center">
                      <Icon name="mic" size={20}  />
                    </div>
                  )}
                </div>

                {/* номер */}
                <div
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-200"
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--accent-primary) ${Math.round(ringOpacity * 100)}%, rgba(255,255,255,0.08))`,
                    color: i === 0 ? 'var(--bg-primary)' : 'var(--text-primary)',
                  }}
                >
                  {i + 1}
                </div>
              </div>

              <p
                className={`text-[11px] truncate max-w-full transition-colors duration-200 ${
                  i === 0
                    ? 'text-text-primary font-medium group-hover:text-[var(--accent-primary)]'
                    : 'text-text-tertiary group-hover:text-text-secondary'
                }`}
              >
                {a.username}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}