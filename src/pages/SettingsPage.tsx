import { useState } from 'react';
import { Icon } from '../components/Icon';
import { useStore } from '../store/store';
import { ConfirmModal } from '../components/Modals/ConfirmModal';
import { BrokenTracksModal } from '../components/Modals/BrokenTracksModal';

type SettingsTab = 'data' | 'appearance' | 'diagnostics' | 'about';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('data');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showBrokenModal, setShowBrokenModal] = useState(false);
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);
  const [showClearFavoritesConfirm, setShowClearFavoritesConfirm] = useState(false);

  const clearHistory = useStore((s) => s.clearHistory);
  const clearFavorites = useStore((s) => s.clearFavorites);
  const showToast = useStore((s) => s.showToast);

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

  const tabs = [
    { id: 'data', label: 'данные', icon: 'database' },
    { id: 'appearance', label: 'внешний вид', icon: 'palette' },
    { id: 'diagnostics', label: 'диагностика', icon: 'bug' },
    { id: 'about', label: 'о приложении', icon: 'info' },
  ];

  return (
    <div className="h-full flex bg-bg-primary rounded-2xl overflow-hidden border border-border-subtle">
      <aside className="w-48 flex-shrink-0 border-r border-border-subtle bg-bg-primary p-4">
        <div className="space-y-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors duration-150 ${
                  isActive
                    ? 'bg-bg-secondary text-text-secondary'
                    : 'text-text-tertiary hover:bg-bg-secondary hover:text-text-primary'
                }`}
              >
                <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                  <Icon name={tab.icon} size={16} />
                </span>
                <span className="flex-1 text-left truncate leading-normal">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          {activeTab === 'data' && (
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
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div className="bg-bg-primary rounded-2xl border border-border-subtle overflow-hidden">
                <div className="px-5 py-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-bg-secondary flex items-center justify-center">
                      <Icon name="palette" size={16} className="text-text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm text-text-primary">тема оформления</p>
                      <p className="text-xs text-text-tertiary">AMOLED · минимализм</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="w-2 h-2 rounded-full bg-text-secondary" />
                    <p className="text-sm text-text-secondary">
                      AMOLED — максимально черный фон, серый акцент
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-bg-primary rounded-2xl border border-border-subtle overflow-hidden">
                <div className="px-5 py-4">
                  <p className="text-xs text-text-tertiary mb-3">цветовая палитра</p>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <div className="w-full aspect-square rounded-xl bg-bg-primary border border-border-subtle" />
                      <p className="text-xs text-text-tertiary mt-1.5 text-center">фон</p>
                    </div>
                    <div>
                      <div className="w-full aspect-square rounded-xl bg-bg-secondary border border-border-subtle" />
                      <p className="text-xs text-text-tertiary mt-1.5 text-center">карточки</p>
                    </div>
                    <div>
                      <div className="w-full aspect-square rounded-xl bg-text-secondary" />
                      <p className="text-xs text-text-tertiary mt-1.5 text-center">акцент</p>
                    </div>
                    <div>
                      <div className="w-full aspect-square rounded-xl bg-text-primary" />
                      <p className="text-xs text-text-tertiary mt-1.5 text-center">текст</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'diagnostics' && (
            <div className="bg-bg-primary rounded-2xl border border-border-subtle overflow-hidden">
              <div className="divide-y divide-border-subtle">
                <button
                  onClick={() => setShowBrokenModal(true)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-secondary transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-bg-secondary flex items-center justify-center">
                      <Icon name="alert-circle" size={16} className="text-text-secondary" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-text-primary">битые треки</p>
                      <p className="text-xs text-text-tertiary">список треков, которые не воспроизвелись</p>
                    </div>
                  </div>
                  <Icon name="chevron-right" size={16} className="text-text-tertiary group-hover:text-text-secondary transition-colors" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="bg-bg-primary rounded-2xl border border-border-subtle overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-bg-secondary flex items-center justify-center border border-border-subtle">
                    <span className="text-text-secondary text-lg font-bold">a</span>
                  </div>
                  <div>
                    <p className="text-base font-medium text-text-primary">aether</p>
                    <p className="text-xs text-text-tertiary">версия 2.0.0</p>
                  </div>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  десктопный музыкальный плеер с интеграцией soundcloud
                </p>
                <div className="mt-4 pt-4 border-t border-border-subtle">
                  <p className="text-xs text-text-tertiary">© 2026 aether</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

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

      <BrokenTracksModal
        isOpen={showBrokenModal}
        onClose={() => setShowBrokenModal(false)}
      />
    </div>
  );
}