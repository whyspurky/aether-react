import { useNavigate } from 'react-router-dom';
import { Icon } from '@components/ui/Icon';
import { useStore } from '@store/store';
import { formatMs } from '@lib/format';
import type { Track } from '@store/types';

interface Props {
  track: Track;
  tracks: Track[];
}

export function MyWaveTrackItem({ track, tracks }: Props) {
  const navigate = useNavigate();
  const playTrack = useStore((s) => s.playTrack);

  const index = tracks.findIndex((t) => t.id === track.id);
  const queue = tracks.slice(index >= 0 ? index : 0);

  const coverUrl =
    track.artwork_url?.replace('-large', '-t300x300') ||
    track.user?.avatar_url?.replace('-large', '-t300x300') ||
    null;

  const handleArtistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const id = track.user?.id;
    if (id) navigate(`/artist/${id}`);
  };

  return (
    <div
      onClick={() => playTrack(track, queue, 0, 'Моя Волна')}
      className="group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-bg-secondary active:scale-[0.98]"
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          className="w-10 h-10 rounded-md object-cover flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
          alt=""
        />
      ) : (
        <div className="w-10 h-10 rounded-md bg-bg-secondary flex items-center justify-center flex-shrink-0">
          <Icon name="music" size={16} className="text-text-tertiary" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-text-primary truncate group-hover:text-text-secondary transition-colors duration-200">
          {track.title || 'без названия'}
        </h4>
        <p className="text-xs text-text-tertiary truncate">
          {track.user?.id ? (
            <span
              onClick={handleArtistClick}
              className="cursor-pointer hover:text-text-secondary transition-colors"
            >
              {track.user.username}
            </span>
          ) : (
            track.user?.username || ''
          )}
        </p>
      </div>

      <span className="text-xs text-text-tertiary tabular-nums opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {formatMs(track.duration || 0)}
      </span>
    </div>
  );
}