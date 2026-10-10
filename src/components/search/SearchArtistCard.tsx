import { useNavigate } from 'react-router-dom';
import { Icon } from '@components/ui/Icon';
import type { User } from '@store/types';

interface Props {
  artist: User;
}

export function SearchArtistCard({ artist }: Props) {
  const navigate = useNavigate();

  console.log('[SearchArtistCard]', {
    id: artist.id,
    username: artist.username,
    avatar_url: artist.avatar_url,
    hasAvatar: !!artist.avatar_url,
    keys: Object.keys(artist).slice(0, 20),
  });

  return (
    <div
      onClick={() => navigate(`/artist/${artist.id}`)}
      className="flex items-center gap-3 p-3 rounded-xl bg-bg-card/60 backdrop-blur-sm border border-border-subtle hover:border-border-visible transition-all duration-200 cursor-pointer group"
    >
      {artist.avatar_url ? (
        <img
          src={artist.avatar_url}
          alt={artist.username}
          className="w-10 h-10 rounded-full object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center">
          <Icon name="mic" size={16} className="text-text-tertiary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-text-primary truncate">{artist.username}</h4>
        <p className="text-xs text-text-tertiary">
          {artist.followers_count?.toLocaleString() || 0} слушателей
        </p>
      </div>
      <Icon
        name="chevron-right"
        size={16}
        className="text-text-tertiary group-hover:text-text-secondary transition-colors"
      />
    </div>
  );
}