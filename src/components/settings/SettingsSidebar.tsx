import { useEffect, useState } from 'react';
import { Icon } from '@components/ui/Icon';

export type SettingsTab = 'data' | 'audio' | 'appearance' | 'proxy' | 'binds' | 'about';
export type AudioSection = 'playback' | 'eq' | 'cache';

interface Props {
  activeTab: SettingsTab;
  audioSection: AudioSection;
  onAudioSectionChange: (section: AudioSection) => void;
  zapretRunning: boolean;
  onChange: (tab: SettingsTab) => void;
}

const TABS: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'data', label: 'данные', icon: 'database' },
  { id: 'audio', label: 'аудио', icon: 'audio-lines' },
  { id: 'appearance', label: 'внешний вид', icon: 'palette' },
  { id: 'binds', label: 'бинды', icon: 'command' },
  { id: 'proxy', label: 'прокси', icon: 'shield' },
  { id: 'about', label: 'о приложении', icon: 'info' },
];

const AUDIO_TABS: { id: AudioSection; label: string; icon: string }[] = [
  { id: 'playback', label: 'воспроизведение', icon: 'play' },
  { id: 'eq', label: 'эквалайзер', icon: 'audio-lines' },
  { id: 'cache', label: 'кэш', icon: 'database' },
];

export function SettingsSidebar({
  activeTab,
  audioSection,
  onAudioSectionChange,
  zapretRunning,
  onChange,
}: Props) {
  const [audioOpen, setAudioOpen] = useState(activeTab === 'audio');

  useEffect(() => {
    if (activeTab === 'audio') setAudioOpen(true);
  }, [activeTab]);

  return (
    <aside className="w-48 flex-shrink-0 border-r border-border-subtle bg-bg-primary/40 p-4">
      <div className="space-y-1">
        {TABS.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const isAudio = tab.id === 'audio';
          const isProxyTab = tab.id === 'proxy';
          const showIndicator = isProxyTab && zapretRunning;

          return (
            <div key={tab.id}>
              <button
                onClick={() => {
                  if (isAudio) {
                    setAudioOpen((open) => !open);
                    if (activeTab !== 'audio') onChange('audio');
                    return;
                  }
                  onChange(tab.id);
                }}
                aria-expanded={isAudio ? audioOpen : undefined}
                className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm transition-all duration-200 active:scale-[0.98] ${
                  isActive
                    ? 'text-[var(--accent-primary)]'
                    : 'text-text-tertiary hover:text-text-primary'
                }`}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <span
                  className={`absolute inset-0 origin-bottom rounded-xl bg-[var(--accent-muted)] transition-transform duration-300 ease-out ${
                    isActive ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100'
                  }`}
                />

                <span
                  className={`absolute left-0 top-1/2 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--accent-primary)] transition-all duration-300 ${
                    isActive ? 'h-6 opacity-100' : 'h-0 opacity-0'
                  }`}
                />

                <span className="relative z-10 flex h-4 w-4 flex-shrink-0 items-center justify-center">
                  <Icon
                    name={tab.icon}
                    size={16}
                    className="transition-transform duration-150 group-active:scale-90"
                  />
                </span>

                <span className="relative z-10 flex-1 truncate text-left leading-normal">
                  {tab.label}
                </span>

                {isAudio && (
                  <Icon
                    name="chevron-right"
                    size={14}
                    className={`relative z-10 flex-shrink-0 transition-transform duration-300 ${
                      audioOpen ? 'rotate-90' : ''
                    }`}
                  />
                )}

                {showIndicator && (
                  <span className="relative z-10 flex-shrink-0">
                    <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-60" />
                    <span className="relative block h-1.5 w-1.5 rounded-full bg-green-500" />
                  </span>
                )}
              </button>

              {isAudio && (
                <div
                  className={`grid transition-all duration-300 ease-out ${
                    audioOpen
                      ? 'mt-1 grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="ml-4 space-y-1 border-l border-border-subtle pl-2">
                      {AUDIO_TABS.map((sub) => {
                        const subActive = activeTab === 'audio' && audioSection === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => {
                              onChange('audio');
                              onAudioSectionChange(sub.id);
                            }}
                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-all duration-200 ${
                              subActive
                                ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                                : 'text-text-tertiary hover:bg-white/[0.04] hover:text-text-secondary'
                            }`}
                          >
                            <Icon name={sub.icon} size={13} className="flex-shrink-0" />
                            <span className="truncate">{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
