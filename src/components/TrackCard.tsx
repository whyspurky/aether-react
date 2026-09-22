import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { useStore } from '../store/store';
import { useAddToPlaylist } from './AddToPlaylistProvider';
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
  const { open: openAddToPlaylist, close: closeAddToPlaylist, openTrackId } = useAddToPlaylist();

  const coverUrl =
    track.artwork_url?.replace('-large', '-t500x500') ||
    track.user?.avatar_url?.replace('-large', '-t500x500') ||
    null;

  const isMenuOpen = openTrackId === track.id;

  const handlePlay = async () => {
    const list = tracks ?? [track];
    const i = tracks ? index : 0;
    await playTrack(track, list.slice(i), 0, 'trackcard');
  };

  const handleAddToPlaylist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMenuOpen) {
      closeAddToPlaylist();
    } else {
      openAddToPlaylist(track, e.currentTarget as HTMLElement);
    }
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

        <button
          onClick={handleAddToPlaylist}
          className={`absolute top-2 right-2 w-6 h-6 rounded-md bg-black/60 backdrop-blur-sm grid place-items-center text-white hover:bg-black/80 transition-all duration-200 ${
            isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          title="добавить в плейлист"
        >
          <span className={`block transition-transform duration-200 ${isMenuOpen ? 'rotate-45' : ''}`}>
            <Icon name="plus" size={12} />
          </span>
        </button>
      </div>

      <div className="mt-2 space-y-0.5">
        <h4 className="text-sm font-medium text-text-primary truncate leading-tight">
          {track.title || 'без названия'}
        </h4>
        <p className="text-xs text-text-tertiary truncate leading-tight">
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
        <p className="text-xs text-text-tertiary tabular-nums leading-tight">
          {formatMs(track.duration || 0)}
        </p>
      </div>
    </div>
  );
}