import { useNavigate } from 'react-router-dom';
import { Icon } from '@components/ui/Icon';
import { useStore } from '@store/store';
import { useTrackContextMenu } from '@hooks/ui/useTrackContextMenu';
import { CacheIndicator } from './CacheIndicator';
import type { Track } from '@store/types';
import { formatMs } from '@lib/format';

interface TrackCardProps {
  track: Track;
  index?: number;
  tracks?: Track[];
}

export function TrackCard({ track, index = 0, tracks }: TrackCardProps) {
  const navigate = useNavigate();
  const playTrack = useStore((s) => s.playTrack);
  const cacheEntry = useStore((s) => s.offline.entries[track.id]);
  const { openTrackMenu } = useTrackContextMenu();

  const coverUrl =
    track.artwork_url?.replace('-large', '-t500x500') ||
    track.user?.avatar_url?.replace('-large', '-t500x500') ||
    null;

  const handlePlay = async () => {
    const list = tracks ?? [track];
    const i = tracks ? index : 0;
    await playTrack(track, list.slice(i), 0, 'trackcard');
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
      onContextMenu={(e) => {
        e.preventDefault();
        openTrackMenu(track, e);
      }}
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-bg-secondary/60 backdrop-blur-sm border border-border-subtle group-hover:border-border-visible transition-all duration-300 group-hover:shadow-xl group-hover:shadow-white/5">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={track.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-bg-secondary">
            <Icon name="music" size={32} className="text-text-tertiary" />
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            openTrackMenu(track, e, { below: true });
          }}
          className="absolute top-2 right-2 w-6 h-6 rounded-md bg-black/60 backdrop-blur-sm grid place-items-center text-white hover:bg-black/80 transition-all duration-200 opacity-0 group-hover:opacity-100"
          aria-label="меню трека"
        >
          <Icon name="plus" size={12} />
        </button>
      </div>

      <div className="mt-2 space-y-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <CacheIndicator entry={cacheEntry} size={12} />
          <h4 className="min-w-0 truncate text-sm font-medium leading-tight text-text-primary transition-colors duration-150 group-hover:text-[var(--accent-primary)]">
            {track.title || 'без названия'}
          </h4>
        </div>
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