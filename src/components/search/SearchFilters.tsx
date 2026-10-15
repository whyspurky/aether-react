import { Icon } from '@components/ui/Icon';

export type FilterType = 'tracks' | 'artists' | 'playlists';

interface Props {
  filter: FilterType;
  onChange: (filter: FilterType) => void;
}

const FILTERS: { id: FilterType; label: string; icon: string }[] = [
  { id: 'tracks', label: 'треки', icon: 'music' },
  { id: 'artists', label: 'артисты', icon: 'mic' },
  { id: 'playlists', label: 'плейлисты', icon: 'folder' },
];

export function SearchFilters({ filter, onChange }: Props) {
  return (
    <div className="flex items-center justify-center mt-3">
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => onChange(f.id)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
              filter === f.id
                ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                : 'bg-white/[0.03] text-text-tertiary hover:bg-white/[0.06] hover:text-text-secondary'
            }`}
          >
            <Icon name={f.icon} size={14} />
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}