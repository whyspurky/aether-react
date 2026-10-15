import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@lib/api';
import { useStore } from '@store/store';
import type { FilterType } from '@components/search/SearchFilters';

const DEBOUNCE_MS = 200;
const OBSERVER_MARGIN = '0px 0px 500px 0px';
const OBSERVER_THRESHOLD = 0.1;

const PER_PAGE: Record<FilterType, number> = {
  tracks: 20,
  artists: 30,
  playlists: 20,
};

export function useSearchPage() {
  const setSearchPage = useStore((s) => s.setSearchPage);
  const setSearchCache = useStore((s) => s.setSearchCache);
  const resetSearchPage = useStore((s) => s.resetSearchPage);
  const addSearchHistory = useStore((s) => s.addSearchHistory);

  const storeQuery = useStore((s) => s.searchPage.query);
  const storeFilter = useStore((s) => s.searchPage.filter);
  const cachedTracks = useStore((s) => s.searchPage.cache.tracks.items);
  const cachedArtists = useStore((s) => s.searchPage.cache.artists.items);
  const cachedPlaylists = useStore((s) => s.searchPage.cache.playlists.items);

  const [query, setQueryState] = useState(storeQuery);
  const [filter, setFilterState] = useState<FilterType>(storeFilter);
  const [debouncedQuery, setDebouncedQuery] = useState(storeQuery);
  const [isLoading, setIsLoading] = useState(false);

  const isLoadingRef = useRef(false);
  const requestIdRef = useRef(0);
  const offsetRef = useRef(0);
  const hasMoreRef = useRef(true);

  const search = useCallback(async (
    q: string,
    tab: FilterType,
    newOffset: number,
    reset: boolean,
  ) => {
    if (!q || isLoadingRef.current) return;
    if (!reset && !hasMoreRef.current) return;

    const reqId = ++requestIdRef.current;
    setIsLoading(true);
    isLoadingRef.current = true;

    try {
      const perPage = PER_PAGE[tab];
      const prev = reset
        ? []
        : (useStore.getState().searchPage.cache[tab].items as any[]);

      let fresh: any[] = [];
      if (tab === 'tracks') {
        fresh = (await api.searchTracks(q, perPage, newOffset)).filter((t) => t?.id);
      } else if (tab === 'artists') {
        fresh = await api.searchUsers(q, newOffset, perPage);
      } else {
        fresh = await api.searchPlaylists(q, perPage, newOffset);
      }

      if (reqId !== requestIdRef.current) return;

      const next = [...prev, ...fresh];
      const nextHasMore = fresh.length === perPage;
      const nextOffset = newOffset + fresh.length;

      hasMoreRef.current = nextHasMore;
      offsetRef.current = nextOffset;

      setSearchCache(tab, {
        items: next,
        offset: nextOffset,
        hasMore: nextHasMore,
        loaded: true,
      });

      if (reset && fresh.length > 0) {
        addSearchHistory(q);
      }
    } catch {
    } finally {
      if (reqId === requestIdRef.current) {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    }
  }, [setSearchCache, addSearchHistory]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery) {
      resetSearchPage();
      return;
    }

    const timer = setTimeout(() => {
      const currentFilter = filter;
      resetSearchPage();
      offsetRef.current = 0;
      hasMoreRef.current = true;
      void search(debouncedQuery, currentFilter, 0, true);
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filter]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreRef.current &&
          !isLoadingRef.current &&
          debouncedQuery
        ) {
          void search(debouncedQuery, filter, offsetRef.current, false);
        }
      },
      { threshold: OBSERVER_THRESHOLD, rootMargin: OBSERVER_MARGIN }
    );

    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filter, cachedTracks.length, cachedArtists.length, cachedPlaylists.length]);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
    setSearchPage({ query: q });
  }, [setSearchPage]);

  const setFilter = useCallback((f: FilterType) => {
    setFilterState(f);
    setSearchPage({ filter: f });
  }, [setSearchPage]);

  const hasMore = useStore((s) => s.searchPage.cache[filter].hasMore);

  return {
    query,
    setQuery,
    filter,
    setFilter,
    debouncedQuery,
    tracks: cachedTracks,
    artists: cachedArtists,
    playlists: cachedPlaylists,
    isLoading,
    hasMore,
    sentinelRef,
  };
}