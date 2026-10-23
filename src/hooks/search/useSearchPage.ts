import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@lib/api';
import { useStore } from '@store/store';
import type { FilterType } from '@components/search/SearchFilters';
import type { Playlist, Track, User } from '@store/types';

const DEBOUNCE_MS = 250;
const OBSERVER_MARGIN = '0px 0px 600px 0px';

const PER_PAGE: Record<FilterType, number> = {
  tracks: 20,
  artists: 30,
  playlists: 20,
};

type ResultItem = Track | User | Playlist;
type SearchMode = 'reset' | 'more';

function fetchPage(
  tab: FilterType,
  query: string,
  offset: number,
  perPage: number
): Promise<ResultItem[]> {
  if (tab === 'tracks') {
    return api.searchTracks(query, perPage, offset).then((list) => list.filter((t) => t?.id));
  }
  if (tab === 'artists') {
    return api.searchUsers(query, offset, perPage);
  }
  return api.searchPlaylists(query, perPage, offset);
}

// склеивает страницы без дублей, soundcloud иногда отдаёт повторы между offset
function mergeUnique(prev: ResultItem[], fresh: ResultItem[]) {
  const seen = new Set(prev.map((item) => String(item?.id)));
  const items = [...prev];
  let added = 0;

  for (const item of fresh) {
    const id = item?.id;
    if (id === undefined || id === null) continue;
    const key = String(id);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
    added += 1;
  }

  return { items, added };
}

export function useSearchPage() {
  const setSearchPage = useStore((s) => s.setSearchPage);
  const setSearchCache = useStore((s) => s.setSearchCache);
  const resetSearchPage = useStore((s) => s.resetSearchPage);
  const addSearchHistory = useStore((s) => s.addSearchHistory);

  const storeQuery = useStore((s) => s.searchPage.query);
  const storeFilter = useStore((s) => s.searchPage.filter);
  const tracks = useStore((s) => s.searchPage.cache.tracks.items) as Track[];
  const artists = useStore((s) => s.searchPage.cache.artists.items) as User[];
  const playlists = useStore((s) => s.searchPage.cache.playlists.items) as Playlist[];

  const [query, setQueryState] = useState(storeQuery);
  const [filter, setFilterState] = useState<FilterType>(storeFilter);
  const [debouncedQuery, setDebouncedQuery] = useState(storeQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const moreLoadingRef = useRef(false);

  const search = useCallback(
    async (q: string, tab: FilterType, offset: number, mode: SearchMode) => {
      const text = q.trim();
      if (!text) return;
      if (mode === 'more' && moreLoadingRef.current) return;
      if (mode === 'more' && !useStore.getState().searchPage.cache[tab].hasMore) return;

      const reqId = ++requestIdRef.current;
      if (mode === 'more') moreLoadingRef.current = true;
      setIsLoading(true);
      setError(null);

      if (mode === 'reset') {
        setSearchCache(tab, {
          items: [],
          offset: 0,
          hasMore: true,
          loaded: false,
          query: text,
        });
      }

      try {
        const perPage = PER_PAGE[tab];
        const fresh = await fetchPage(tab, text, offset, perPage);
        if (reqId !== requestIdRef.current) return;

        const base =
          mode === 'reset'
            ? []
            : (useStore.getState().searchPage.cache[tab].items as ResultItem[]);
        const { items, added } = mergeUnique(base, fresh);
        const nextOffset = offset + fresh.length;
        // стоп, если страница неполная или целиком состояла из дублей
        const hasMore = fresh.length === perPage && (mode === 'reset' || added > 0);

        setSearchCache(tab, {
          items: items as any,
          offset: nextOffset,
          hasMore,
          loaded: true,
          query: text,
        });

        if (mode === 'reset' && fresh.length > 0) addSearchHistory(text);
      } catch {
        if (reqId === requestIdRef.current) {
          setError('не удалось загрузить результаты');
        }
      } finally {
        if (mode === 'more') moreLoadingRef.current = false;
        if (reqId === requestIdRef.current) setIsLoading(false);
      }
    },
    [setSearchCache, addSearchHistory]
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      // гасим запросы, которые ещё в полёте
      requestIdRef.current += 1;
      setIsLoading(false);
      setError(null);
      resetSearchPage();
      return;
    }

    const cached = useStore.getState().searchPage.cache[filter];
    // результаты для этого запроса уже есть, повторно не грузим
    if (cached.loaded && cached.query === debouncedQuery.trim()) return;

    void search(debouncedQuery, filter, 0, 'reset');
  }, [debouncedQuery, filter, search, resetSearchPage]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (isLoading) return;

        const cache = useStore.getState().searchPage.cache[filter];
        if (error) return;
        if (!cache.hasMore || cache.offset === 0) return;

        void search(debouncedQuery, filter, cache.offset, 'more');
      },
      { threshold: 0, rootMargin: OBSERVER_MARGIN }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [debouncedQuery, filter, isLoading, error, search]);

  const retry = useCallback(() => {
    const cache = useStore.getState().searchPage.cache[filter];
    const hasItems = cache.items.length > 0;
    void search(
      debouncedQuery,
      filter,
      hasItems ? cache.offset : 0,
      hasItems ? 'more' : 'reset'
    );
  }, [search, debouncedQuery, filter]);

  const setQuery = useCallback(
    (q: string) => {
      setQueryState(q);
      setSearchPage({ query: q });
    },
    [setSearchPage]
  );

  const setFilter = useCallback(
    (f: FilterType) => {
      setFilterState(f);
      setSearchPage({ filter: f });
    },
    [setSearchPage]
  );

  const hasMore = useStore((s) => s.searchPage.cache[filter].hasMore);

  return {
    query,
    setQuery,
    filter,
    setFilter,
    debouncedQuery,
    tracks,
    artists,
    playlists,
    isLoading,
    hasMore,
    error,
    retry,
    sentinelRef,
  };
}
