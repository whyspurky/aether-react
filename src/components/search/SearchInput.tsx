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

  const clear = () => {
    onChange('');
    setTopSuggestion(null);
    inputRef.current?.focus();
  };

  const acceptSuggestion = () => {
    if (!topSuggestion) return;
    onChange(topSuggestion);
    setTopSuggestion(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && topSuggestion) {
      e.preventDefault();
      acceptSuggestion();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (value) {
        onChange('');
        setTopSuggestion(null);
        return;
      }
      setTopSuggestion(null);
      inputRef.current?.blur();
      return;
    }
    if (e.key === 'Enter') {
      setTopSuggestion(null);
      inputRef.current?.blur();
    }
  };

  const suffix =
    topSuggestion && topSuggestion.toLowerCase().startsWith(value.toLowerCase())
      ? topSuggestion.slice(value.length)
      : '';
  const showHint = isFocused && !!suffix;

  return (
    <div className="relative group">
      <Icon
        name="search"
        size={20}
        className={`absolute left-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none transition-colors duration-200 ${
          isFocused ? 'text-[var(--accent-primary)]' : 'text-text-tertiary'
        }`}
      />

      <div
        className={`relative rounded-2xl border transition-all duration-200 ${
          isFocused
            ? 'border-[color-mix(in_srgb,var(--accent-primary)_40%,transparent)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent-primary)_10%,transparent)]'
            : 'border-white/[0.06] hover:border-white/[0.12]'
        }`}
        style={{
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          data-search-input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="поиск треков, артистов, плейлистов"
          aria-label="поиск"
          autoFocus
          autoComplete="off"
          spellCheck={false}
          className={`w-full h-[52px] pl-12 bg-transparent text-lg text-text-primary placeholder:text-text-tertiary outline-none ${
            showHint ? 'pr-48' : 'pr-14'
          }`}
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5">
          {showHint && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={acceptSuggestion}
              aria-label={`дополнить запрос: ${topSuggestion}`}
              className="flex items-center gap-1.5 max-w-[120px] pl-2 pr-1.5 py-1 rounded-lg text-xs text-text-tertiary border border-white/[0.08] bg-white/[0.04] hover:text-text-secondary hover:border-white/[0.16] transition-colors duration-150"
            >
              <span className="truncate">{suffix}</span>
              <kbd className="px-1 py-0.5 rounded border border-white/[0.1] text-[10px] uppercase leading-none shrink-0">
                tab
              </kbd>
            </button>
          )}

          {value && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={clear}
              aria-label="очистить запрос"
              className="p-1.5 rounded-lg text-text-tertiary hover:text-[var(--accent-primary)] hover:bg-[var(--accent-muted)] transition-all duration-200"
            >
              <Icon name="x" size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
