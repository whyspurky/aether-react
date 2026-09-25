import { useEffect, useState, useCallback, useRef } from 'react';
import { MyWaveSection } from '@components/home/MyWaveSection';
import { PopularSection } from '@components/home/PopularSection';
import { api } from '@lib/api';
import { useStore } from '@store/store';

export default function HomePage() {
  const popularTracks = useStore((s) => s.homePage.popularTracks);
  const myWaveTracks = useStore((s) => s.homePage.myWaveTracks);
  const isLoadingPopular = useStore((s) => s.homePage.isLoadingPopular);
  const isLoadingWave = useStore((s) => s.homePage.isLoadingWave);
  const history = useStore((s) => s.library.history);
  const setHomePagePopular = useStore((s) => s.setHomePagePopular);
  const setHomePageMyWave = useStore((s) => s.setHomePageMyWave);
  const setHomePageLoadingPopular = useStore((s) => s.setHomePageLoadingPopular);
  const setHomePageLoadingWave = useStore((s) => s.setHomePageLoadingWave);
  const setHomePagePopularLoaded = useStore((s) => s.setHomePagePopularLoaded);
  const setHomePageMyWaveLoaded = useStore((s) => s.setHomePageMyWaveLoaded);
  const addHomePagePopularTracks = useStore((s) => s.addHomePagePopularTracks);

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

  return (
    <div className="h-full overflow-auto">
      <div className="flex gap-4">
        <MyWaveSection
          tracks={myWaveTracks}
          isLoading={isLoadingWave}
          onPlay={handlePlayWave}
        />
        <PopularSection
          tracks={popularTracks}
          isLoading={isLoadingPopular}
          isLoadingMore={isLoadingMore}
          hasMore={hasMorePopular}
          scrollRef={scrollRef}
        />
      </div>
    </div>
  );
}