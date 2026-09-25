import { Icon } from '@components/ui/Icon';
import type { User } from '@store/types';

interface Props {
  artist: User;
  tracksCount: number;
  repostsCount: number;
}

export function ArtistHeader({ artist, tracksCount, repostsCount }: Props) {
  const coverUrl = artist.avatar_url?.replace('-large', '-t500x500') || null;

  const formatCount = (n: number | undefined) => {
    if (!n) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n);
  };

  return (
    <div className="relative px-6 pt-0 pb-6">
      <div className="flex gap-6 items-start">
        <div className="flex-shrink-0">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={artist.username}
              className="w-40 h-40 rounded-full object-cover border-2 border-border-subtle shadow-xl"
            />
          ) : (
            <div className="w-40 h-40 rounded-full bg-bg-secondary flex items-center justify-center border-2 border-border-subtle">
              <Icon name="mic" size={64} className="text-text-tertiary" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 pt-2">
          <div className="flex items-center gap-2">
            <h1 className="text-4xl font-bold text-text-primary truncate">{artist.username}</h1>
            {artist.verified && (
              <Icon name="check-circle" size={24} className="text-text-secondary flex-shrink-0" />
            )}
          </div>

          {artist.full_name && artist.full_name !== artist.username && (
            <p className="text-text-secondary text-lg mt-1 truncate">{artist.full_name}</p>
          )}

          {(artist.city || artist.country_code) && (
            <p className="text-text-tertiary text-sm mt-1 flex items-center gap-1">
              <Icon name="map-pin" size={12} />
              {[artist.city, artist.country_code].filter(Boolean).join(', ')}
            </p>
          )}

          <div className="flex items-center gap-6 mt-5">
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-text-primary">{formatCount(artist.followers_count)}</span>
              <span className="text-xs text-text-tertiary">подписчиков</span>
            </div>

            <div className="flex flex-col">
              <span className="text-lg font-semibold text-text-primary">{formatCount(artist.followings_count)}</span>
              <span className="text-xs text-text-tertiary">подписок</span>
            </div>

            <div className="flex flex-col">
              <span className="text-lg font-semibold text-text-primary">{formatCount(tracksCount)}</span>
              <span className="text-xs text-text-tertiary">треков</span>
            </div>

            <div className="flex flex-col">
              <span className="text-lg font-semibold text-text-primary">{formatCount(repostsCount)}</span>
              <span className="text-xs text-text-tertiary">репостов</span>
            </div>

            <div className="flex flex-col">
              <span className="text-lg font-semibold text-text-primary">{formatCount(artist.likes_count)}</span>
              <span className="text-xs text-text-tertiary">лайков</span>
            </div>
          </div>

          {artist.description && (
            <p className="text-text-tertiary text-sm mt-4 line-clamp-3 leading-relaxed">
              {artist.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}