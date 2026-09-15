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
      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative ${
        isActive
          ? 'bg-bg-card text-text-secondary'
          : 'text-text-tertiary hover:bg-bg-card hover:text-text-secondary'
      }`}
      title={item.label}
    >
      <Icon name={item.icon} size={20} />
      {isActive && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-5 bg-text-secondary rounded-r" />
      )}
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