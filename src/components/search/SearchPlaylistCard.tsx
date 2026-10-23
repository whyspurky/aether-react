import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@components/ui/Icon';
import { useStore } from '@store/store';
import { api } from '@lib/api';
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
  const importPlaylist = useStore((s) => s.importPlaylist);
  const libraryPlaylists = useStore((s) => s.library.playlists);

  const coverUrl =
    upgradeCover(playlist.artwork_url) ||
    upgradeCover(playlist.tracks?.[0]?.artwork_url) ||
    upgradeCover(playlist.tracks?.[0]?.user?.avatar_url) ||
    null;

  const title = playlist.title || playlist.name || 'без названия';
  const typeLabel = TYPE_LABELS[playlist.playlist_type || 'playlist'];

  const isImported = libraryPlaylists.some((p) => String(p.id) === String(playlist.id));

  const [importing, setImporting] = useState(false);
  const [justImported, setJustImported] = useState(false);

  const open = () => navigate(`/playlist/${playlist.id}`);

  const handleImport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isImported || importing) return;

    setImporting(true);
    try {
      const tracks = await api.getPlaylistTracks(String(playlist.id));
      const cover = upgradeCover(playlist.artwork_url);
      importPlaylist(title, tracks, cover);
      setJustImported(true);
      window.setTimeout(() => setJustImported(false), 700);
    } catch {
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
      className="flex items-center gap-3 p-3 rounded-xl bg-bg-card/60 backdrop-blur-sm border border-border-subtle hover:border-[color-mix(in_srgb,var(--accent-primary)_40%,transparent)] hover:bg-[var(--accent-muted)] transition-all duration-200 cursor-pointer group outline-none focus-visible:border-[color-mix(in_srgb,var(--accent-primary)_40%,transparent)] focus-visible:bg-[var(--accent-muted)]"
    >
      {coverUrl ? (
        <img src={coverUrl} alt="" className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-md bg-bg-secondary flex items-center justify-center flex-shrink-0">
          <Icon name="folder" size={20} className="text-text-tertiary" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-text-primary truncate transition-colors group-hover:text-[var(--accent-primary)]">
          {title}
        </h4>
        <p className="text-xs text-text-tertiary truncate">
          {typeLabel}
          {playlist.user && ` · ${playlist.user.username}`}
          {playlist.track_count && ` · ${playlist.track_count} треков`}
        </p>
      </div>

      <button
        type="button"
        onClick={handleImport}
        disabled={isImported || importing}
        style={
          justImported
            ? { animation: 'checkPop 0.45s cubic-bezier(0.34, 1.4, 0.64, 1)' }
            : undefined
        }
        className={`p-1.5 rounded-md transition-all flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_35%,transparent)] ${
          isImported
            ? 'text-emerald-400 bg-emerald-500/15 cursor-default'
            : importing
            ? 'text-text-secondary'
            : 'text-text-tertiary hover:text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100'
        }`}
        aria-label={
          isImported
            ? 'уже в библиотеке'
            : importing
            ? 'добавляем в библиотеку'
            : `добавить плейлист ${title} в библиотеку`
        }
      >
        {importing ? (
          <span className="block w-4 h-4 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
        ) : (
          <Icon
            name={isImported ? 'check' : 'plus'}
            size={16}
            className={isImported ? 'stroke-2' : ''}
          />
        )}
      </button>

      <Icon
        name="chevron-right"
        size={16}
        className="text-text-tertiary group-hover:text-text-secondary transition-all duration-200 group-hover:translate-x-0.5 flex-shrink-0"
      />
    </div>
  );
}
