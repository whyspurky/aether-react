import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { useStore } from '../store/store';
import type { Track } from '../store/types';
import { formatMs } from '../lib/format';

interface TrackListProps {
  tracks: Track[];
  showQueueButton?: boolean;
  onTrackClick?: (track: Track, index: number) => void;
}

export function TrackList({ tracks, showQueueButton = true, onTrackClick }: TrackListProps) {
  const navigate = useNavigate();
  const playTrack = useStore((s) => s.playTrack);
  const addToQueue = useStore((s) => s.addToQueue);
  const showToast = useStore((s) => s.showToast);
  const currentTrack = useStore((s) => s.player.currentTrack);
  const isPlaying = useStore((s) => s.player.isPlaying);

  const handlePlay = async (track: Track, index: number) => {
    if (onTrackClick) {
      onTrackClick(track, index);
      return;
    }
    await playTrack(track, tracks, index);
  };

  const handleAddToQueue = (track: Track, e: React.MouseEvent) => {
    e.stopPropagation();
    addToQueue(track);
    showToast('добавлено в очередь', 'success');
  };

  const handleArtistClick = (track: Track, e: React.MouseEvent) => {
    e.stopPropagation();
    const id = track.user?.id;
    if (id) navigate(`/artist/${id}`);
  };

  if (!tracks.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
        <Icon name="music" size={48} className="mb-4 opacity-30" />
        <p className="text-sm">нет треков</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 pr-2">
      {tracks.map((track, index) => {
        const isCurrent = currentTrack?.id === track.id;
        const coverUrl =
          track.artwork_url?.replace('-large', '-t300x300') ||
          track.user?.avatar_url?.replace('-large', '-t300x300') ||
          null;

        return (
          <div
            key={track.id}
            onClick={() => handlePlay(track, index)}
            className={`group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-bg-secondary ${
              isCurrent ? 'bg-bg-secondary' : ''
            }`}
          >
            <div className="w-8 text-center text-sm text-text-tertiary">
              {isCurrent && isPlaying ? (
                <div className="flex items-center justify-center gap-0.5">
                  <span className="w-1 h-2 bg-text-secondary rounded-full animate-[eqBar_0.8s_ease_infinite]" />
                  <span className="w-1 h-3 bg-text-secondary rounded-full animate-[eqBar_0.8s_ease_infinite_0.15s]" />
                  <span className="w-1 h-4 bg-text-secondary rounded-full animate-[eqBar_0.8s_ease_infinite_0.3s]" />
                </div>
              ) : (
                <span className="tabular-nums">{index + 1}</span>
              )}
            </div>

            {coverUrl ? (
              <img src={coverUrl} className="w-10 h-10 rounded-md object-cover flex-shrink-0" alt="" />
            ) : (
              <div className="w-10 h-10 rounded-md bg-bg-secondary flex items-center justify-center flex-shrink-0">
                <Icon name="music" size={16} className="text-text-tertiary" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h4 className={`text-sm font-medium truncate ${isCurrent ? 'text-text-secondary' : 'text-text-primary'}`}>
                {track.title || 'без названия'}
              </h4>
              <p className="text-xs text-text-tertiary truncate">
                {track.user?.id ? (
                  <span
                    onClick={(e) => handleArtistClick(track, e)}
                    className="cursor-pointer hover:text-text-secondary transition-colors"
                  >
                    {track.user.username}
                  </span>
                ) : (
                  track.user?.username || ''
                )}
              </p>
            </div>

            <span className="text-xs text-text-tertiary tabular-nums">
              {formatMs(track.duration || 0)}
            </span>

            {showQueueButton && (
              <button
                onClick={(e) => handleAddToQueue(track, e)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-glass-bg transition-all duration-200"
                title="добавить в очередь"
              >
                <Icon name="plus" size={16} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}