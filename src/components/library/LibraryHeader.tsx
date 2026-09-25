import { Icon } from '@components/ui/Icon';
import type { Playlist } from '@store/types';

type LibraryView = 'favorites' | 'history' | 'playlist';

interface Props {
  selectedView: LibraryView;
  selectedPlaylist: Playlist | null;
  title: string;
  count: number;
  icon: string;
  iconColor: string;
  maxNameLength: number;
  isEditing: boolean;
  editingName: string;
  showPlaylistMenu: boolean;
  showSettingsMenu: boolean;
  onEditNameChange: (name: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onTogglePlaylistMenu: () => void;
  onToggleSettingsMenu: () => void;
  onStartEdit: () => void;
  onDeletePlaylist: (id: string) => void;
  onClearRequest: () => void;
}

export function LibraryHeader({
  selectedView,
  selectedPlaylist,
  title,
  count,
  icon,
  iconColor,
  maxNameLength,
  isEditing,
  editingName,
  showPlaylistMenu,
  showSettingsMenu,
  onEditNameChange,
  onSaveEdit,
  onCancelEdit,
  onTogglePlaylistMenu,
  onToggleSettingsMenu,
  onStartEdit,
  onDeletePlaylist,
  onClearRequest,
}: Props) {
  const currentCover =
    selectedView === 'playlist' && selectedPlaylist
      ? (selectedPlaylist.artwork_url || selectedPlaylist.tracks[0]?.artwork_url || null)
      : null;

  const coverUrl = currentCover?.replace(
    /-(large|t\d+x\d+|original|crop|mini|tiny|small|badge)$/,
    '-t500x500'
  );

  return (
    <div className="sticky top-0 z-20 mx-3 mt-3 rounded-xl border border-white/[0.06] bg-bg-secondary/60 backdrop-blur-2xl p-5 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-bg-secondary flex items-center justify-center shadow-lg flex-shrink-0 overflow-hidden">
            {coverUrl ? (
              <img src={coverUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Icon name={icon} size={32} className={iconColor} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4">
              {isEditing && selectedView === 'playlist' ? (
                <>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => onEditNameChange(e.target.value)}
                    className="text-2xl font-bold bg-transparent focus:outline-none px-0 text-text-primary flex-1 min-w-0"
                    autoFocus
                    maxLength={maxNameLength}
                    onKeyDown={(e) => e.key === 'Enter' && onSaveEdit()}
                  />
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={onSaveEdit}
                      className="p-1.5 rounded-lg text-text-secondary hover:bg-bg-secondary transition"
                      title="сохранить"
                    >
                      <Icon name="check" size={20} />
                    </button>
                    <button
                      onClick={onCancelEdit}
                      className="p-1.5 rounded-lg text-text-tertiary hover:bg-bg-secondary transition"
                      title="отмена"
                    >
                      <Icon name="x" size={20} />
                    </button>
                  </div>
                </>
              ) : (
                <h1 className="text-2xl font-bold text-text-primary truncate flex-1 min-w-0">{title}</h1>
              )}
            </div>
            <p className="text-sm text-text-tertiary mt-1">{count} треков</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {selectedView === 'playlist' && selectedPlaylist && (
            <div className="relative">
              <button
                onClick={onTogglePlaylistMenu}
                className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-bg-secondary transition-all"
              >
                <Icon name="ellipsis-vertical" size={22} className="text-text-tertiary" />
              </button>
              {showPlaylistMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-bg-card rounded-lg shadow-xl border border-border-subtle overflow-hidden z-20">
                  <button
                    onClick={onStartEdit}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary transition"
                  >
                    <Icon name="pencil" size={14} />
                    переименовать
                  </button>
                  <button
                    onClick={() => onDeletePlaylist(selectedPlaylist.id)}
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
                onClick={onToggleSettingsMenu}
                className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-bg-secondary transition-all"
              >
                <Icon name="ellipsis-vertical" size={22} className="text-text-tertiary" />
              </button>
              {showSettingsMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-bg-card rounded-lg shadow-xl border border-border-subtle overflow-hidden z-20">
                  <button
                    onClick={onClearRequest}
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
  );
}