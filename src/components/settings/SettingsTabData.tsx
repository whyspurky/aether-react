import { useState } from 'react';
import { Icon } from '@components/ui/Icon';
import { ConfirmModal } from '../ui/ConfirmModal';
import { useStore } from '@store/store';
import { clearTauriStorage } from '@lib/store/tauriStorage';

type ConfirmKind = 'cache' | 'history' | 'favorites';

const CONFIRM_MESSAGES: Record<ConfirmKind, { title: string; message: string }> = {
  cache: {
    title: 'очистка кеша',
    message: 'вы уверены, что хотите полностью очистить кеш? будут удалены история, избранное и все плейлисты. настройки громкости сохранятся.',
  },
  history: {
    title: 'очистка истории',
    message: 'вы уверены, что хотите очистить историю прослушиваний?',
  },
  favorites: {
    title: 'очистка избранного',
    message: 'вы уверены, что хотите очистить избранное?',
  },
};

export function SettingsTabData() {
  const clearHistory = useStore((s) => s.clearHistory);
  const clearFavorites = useStore((s) => s.clearFavorites);
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);

  const handleConfirm = async () => {
    if (confirm === 'cache') {
      useStore.setState({
        library: {
          favorites: [],
          history: [],
          playlists: [],
        },
      });
      await clearTauriStorage();
    } else if (confirm === 'history') {
      clearHistory();
    } else if (confirm === 'favorites') {
      clearFavorites();
    }
    setConfirm(null);
  };

  return (
    <>
      <div className="bg-bg-primary/40 rounded-2xl border border-border-subtle overflow-hidden">
              <div className="divide-y divide-border-subtle">
          <button
            onClick={() => setConfirm('history')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.04] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
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
            onClick={() => setConfirm('favorites')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.04] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
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
            onClick={() => setConfirm('cache')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.04] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
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
        isOpen={confirm !== null}
        title={confirm ? CONFIRM_MESSAGES[confirm].title : ''}
        message={confirm ? CONFIRM_MESSAGES[confirm].message : ''}
        confirmText="очистить"
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}