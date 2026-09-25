import { useNavigate } from 'react-router-dom';
import { Icon } from '@components/ui/Icon';
import type { Playlist, Track } from '@store/types';

interface Props {
  playlist: Playlist;
  tracks: Track[];
  onPlayAll: () => void;
  onImport: () => void;
}

export function PlaylistHeader({ playlist, tracks, onPlayAll, onImport }: Props) {
  const navigate = useNavigate();
  const coverUrl = playlist.artwork_url?.replace('-large', '-t500x500') || null;
  const title = playlist.title || playlist.name || 'без названия';

  const typeLabel = {
    album: 'альбом',
    ep: 'ep',
    playlist: 'плейлист',
  }[playlist.playlist_type || 'playlist'];

  const formatDuration = (ms: number | undefined) => {
    if (!ms) return '';
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    if (h > 0) return `${h} ч ${m} мин`;
    return `${m} мин`;
  };

  return (
    <div className="flex gap-6 mb-8 items-start">
      <div className="flex-shrink-0">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="w-48 h-48 rounded-2xl object-cover border border-border-subtle shadow-2xl shadow-white/5"
          />
        ) : (
          <div className="w-48 h-48 rounded-2xl bg-bg-secondary flex items-center justify-center border border-border-subtle">
            <Icon name="folder" size={64} className="text-text-tertiary opacity-60" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 pt-2">
        <p className="text-xs text-text-tertiary uppercase tracking-wider">{typeLabel}</p>

        <h1 className="text-4xl font-bold text-text-primary mt-2 break-words">{title}</h1>

        {playlist.user && (
          <button
            onClick={() => navigate(`/artist/${playlist.user!.id}`)}
            className="flex items-center gap-2 mt-3 text-text-secondary hover:text-text-primary transition-colors"
          >
            {playlist.user.avatar_url && (
              <img
                src={playlist.user.avatar_url.replace('-large', '-t100x100')}
                alt={playlist.user.username}
                className="w-6 h-6 rounded-full object-cover"
              />
            )}
            <span className="text-sm font-medium">{playlist.user.username}</span>
          </button>
        )}

        {playlist.description && (
          <p className="text-text-tertiary text-sm mt-3 line-clamp-3 leading-relaxed">
            {playlist.description}
          </p>
        )}

        <div className="flex items-center gap-4 mt-5 text-sm text-text-tertiary">
          <span>{tracks.length} треков</span>
          {playlist.duration && (
            <>
              <span>·</span>
              <span>{formatDuration(playlist.duration)}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 mt-5">
          <button
            onClick={onPlayAll}
            disabled={!tracks.length}
            className="px-6 py-2 bg-bg-secondary text-text-primary rounded-full font-medium flex items-center gap-2 hover:bg-text-secondary hover:text-bg-primary transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-bg-secondary disabled:hover:text-text-primary"
          >
            <Icon name="play" size={16} />
            слушать всё
          </button>

          <button
            onClick={onImport}
            disabled={!tracks.length}
            className="px-6 py-2 bg-transparent border border-border-subtle text-text-secondary rounded-full font-medium flex items-center gap-2 hover:text-text-primary hover:border-border-visible transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Icon name="plus" size={16} />
            в библиотеку
          </button>
        </div>
      </div>
    </div>
  );
}