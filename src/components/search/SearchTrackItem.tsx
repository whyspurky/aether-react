import { useNavigate } from 'react-router-dom';
import { Icon } from '@components/ui/Icon';
import { formatMs } from '@lib/format'
import type { Track } from '@store/types';

interface Props {
  track: Track;
  onPlay: (track: Track) => void;
  onAddToQueue: (track: Track, e: React.MouseEvent) => void;
}

export function SearchTrackItem({ track, onPlay, onAddToQueue }: Props) {
  const navigate = useNavigate();

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
      onClick={() => onPlay(track)}
      className="group flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-bg-secondary w-full"
    >
      {coverUrl ? (
        <img src={coverUrl} className="w-12 h-12 rounded-md object-cover flex-shrink-0" alt="" />
      ) : (
        <div className="w-12 h-12 rounded-md bg-bg-secondary flex items-center justify-center flex-shrink-0">
          <Icon name="music" size={20} className="text-text-tertiary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h4 className="text-base font-medium text-text-primary truncate">
          {track.title || 'без названия'}
        </h4>
        <p className="text-sm text-text-tertiary truncate">
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
      <div className="flex items-center gap-3">
        <span className="text-sm text-text-tertiary tabular-nums">
          {formatMs(track.duration || 0)}
        </span>
        <button
          onClick={(e) => onAddToQueue(track, e)}
          className="p-2 rounded-md text-text-tertiary opacity-0 group-hover:opacity-100 hover:text-text-secondary transition-all duration-200"
          title="добавить в очередь"
        >
          <Icon name="plus" size={16} />
        </button>
      </div>
    </div>
  );
}