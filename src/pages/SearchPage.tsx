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
  const resetSearchPage = useStore((s) => s.resetSearchPage);

  const [query, setQuery] = useState(sp.query);
  const [debouncedQuery, setDebouncedQuery] = useState(sp.query);
  const [filter, setFilter] = useState<FilterType>(sp.filter);
  const [tracks, setTracks] = useState<Track[]>(sp.tracks);
  const [artists, setArtists] = useState<User[]>(sp.artists);
  const [playlists, setPlaylists] = useState<Playlist[]>(sp.playlists);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(sp.hasMore);
  const [offset, setOffset] = useState(sp.offset);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const smoothRef = useSmoothScroll<HTMLDivElement>();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const setRefs = useCallback((node: HTMLDivElement | null) => {
    smoothRef(node);
    containerRef.current = node;
  }, [smoothRef]);

  const playTrack = useStore((s) => s.playTrack);
  const addToQueue = useStore((s) => s.addToQueue);
  const showToast = useStore((s) => s.showToast);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 500);
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

  const performSearch = useCallback(async (newOffset: number, reset: boolean) => {
    if (!debouncedQuery || isLoading) return;
    if (!reset && !hasMore) return;

    setIsLoading(true);
    try {
      if (filter === 'tracks') {
        const results = await api.searchTracks(debouncedQuery, 20, newOffset);
        const fresh = results.filter((t) => t?.id);
        const next = reset ? fresh : [...tracks, ...fresh];
        setTracks(next);
        setHasMore(fresh.length === 20);
        setOffset(newOffset + fresh.length);
        setSearchPage({ query: debouncedQuery, filter, tracks: next, offset: newOffset + fresh.length, hasMore: fresh.length === 20 });
      } else if (filter === 'artists') {
        const results = await api.searchUsers(debouncedQuery, newOffset, 30);
        const next = reset ? results : [...artists, ...results];
        setArtists(next);
        setHasMore(results.length === 30);
        setOffset(newOffset + results.length);
        setSearchPage({ query: debouncedQuery, filter, artists: next, offset: newOffset + results.length, hasMore: results.length === 30 });
      } else {
        const data = await api.searchPlaylists(debouncedQuery, 20, newOffset);
        const items = (data?.collection || []) as Playlist[];
        const next = reset ? items : [...playlists, ...items];
        setPlaylists(next);
        setHasMore(items.length === 20);
        setOffset(newOffset + items.length);
        setSearchPage({ query: debouncedQuery, filter, playlists: next, offset: newOffset + items.length, hasMore: items.length === 20 });
      }
    } catch {
      showToast('ошибка поиска', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, filter, isLoading, hasMore, showToast, tracks, artists, playlists, setSearchPage]);

  useEffect(() => {
    resetSearchPage();
    setTracks([]);
    setArtists([]);
    setPlaylists([]);
    setOffset(0);
    setHasMore(true);
    if (containerRef.current) containerRef.current.scrollTop = 0;
    if (debouncedQuery) performSearch(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, filter]);

  const lastElementCallback = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!node) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && debouncedQuery) {
          performSearch(offset, false);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px 200px 0px' }
    );
    observerRef.current.observe(node);
  }, [hasMore, isLoading, offset, debouncedQuery, performSearch]);

  const handlePlay = useCallback(async (track: Track) => {
    const index = tracks.findIndex((t) => t.id === track.id);
    const queue = tracks.slice(index >= 0 ? index : 0);
    if (!queue.length) {
      showToast('нет треков для воспроизведения', 'error');
      return;
    }
    await playTrack(track, queue, 0, debouncedQuery);
  }, [tracks, playTrack, showToast, debouncedQuery]);

  const handlePlayAll = useCallback(async () => {
    if (!tracks.length) return;
    await playTrack(tracks[0], tracks, 0, `${debouncedQuery} (все)`);
  }, [tracks, playTrack, debouncedQuery]);

  const handleAddToQueue = useCallback((track: Track, e: React.MouseEvent) => {
    e.stopPropagation();
    addToQueue(track);
    showToast('добавлено в очередь', 'success');
  }, [addToQueue, showToast]);

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

            {!hasMore && tracks.length > 0 && (
              <div className="text-center py-8 text-text-tertiary text-sm">
                вы достигли конца результатов
              </div>
            )}

            <div ref={lastElementCallback} className="h-1" />
          </>
        ) : filter === 'artists' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-content-fade-in">
            {artists.map((artist) => (
              <SearchArtistCard key={artist.id} artist={artist} />
            ))}
            <div ref={lastElementCallback} className="h-1 col-span-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-content-fade-in">
            {playlists.map((pl) => (
              <SearchPlaylistCard key={pl.id} playlist={pl} />
            ))}
            <div ref={lastElementCallback} className="h-1 col-span-full" />
          </div>
        )}
      </div>
    </div>
  );
}