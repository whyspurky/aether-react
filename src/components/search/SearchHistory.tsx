import { Icon } from '@components/ui/Icon';

interface Props {
  items: string[];
  onSelect: (value: string) => void;
  onRemove: (value: string) => void;
  onClear?: () => void;
}

export function SearchHistory({ items, onSelect, onRemove, onClear }: Props) {
  if (!items.length) return null;

  return (
    // потолок 3 высоты инпута (52px), дальше список скроллится
    <div
      className="flex max-h-[156px] flex-col rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--bg-primary) 55%, transparent)',
        backdropFilter: 'blur(40px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-2 pb-1">
        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-text-tertiary">
          <Icon name="history" size={12} />
          недавние запросы
        </span>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="px-2 py-1 rounded-md text-[11px] text-text-tertiary hover:text-text-secondary hover:bg-white/[0.06] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_35%,transparent)]"
          >
            очистить
          </button>
        )}
      </div>

      <div className="min-h-0 py-1 overflow-y-auto scrollbar-hidden">
        {items.map((item) => (
          <div
            key={item}
            role="button"
            tabIndex={0}
            className="group flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.06] focus-visible:bg-white/[0.06] outline-none transition-colors cursor-pointer"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(item)}
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(item);
              }
            }}
          >
            <Icon name="search" size={16} className=" flex-shrink-0" />
            <span className="flex-1 text-sm text-text-primary truncate">{item}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item);
              }}
              className="p-1 rounded-md text-text-tertiary opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-text-primary hover:bg-white/[0.08] transition-all outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_35%,transparent)]"
              aria-label={`удалить запрос ${item}`}
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
