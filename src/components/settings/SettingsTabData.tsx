import { useState } from 'react';
import { Icon } from '@components/ui/Icon';
import { open } from '@tauri-apps/plugin-dialog';
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
  const favorites = useStore((s) => s.library.favorites);
  const history = useStore((s) => s.library.history);
  const playlists = useStore((s) => s.library.playlists);
  const searchHistory = useStore((s) => s.searchHistory);

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

  const handleOpenStorage = async () => {
    try {
      await open({ directory: true, title: 'папка aether' });
    } catch {}
  };

  return (
    <div className="space-y-4">
      {/* статистика */}
      <div className="bg-bg-primary/40 rounded-2xl border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <p className="text-sm text-text-primary">ваша статистика</p>
          <p className="text-xs text-text-tertiary mt-0.5">локально на этом устройстве</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border-subtle">
          <div className="p-4 text-center">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--accent-muted)] mx-auto mb-2">
              <Icon name="heart" size={14} className="text-[var(--accent-primary)]" />
            </div>
            <p className="text-xl font-bold text-text-primary tabular-nums">{favorites.length}</p>
            <p className="text-[10px] text-text-tertiary uppercase tracking-wider mt-1">избранное</p>
          </div>
          <div className="p-4 text-center">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--accent-muted)] mx-auto mb-2">
              <Icon name="history" size={14} className="text-[var(--accent-primary)]" />
            </div>
            <p className="text-xl font-bold text-text-primary tabular-nums">{history.length}</p>
            <p className="text-[10px] text-text-tertiary uppercase tracking-wider mt-1">в истории</p>
          </div>
          <div className="p-4 text-center">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--accent-muted)] mx-auto mb-2">
              <Icon name="folder" size={14} className="text-[var(--accent-primary)]" />
            </div>
            <p className="text-xl font-bold text-text-primary tabular-nums">{playlists.length}</p>
            <p className="text-[10px] text-text-tertiary uppercase tracking-wider mt-1">плейлистов</p>
          </div>
        </div>
      </div>

      {/* очистка данных */}
      <div className="bg-bg-primary/40 rounded-2xl border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
            <Icon name="trash-2" size={16} />
          </div>
          <div>
            <p className="text-sm text-text-primary">очистка данных</p>
            <p className="text-xs text-text-tertiary">удаляет сохранённые записи</p>
          </div>
        </div>

        <div className="divide-y divide-border-subtle">
          <button
            onClick={() => setConfirm('history')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center transition-all duration-200 group-hover:bg-[var(--accent-muted)]">
                <Icon name="history" size={16} className=" transition-colors duration-200 group-hover:text-[var(--accent-primary)]" />
              </div>
              <div className="text-left">
                <p className="text-sm text-text-primary">очистить историю</p>
                <p className="text-xs text-text-tertiary">{history.length} треков в истории</p>
              </div>
            </div>
            <Icon
              name="chevron-right"
              size={16}
              className=" group-hover:text-[var(--accent-primary)] group-hover:translate-x-0.5 transition-all duration-200"
            />
          </button>

          <button
            onClick={() => setConfirm('favorites')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center transition-all duration-200 group-hover:bg-[var(--accent-muted)]">
                <Icon name="heart" size={16} className=" transition-colors duration-200 group-hover:text-[var(--accent-primary)]" />
              </div>
              <div className="text-left">
                <p className="text-sm text-text-primary">очистить избранное</p>
                <p className="text-xs text-text-tertiary">{favorites.length} треков в избранном</p>
              </div>
            </div>
            <Icon
              name="chevron-right"
              size={16}
              className=" group-hover:text-[var(--accent-primary)] group-hover:translate-x-0.5 transition-all duration-200"
            />
          </button>

          <button
            onClick={() => setConfirm('cache')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-red-500/[0.04] transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center transition-all duration-200 group-hover:bg-red-500/20">
                <Icon name="trash-2" size={16} className="text-red-400" />
              </div>
              <div className="text-left">
                <p className="text-sm text-text-primary">полная очистка кеша</p>
                <p className="text-xs text-text-tertiary">история, избранное, плейлисты</p>
              </div>
            </div>
            <Icon
              name="chevron-right"
              size={16}
              className=" group-hover:text-red-400 group-hover:translate-x-0.5 transition-all duration-200"
            />
          </button>
        </div>
      </div>

      {/* хранилище */}
      <div className="bg-bg-primary/40 rounded-2xl border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
            <Icon name="database" size={16} />
          </div>
          <div>
            <p className="text-sm text-text-primary">хранилище данных</p>
            <p className="text-xs text-text-tertiary">настройки сохраняются локально</p>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02]">
            <Icon name="folder" size={14} className=" flex-shrink-0" />
            <code className="text-xs text-text-secondary font-mono flex-1 truncate">
              %LOCALAPPDATA%\com.aether.desktop\
            </code>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02]">
              <Icon name="search" size={14} className=" flex-shrink-0" />
              <span className="text-xs text-text-tertiary">
                поиск: <span className="text-text-secondary tabular-nums">{searchHistory.length}</span> запросов
              </span>
            </div>
          </div>
          <button
            onClick={handleOpenStorage}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs bg-white/[0.04] text-text-secondary hover:bg-[var(--accent-muted)] hover:text-[var(--accent-primary)] transition-all duration-200"
          >
            <Icon name="external-link" size={12} />
            открыть папку данных
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
    </div>
  );
}