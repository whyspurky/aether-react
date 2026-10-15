import { Icon } from '@components/ui/Icon';

interface Props {
  items: string[];
  onSelect: (value: string) => void;
  onRemove: (value: string) => void;
}

export function SearchHistory({ items, onSelect, onRemove }: Props) {
  if (!items.length) return null;

  return (
    <div className="bg-bg-primary/95 backdrop-blur-2xl rounded-2xl border border-border-subtle shadow-2xl overflow-hidden">
      <div className="py-1 max-h-[360px] overflow-y-auto scrollbar-hidden">
        {items.map((item) => (
          <div
            key={item}
            className="group flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors cursor-pointer"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(item)}
          >
            <Icon name="search" size={16} className="text-text-tertiary flex-shrink-0" />
            <span className="flex-1 text-sm text-text-primary truncate">{item}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item);
              }}
              className="p-1 rounded-md text-text-tertiary opacity-0 group-hover:opacity-100 hover:text-text-primary hover:bg-white/[0.06] transition-all"
              aria-label="удалить"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}