import { useState, useEffect, useMemo, useRef } from 'react';import { CreatePlaylistModal } from '@components/library/CreatePlaylistModal';
import { LibrarySidebar } from '@components/library/LibrarySidebar';
import { LibraryHeader } from '@components/library/LibraryHeader';
import { TrackList } from '@components/track/TrackList';
import { ConfirmModal } from '@components/ui/ConfirmModal';
import { useStore } from '@store/store';
import type { Playlist, Track } from '@store/types';

type LibraryView = 'favorites' | 'history' | 'playlist';

const MAX_PLAYLIST_NAME_LENGTH = 16;

export default function LibraryPage() {
  const tracksScrollRef = useRef<HTMLDivElement>(null);
  const favorites = useStore((s) => s.library.favorites);
  const history = useStore((s) => s.library.history);
  const playlists = useStore((s) => s.library.playlists);
  const createPlaylist = useStore((s) => s.createPlaylist);
  const deletePlaylist = useStore((s) => s.deletePlaylist);
  const updatePlaylist = useStore((s) => s.updatePlaylist);
  const removeFromPlaylist = useStore((s) => s.removeFromPlaylist);
  const clearFavorites = useStore((s) => s.clearFavorites);
  const clearHistory = useStore((s) => s.clearHistory);

  const [selectedView, setSelectedView] = useState<LibraryView>('favorites');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | number | null>(null);
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

  const view = useMemo(() => {
    if (selectedView === 'favorites') {
      return {
        tracks: favorites,
        title: 'избранное',
        icon: 'heart',
        count: favorites.length,
      };
    }
    if (selectedView === 'history') {
      return {
        tracks: history,
        title: 'история',
        icon: 'history',
        count: history.length,
      };
    }
    if (selectedView === 'playlist' && selectedPlaylist) {
      return {
        tracks: selectedPlaylist.tracks || [],
        title: selectedPlaylist.name,
        icon: 'folder',
        count: selectedPlaylist.tracks?.length || 0,
      };
    }
    return {
      tracks: [] as Track[],
      title: '',
      icon: 'music',
      count: 0,
    };
  }, [selectedView, selectedPlaylist, favorites, history]);

  const handleCreatePlaylist = (name: string) => {
    if (name.length > MAX_PLAYLIST_NAME_LENGTH) return;
    createPlaylist(name);
    setShowCreateModal(false);
  };

  const handleDeletePlaylist = (id: string | number) => {
    deletePlaylist(id);
    if (selectedPlaylistId === id) {
      setSelectedPlaylistId(null);
      setSelectedView('favorites');
    }
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
    if (editingName.length > MAX_PLAYLIST_NAME_LENGTH) return;

    updatePlaylist(selectedPlaylist.id, editingName.trim());
    setIsEditing(false);
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
  };

  return (
    <div className="flex-1 min-h-0 flex gap-2">
      <LibrarySidebar
        selectedView={selectedView}
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

      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <LibraryHeader
          selectedView={selectedView}
          selectedPlaylist={selectedPlaylist}
          title={view.title}
          count={view.count}
          icon={view.icon}
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

        <div ref={tracksScrollRef} className="p-1 flex-1 min-h-0 overflow-auto scrollbar-hidden overscroll-contain">
          <TrackList
            key={selectedView === 'playlist' ? `playlist-${selectedPlaylistId}` : selectedView}
            tracks={view.tracks}
            virtualize
            scrollRef={tracksScrollRef}
            showQueueButton
            onRemove={
              selectedView === 'playlist' && selectedPlaylistId
                ? (track) => removeFromPlaylist(selectedPlaylistId, track.id)
                : undefined
            }
          />
        </div>
      </div>

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