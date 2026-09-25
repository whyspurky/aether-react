import { Icon } from '@components/ui/Icon';

export type SettingsTab = 'data' | 'appearance' | 'proxy' | 'about';

interface Props {
  activeTab: SettingsTab;
  zapretRunning: boolean;
  onChange: (tab: SettingsTab) => void;
}

const TABS: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'data', label: 'данные', icon: 'database' },
  { id: 'appearance', label: 'внешний вид', icon: 'palette' },
  { id: 'proxy', label: 'прокси', icon: 'shield' },
  { id: 'about', label: 'о приложении', icon: 'info' },
];

export function SettingsSidebar({ activeTab, zapretRunning, onChange }: Props) {
  return (
    <aside className="w-48 flex-shrink-0 border-r border-border-subtle bg-bg-primary p-4">
      <div className="space-y-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const isProxyTab = tab.id === 'proxy';
          const showIndicator = isProxyTab && zapretRunning;

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm overflow-hidden transition-colors duration-200 ${
                isActive ? 'text-text-secondary' : 'text-text-tertiary hover:text-text-primary'
              }`}
            >
              <span
                className={`absolute inset-0 bg-bg-secondary origin-bottom transition-transform duration-300 ease-out ${
                  isActive ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100'
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
                <span className="relative z-10 w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}