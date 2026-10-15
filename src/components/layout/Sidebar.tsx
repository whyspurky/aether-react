import { Icon } from '@components/ui/Icon';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'главная', icon: 'home', path: '/' },
  { id: 'search', label: 'поиск', icon: 'search', path: '/search' },
  { id: 'library', label: 'библиотека', icon: 'library', path: '/library' },
  { id: 'player', label: 'плеер', icon: 'play', path: '/player' },
];

const settingsItem: NavItem = { id: 'settings', label: 'настройки', icon: 'settings', path: '/settings' };

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  onNavigate: (path: string) => void;
}

function NavButton({ item, isActive, onNavigate }: NavButtonProps) {
  return (
    <button
      onClick={() => onNavigate(item.path)}
      className={`group relative w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden transition-all duration-200 active:scale-[0.92] ${
        isActive
          ? 'text-[var(--accent-primary)]'
          : 'text-text-tertiary hover:text-[var(--accent-primary)]'
      }`}
      aria-label={item.label}
    >
      {/* accent glow при активной */}
      <span
        className={`absolute inset-0 rounded-xl transition-all duration-300 ${
          isActive
            ? 'bg-[var(--accent-muted)] scale-100 opacity-100'
            : 'bg-[var(--accent-muted)] scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100'
        }`}
      />

      {/* левая accent полоска */}
      <span
        className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2px] rounded-r-full bg-[var(--accent-primary)] transition-all duration-300 ${
          isActive ? 'h-5 opacity-100' : 'h-0 opacity-0'
        }`}
      />

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
    <aside className="w-16 flex flex-col items-center pt-3 pb-4 gap-2 h-full bg-bg-secondary/30 backdrop-blur-xl">
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