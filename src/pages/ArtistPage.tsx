import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@components/ui/Icon';
import { api } from '@lib/api';
import { useStore } from '@store/store';
import type { User, Track, Playlist } from '@store/types';
import { useSmoothScroll } from '@hooks/ui/useSmoothScroll';
import { ArtistHeader } from '@components/artist/ArtistHeader';
import { ArtistTabs } from '@components/artist/ArtistTabs';
import { ArtistAllTab } from '@components/artist/ArtistAllTab';
import { ArtistTracksTab } from '@components/artist/ArtistTracksTab';
import { ArtistRepostsTab } from '@components/artist/ArtistRepostsTab';
import { ArtistPlaylistsTab } from '@components/artist/ArtistPlaylistsTab';

type Tab = 'all' | 'tracks' | 'playlists' | 'reposts';

export function ArtistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const scrollRef = useSmoothScroll<HTMLDivElement>();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const setRefs = useCallback((el: HTMLDivElement | null) => {
    scrollRef(el);
    rootRef.current = el;
  }, [scrollRef]);
  useSmoothScroll<HTMLDivElement>();
  const cached = useStore((s) => (id ? s.artistPage.cache[id] : undefined));
  const setArtistCache = useStore((s) => s.setArtistCache);

  const [playlists, setPlaylists] = useState<Playlist[]>(cached?.playlists ?? []);
  const [artist, setArtist] = useState<User | null>(cached?.artist ?? null);
  const [popularTracks, setPopularTracks] = useState<Track[]>(cached?.popularTracks ?? []);
  const [tracks, setTracks] = useState<Track[]>(cached?.tracks ?? []);
  const [relatedArtists, setRelatedArtists] = useState<User[]>(cached?.relatedArtists ?? []);
  const [isLoading, setIsLoading] = useState(!cached);
  const [reposts, setReposts] = useState<Track[]>(cached?.reposts ?? []);
  const [activeTab, setActiveTab] = useState<Tab>(cached?.tab ?? 'all');
  const showToast = useStore((s) => s.showToast);
  const [visibleTracks, setVisibleTracks] = useState(100);
  const [visibleReposts, setVisibleReposts] = useState(100);

  useEffect(() => {
    setVisibleTracks(100);
    setVisibleReposts(100);
  }, [activeTab]);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const uid = parseInt(id, 10);

        const user = await api.getUser(uid);
        if (!user) {
          showToast('артист не найден', 'error');
          navigate('/search');
          return;
        }
        setArtist(user);

        const [popular, all, related, reps, pls] = await Promise.all([
          api.getUserPopularTracks(uid),
          api.getUserTracks(uid),
          api.getRelatedArtists(uid),
          api.getUserReposts(uid),
          api.getUserPlaylists(uid),
        ]);

        setPopularTracks(popular);
        setTracks(all);
        setRelatedArtists(related);
        setReposts(reps);
        setPlaylists(pls);

        setArtistCache(id, {
          artist: user,
          popularTracks: popular,
          tracks: all,
          reposts: reps,
          playlists: pls,
          relatedArtists: related,
          tab: cached?.tab ?? 'all',
          scrollTop: cached?.scrollTop ?? 0,
        });
      } catch {
        showToast('ошибка загрузки артиста', 'error');
        navigate('/search');
      } finally {
        setIsLoading(false);
      }
    };

    if (!cached) load();
    else setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate, showToast]);

  useEffect(() => {
    if (!isLoading && cached?.scrollTop && rootRef.current) {
      requestAnimationFrame(() => {
        if (rootRef.current) rootRef.current.scrollTop = cached.scrollTop;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  useEffect(() => {
    return () => {
      const el = rootRef.current;
      if (id && el) setArtistCache(id, { scrollTop: el.scrollTop });
      setVisibleTracks(100);
      setVisibleReposts(100);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (isLoading || !artist) {
    return (
      <div ref={setRefs} className="h-full overflow-y-auto bg-bg-primary">
                {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-text-secondary">
            <Icon name="alert-circle" size={64} className="mb-4 text-text-tertiary" />
            <p className="text-lg mb-2">артист не найден</p>
            <button
              onClick={() => navigate('/search')}
              className="mt-4 px-6 py-2 bg-bg-secondary text-text-primary rounded-full text-sm font-medium hover:bg-text-secondary hover:text-bg-primary transition-all duration-200"
            >
              вернуться к поиску
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setRefs}
      className={`h-full overflow-y-auto bg-bg-primary ${
        activeTab === 'all' ? 'custom-scrollbar-hidden' : 'custom-scrollbar'
      }`}
    >
      <ArtistHeader
        artist={artist}
        tracksCount={tracks.length}
        repostsCount={reposts.length}
      />

      <ArtistTabs
        activeTab={activeTab}
        onChange={(tab) => {
          setActiveTab(tab);
          if (id) setArtistCache(id, { tab });
        }}
      />

      <div className="px-6 py-6">
        {activeTab === 'all' && (
          <ArtistAllTab
            popularTracks={popularTracks}
            tracks={tracks}
            reposts={reposts}
            relatedArtists={relatedArtists}
            visibleTracks={visibleTracks}
            visibleReposts={visibleReposts}
            onShowMoreTracks={() => setVisibleTracks((n) => n + 100)}
            onShowMoreReposts={() => setVisibleReposts((n) => n + 100)}
          />
        )}

        {activeTab === 'tracks' && (
          <ArtistTracksTab
            tracks={tracks}
            visibleCount={visibleTracks}
            onShowMore={() => setVisibleTracks((n) => n + 100)}
          />
        )}

        {activeTab === 'reposts' && (
          <ArtistRepostsTab
            reposts={reposts}
            visibleCount={visibleReposts}
            onShowMore={() => setVisibleReposts((n) => n + 100)}
          />
        )}

        {activeTab === 'playlists' && (
          <ArtistPlaylistsTab playlists={playlists} />
        )}
      </div>
    </div>
  );
}

export default ArtistPage;