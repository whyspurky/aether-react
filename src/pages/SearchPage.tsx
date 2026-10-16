import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '@store/store';
import { useSearchPage } from '@hooks/search/useSearchPage';
import type { Track } from '@store/types';
import { SearchInput } from '@components/search/SearchInput';
import { SearchFilters } from '@components/search/SearchFilters';
import { SearchHistory } from '@components/search/SearchHistory';
import { SearchTrackItem } from '@components/search/SearchTrackItem';
import { SearchArtistCard } from '@components/search/SearchArtistCard';
import { SearchPlaylistCard } from '@components/search/SearchPlaylistCard';
import { SearchSkeletons } from '@components/search/SearchSkeletons';

export default function SearchPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const setRefs = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
  }, []);

  const {
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
    sentinelRef,
  } = useSearchPage();

  const setSearchPage = useStore((s) => s.setSearchPage);
  const playTrack = useStore((s) => s.playTrack);
  const addToQueue = useStore((s) => s.addToQueue);
  const searchHistory = useStore((s) => s.searchHistory);
  const removeSearchHistory = useStore((s) => s.removeSearchHistory);

  const [inputFocused, setInputFocused] = useState(false);
  const [historyClosing, setHistoryClosing] = useState(false);
  const [historyMounted, setHistoryMounted] = useState(false);

  useEffect(() => {
    const st = useStore.getState().searchPage;
    if (containerRef.current && st.scrollTop > 0) {
      containerRef.current.scrollTop = st.scrollTop;
    }
  }, []);

  useEffect(() => {
    return () => {
      const el = containerRef.current;
      if (el) setSearchPage({ scrollTop: el.scrollTop });
    };
  }, [setSearchPage]);

  useEffect(() => {
    if (!inputFocused) return;
    const onClick = (e: MouseEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) {
        setInputFocused(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [inputFocused]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== 'Tab') return;
      if (inputFocused) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      const el = document.querySelector<HTMLInputElement>('input[data-search-input]');
      if (!el) return;
      e.preventDefault();
      el.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inputFocused]);

  const handlePlay = useCallback(async (track: Track) => {
    const t = useStore.getState().searchPage.cache.tracks.items;
    const index = t.findIndex((x) => x.id === track.id);
    const queue = t.slice(index >= 0 ? index : 0);
    if (!queue.length) return;
    await playTrack(track, queue, 0, useStore.getState().searchPage.query);
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

  const showHistory = inputFocused && !query && searchHistory.length > 0;

  useEffect(() => {
    if (showHistory) {
      setHistoryMounted(true);
      setHistoryClosing(false);
      return;
    }
    if (!historyMounted) return;
    setHistoryClosing(true);
    const timer = setTimeout(() => {
      setHistoryMounted(false);
      setHistoryClosing(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [showHistory, historyMounted]);

  return (
    <div ref={setRefs} className="h-full overflow-auto scrollbar-hidden overscroll-contain">
      <div ref={headerRef} className="sticky top-0 z-30">
        <div
          className="absolute inset-0 bg-bg-primary/50 pointer-events-none rounded-2xl overflow-hidden"
          style={{
            backdropFilter: 'blur(40px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
          }}
        />

        <div className="relative p-4">
          <SearchInput
            value={query}
            onChange={setQuery}
            filter={filter}
            onFocusChange={setInputFocused}
          />
          <SearchFilters filter={filter} onChange={setFilter} />

          {historyMounted && (
            <div className={`mt-2 ${historyClosing ? 'animate-menu-exit' : 'animate-menu-enter'}`}>
              <SearchHistory
                items={searchHistory}
                onSelect={(v) => {
                  setQuery(v);
                  setInputFocused(false);
                }}
                onRemove={removeSearchHistory}
              />
            </div>
          )}
        </div>
      </div>

      <div className="p-4 scrollbar-hidden">
        {!debouncedQuery ? null : showSkeletons ? (
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

            {tracks.length > 0 && (
              <div ref={sentinelRef} className="h-1" />
            )}

            {!hasMore && tracks.length > 0 && (
              <div className="text-center py-8 text-text-tertiary text-sm">
                вы достигли конца результатов
              </div>
            )}
          </>
        ) : filter === 'artists' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-content-fade-in">
            {artists.map((artist) => (
              <SearchArtistCard key={artist.id} artist={artist} />
            ))}
            {artists.length > 0 && (
              <div ref={sentinelRef} className="h-1 col-span-full" />
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-content-fade-in">
            {playlists.map((pl) => (
              <SearchPlaylistCard key={pl.id} playlist={pl} />
            ))}
            {playlists.length > 0 && (
              <div ref={sentinelRef} className="h-1 col-span-full" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}