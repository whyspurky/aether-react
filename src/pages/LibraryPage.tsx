import { useState, useEffect } from 'react';
import { CreatePlaylistModal } from '@components/library/CreatePlaylistModal';
import { LibrarySidebar } from '@components/library/LibrarySidebar';
import { LibraryHeader } from '@components/library/LibraryHeader';
import { TrackList } from '@components/track/TrackList';
import { useAddToPlaylist } from '@components/playlist/AddToPlaylistProvider';
import { ConfirmModal } from '@components/ui/ConfirmModal';
import { useStore } from '@store/store';
import type { Playlist } from '@store/types';
import { useSmoothScroll } from '@hooks/ui/useSmoothScroll';

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
 
  const [selectedView, setSelectedView] = useState<LibraryView>('favorites');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const selectedPlaylist = useStore((s) =>
    selectedPlaylistId ? s.library.playlists.find((p) => p.id === selectedPlaylistId) ?? null : null
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
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


  const handleCreatePlaylist = (name: string) => {
    if (!validatePlaylistName(name)) return;
    createPlaylist(name);
    setShowCreateModal(false);
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
      <LibrarySidebar
        selectedView={selectedView}
        selectedPlaylistId={selectedPlaylistId}
        playlists={playlists}
        onSelectFavorites={() => {
          setSelectedView('favorites');
          setSelectedPlaylistId(null);
        }}
        onSelectHistory={() => {
          setSelectedView('history');
          setSelectedPlaylistId(null);
        }}
        onSelectPlaylist={handleSelectPlaylist}
        onCreateClick={() => setShowCreateModal(true)}
      />

      <main ref={tracksScrollRef} className="flex-1 h-full overflow-y-auto">
                <LibraryHeader
          selectedView={selectedView}
          selectedPlaylist={selectedPlaylist}
          title={getCurrentTitle()}
          count={getCurrentCount()}
          icon={getCurrentIcon()}
          iconColor={getIconColor()}
          maxNameLength={MAX_PLAYLIST_NAME_LENGTH}
          isEditing={isEditing}
          editingName={editingName}
          showPlaylistMenu={showPlaylistMenu}
          showSettingsMenu={showSettingsMenu}
          onEditNameChange={setEditingName}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
          onTogglePlaylistMenu={() => setShowPlaylistMenu((v) => !v)}
          onToggleSettingsMenu={() => setShowSettingsMenu((v) => !v)}
          onStartEdit={handleStartEdit}
          onDeletePlaylist={handleDeletePlaylist}
          onClearRequest={() => {
            setConfirmClear(selectedView === 'favorites' ? 'favorites' : 'history');
            setShowSettingsMenu(false);
          }}
        />

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

      <CreatePlaylistModal
        isOpen={showCreateModal}
        maxLength={MAX_PLAYLIST_NAME_LENGTH}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreatePlaylist}
      />

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