import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TrackList } from '../components/TrackList';
import { TrackCard } from '../components/TrackCard';
import { HorizontalScroll } from '../components/HorizontalScroll';
import { Icon } from '../components/Icon';
import { api } from '../lib/api';
import { useStore } from '../store/store';
import type { User, Track, Playlist } from '../store/types';
import { useSmoothScroll } from '../hooks/useSmoothScroll';

export function ArtistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const scrollRef = useSmoothScroll<HTMLDivElement>();
  const cached = useStore((s) => (id ? s.artistPage.cache[id] : undefined));
  const setArtistCache = useStore((s) => s.setArtistCache);

  const [playlists, setPlaylists] = useState<Playlist[]>(cached?.playlists ?? []);
  const [artist, setArtist] = useState<User | null>(cached?.artist ?? null);
  const [popularTracks, setPopularTracks] = useState<Track[]>(cached?.popularTracks ?? []);
  const [tracks, setTracks] = useState<Track[]>(cached?.tracks ?? []);
  const [relatedArtists, setRelatedArtists] = useState<User[]>(cached?.relatedArtists ?? []);
  const [isLoading, setIsLoading] = useState(!cached);
  const [reposts, setReposts] = useState<Track[]>(cached?.reposts ?? []);
  const [activeTab, setActiveTab] = useState<'all' | 'tracks' | 'playlists' | 'reposts'>(cached?.tab ?? 'all');
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

  const rootRef = useRef<HTMLDivElement | null>(null);

  const setRefs = useCallback((el: HTMLDivElement | null) => {
    scrollRef(el);
    rootRef.current = el;
  }, [scrollRef]);

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
      <div
        ref={setRefs}
        className="h-full overflow-y-auto bg-bg-primary"
      >
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

  const coverUrl = artist.avatar_url?.replace('-large', '-t500x500') || null;

  const formatCount = (n: number | undefined) => {
    if (!n) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n);
  };

return (
<div
  ref={setRefs}
  className={`h-full overflow-y-auto bg-bg-primary ${
    activeTab === 'all' ? 'custom-scrollbar-hidden' : 'custom-scrollbar'
  }`}
>
  <div className="relative px-6 pt-8 pb-6">
  <div className="flex gap-6 items-start">
    {/* аватар слева */}
    <div className="flex-shrink-0">
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={artist.username}
          className="w-40 h-40 rounded-full object-cover border-2 border-border-subtle shadow-xl"
        />
      ) : (
        <div className="w-40 h-40 rounded-full bg-bg-secondary flex items-center justify-center border-2 border-border-subtle">
          <Icon name="mic" size={64} className="text-text-tertiary" />
        </div>
      )}
    </div>

    {/* всё остальное справа */}
    <div className="flex-1 min-w-0 pt-2">
      {/* имя */}
      <div className="flex items-center gap-2">
        <h1 className="text-4xl font-bold text-text-primary truncate">{artist.username}</h1>
        {artist.verified && (
          <Icon name="check-circle" size={24} className="text-text-secondary flex-shrink-0" />
        )}
      </div>

      {artist.full_name && artist.full_name !== artist.username && (
        <p className="text-text-secondary text-lg mt-1 truncate">{artist.full_name}</p>
      )}

      {(artist.city || artist.country_code) && (
        <p className="text-text-tertiary text-sm mt-1 flex items-center gap-1">
          <Icon name="map-pin" size={12} />
          {[artist.city, artist.country_code].filter(Boolean).join(', ')}
        </p>
      )}

      {/* счётчики */}
      <div className="flex items-center gap-6 mt-5">
        <div className="flex flex-col">
          <span className="text-lg font-semibold text-text-primary">
            {formatCount(artist.followers_count)}
          </span>
          <span className="text-xs text-text-tertiary">подписчиков</span>
        </div>

        <div className="flex flex-col">
          <span className="text-lg font-semibold text-text-primary">
            {formatCount(artist.followings_count)}
          </span>
          <span className="text-xs text-text-tertiary">подписок</span>
        </div>

<div className="flex flex-col">
  <span className="text-lg font-semibold text-text-primary">
    {formatCount(tracks.length)}
  </span>
  <span className="text-xs text-text-tertiary">треков</span>
</div>

<div className="flex flex-col">
  <span className="text-lg font-semibold text-text-primary">
    {formatCount(reposts.length)}
  </span>
  <span className="text-xs text-text-tertiary">репостов</span>
</div>

        <div className="flex flex-col">
          <span className="text-lg font-semibold text-text-primary">
            {formatCount(artist.likes_count)}
          </span>
          <span className="text-xs text-text-tertiary">лайков</span>
        </div>
      </div>

      {/* описание */}
      {artist.description && (
        <p className="text-text-tertiary text-sm mt-4 line-clamp-3 leading-relaxed">
          {artist.description}
        </p>
      )}
    </div>
  </div>
</div>

<div className="flex gap-6 ml-8">
  <TabButton active={activeTab === 'all'} onClick={() => { setActiveTab('all'); if (id) setArtistCache(id, { tab: 'all' }); }}>
    все
  </TabButton>
  <TabButton active={activeTab === 'tracks'} onClick={() => { setActiveTab('tracks'); if (id) setArtistCache(id, { tab: 'tracks' }); }}>
    треки
  </TabButton>
  <TabButton active={activeTab === 'playlists'} onClick={() => { setActiveTab('playlists'); if (id) setArtistCache(id, { tab: 'playlists' }); }}>
    плейлисты
  </TabButton>
  <TabButton active={activeTab === 'reposts'} onClick={() => { setActiveTab('reposts'); if (id) setArtistCache(id, { tab: 'reposts' }); }}>
    репосты
  </TabButton>
</div>

{/* контент вкладки */}
<div className="px-6 py-6">
{activeTab === 'all' && (
  <div className="space-y-8">
    {popularTracks.length > 0 && (
      <section>
        <h2 className="text-xl font-bold text-text-primary mb-4">популярные</h2>
        <HorizontalScroll gap={20}>
          {popularTracks.map((track, i) => (
            <TrackCard key={track.id} track={track} index={i} tracks={popularTracks} />
          ))}
        </HorizontalScroll>
      </section>
    )}

{(tracks.length > 0 || reposts.length > 0) && (
  <div className={`grid gap-6 ${tracks.length > 0 && reposts.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
    {tracks.length > 0 && (
      <ScrollableSection title="треки" count={tracks.length}>
        <TrackList tracks={tracks.slice(0, visibleTracks)} showNumber={false} />
        {visibleTracks < tracks.length && (
          <button
            onClick={() => setVisibleTracks(visibleTracks + 100)}
            className="w-full mt-2 py-2 rounded-lg text-xs text-text-secondary bg-bg-secondary hover:bg-text-secondary hover:text-bg-primary transition-colors"
          >
            показать ещё {Math.min(100, tracks.length - visibleTracks)}
          </button>
        )}
      </ScrollableSection>
    )}

    {reposts.length > 0 && (
      <ScrollableSection title="репосты" count={reposts.length}>
        <TrackList tracks={reposts.slice(0, visibleReposts)} showNumber={false}/>
        {visibleReposts < reposts.length && (
          <button
            onClick={() => setVisibleReposts(visibleReposts + 100)}
            className="w-full mt-2 py-2 rounded-lg text-xs text-text-secondary bg-bg-secondary hover:bg-text-secondary hover:text-bg-primary transition-colors"
          >
            показать ещё {Math.min(100, reposts.length - visibleReposts)}
          </button>
        )}
      </ScrollableSection>
    )}
  </div>
)}

    {relatedArtists.length > 0 && (
      <section>
        <h2 className="text-xl font-bold text-text-primary mb-4">похожие</h2>
        <HorizontalScroll gap={16}>
          {relatedArtists.map((a) => (
            <ArtistCard key={a.id} artist={a} />
          ))}
        </HorizontalScroll>
      </section>
    )}

    {!popularTracks.length && !tracks.length && !reposts.length && (
      <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
        <Icon name="music" size={64} className="mb-4 opacity-30" />
        <p>у этого артиста пока ничего нет</p>
      </div>
    )}
  </div>
)}

  {activeTab === 'tracks' && (
    <>
      {tracks.length > 0 ? (
        <>
          <TrackList tracks={tracks.slice(0, visibleTracks)} />
          {visibleTracks < tracks.length && (
            <button
              onClick={() => setVisibleTracks(visibleTracks + 100)}
              className="w-full mt-4 py-2 rounded-lg text-sm text-text-secondary bg-bg-secondary hover:bg-text-secondary hover:text-bg-primary transition-colors"
            >
              показать ещё {Math.min(100, tracks.length - visibleTracks)}
            </button>
          )}
        </>
      ) : (
        <EmptyState text="у этого артиста нет треков" />
      )}
    </>
  )}

  {activeTab === 'reposts' && (
    <>
      {reposts.length > 0 ? (
        <>
          <TrackList tracks={reposts.slice(0, visibleReposts)} />
          {visibleReposts < reposts.length && (
            <button
              onClick={() => setVisibleReposts(visibleReposts + 100)}
              className="w-full mt-4 py-2 rounded-lg text-sm text-text-secondary bg-bg-secondary hover:bg-text-secondary hover:text-bg-primary transition-colors"
            >
              показать ещё {Math.min(100, reposts.length - visibleReposts)}
            </button>
          )}
        </>
      ) : (
        <EmptyState text="нет репостов" />
      )}
    </>
  )}

  {activeTab === 'playlists' && (
  <>
    {playlists.length > 0 ? (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {playlists.map((pl) => (
          <ArtistPlaylistCard key={pl.id} playlist={pl} />
        ))}
      </div>
    ) : (
      <EmptyState text="нет плейлистов" />
    )}
  </>
)}
</div>
    </div>
  );
}

function ArtistCard({ artist }: { artist: User }) {
  const navigate = useNavigate();
  const avatarUrl = artist.avatar_url?.replace('-large', '-t300x300') || null;

  return (
    <div
      onClick={() => navigate(`/artist/${artist.id}`)}
      className="w-[140px] flex-shrink-0 cursor-pointer group"
    >
      <div className="aspect-square rounded-full overflow-hidden bg-bg-secondary border border-border-subtle group-hover:border-border-visible transition-all duration-300">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={artist.username}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon name="mic" size={32} className="text-text-tertiary" />
          </div>
        )}
      </div>

      <p className="mt-2 text-sm font-medium text-text-primary truncate text-center group-hover:text-text-secondary transition-colors">
        {artist.username}
      </p>

      {artist.followers_count !== undefined && (
        <p className="text-xs text-text-tertiary truncate text-center">
          {artist.followers_count.toLocaleString()} подписчиков
        </p>
      )}
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative py-3 text-sm font-medium transition-colors duration-200 ${
        active ? 'text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
      }`}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-text-primary rounded-full" />
      )}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
      <Icon name="music" size={64} className="mb-4 opacity-30" />
      <p>{text}</p>
    </div>
  );
}

interface ScrollableSectionProps {
  title: string;
  count: number;
  children: React.ReactNode;
}

function ScrollableSection({ title, count, children }: ScrollableSectionProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 4);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll);
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      observer.disconnect();
    };
  }, [children]);

  return (
    <section className="flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-text-primary">{title}</h2>
        <span className="text-xs text-text-tertiary tabular-nums">{count}</span>
      </div>

      <div className="relative">
        {/* верхняя тень */}
        <div
          className={`pointer-events-none absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-bg-primary to-transparent z-10 transition-opacity duration-300 ${
            canScrollUp ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <div
          ref={scrollRef}
          className="max-h-[600px] overflow-y-auto custom-scrollbar pr-2"
        >
          {children}
        </div>

        {/* нижняя тень */}
        <div
          className={`pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-bg-primary to-transparent z-10 transition-opacity duration-300 ${
            canScrollDown ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
    </section>
  );
}

function ArtistPlaylistCard({ playlist }: { playlist: Playlist }) {
  const navigate = useNavigate();
  const coverUrl = playlist.artwork_url?.replace('-large', '-t500x500') || null;
  const title = playlist.title || playlist.name || 'без названия';

  const typeLabel = {
    album: 'альбом',
    ep: 'ep',
    playlist: 'плейлист',
  }[playlist.playlist_type || 'playlist'];

  return (
    <div
      onClick={() => navigate(`/playlist/${playlist.id}`)}
      className="cursor-pointer group"
    >
      <div className="aspect-square rounded-xl overflow-hidden bg-bg-secondary border border-border-subtle group-hover:border-border-visible transition-all duration-300 shadow-lg shadow-white/0 group-hover:shadow-white/5">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon name="folder" size={48} className="text-text-tertiary" />
          </div>
        )}
      </div>

      <p className="mt-2 text-sm font-medium text-text-primary truncate group-hover:text-text-secondary transition-colors">
        {title}
      </p>

      <p className="text-xs text-text-tertiary truncate">
        {typeLabel}
        {playlist.track_count && ` · ${playlist.track_count} треков`}
      </p>
    </div>
  );
}

export default ArtistPage;