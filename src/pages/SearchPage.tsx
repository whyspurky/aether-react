import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '@store/store';
import { useSearchPage } from '@hooks/search/useSearchPage';
import type { Track } from '@store/types';
import { Icon } from '@components/ui/Icon';
import { SearchInput } from '@components/search/SearchInput';
import { SearchFilters } from '@components/search/SearchFilters';
import { SearchHistory } from '@components/search/SearchHistory';
import { TrackList } from '@components/track/TrackList';
import { SearchArtistCard } from '@components/search/SearchArtistCard';
import { SearchPlaylistCard } from '@components/search/SearchPlaylistCard';
import { SearchSkeletons } from '@components/search/SearchSkeletons';

function blurSearchInput() {
  document.querySelector<HTMLInputElement>('input[data-search-input]')?.blur();
}

function cardAnimation(index: number) {
  return {
    marginBottom: 4,
    animation: 'contentFadeIn 0.2s ease-out backwards',
    animationDelay: `${Math.min(index, 15) * 25}ms`,
  };
}

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
    error,
    retry,
    sentinelRef,
  } = useSearchPage();

  const setSearchPage = useStore((s) => s.setSearchPage);
  const playTrack = useStore((s) => s.playTrack);
  const searchHistory = useStore((s) => s.searchHistory);
  const removeSearchHistory = useStore((s) => s.removeSearchHistory);
  const clearSearchHistory = useStore((s) => s.clearSearchHistory);

  const [inputFocused, setInputFocused] = useState(false);
  const [historyArmed, setHistoryArmed] = useState(false);
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

  // enter из любого места страницы ведёт в строку поиска
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (inputFocused) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('input, textarea, select, button, a, [role="button"], [contenteditable="true"]')) {
        return;
      }
      const el = document.querySelector<HTMLInputElement>('input[data-search-input]');
      if (!el) return;
      e.preventDefault();
      el.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inputFocused]);

  const handlePlay = useCallback(
    async (track: Track) => {
      const t = useStore.getState().searchPage.cache.tracks.items;
      const index = t.findIndex((x) => x.id === track.id);
      const queue = t.slice(index >= 0 ? index : 0);
      if (!queue.length) return;
      await playTrack(track, queue, 0, useStore.getState().searchPage.query);
    },
    [playTrack]
  );

  const items = filter === 'tracks' ? tracks : filter === 'artists' ? artists : playlists;
  const hasQuery = query.trim().length > 0;
  const pendingQuery = hasQuery && !debouncedQuery.trim();
  const showSkeletons = (isLoading || pendingQuery) && items.length === 0;
  const isEmpty =
    !isLoading && !pendingQuery && !error && items.length === 0 && !!debouncedQuery;

  // история не вылезает на автофокусе при входе, только после действия пользователя
  const showHistory =
    inputFocused && historyArmed && !hasQuery && searchHistory.length > 0;

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
    <div
      ref={setRefs}
      className="flex-1 min-h-0 overflow-auto scrollbar-hidden overscroll-contain [overflow-anchor:none]"
    >
      <div
        ref={headerRef}
        onMouseDown={() => setHistoryArmed(true)}
        onKeyDown={() => setHistoryArmed(true)}
        className={`sticky top-0 z-30 px-1 pt-2 transition-[margin-top] duration-300 ease-out ${
          hasQuery ? 'mt-0' : 'mt-[28vh]'
        }`}
      >
        <div
          className={`group/search relative mx-auto w-full transition-[max-width] duration-300 ease-out after:absolute after:inset-x-0 after:top-full after:h-[52px] after:content-[''] ${
            hasQuery ? 'max-w-full' : 'max-w-[680px]'
          }`}
        >
          <SearchInput
            value={query}
            onChange={setQuery}
            filter={filter}
            onFocusChange={setInputFocused}
          />

          {/* фильтры в потоке: по наведению раздвигают список, а не висят поверх */}
          <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-200 ease-out group-hover/search:grid-rows-[1fr] group-hover/search:opacity-100 focus-within:grid-rows-[1fr] focus-within:opacity-100">
            <div className="overflow-hidden">
              <div className="flex justify-center pt-2 pb-1">
                <SearchFilters filter={filter} onChange={setFilter} />
              </div>
            </div>
          </div>

          {historyMounted && (
            <div
              className={`absolute left-0 right-0 top-full z-40 pt-2 ${
                historyClosing ? 'animate-menu-exit' : 'animate-menu-enter'
              }`}
            >
              <SearchHistory
                items={searchHistory}
                onSelect={(v) => {
                  setQuery(v);
                  setInputFocused(false);
                  blurSearchInput();
                }}
                onRemove={removeSearchHistory}
                onClear={clearSearchHistory}
              />
            </div>
          )}
        </div>
      </div>

      <div className="px-1 pt-2 pb-6">
        {!hasQuery ? null : error && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center animate-content-fade-in">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/[0.08] bg-white/[0.04]">
              <Icon name="alert-circle" size={24} />
            </div>
            <p className="text-sm text-text-secondary">{error}</p>
            <button
              type="button"
              onClick={retry}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-text-primary border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_35%,transparent)]"
            >
              <Icon name="rotate-ccw" size={14} />
              повторить
            </button>
          </div>
        ) : showSkeletons ? (
          <SearchSkeletons filter={filter} />
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center animate-content-fade-in">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/[0.08] bg-white/[0.04]">
              <Icon name="x-circle" size={24} />
            </div>
            <p className="text-sm text-text-secondary">ничего не найдено</p>
            <p className="text-xs text-text-tertiary max-w-[320px]">
              попробуйте другой запрос или смените тип результатов
            </p>
          </div>
        ) : (
          <>
            {filter === 'tracks' ? (
              <TrackList tracks={tracks} onTrackClick={handlePlay} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-content-fade-in">
                {filter === 'artists'
                  ? artists.map((artist, index) => (
                      <div key={artist.id} style={cardAnimation(index)}>
                        <SearchArtistCard artist={artist} />
                      </div>
                    ))
                  : playlists.map((pl, index) => (
                      <div key={pl.id} style={cardAnimation(index)}>
                        <SearchPlaylistCard playlist={pl} />
                      </div>
                    ))}
              </div>
            )}

            <div ref={sentinelRef} className="h-1" />

            {isLoading && (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {error && items.length > 0 && (
              <div className="flex items-center justify-center gap-3 py-4 text-sm text-text-tertiary">
                <Icon name="alert-circle" size={16} />
                <span>не удалось загрузить ещё</span>
                <button
                  type="button"
                  onClick={retry}
                  className=" hover:text-[var(--accent-primary)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_35%,transparent)] rounded-sm"
                >
                  повторить
                </button>
              </div>
            )}

            {!hasMore && !isLoading && !error && (
              <div className="text-center py-8 text-text-tertiary text-sm">
                вы достигли конца результатов
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
