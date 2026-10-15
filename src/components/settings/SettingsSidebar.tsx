import { Icon } from '@components/ui/Icon';

export type SettingsTab = 'data' | 'appearance' | 'proxy' | 'binds' | 'about';

interface Props {
  activeTab: SettingsTab;
  zapretRunning: boolean;
  onChange: (tab: SettingsTab) => void;
}

const TABS: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'data', label: 'данные', icon: 'database' },
  { id: 'appearance', label: 'внешний вид', icon: 'palette' },
  { id: 'binds', label: 'бинды', icon: 'command' },
  { id: 'proxy', label: 'прокси', icon: 'shield' },
  { id: 'about', label: 'о приложении', icon: 'info' },
];

export function SettingsSidebar({ activeTab, zapretRunning, onChange }: Props) {
  return (
    <aside className="w-48 flex-shrink-0 border-r border-border-subtle bg-bg-primary/40 p-4">
      <div className="space-y-1">
        {TABS.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const isProxyTab = tab.id === 'proxy';
          const showIndicator = isProxyTab && zapretRunning;

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm overflow-hidden transition-all duration-200 active:scale-[0.98] ${
                isActive
                  ? 'text-[var(--accent-primary)]'
                  : 'text-text-tertiary hover:text-text-primary'
              }`}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              {/* подсветка снизу вверх */}
              <span
                className={`absolute inset-0 bg-[var(--accent-muted)] origin-bottom transition-transform duration-300 ease-out rounded-xl ${
                  isActive ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100'
                }`}
              />

              {/* левая accent полоска для активной */}
              <span
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-[var(--accent-primary)] transition-all duration-300 ${
                  isActive ? 'h-6 opacity-100' : 'h-0 opacity-0'
                }`}
              />

              <span className="relative z-10 w-4 h-4 flex-shrink-0 flex items-center justify-center">
                <Icon
                  name={tab.icon}
                  size={16}
                  className="transition-transform duration-150 group-active:scale-90"
                />
              </span>

              <span className="relative z-10 flex-1 text-left truncate leading-normal">
                {tab.label}
              </span>

              {showIndicator && (
                <span className="relative z-10 flex-shrink-0">
                  <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-60" />
                  <span className="relative block w-1.5 h-1.5 rounded-full bg-green-500" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}