import { Icon } from './Icon';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

const navItems = [
  { id: 'home', label: 'главная', icon: 'home', path: '/' },
  { id: 'search', label: 'поиск', icon: 'search', path: '/search' },
  { id: 'library', label: 'библиотека', icon: 'library', path: '/library' },
  { id: 'player', label: 'плеер', icon: 'play', path: '/player' },
];

const settingsItem = { id: 'settings', label: 'настройки', icon: 'settings', path: '/settings' };

interface NavButtonProps {
  item: typeof navItems[number];
  isActive: boolean;
  onNavigate: (path: string) => void;
}

function NavButton({ item, isActive, onNavigate }: NavButtonProps) {
  return (
    <button
      onClick={() => onNavigate(item.path)}
      className={`group relative w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden transition-colors duration-300 ${
        isActive ? 'text-text-secondary' : 'text-text-tertiary hover:text-text-secondary'
      }`}
      title={item.label}
    >
      {/* подсветка снизу вверх */}
      <span
        className={`absolute inset-0 bg-bg-card origin-bottom transition-transform duration-300 ease-out ${
          isActive ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100'
        }`}
      />

      {/* иконка поверх подсветки */}
      <Icon
        name={item.icon}
        size={20}
        className="relative z-10 transition-transform duration-150 group-active:scale-90"
      />
    </button>
  );
}

export function Sidebar({ currentPath, onNavigate }: SidebarProps) {
  return (
    <aside className="w-16 flex flex-col items-center pt-3 pb-4 gap-2 h-full">
      {navItems.map((item) => (
        <NavButton
          key={item.id}
          item={item}
          isActive={currentPath === item.path}
          onNavigate={onNavigate}
        />
      ))}

      <div className="flex-1" />

      <NavButton
        item={settingsItem}
        isActive={currentPath === settingsItem.path}
        onNavigate={onNavigate}
      />
    </aside>
  );
}