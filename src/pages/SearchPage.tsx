import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { api } from '../lib/api';
import { useStore } from '../store/store';
import { formatMs } from '../lib/format';
import type { Track, User } from '../store/types';
import { useSmoothScroll } from '../hooks/useSmoothScroll';

type FilterType = 'tracks' | 'artists';

interface TrackItemProps {
  track: Track;
  onPlay: (track: Track) => void;
  onAddToQueue: (track: Track, e: React.MouseEvent) => void;
}

function TrackItem({ track, onPlay, onAddToQueue }: TrackItemProps) {
  const coverUrl =
    track.artwork_url?.replace('-large', '-t300x300') ||
    track.user?.avatar_url?.replace('-large', '-t300x300') ||
    null;

  return (
    <div
      onClick={() => onPlay(track)}
      className="group flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-bg-secondary w-full"
    >
      {coverUrl ? (
        <img src={coverUrl} className="w-12 h-12 rounded-md object-cover flex-shrink-0" alt="" />
      ) : (
        <div className="w-12 h-12 rounded-md bg-bg-secondary flex items-center justify-center flex-shrink-0">
          <Icon name="music" size={20} className="text-text-tertiary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h4 className="text-base font-medium text-text-primary truncate">
          {track.title || 'без названия'}
        </h4>
        <p className="text-sm text-text-tertiary truncate">{track.user?.username || ''}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-text-tertiary tabular-nums">
          {formatMs(track.duration || 0)}
        </span>
        <button
          onClick={(e) => onAddToQueue(track, e)}
          className="p-2 rounded-md text-text-tertiary opacity-0 group-hover:opacity-100 hover:text-text-secondary transition-all duration-200"
          title="добавить в очередь"
        >
          <Icon name="plus" size={16} />
        </button>
      </div>
    </div>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('tracks');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const smoothRef = useSmoothScroll<HTMLDivElement>();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const setRefs = (node: HTMLDivElement | null) => {
    smoothRef.current = node;
    containerRef.current = node;
  };
  const navigate = useNavigate();
  const playTrack = useStore((s) => s.playTrack);
  const addToQueue = useStore((s) => s.addToQueue);
  const showToast = useStore((s) => s.showToast);

useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(t);
  }, [query]);

  const performSearch = useCallback(async (newOffset: number, reset: boolean) => {
    if (!debouncedQuery || isLoading) return;
    if (!reset && !hasMore) return;

    setIsLoading(true);
    try {
      if (filter === 'tracks') {
        const results = await api.searchTracks(debouncedQuery, 20, newOffset);
        const fresh = results.filter((t) => t?.id);
        setTracks((prev) => (reset ? fresh : [...prev, ...fresh]));
        setHasMore(fresh.length === 20);
        setOffset(newOffset + fresh.length);
      } else {
        const results = await api.searchUsers(debouncedQuery, newOffset, 30);
        setArtists((prev) => (reset ? results : [...prev, ...results]));
        setHasMore(results.length === 30);
        setOffset(newOffset + results.length);
      }
    } catch {
      showToast('ошибка поиска', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, filter, isLoading, hasMore, showToast]);

  useEffect(() => {
    setTracks([]);
    setArtists([]);
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

  const filters: { id: FilterType; label: string; icon: string }[] = [
    { id: 'tracks', label: 'треки', icon: 'music' },
    { id: 'artists', label: 'артисты', icon: 'mic' },
  ];

  const handlePlay = useCallback(async (track: Track) => {
    const index = tracks.findIndex((t) => t.id === track.id);
    const queue = tracks.slice(index >= 0 ? index : 0);
    if (!queue.length) {
      showToast('нет треков для воспроизведения', 'error');
      return;
    }
    await playTrack(track, queue, 0, ` ${debouncedQuery}`);
  }, [tracks, playTrack, navigate, showToast, debouncedQuery]);

  const handlePlayAll = useCallback(async () => {
    if (!tracks.length) return;
    await playTrack(tracks[0], tracks, 0, ` ${debouncedQuery} (все)`);
  }, [tracks, playTrack, navigate, debouncedQuery]);

  const handleAddToQueue = useCallback((track: Track, e: React.MouseEvent) => {
    e.stopPropagation();
    addToQueue(track);
    showToast('добавлено в очередь', 'success');
  }, [addToQueue, showToast]);

  return (
    <div ref={setRefs} className="h-full overflow-auto scrollbar-hidden">
      <div className="sticky top-0 z-10 rounded-2xl border border-border-subtle bg-bg-secondary/80 backdrop-blur-xl overflow-hidden">
        <div className="p-4">
          <div className="relative group">
            <Icon
              name="search"
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-text-secondary transition-colors"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="исполнители, треки"
              className="w-full py-3.5 pl-12 pr-4 bg-bg-card border border-border-subtle rounded-xl text-text-primary text-lg placeholder:text-text-tertiary outline-none focus:border-border-visible focus:bg-bg-secondary transition-all duration-200"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-2">
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    filter === f.id
                      ? 'bg-bg-secondary text-text-primary'
                      : 'bg-bg-card text-text-tertiary hover:bg-bg-secondary hover:text-text-secondary'
                  }`}
                >
                  <Icon name={f.icon} size={14} />
                  {f.label}
                </button>
              ))}
            </div>
            {filter === 'tracks' && tracks.length > 0 && (
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium bg-bg-secondary text-text-primary hover:bg-text-secondary hover:text-bg-primary transition-all duration-200"
              >
                <Icon name="play" size={14} />
                слушать всё
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 scrollbar-hidden">
        {!debouncedQuery ? (
          <div className="flex flex-col items-center justify-center py-32 text-text-tertiary">
            <Icon name="search" size={64} className="mb-4 opacity-30" />
            <p className="text-base">начните поиск</p>
            <p className="text-sm mt-1">введите название трека или исполнителя</p>
          </div>
) : isLoading && (filter === 'tracks' ? tracks.length === 0 : artists.length === 0) ? (
  filter === 'tracks' ? (
    <div className="space-y-1">
      {[...Array(8)].map((_, i) => {
        const tw = 20 + Math.random() * 30;
        const aw = 12 + Math.random() * 20;
        return (
          <div key={i} className="flex items-center gap-4 p-3 rounded-xl animate-pulse">
            <div className="w-12 h-12 rounded-md bg-bg-secondary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-bg-secondary rounded mb-2" style={{ width: `${tw}%` }} />
              <div className="h-3 bg-bg-secondary rounded" style={{ width: `${aw}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {[...Array(16)].map((_, i) => {
        const nameW = 30 + Math.random() * 30;
        const subsW = 25 + Math.random() * 20;
        return (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-bg-card animate-pulse">
            <div className="w-10 h-10 rounded-full bg-bg-secondary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-bg-secondary rounded mb-1.5" style={{ width: `${nameW}%` }} />
              <div className="h-3 bg-bg-secondary rounded" style={{ width: `${subsW}%` }} />
            </div>
            <div className="w-4 h-4 rounded bg-bg-secondary flex-shrink-0" />
          </div>
        );
      })}
    </div>
  )
) : filter === 'tracks' ? (
          <>
            <div className="space-y-1 animate-content-fade-in">
              {tracks.map((track) => (
                <TrackItem
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-content-fade-in">
            {artists.map((artist) => (
              <div
                key={artist.id}
                onClick={() => navigate(`/artist/${artist.id}`)}
                className="flex items-center gap-3 p-3 rounded-xl bg-bg-card border border-border-subtle hover:border-border-visible transition-all duration-200 cursor-pointer group"
              >
                {artist.avatar_url ? (
                  <img
                    src={artist.avatar_url.replace('-large', '-t100x100')}
                    alt={artist.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center">
                    <Icon name="mic" size={16} className="text-text-tertiary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-text-primary truncate">
                    {artist.username}
                  </h4>
                  <p className="text-xs text-text-tertiary">
                    {artist.followers_count?.toLocaleString() || 0} слушателей
                  </p>
                </div>
                <Icon
                  name="chevron-right"
                  size={16}
                  className="text-text-tertiary group-hover:text-text-secondary transition-colors"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}