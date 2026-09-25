import { useNavigate } from 'react-router-dom';
import { Icon } from '@components/ui/Icon';
import type { User } from '@store/types';

interface Props {
  artist: User;
}

export function ArtistCard({ artist }: Props) {
  const navigate = useNavigate();
  const avatarUrl = artist.avatar_url?.replace('-large', '-t300x300') || null;

  return (
    <div
      onClick={() => navigate(`/artist/${artist.id}`)}
      className="w-[140px] flex-shrink-0 cursor-pointer group"
    >
      <div className="aspect-square rounded-full overflow-hidden bg-bg-secondary border border-border-subtle group-hover:border-border-visible transition-all duration-300">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={artist.username}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon name="mic" size={32} className="text-text-tertiary" />
          </div>
        )}
      </div>

      <p className="mt-2 text-sm font-medium text-text-primary truncate text-center group-hover:text-text-secondary transition-colors">
        {artist.username}
      </p>

      {artist.followers_count !== undefined && (
        <p className="text-xs text-text-tertiary truncate text-center">
          {artist.followers_count.toLocaleString()} подписчиков
        </p>
      )}
    </div>
  );
}