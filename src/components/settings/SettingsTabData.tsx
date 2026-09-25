import { useState } from 'react';
import { Icon } from '@components/ui/Icon';
import { ConfirmModal } from '../ui/ConfirmModal';
import { useStore } from '@store/store';

export function SettingsTabData() {
  const clearHistory = useStore((s) => s.clearHistory);
  const clearFavorites = useStore((s) => s.clearFavorites);
  const showToast = useStore((s) => s.showToast);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);
  const [showClearFavoritesConfirm, setShowClearFavoritesConfirm] = useState(false);

  const handleClearCache = () => {
    localStorage.removeItem('aether-storage');

    useStore.setState({
      library: {
        favorites: [],
        history: [],
        playlists: [],
        currentPlaylist: null,
      },
    });

    showToast('кеш очищен', 'success');
  };

  const handleClearHistory = () => {
    clearHistory();
    showToast('история очищена', 'success');
  };

  const handleClearFavorites = () => {
    clearFavorites();
    showToast('избранное очищено', 'success');
  };

  return (
    <>
      <div className="bg-bg-primary rounded-2xl border border-border-subtle overflow-hidden">
        <div className="divide-y divide-border-subtle">
          <button
            onClick={() => setShowClearHistoryConfirm(true)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-secondary transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-bg-secondary flex items-center justify-center">
                <Icon name="history" size={16} className="text-text-secondary" />
              </div>
              <div className="text-left">
                <p className="text-sm text-text-primary">очистить историю</p>
                <p className="text-xs text-text-tertiary">удалить все треки из истории</p>
              </div>
            </div>
            <Icon name="chevron-right" size={16} className="text-text-tertiary group-hover:text-text-secondary transition-colors" />
          </button>

          <button
            onClick={() => setShowClearFavoritesConfirm(true)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-secondary transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-bg-secondary flex items-center justify-center">
                <Icon name="heart" size={16} className="text-text-secondary" />
              </div>
              <div className="text-left">
                <p className="text-sm text-text-primary">очистить избранное</p>
                <p className="text-xs text-text-tertiary">удалить все треки из избранного</p>
              </div>
            </div>
            <Icon name="chevron-right" size={16} className="text-text-tertiary group-hover:text-text-secondary transition-colors" />
          </button>

          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-secondary transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-bg-secondary flex items-center justify-center">
                <Icon name="trash-2" size={16} className="text-text-secondary" />
              </div>
              <div className="text-left">
                <p className="text-sm text-text-primary">полная очистка кеша</p>
                <p className="text-xs text-text-tertiary">очистить историю, избранное и плейлисты</p>
              </div>
            </div>
            <Icon name="chevron-right" size={16} className="text-text-tertiary group-hover:text-text-secondary transition-colors" />
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showClearConfirm}
        title="очистка кеша"
        message="вы уверены, что хотите полностью очистить кеш? будут удалены история, избранное и все плейлисты. настройки громкости сохранятся."
        confirmText="очистить"
        onConfirm={() => {
          setShowClearConfirm(false);
          handleClearCache();
        }}
        onCancel={() => setShowClearConfirm(false)}
      />

      <ConfirmModal
        isOpen={showClearHistoryConfirm}
        title="очистка истории"
        message="вы уверены, что хотите очистить историю прослушиваний?"
        confirmText="очистить"
        onConfirm={() => {
          setShowClearHistoryConfirm(false);
          handleClearHistory();
        }}
        onCancel={() => setShowClearHistoryConfirm(false)}
      />

      <ConfirmModal
        isOpen={showClearFavoritesConfirm}
        title="очистка избранного"
        message="вы уверены, что хотите очистить избранное?"
        confirmText="очистить"
        onConfirm={() => {
          setShowClearFavoritesConfirm(false);
          handleClearFavorites();
        }}
        onCancel={() => setShowClearFavoritesConfirm(false)}
      />
    </>
  );
}