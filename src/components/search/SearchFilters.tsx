import { Icon } from '@components/ui/Icon';

export type FilterType = 'tracks' | 'artists' | 'playlists';

interface Props {
  filter: FilterType;
  onChange: (filter: FilterType) => void;
  canPlayAll: boolean;
  onPlayAll: () => void;
}

const FILTERS: { id: FilterType; label: string; icon: string }[] = [
  { id: 'tracks', label: 'треки', icon: 'music' },
  { id: 'artists', label: 'артисты', icon: 'mic' },
  { id: 'playlists', label: 'плейлисты', icon: 'folder' },
];

export function SearchFilters({ filter, onChange, canPlayAll, onPlayAll }: Props) {
  return (
    <div className="flex items-center justify-between mt-3">
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => onChange(f.id)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
              filter === f.id
                ? 'bg-bg-secondary text-text-primary'
                : 'bg-bg-card text-text-tertiary hover:bg-bg-secondary hover:text-text-secondary'
            }`}
          >
            <Icon name={f.icon} size={14} />
            {f.label}
          </button>
        ))}
      </div>

      {filter === 'tracks' && canPlayAll && (
        <button
          onClick={onPlayAll}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium bg-bg-secondary text-text-primary hover:bg-text-secondary hover:text-bg-primary transition-all duration-200"
        >
          <Icon name="play" size={14} />
          слушать всё
        </button>
      )}
    </div>
  );
}