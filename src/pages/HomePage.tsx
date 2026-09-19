import { useEffect, useState, useCallback, useRef } from 'react';
import { Icon } from '../components/Icon';
import { TrackCard } from '../components/TrackCard';
import { HorizontalScroll } from '../components/HorizontalScroll';
import { api } from '../lib/api';
import { useStore } from '../store/store';
import { formatMs } from '../lib/format';
import { useNavigate } from 'react-router-dom';
import type { Track } from '../store/types';
import { useSmoothScroll } from '../hooks/useSmoothScroll';

export default function HomePage() {
  const popularTracks = useStore((s) => s.homePage.popularTracks);
  const myWaveTracks = useStore((s) => s.homePage.myWaveTracks);
  const isLoadingPopular = useStore((s) => s.homePage.isLoadingPopular);
  const isLoadingWave = useStore((s) => s.homePage.isLoadingWave);
  const history = useStore((s) => s.library.history);
  const waveScrollRef = useSmoothScroll<HTMLDivElement>();
  const setHomePagePopular = useStore((s) => s.setHomePagePopular);
  const setHomePageMyWave = useStore((s) => s.setHomePageMyWave);
  const setHomePageLoadingPopular = useStore((s) => s.setHomePageLoadingPopular);
  const setHomePageLoadingWave = useStore((s) => s.setHomePageLoadingWave);
  const setHomePagePopularLoaded = useStore((s) => s.setHomePagePopularLoaded);
  const setHomePageMyWaveLoaded = useStore((s) => s.setHomePageMyWaveLoaded);
  const addHomePagePopularTracks = useStore((s) => s.addHomePagePopularTracks);
const popularTitleWidths = ['w-3/4', 'w-2/3', 'w-5/6', 'w-1/2', 'w-4/5', 'w-3/5', 'w-11/12'];
const popularArtistWidths = ['w-1/2', 'w-1/3', 'w-2/5', 'w-1/4', 'w-1/2', 'w-1/3', 'w-3/4'];
  const [popularOffset, setPopularOffset] = useState(20);
  const [hasMorePopular, setHasMorePopular] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const loadPopular = useCallback(async () => {
    setHomePageLoadingPopular(true);
    try {
      const tracks = await api.getPopular(20, 0);
      setHomePagePopular(tracks);
      setHomePagePopularLoaded(true);
      setPopularOffset(20);
      setHasMorePopular(tracks.length === 20);
    } catch {
    } finally {
      setHomePageLoadingPopular(false);
    }
  }, [setHomePagePopular, setHomePageLoadingPopular, setHomePagePopularLoaded]);

  const loadMyWave = useCallback(async () => {
    setHomePageLoadingWave(true);
    try {
      const artists = [...new Set(history.map((t) => t.user?.username).filter(Boolean))] as string[];
      const tracks = artists.length
        ? await api.getMyWave(artists.slice(0, 5), 6)
        : await api.getPopular(6);

      setHomePageMyWave(tracks);
      setHomePageMyWaveLoaded(true);
    } catch {
    } finally {
      setHomePageLoadingWave(false);
    }
  }, [history, setHomePageMyWave, setHomePageLoadingWave, setHomePageMyWaveLoaded]);

  const loadMorePopular = useCallback(async () => {
    if (isLoadingMore || !hasMorePopular) return;
    setIsLoadingMore(true);
    try {
      const tracks = await api.getPopular(20, popularOffset);
      if (tracks.length) {
        addHomePagePopularTracks(tracks);
        setPopularOffset(popularOffset + tracks.length);
        setHasMorePopular(tracks.length === 20);
      } else {
        setHasMorePopular(false);
      }
    } catch {
    } finally {
      setIsLoadingMore(false);
    }
  }, [popularOffset, hasMorePopular, isLoadingMore, addHomePagePopularTracks]);

  const checkAndLoadMore = useCallback(() => {
    if (!scrollRef.current) return;
    if (isLoadingMore || !hasMorePopular) return;

    const el = scrollRef.current;
    if (el.scrollWidth - (el.scrollLeft + el.clientWidth) < 200) loadMorePopular();
  }, [isLoadingMore, hasMorePopular, loadMorePopular]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkAndLoadMore);
    return () => el.removeEventListener('scroll', checkAndLoadMore);
  }, [checkAndLoadMore]);

  useEffect(() => {
    const { isPopularLoaded, isMyWaveLoaded } = useStore.getState().homePage;
    if (!isPopularLoaded) loadPopular();
    if (!isMyWaveLoaded) loadMyWave();
  }, [loadPopular, loadMyWave]);

  const handlePlayWave = () => {
    if (myWaveTracks.length) {
      useStore.getState().playTrack(myWaveTracks[0], myWaveTracks, 0, 'Моя Волна');
    }
  };

const renderMyWaveSkeletons = () =>
  [...Array(6)].map((_, i) => {
    const titleWidth = 30 + Math.random() * 40;   
    const artistWidth = 25 + Math.random() * 35;  
    return (
      <div key={i} className="flex items-center gap-3 p-2">
        <div className="w-10 h-10 rounded-md bg-bg-secondary flex items-center justify-center">
          <Icon name="music" size={16} className="text-text-tertiary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-bg-secondary rounded mb-1" style={{ width: `${titleWidth}%` }} />
          <div className="h-3 bg-bg-secondary rounded" style={{ width: `${artistWidth}%` }} />
        </div>
      </div>
    );
  });

  return (
    <div className="h-full overflow-auto">
      <div className="flex gap-4">
        <div className="w-1/3 flex-shrink-0">
  <div className="relative overflow-hidden rounded-2xl bg-bg-secondary/50 backdrop-blur-sm border border-border-subtle p-4 h-96 transition-all duration-200 hover:border-border-visible">
    <div className="relative z-10 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-text-secondary animate-pulse" />
          <h2 className="mb-1 text-base font-bold text-text-primary">моя волна</h2>
        </div>
        <button
          onClick={handlePlayWave}
          disabled={!myWaveTracks.length || isLoadingWave}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-secondary text-text-secondary rounded-full text-xs font-medium hover:bg-text-secondary hover:text-bg-primary transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Icon name="play" size={12} />
          <span>слушать</span>
        </button>
      </div>

      <div ref={waveScrollRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-hidden">
        {isLoadingWave ? (
          <div className="space-y-1">{renderMyWaveSkeletons()}</div>
        ) : myWaveTracks.length ? (
  <div className="space-y-1 animate-content-fade-in">
    {myWaveTracks.map((track) => (
      <MyWaveTrackItem key={track.id} track={track} tracks={myWaveTracks} />
    ))}
  </div>
) : (
          <div className="flex flex-col items-center justify-center py-12 text-center text-text-tertiary">
            <Icon name="music" size={32} className="mb-3 opacity-30" />
            <p className="text-xs">нет рекомендаций</p>
          </div>
        )}
      </div>
    </div>
  </div>
</div>

        <div className="flex-1 min-w-0">
          <div className="rounded-2xl border border-border-subtle bg-bg-secondary/50 backdrop-blur-sm p-4 h-72 transition-all duration-200 hover:border-border-visible">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon name="flame" size={16} className="text-text-tertiary" />
                <h2 className="text-sm font-bold text-text-primary">популярное</h2>
              </div>
              {isLoadingMore && (
                <div className="w-4 h-4 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
              )}
            </div>



{isLoadingPopular ? (
  <HorizontalScroll gap={12} style={{ minHeight: '280px' }}>
    {[...Array(7)].map((_, i) => (
      <div key={i} className="w-[160px] flex-shrink-0 animate-pulse">
        <div className="aspect-square rounded-xl bg-bg-secondary" />
        <div className={`mt-2 h-3 bg-bg-secondary rounded ${popularTitleWidths[i % popularTitleWidths.length]}`} />
        <div className={`mt-1 h-2 bg-bg-secondary rounded ${popularArtistWidths[i % popularArtistWidths.length]}`} />
      </div>
    ))}
  </HorizontalScroll>
) : (
 <HorizontalScroll
  ref={scrollRef}
  gap={12}
  style={{ minHeight: '280px' }}
  className="animate-content-fade-in"
>
{popularTracks.map((track, i) => (
  <div key={`${track.id}-${i}`}>
    <TrackCard track={track} index={i} tracks={popularTracks} />
  </div>
))}
                {isLoadingMore && (
                  <>
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="w-[160px] flex-shrink-0 animate-pulse">
                        <div className="aspect-square rounded-xl bg-bg-secondary" />
                        <div className="mt-2 h-3 bg-bg-secondary rounded w-3/4" />
                        <div className="mt-1 h-2 bg-bg-secondary rounded w-1/2" />
                      </div>
                    ))}
                  </>
                )}
              </HorizontalScroll>
            )}

            {!hasMorePopular && popularTracks.length > 0 && !isLoadingPopular && (
              <div className="text-center text-text-tertiary text-xs mt-2 animate-fade-in">
                это всё популярное
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MyWaveTrackItem({ track, tracks }: { track: Track; tracks: Track[] }) {
  const navigate = useNavigate();
  const playTrack = useStore((s) => s.playTrack);

  const index = tracks.findIndex((t) => t.id === track.id);
  const queue = tracks.slice(index >= 0 ? index : 0);

  const coverUrl =
    track.artwork_url?.replace('-large', '-t300x300') ||
    track.user?.avatar_url?.replace('-large', '-t300x300') ||
    null;

  const handleArtistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const id = track.user?.id;
    if (id) navigate(`/artist/${id}`);
  };

  return (
    <div
      onClick={() => playTrack(track, queue, 0, 'Моя Волна')}
      className="group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-bg-secondary active:scale-[0.98]"
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          className="w-10 h-10 rounded-md object-cover flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
          alt=""
        />
      ) : (
        <div className="w-10 h-10 rounded-md bg-bg-secondary flex items-center justify-center flex-shrink-0">
          <Icon name="music" size={16} className="text-text-tertiary" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-text-primary truncate group-hover:text-text-secondary transition-colors duration-200">
          {track.title || 'без названия'}
        </h4>
        <p className="text-xs text-text-tertiary truncate">
          {track.user?.id ? (
            <span
              onClick={handleArtistClick}
              className="cursor-pointer hover:text-text-secondary transition-colors"
            >
              {track.user.username}
            </span>
          ) : (
            track.user?.username || ''
          )}
        </p>
      </div>

      <span className="text-xs text-text-tertiary tabular-nums opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {formatMs(track.duration || 0)}
      </span>
    </div>
  );
}