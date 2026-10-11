import { useNavigate } from 'react-router-dom';
import { Icon } from '@components/ui/Icon';
import type { Playlist } from '@store/types';

interface Props {
  playlist: Playlist;
}

const IMG_SIZE_RE = /-(large|t\d+x\d+|original|crop|mini|tiny|small|badge)(\.[a-z]+)?$/;
const TYPE_LABELS: Record<string, string> = {
  album: 'альбом',
  ep: 'ep',
  playlist: 'плейлист',
};

function upgradeCover(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  return url.replace(IMG_SIZE_RE, '-t300x300$2');
}

export function SearchPlaylistCard({ playlist }: Props) {
  const navigate = useNavigate();

  const coverUrl =
    upgradeCover(playlist.artwork_url) ||
    upgradeCover(playlist.tracks?.[0]?.artwork_url) ||
    upgradeCover(playlist.tracks?.[0]?.user?.avatar_url) ||
    null;

  const title = (playlist as any).title || playlist.name || 'без названия';
  const typeLabel = TYPE_LABELS[playlist.playlist_type || 'playlist'];

  return (
    <div
      onClick={() => navigate(`/playlist/${playlist.id}`)}
      className="flex items-center gap-3 p-3 rounded-xl bg-bg-card/60 backdrop-blur-sm border border-border-subtle hover:border-border-visible transition-all duration-200 cursor-pointer group"
    >
      {coverUrl ? (
        <img src={coverUrl} alt={title} className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-md bg-bg-secondary flex items-center justify-center flex-shrink-0">
          <Icon name="folder" size={20} className="text-text-tertiary" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-text-primary truncate">{title}</h4>
        <p className="text-xs text-text-tertiary truncate">
          {typeLabel}
          {playlist.user && ` · ${playlist.user.username}`}
          {playlist.track_count && ` · ${playlist.track_count} треков`}
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