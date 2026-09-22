import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../components/Icon';
import { TrackList } from '../components/TrackList';
import { useAddToPlaylist } from '../components/AddToPlaylistProvider';
import { ConfirmModal } from '../components/Modals/ConfirmModal';
import { useStore } from '../store/store';
import type { Playlist } from '../store/types';
import { useSmoothScroll } from '../hooks/useSmoothScroll';

type LibraryView = 'favorites' | 'history' | 'playlist';

const MAX_PLAYLIST_NAME_LENGTH = 16;

export default function LibraryPage() {
  const favorites = useStore((s) => s.library.favorites);
  const history = useStore((s) => s.library.history);
  const playlists = useStore((s) => s.library.playlists);
  const createPlaylist = useStore((s) => s.createPlaylist);
  const deletePlaylist = useStore((s) => s.deletePlaylist);
  const updatePlaylist = useStore((s) => s.updatePlaylist);
  const removeFromPlaylist = useStore((s) => s.removeFromPlaylist);
  const clearFavorites = useStore((s) => s.clearFavorites);
  const clearHistory = useStore((s) => s.clearHistory);
  const showToast = useStore((s) => s.showToast);
  const { close: closeAddToPlaylist, openTrackId } = useAddToPlaylist();

  const tracksScrollRef = useSmoothScroll<HTMLDivElement>();
  const playlistsScrollRef = useSmoothScroll<HTMLDivElement>();

  const [selectedView, setSelectedView] = useState<LibraryView>('favorites');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const selectedPlaylist = useStore((s) =>
    selectedPlaylistId ? s.library.playlists.find((p) => p.id === selectedPlaylistId) ?? null : null
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [confirmClear, setConfirmClear] = useState<null | 'favorites' | 'history'>(null);

  useEffect(() => {
    setIsEditing(false);
    setShowPlaylistMenu(false);
    setShowSettingsMenu(false);
  }, [selectedView, selectedPlaylistId]);

  useEffect(() => {
    if (selectedView !== 'playlist' || !selectedPlaylist || !openTrackId) return;
    const stillThere = selectedPlaylist.tracks.some((t) => t.id === openTrackId);
    if (!stillThere) closeAddToPlaylist();
  }, [selectedPlaylist, selectedView, openTrackId, closeAddToPlaylist]);
  
  const validatePlaylistName = (name: string): boolean => {
    if (name.length > MAX_PLAYLIST_NAME_LENGTH) {
      showToast(`название не может превышать ${MAX_PLAYLIST_NAME_LENGTH} символов`, 'error');
      return false;
    }
    return true;
  };

  const getCurrentTracks = () => {
    if (selectedView === 'favorites') return favorites;
    if (selectedView === 'history') return history;
    if (selectedView === 'playlist' && selectedPlaylist) return selectedPlaylist.tracks || [];
    return [];
  };

  const getCurrentTitle = () => {
    if (selectedView === 'favorites') return 'избранное';
    if (selectedView === 'history') return 'история';
    if (selectedView === 'playlist' && selectedPlaylist) return selectedPlaylist.name;
    return '';
  };

  const getCurrentIcon = () => {
    if (selectedView === 'favorites') return 'heart';
    if (selectedView === 'history') return 'history';
    if (selectedView === 'playlist') return 'folder';
    return 'music';
  };

  const getCurrentCount = () => {
    if (selectedView === 'favorites') return favorites.length;
    if (selectedView === 'history') return history.length;
    if (selectedView === 'playlist' && selectedPlaylist) return selectedPlaylist.tracks?.length || 0;
    return 0;
  };

  const getIconColor = () => {
    if (selectedView === 'favorites') return 'text-text-secondary';
    return 'text-text-primary';
  };


  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) {
      showToast('введите название плейлиста', 'error');
      return;
    }
    if (!validatePlaylistName(newPlaylistName)) return;
    createPlaylist(newPlaylistName.trim());
    setShowCreateModal(false);
    setNewPlaylistName('');
    showToast('плейлист создан', 'success');
  };

  const handleDeletePlaylist = (id: string) => {
    deletePlaylist(id);
    if (selectedPlaylistId === id) {
      setSelectedPlaylistId(null);
      setSelectedView('favorites');
    }
    showToast('плейлист удален', 'info');
  };

  const handleStartEdit = () => {
    if (isEditing) {
      setIsEditing(false);
      setShowPlaylistMenu(false);
    } else if (selectedPlaylist) {
      setEditingName(selectedPlaylist.name);
      setIsEditing(true);
      setShowPlaylistMenu(false);
    }
  };

  const handleSaveEdit = () => {
    if (!selectedPlaylist || !editingName.trim()) return;
    if (!validatePlaylistName(editingName)) return;

    updatePlaylist(selectedPlaylist.id, editingName.trim());
    setIsEditing(false);
    showToast('плейлист переименован', 'success');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSelectPlaylist = (playlist: Playlist) => {
    setSelectedPlaylistId(playlist.id);
    setSelectedView('playlist');
  };


  const handleClearConfirm = () => {
    if (confirmClear === 'favorites') clearFavorites();
    else if (confirmClear === 'history') clearHistory();
    setConfirmClear(null);
    setShowSettingsMenu(false);
    showToast('очищено', 'info');
  };


  return (
    <div className="h-full flex">
      <aside className="w-20 flex-shrink-0 flex flex-col items-center gap-2 p-2">
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-14 h-14 flex items-center justify-center rounded-2xl border border-border-subtle bg-bg-secondary/30 text-text-tertiary hover:bg-text-secondary hover:text-bg-primary hover:border-transparent transition-all duration-200 active:scale-95"
          title="создать плейлист"
        >
          <Icon name="plus" size={18} />
        </button>

        <div className="w-14 rounded-2xl border border-border-subtle bg-bg-secondary/30 p-1 flex flex-col items-center gap-1">
          <button
            onClick={() => {
              setSelectedView('favorites');
              setSelectedPlaylistId(null);
            }}
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
            onClick={() => {
              setSelectedView('history');
              setSelectedPlaylistId(null);
            }}
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
                    onClick={() => handleSelectPlaylist(playlist)}
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

      <main ref={tracksScrollRef} className="flex-1 h-full overflow-y-auto">
        <div className="sticky top-0 z-20 mx-3 mt-3 rounded-xl border border-white/[0.06] bg-bg-secondary/60 backdrop-blur-2xl p-5 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {(() => {
                const currentCover = selectedView === 'playlist' && selectedPlaylist
                  ? (selectedPlaylist.artwork_url || selectedPlaylist.tracks[0]?.artwork_url || null)
                  : null;
                const coverUrl = currentCover?.replace(/-(large|t\d+x\d+|original|crop|mini|tiny|small|badge)$/, '-t500x500');

                return (
                  <div className="w-16 h-16 rounded-xl bg-bg-secondary flex items-center justify-center shadow-lg flex-shrink-0 overflow-hidden">
                    {coverUrl ? (
                      <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Icon name={getCurrentIcon()} size={32} className={getIconColor()} />
                    )}
                  </div>
                );
              })()}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-4">
                  {isEditing && selectedView === 'playlist' ? (
                    <>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="text-2xl font-bold bg-transparent focus:outline-none px-0 text-text-primary flex-1 min-w-0"
                        autoFocus
                        maxLength={MAX_PLAYLIST_NAME_LENGTH}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                      />
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={handleSaveEdit}
                          className="p-1.5 rounded-lg text-text-secondary hover:bg-bg-secondary transition"
                          title="сохранить"
                        >
                          <Icon name="check" size={20} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1.5 rounded-lg text-text-tertiary hover:bg-bg-secondary transition"
                          title="отмена"
                        >
                          <Icon name="x" size={20} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <h1 className="text-2xl font-bold text-text-primary truncate flex-1 min-w-0">{getCurrentTitle()}</h1>
                  )}
                </div>
                <p className="text-sm text-text-tertiary mt-1">{getCurrentCount()} треков</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {selectedView === 'playlist' && selectedPlaylist && (
                <div className="relative">
                  <button
                    onClick={() => setShowPlaylistMenu(!showPlaylistMenu)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-bg-secondary transition-all"
                  >
                    <Icon name="ellipsis-vertical" size={22} className="text-text-tertiary" />
                  </button>
                  {showPlaylistMenu && (
                    <div className="absolute right-0 top-full mt-1 w-40 bg-bg-card rounded-lg shadow-xl border border-border-subtle overflow-hidden z-20">
                      <button
                        onClick={handleStartEdit}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary transition"
                      >
                        <Icon name="pencil" size={14} />
                        переименовать
                      </button>
                      <button
                        onClick={() => handleDeletePlaylist(selectedPlaylist.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary transition"
                      >
                        <Icon name="trash-2" size={14} />
                        удалить
                      </button>
                    </div>
                  )}
                </div>
              )}

              {(selectedView === 'favorites' || selectedView === 'history') && (
                <div className="relative">
                  <button
                    onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-bg-secondary transition-all"
                  >
                    <Icon name="ellipsis-vertical" size={22} className="text-text-tertiary" />
                  </button>
                  {showSettingsMenu && (
                    <div className="absolute right-0 top-full mt-1 w-40 bg-bg-card rounded-lg shadow-xl border border-border-subtle overflow-hidden z-20">
                      <button
                        onClick={() => {
                          setConfirmClear(selectedView === 'favorites' ? 'favorites' : 'history');
                          setShowSettingsMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary transition"
                      >
                        <Icon name="trash-2" size={14} />
                        очистить
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-5">
          <TrackList
            tracks={getCurrentTracks()}
            showQueueButton
            onRemove={
              selectedView === 'playlist' && selectedPlaylistId
                ? (track) => {
                    removeFromPlaylist(selectedPlaylistId, track.id);
                    closeAddToPlaylist();
                  }
                : undefined
            }
          />
        </div>
      </main>

      {showCreateModal && createPortal(
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] animate-modal-backdrop"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-bg-card rounded-xl p-6 w-96 max-w-[90vw] border border-border-subtle shadow-2xl animate-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4 text-text-primary">новый плейлист</h3>
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="название плейлиста"
              className="w-full px-4 py-2 bg-bg-secondary border border-border-subtle rounded-lg outline-none focus:border-border-visible mb-4 text-text-primary placeholder:text-text-tertiary"
              autoFocus
              maxLength={MAX_PLAYLIST_NAME_LENGTH}
              onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg text-text-tertiary hover:bg-bg-secondary transition"
              >
                отмена
              </button>
              <button
                onClick={handleCreatePlaylist}
                className="px-4 py-2 rounded-lg bg-bg-secondary text-text-primary hover:bg-text-secondary hover:text-bg-primary transition"
              >
                создать
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmModal
        isOpen={confirmClear !== null}
        title={confirmClear === 'favorites' ? 'очистка избранного' : 'очистка истории'}
        message={
          confirmClear === 'favorites'
            ? 'вы уверены, что хотите очистить избранное?'
            : 'вы уверены, что хотите очистить историю?'
        }
        confirmText="очистить"
        onConfirm={handleClearConfirm}
        onCancel={() => setConfirmClear(null)}
      />
    </div>
  );
}