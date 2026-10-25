import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@components/ui/Icon';
import { upgradeCoverUrl, formatYear } from '@lib/format';
import { playlistTypeLabel } from '@lib/playlist';
import { useStore } from '@store/store';
import type { Playlist } from '@store/types';

interface Props {
  playlist: Playlist;
  variant?: 'release' | 'playlist';
  // в репостах плейлист чужой, автор важен
  showUser?: boolean;
}

export function ArtistPlaylistCard({ playlist, variant = 'playlist', showUser = false }: Props) {
  const navigate = useNavigate();
  const playTrack = useStore((s) => s.playTrack);
  const [coverFailed, setCoverFailed] = useState(false);

  const title = playlist.title || playlist.name || 'без названия';
  const typeLabel = playlistTypeLabel(playlist);
  const year = formatYear(playlist.release_date || playlist.created_at);
  const coverUrl =
    upgradeCoverUrl(playlist.artwork_url, 't500x500') ||
    upgradeCoverUrl(playlist.tracks?.[0]?.artwork_url, 't500x500') ||
    upgradeCoverUrl(playlist.tracks?.[0]?.user?.avatar_url, 't500x500') ||
    null;

  const trackCount = playlist.track_count ?? playlist.tracks?.length ?? 0;
  const metaLine =
    variant === 'release'
      ? [year, trackCount ? `${trackCount} треков` : null].filter(Boolean).join(' · ')
      : trackCount
        ? `${trackCount} треков`
        : '';

  const open = () => navigate(`/playlist/${playlist.id}`);

  // если треки уже пришли, играем сразу, иначе открываем плейлист
  const play = () => {
    const tracks = playlist.tracks ?? [];
    if (!tracks.length || !tracks[0]?.id) {
      open();
      return;
    }
    void playTrack(tracks[0], tracks, 0, `плейлист ${title}`);
  };

  const showCover = !!coverUrl && !coverFailed;

  return (
    <div className="group relative w-full min-w-0">
      <div className="relative aspect-square rounded-xl overflow-hidden bg-white/[0.04] border border-border-subtle group-hover:border-[color-mix(in_srgb,var(--accent-primary)_40%,transparent)] transition-all duration-300">
        <button
          type="button"
          onClick={open}
          aria-label={`открыть ${typeLabel} ${title}`}
          className="absolute inset-0 w-full h-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_55%,transparent)]"
        >
          {showCover ? (
            <img
              src={coverUrl!}
              alt=""
              loading="lazy"
              onError={() => setCoverFailed(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <span className="w-full h-full flex items-center justify-center">
              <Icon name="folder" size={40}  />
            </span>
          )}
        </button>

        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wide bg-black/55 backdrop-blur-sm text-white/90 pointer-events-none">
          {typeLabel}
        </span>

        <button
          type="button"
          onClick={play}
          aria-label={`играть ${title}`}
          className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm grid place-items-center text-white opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 focus-visible:opacity-100 focus-visible:translate-y-0 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_55%,transparent)]"
        >
          <Icon name="play" size={14} />
        </button>
      </div>

      <button
        type="button"
        onClick={open}
        className="mt-2 block w-full text-left text-sm font-medium text-text-primary truncate group-hover:text-[var(--accent-primary)] transition-colors outline-none focus-visible:text-[var(--accent-primary)]"
      >
        {title}
      </button>

      {metaLine && <p className="text-xs text-text-tertiary truncate">{metaLine}</p>}

      {showUser && playlist.user?.username && (
        <button
          type="button"
          onClick={() => navigate(`/artist/${playlist.user!.id}`)}
          aria-label={`открыть артиста ${playlist.user.username}`}
          className="block max-w-full text-xs text-text-tertiary truncate hover:text-text-secondary transition-colors outline-none focus-visible:text-text-secondary"
        >
          {playlist.user.username}
        </button>
      )}
    </div>
  );
}
