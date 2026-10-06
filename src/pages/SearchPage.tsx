import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@lib/api';
import { useStore } from '@store/store';
import { useSmoothScroll } from '@hooks/ui/useSmoothScroll';
import type { Track, User, Playlist } from '@store/types';
import { SearchInput } from '@components/search/SearchInput';
import { SearchFilters, type FilterType } from '@components/search/SearchFilters';
import { SearchTrackItem } from '@components/search/SearchTrackItem';
import { SearchArtistCard } from '@components/search/SearchArtistCard';
import { SearchPlaylistCard } from '@components/search/SearchPlaylistCard';
import { SearchSkeletons } from '@components/search/SearchSkeletons';
import { SearchEmpty } from '@components/search/SearchEmpty';

export default function SearchPage() {
  const sp = useStore((s) => s.searchPage);
  const setSearchPage = useStore((s) => s.setSearchPage);
  const setSearchCache = useStore((s) => s.setSearchCache);
  const resetSearchPage = useStore((s) => s.resetSearchPage);

  const [query, setQuery] = useState(sp.query);
  const [debouncedQuery, setDebouncedQuery] = useState(sp.query);
  const [filter, setFilter] = useState<FilterType>(sp.filter);
  const [tracks, setTracks] = useState<Track[]>(sp.cache.tracks.items);
  const [artists, setArtists] = useState<User[]>(sp.cache.artists.items);
  const [playlists, setPlaylists] = useState<Playlist[]>(sp.cache.playlists.items);
  const [isLoading, setIsLoading] = useState(false);

  const smoothRef = useSmoothScroll<HTMLDivElement>();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useRef<HTMLDivElement | null>(null);

  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const offsetRef = useRef(0);
  const debouncedQueryRef = useRef(sp.query);
  const filterRef = useRef<FilterType>(sp.filter);

  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);
  useEffect(() => { debouncedQueryRef.current = debouncedQuery; }, [debouncedQuery]);
  useEffect(() => { filterRef.current = filter; }, [filter]);

  const setRefs = useCallback((node: HTMLDivElement | null) => {
    smoothRef(node);
    containerRef.current = node;
  }, [smoothRef]);

  const playTrack = useStore((s) => s.playTrack);
  const addToQueue = useStore((s) => s.addToQueue);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (containerRef.current && sp.scrollTop > 0) {
      containerRef.current.scrollTop = sp.scrollTop;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      const el = containerRef.current;
      if (el) setSearchPage({ scrollTop: el.scrollTop });
    };
  }, [setSearchPage]);

  const performSearch = useCallback(async (tab: FilterType, newOffset: number, reset: boolean, q: string) => {
    if (!q || isLoadingRef.current) return;
    if (!reset && !hasMoreRef.current) return;

    setIsLoading(true);
    isLoadingRef.current = true;

    try {
      if (tab === 'tracks') {
        const results = await api.searchTracks(q, 20, newOffset);
        const fresh = results.filter((t) => t?.id);
        const prev = reset ? [] : useStore.getState().searchPage.cache.tracks.items;
        const next = [...prev, ...fresh];
        const nextHasMore = fresh.length === 20;
        const nextOffset = newOffset + fresh.length;

        setTracks(next);
        hasMoreRef.current = nextHasMore;
        offsetRef.current = nextOffset;

        setSearchCache('tracks', { items: next, offset: nextOffset, hasMore: nextHasMore, loaded: true });
        setSearchPage({ query: q });
      } else if (tab === 'artists') {
        const results = await api.searchUsers(q, newOffset, 30);
        const prev = reset ? [] : useStore.getState().searchPage.cache.artists.items;
        const next = [...prev, ...results];
        const nextHasMore = results.length === 30;
        const nextOffset = newOffset + results.length;

        setArtists(next);
        hasMoreRef.current = nextHasMore;
        offsetRef.current = nextOffset;

        setSearchCache('artists', { items: next, offset: nextOffset, hasMore: nextHasMore, loaded: true });
        setSearchPage({ query: q });
      } else {
        const data = await api.searchPlaylists(q, 20, newOffset);
        const items = (data?.collection || []) as Playlist[];
        const prev = reset ? [] : useStore.getState().searchPage.cache.playlists.items;
        const next = [...prev, ...items];
        const nextHasMore = items.length === 20;
        const nextOffset = newOffset + items.length;

        setPlaylists(next);
        hasMoreRef.current = nextHasMore;
        offsetRef.current = nextOffset;

        setSearchCache('playlists', { items: next, offset: nextOffset, hasMore: nextHasMore, loaded: true });
        setSearchPage({ query: q });
      }
    } catch {
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [setSearchPage, setSearchCache]);

  // при смене query — полный сброс кеша и новый поиск
  useEffect(() => {
    if (!debouncedQuery) {
      resetSearchPage();
      setTracks([]);
      setArtists([]);
      setPlaylists([]);
      return;
    }

    resetSearchPage();
    setTracks([]);
    setArtists([]);
    setPlaylists([]);
    hasMoreRef.current = true;
    offsetRef.current = 0;
    if (containerRef.current) containerRef.current.scrollTop = 0;
    performSearch(filterRef.current, 0, true, debouncedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  // при смене filter — берём из кеша или грузим
  useEffect(() => {
    if (!debouncedQuery) return;

    const cache = useStore.getState().searchPage.cache;

    if (filter === 'tracks') {
      const c = cache.tracks;
      setTracks(c.items);
      hasMoreRef.current = c.hasMore;
      offsetRef.current = c.offset;
      if (!c.loaded) performSearch('tracks', 0, true, debouncedQuery);
      else if (containerRef.current) containerRef.current.scrollTop = 0;
    } else if (filter === 'artists') {
      const c = cache.artists;
      setArtists(c.items);
      hasMoreRef.current = c.hasMore;
      offsetRef.current = c.offset;
      if (!c.loaded) performSearch('artists', 0, true, debouncedQuery);
      else if (containerRef.current) containerRef.current.scrollTop = 0;
    } else {
      const c = cache.playlists;
      setPlaylists(c.items);
      hasMoreRef.current = c.hasMore;
      offsetRef.current = c.offset;
      if (!c.loaded) performSearch('playlists', 0, true, debouncedQuery);
      else if (containerRef.current) containerRef.current.scrollTop = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, debouncedQuery]);

  useEffect(() => {
    const el = lastElementRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreRef.current &&
          !isLoadingRef.current &&
          debouncedQueryRef.current
        ) {
          performSearch(filterRef.current, offsetRef.current, false, debouncedQueryRef.current);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px 200px 0px' }
    );

    observer.observe(el);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [performSearch]);

  const handlePlay = useCallback(async (track: Track) => {
    const t = useStore.getState().searchPage.cache.tracks.items;
    const index = t.findIndex((x) => x.id === track.id);
    const queue = t.slice(index >= 0 ? index : 0);
    if (!queue.length) return;
    await playTrack(track, queue, 0, debouncedQueryRef.current);
  }, [playTrack]);

  const handlePlayAll = useCallback(async () => {
    const t = useStore.getState().searchPage.cache.tracks.items;
    if (!t.length) return;
    await playTrack(t[0], t, 0, `${debouncedQueryRef.current} (все)`);
  }, [playTrack]);

  const handleAddToQueue = useCallback((track: Track, e: React.MouseEvent) => {
    e.stopPropagation();
    addToQueue(track);
  }, [addToQueue]);

  const showSkeletons =
    isLoading &&
    (filter === 'tracks'
      ? !tracks.length
      : filter === 'artists'
      ? !artists.length
      : !playlists.length);

  return (
    <div ref={setRefs} className="h-full overflow-auto scrollbar-hidden">
      <div className="sticky top-0 z-10 rounded-2xl border border-border-subtle bg-bg-secondary/80 backdrop-blur-xl overflow-hidden">
        <div className="p-4">
          <SearchInput
            value={query}
            onChange={(v) => { setQuery(v); setSearchPage({ query: v }); }}
          />
          <SearchFilters
            filter={filter}
            onChange={(f) => { setFilter(f); setSearchPage({ filter: f }); }}
            canPlayAll={tracks.length > 0}
            onPlayAll={handlePlayAll}
          />
        </div>
      </div>

      <div className="p-4 scrollbar-hidden">
        {!debouncedQuery ? (
          <SearchEmpty />
        ) : showSkeletons ? (
          <SearchSkeletons filter={filter} />
        ) : filter === 'tracks' ? (
          <>
            <div className="space-y-1 animate-content-fade-in">
              {tracks.map((track) => (
                <SearchTrackItem
                  key={track.id}
                  track={track}
                  onPlay={handlePlay}
                  onAddToQueue={handleAddToQueue}
                />
              ))}
            </div>

            {isLoading && tracks.length > 0 && (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!hasMoreRef.current && tracks.length > 0 && (
              <div className="text-center py-8 text-text-tertiary text-sm">
                вы достигли конца результатов
              </div>
            )}

            <div ref={lastElementRef} className="h-1" />
          </>
        ) : filter === 'artists' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-content-fade-in">
            {artists.map((artist) => (
              <SearchArtistCard key={artist.id} artist={artist} />
            ))}
            <div ref={lastElementRef} className="h-1 col-span-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-content-fade-in">
            {playlists.map((pl) => (
              <SearchPlaylistCard key={pl.id} playlist={pl} />
            ))}
            <div ref={lastElementRef} className="h-1 col-span-full" />
          </div>
        )}
      </div>
    </div>
  );
}