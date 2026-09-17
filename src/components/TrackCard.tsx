import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { useStore } from '../store/store';
import type { Track } from '../store/types';
import { formatMs } from '../lib/format';

interface TrackCardProps {
  track: Track;
  index?: number;
  tracks?: Track[];
}

export function TrackCard({ track, index = 0, tracks }: TrackCardProps) {
  const navigate = useNavigate();
  const playTrack = useStore((s) => s.playTrack);
  const addToQueue = useStore((s) => s.addToQueue);
  const showToast = useStore((s) => s.showToast);

  const coverUrl =
    track.artwork_url?.replace('-large', '-t500x500') ||
    track.user?.avatar_url?.replace('-large', '-t500x500') ||
    null;

  const handlePlay = async () => {
    const list = tracks ?? [track];
    const i = tracks ? index : 0;
    await playTrack(track, list.slice(i), 0, 'trackcard');
  };

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToQueue(track);
    showToast('добавлено в очередь', 'success');
  };

  const handleArtistClick = (e: React.MouseEvent) => {
    e.stopPropagation();  
    const id = track.user?.id;
    if (id) navigate(`/artist/${id}`);
  };

  return (
    <div
      className="group relative w-[160px] flex-shrink-0 cursor-pointer"
      style={{ animationDelay: `${index * 0.05}s` }}
      onClick={handlePlay}
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-bg-secondary border border-border-subtle group-hover:border-border-visible transition-all duration-300 group-hover:shadow-xl group-hover:shadow-white/5">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={track.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-bg-secondary">
            <Icon name="music" size={32} className="text-text-tertiary" />
          </div>
        )}
      </div>

      <div className="mt-2">
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
        <div className="flex items-center justify-between mt-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
          <span className="text-xs text-text-tertiary">{formatMs(track.duration || 0)}</span>
          <button
            onClick={handleAddToQueue}
            className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-glass-bg transition-all duration-200"
          >
            <Icon name="plus" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}