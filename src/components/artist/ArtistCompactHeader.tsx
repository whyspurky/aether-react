import { Icon } from '@components/ui/Icon';
import { formatCount, upgradeCoverUrl } from '@lib/format';
import type { User } from '@store/types';

interface Props {
  artist: User;
  onPlay: () => void;
  onShuffle: () => void;
  canPlay: boolean;
}

export function ArtistCompactHeader({ artist, onPlay, onShuffle, canPlay }: Props) {
  const avatarUrl = upgradeCoverUrl(artist.avatar_url, 't300x300');

  return (
    <div className="flex items-center gap-3 px-6 pt-2 pb-1">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          style={{ viewTransitionName: 'artist-avatar' }}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div
          style={{ viewTransitionName: 'artist-avatar' }}
          className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0"
        >
          <Icon name="mic" size={16} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <h2
            style={{ viewTransitionName: 'artist-name' }}
            className="text-base font-bold text-text-primary truncate"
          >
            {artist.username}
          </h2>
          {artist.verified && (
            <span role="img" aria-label="подтверждённый артист" className="flex flex-shrink-0">
              <Icon name="check-circle" size={14} />
            </span>
          )}
        </div>
        <p className="text-[11px] text-text-tertiary truncate">
          {formatCount(artist.followers_count)} подписчиков
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={onPlay}
          disabled={!canPlay}
          className="w-9 h-9 rounded-full grid place-items-center bg-[var(--accent-primary)] text-[var(--bg-primary)] hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="слушать артиста"
        >
          <Icon name="play" size={15} />
        </button>
        <button
          type="button"
          onClick={onShuffle}
          disabled={!canPlay}
          className="w-9 h-9 rounded-full grid place-items-center border border-white/[0.1] bg-white/[0.04] text-text-secondary hover:text-text-primary hover:bg-white/[0.08] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="перемешать"
        >
          <Icon name="shuffle" size={15} />
        </button>
      </div>
    </div>
  );
}
