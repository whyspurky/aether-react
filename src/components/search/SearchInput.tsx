import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@components/ui/Icon';
import { api } from '@lib/api';
import type { FilterType } from './SearchFilters';

const DEBOUNCE_MS = 200;
const MIN_QUERY_LENGTH = 2;
const CACHE_SIZE = 50;

interface Props {
  value: string;
  onChange: (value: string) => void;
  filter: FilterType;
  onFocusChange?: (focused: boolean) => void;
}

const cache = new Map<string, string[]>();
if (import.meta.hot) {
  import.meta.hot.dispose(() => cache.clear());
}

function matchesFilter(suggestion: string, filter: FilterType): boolean {
  if (filter !== 'artists') return true;
  return !suggestion.includes(' ') && !suggestion.includes(' - ');
}

export function SearchInput({ value, onChange, filter, onFocusChange }: Props) {
  const [topSuggestion, setTopSuggestion] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    onFocusChange?.(isFocused);
  }, [isFocused, onFocusChange]);

  const fetchSuggestions = useCallback(async (q: string): Promise<string[]> => {
    const cached = cache.get(q);
    if (cached) return cached;

    try {
      const list = await api.searchSuggestions(q, 10);
      if (cache.size >= CACHE_SIZE) {
        const firstKey = cache.keys().next().value;
        if (firstKey) cache.delete(firstKey);
      }
      cache.set(q, list);
      return list;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    setTopSuggestion(null);
    if (!isFocused || !value || value.trim().length < MIN_QUERY_LENGTH) return;

    const q = value.trim();
    const reqId = ++requestIdRef.current;

    const timer = setTimeout(async () => {
      const list = await fetchSuggestions(q);
      if (reqId !== requestIdRef.current) return;

      const lower = q.toLowerCase();
      const match = list.find(
        (s) =>
          s.toLowerCase().startsWith(lower) &&
          s.length > q.length &&
          matchesFilter(s, filter)
      );
      setTopSuggestion(match || null);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value, isFocused, filter, fetchSuggestions]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && topSuggestion) {
      e.preventDefault();
      onChange(topSuggestion);
      setTopSuggestion(null);
      return;
    }
    if (e.key === 'Escape') {
      if (value) {
        onChange('');
        setTopSuggestion(null);
        e.preventDefault();
        return;
      }
      setTopSuggestion(null);
      inputRef.current?.blur();
    }
  };

  const suffix =
    topSuggestion && topSuggestion.toLowerCase().startsWith(value.toLowerCase())
      ? topSuggestion.slice(value.length)
      : '';

  return (
    <div className="relative group">
      <Icon
        name="search"
        size={20}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-[var(--accent-primary)] transition-colors z-20 pointer-events-none"
      />
      <div
        className={`relative py-3.5 pl-12 pr-4 bg-white/[0.04] border border-border-subtle rounded-xl text-lg transition-all duration-200 ${
          isFocused ? 'border-border-visible bg-white/[0.07]' : ''
        }`}
      >
        <div className="flex items-center whitespace-pre overflow-hidden h-6 text-lg pointer-events-none">
          {!value ? (
            <span className="text-text-tertiary">исполнители, треки</span>
          ) : (
            <>
              <span className="text-text-primary">{value}</span>
              <span
                className={`transition-opacity duration-150 ${
                  suffix && isFocused ? 'opacity-70' : 'opacity-0'
                }`}
                style={{ color: 'var(--text-tertiary)' }}
              >
                {suffix}
              </span>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          data-search-input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          className="absolute inset-0 py-3.5 pl-12 pr-12 bg-transparent text-transparent caret-text-primary text-lg outline-none"
          autoFocus
        />
        {value && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange('');
              setTopSuggestion(null);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-white/[0.06] transition-all z-20"
            aria-label="очистить"
          >
            <Icon name="x" size={16} />
          </button>
        )}
      </div>
    </div>
  );
}