import { Icon } from '@components/ui/Icon';
import { useSmoothScroll } from '@hooks/ui/useSmoothScroll';
import type { Playlist } from '@store/types';

type LibraryView = 'favorites' | 'history' | 'playlist';

interface Props {
  selectedView: LibraryView;
  selectedPlaylistId: string | null;
  playlists: Playlist[];
  onSelectFavorites: () => void;
  onSelectHistory: () => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  onCreateClick: () => void;
}

export function LibrarySidebar({
  selectedView,
  playlists,
  onSelectFavorites,
  onSelectHistory,
  onSelectPlaylist,
  onCreateClick,
}: Props) {
  const playlistsScrollRef = useSmoothScroll<HTMLDivElement>();

  return (
    <aside className="w-20 flex-shrink-0 flex flex-col items-center gap-2 p-2">
      <button
        onClick={onCreateClick}
        className="w-14 h-14 flex items-center justify-center rounded-2xl border border-border-subtle bg-bg-secondary/30 text-text-tertiary hover:bg-text-secondary hover:text-bg-primary hover:border-transparent transition-all duration-200 active:scale-95"
        title="создать плейлист"
      >
        <Icon name="plus" size={18} />
      </button>

      <div className="w-14 rounded-2xl border border-border-subtle bg-bg-secondary/30 p-1 flex flex-col items-center gap-1">
        <button
          onClick={onSelectFavorites}
          className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-95 ${
            selectedView === 'favorites'
              ? 'bg-bg-secondary text-text-secondary'
              : 'text-text-tertiary hover:bg-bg-secondary hover:text-text-primary'
          }`}
          title="избранное"
        >
          <Icon name="heart" size={18} />
        </button>

        <button
          onClick={onSelectHistory}
          className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-95 ${
            selectedView === 'history'
              ? 'bg-bg-secondary text-text-secondary'
              : 'text-text-tertiary hover:bg-bg-secondary hover:text-text-primary'
          }`}
          title="история"
        >
          <Icon name="history" size={18} />
        </button>
      </div>

      {playlists.length > 0 && (
        <div
          ref={playlistsScrollRef}
          className="w-14 rounded-2xl border border-border-subtle bg-bg-secondary/30 p-1 flex flex-col items-center gap-1 overflow-y-auto overflow-x-hidden scrollbar-thin"
          style={{ maxHeight: '100%', flex: '0 1 auto' }}
        >
          {playlists.map((playlist) => {
            const cover = playlist.artwork_url || playlist.tracks[0]?.artwork_url || null;
            const coverUrl = cover?.replace(/-(large|t\d+x\d+|original|crop|mini|tiny|small|badge)$/, '-t200x200');

            return (
              <div key={playlist.id} className="group relative flex justify-center">
                <button
                  onClick={() => onSelectPlaylist(playlist)}
                  className="w-12 h-12 flex items-center justify-center rounded-lg overflow-hidden transition-all duration-200 hover:scale-105 active:scale-95"
                  title={playlist.name}
                >
                  {coverUrl ? (
                    <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Icon name="folder" size={18} className="text-text-tertiary" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}