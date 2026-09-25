import { useNavigate } from 'react-router-dom';
import { Icon } from '@components/ui/Icon';
import type { Playlist } from '@store/types';

interface Props {
  playlist: Playlist;
}

export function ArtistPlaylistCard({ playlist }: Props) {
  const navigate = useNavigate();
  const coverUrl = playlist.artwork_url?.replace('-large', '-t500x500') || null;
  const title = playlist.title || playlist.name || 'без названия';

  const typeLabel = {
    album: 'альбом',
    ep: 'ep',
    playlist: 'плейлист',
  }[playlist.playlist_type || 'playlist'];

  return (
    <div
      onClick={() => navigate(`/playlist/${playlist.id}`)}
      className="cursor-pointer group"
    >
      <div className="aspect-square rounded-xl overflow-hidden bg-bg-secondary border border-border-subtle group-hover:border-border-visible transition-all duration-300 shadow-lg shadow-white/0 group-hover:shadow-white/5">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon name="folder" size={48} className="text-text-tertiary" />
          </div>
        )}
      </div>

      <p className="mt-2 text-sm font-medium text-text-primary truncate group-hover:text-text-secondary transition-colors">
        {title}
      </p>

      <p className="text-xs text-text-tertiary truncate">
        {typeLabel}
        {playlist.track_count && ` · ${playlist.track_count} треков`}
      </p>
    </div>
  );
}