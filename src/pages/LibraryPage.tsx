import { useState, useEffect } from 'react';
import { Icon } from '../components/Icon';
import { TrackList } from '../components/TrackList';
import { ConfirmModal } from '../components/Modals/ConfirmModal';
import { useStore } from '../store/store';
import type { Playlist } from '../store/types';

type LibraryView = 'favorites' | 'history' | 'playlist';

const MAX_PLAYLIST_NAME_LENGTH = 16;

export default function LibraryPage() {
  const favorites = useStore((s) => s.library.favorites);
  const history = useStore((s) => s.library.history);
  const playlists = useStore((s) => s.library.playlists);
  const createPlaylist = useStore((s) => s.createPlaylist);
  const deletePlaylist = useStore((s) => s.deletePlaylist);
  const updatePlaylist = useStore((s) => s.updatePlaylist);
  const clearFavorites = useStore((s) => s.clearFavorites);
  const clearHistory = useStore((s) => s.clearHistory);
  const showToast = useStore((s) => s.showToast);

  const [selectedView, setSelectedView] = useState<LibraryView>('favorites');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
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
  }, [selectedView, selectedPlaylist]);


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
    if (selectedPlaylist?.id === id) {
      setSelectedPlaylist(null);
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
    setSelectedPlaylist({ ...selectedPlaylist, name: editingName.trim() });
    setIsEditing(false);
    showToast('плейлист переименован', 'success');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSelectPlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
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
    <div className="h-full flex bg-bg-primary rounded-2xl overflow-hidden border border-border-subtle">
      <aside className="w-16 flex-shrink-0 border-r border-border-subtle bg-bg-primary p-2 flex flex-col items-center gap-2">
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-bg-secondary text-text-secondary hover:bg-text-secondary hover:text-bg-primary transition-all duration-200"
          title="создать плейлист"
        >
          <Icon name="plus" size={18} />
        </button>

        <div className="w-full h-px bg-border-subtle my-1" />

        <button
          onClick={() => {
            setSelectedView('favorites');
            setSelectedPlaylist(null);
          }}
          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 ${
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
            setSelectedPlaylist(null);
          }}
          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 ${
            selectedView === 'history'
              ? 'bg-bg-secondary text-text-secondary'
              : 'text-text-tertiary hover:bg-bg-secondary hover:text-text-primary'
          }`}
          title="история"
        >
          <Icon name="history" size={18} />
        </button>

        <div className="w-full h-px bg-border-subtle my-1" />

        <div className="flex-1 overflow-y-auto space-y-1 w-full overflow-x-hidden scrollbar-thin">
          {playlists.map((playlist) => (
            <div key={playlist.id} className="group relative flex justify-center">
              <button
                onClick={() => handleSelectPlaylist(playlist)}
                className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 ${
                  selectedView === 'playlist' && selectedPlaylist?.id === playlist.id
                    ? 'bg-bg-secondary text-text-secondary'
                    : 'text-text-tertiary hover:bg-bg-secondary hover:text-text-primary'
                }`}
                title={playlist.name}
              >
                <Icon name="folder" size={18} />
              </button>
              <button
                onClick={() => {
                  setSelectedPlaylist(playlist);
                  setShowPlaylistMenu(true);
                }}
                className="absolute -right-1 top-1/2 -translate-y-1/2 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-bg-secondary transition-all"
              >
                <Icon name="more-vertical" size={12} className="text-text-tertiary" />
              </button>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-bg-primary">
        <div className="flex-shrink-0 border-b border-border-subtle bg-bg-primary p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-bg-secondary flex items-center justify-center shadow-lg flex-shrink-0">
                <Icon name={getCurrentIcon()} size={32} className={getIconColor()} />
              </div>
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

        <div className="flex-1 overflow-y-auto p-6">
          <TrackList tracks={getCurrentTracks()} showQueueButton />
        </div>
      </main>

      {showCreateModal && (
        <div
          className="fixed inset-0 bg-bg-primary/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-bg-card rounded-xl p-6 w-96 border border-border-subtle shadow-2xl"
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
        </div>
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