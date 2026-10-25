import { useNavigate } from 'react-router-dom';
import { Icon } from '@components/ui/Icon';
import { formatCount, upgradeCoverUrl } from '@lib/format';
import { ArtistEmpty, ArtistSectionError } from './ArtistEmpty';
import type { ArtistSectionMeta, User } from '@store/types';

interface Props {
  artists: User[];
  meta: ArtistSectionMeta;
  onRetry: () => void;
  onLoadMore: () => void;
}

function RelatedSkeleton() {
  return (
    <div className="space-y-1" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-2 animate-pulse">
          <div className="w-11 h-11 rounded-full bg-white/[0.06] flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-32 bg-white/[0.06] rounded" />
            <div className="h-2.5 w-20 bg-white/[0.04] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ArtistRelatedList({ artists, meta, onRetry, onLoadMore }: Props) {
  const navigate = useNavigate();

  if (!artists.length) {
    if (meta.status === 'error') {
      return <ArtistSectionError message={meta.error || 'не удалось загрузить'} onRetry={onRetry} compact />;
    }
    if (meta.status === 'loading' || meta.status === 'idle') {
      return <RelatedSkeleton />;
    }
    return <ArtistEmpty icon="mic" title="похожих артистов не нашлось" compact />;
  }

  return (
    <div>
      <div className="divide-y divide-white/[0.05]">
        {artists.map((artist) => {
          const avatar = upgradeCoverUrl(artist.avatar_url, 't300x300');
          return (
            <button
              key={artist.id}
              type="button"
              onClick={() => navigate(`/artist/${artist.id}`)}
              aria-label={`открыть артиста ${artist.username}`}
              className="group w-full flex items-center gap-3 py-2.5 text-left outline-none rounded-lg hover:bg-white/[0.03] focus-visible:bg-white/[0.03] transition-colors px-1"
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt=""
                  loading="lazy"
                  className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <Icon name="mic" size={16}  />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h3 className="text-sm font-semibold text-text-primary truncate group-hover:text-[var(--accent-primary)] transition-colors">
                    {artist.username}
                  </h3>
                  {artist.verified && (
                    <span role="img" aria-label="подтверждённый артист" className="flex flex-shrink-0">
                      <Icon name="check-circle" size={13}  />
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-text-tertiary">
                  <span className="flex items-center gap-1">
                    <Icon name="circle-user-round" size={12} />
                    {formatCount(artist.followers_count)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="audio-lines" size={12} />
                    {formatCount(artist.track_count)}
                  </span>
                </div>
              </div>

              <Icon
                name="chevron-right"
                size={16}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              />
            </button>
          );
        })}
      </div>

      {meta.hasMore && meta.status !== 'error' && (
        <div className="flex justify-center pt-2">
          {meta.status === 'loading' ? (
            <div
              role="status"
              aria-label="догрузка похожих артистов"
              className="w-5 h-5 border-2 border-text-secondary border-t-transparent rounded-full animate-spin"
            />
          ) : (
            <button
              type="button"
              onClick={onLoadMore}
              className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
            >
              показать ещё
            </button>
          )}
        </div>
      )}

      {meta.status === 'error' && (
        <ArtistSectionError
          message={meta.error || 'не удалось загрузить ещё'}
          onRetry={onRetry}
          compact
        />
      )}
    </div>
  );
}
