import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@components/ui/Icon';
import { useStore } from '@store/store';
import type { ArtistTab } from '@store/types';
import { useArtistPage } from '@hooks/artist/useArtistPage';
import { withViewTransition } from '@lib/viewTransition';
import { ArtistHeader } from '@components/artist/ArtistHeader';
import { ArtistCompactHeader } from '@components/artist/ArtistCompactHeader';
import { ArtistTabs } from '@components/artist/ArtistTabs';
import { ArtistOverviewTab } from '@components/artist/ArtistOverviewTab';
import { ArtistTracksTab } from '@components/artist/ArtistTracksTab';
import { ArtistPlaylistsTab } from '@components/artist/ArtistPlaylistsTab';
import { ArtistRepostsTab } from '@components/artist/ArtistRepostsTab';
import { ArtistEmpty, ArtistSectionError } from '@components/artist/ArtistEmpty';
import {
  ArtistCompactSkeleton,
  ArtistHeroSkeleton,
  ArtistOverviewSkeleton,
} from '@components/artist/ArtistSkeletons';

function BackRow({ onBack, label }: { onBack: () => void; label?: string }) {
  return (
    <div className="px-6 pt-3 pb-1">
      <button
        type="button"
        onClick={onBack}
        aria-label="назад"
        className="flex items-center gap-1 min-w-0 max-w-full px-2 py-1 rounded-full text-xs text-text-tertiary hover:text-text-primary transition-colors outline-none focus-visible:text-text-primary"
      >
        <Icon name="chevron-left" size={16} />
        <span className="truncate font-semibold text-text-secondary">{label || 'назад'}</span>
      </button>
    </div>
  );
}

export function ArtistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    uid,
    artist,
    status,
    heroError,
    tab,
    sections,
    popular,
    tracks,
    tracksPopular,
    visibleTracks,
    tracksSort,
    releases,
    playlists,
    reposts,
    repostPlaylists,
    related,
    plays,
    setTab,
    setTracksSort,
    saveScrollTop,
    loadMore,
    retrySection,
    retryHero,
  } = useArtistPage(id);

  const playTrack = useStore((s) => s.playTrack);
  const setShuffle = useStore((s) => s.setShuffle);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const setScrollEl = useCallback((el: HTMLDivElement | null) => {
    scrollRef.current = el;
  }, []);

  const tabRef = useRef(tab);
  tabRef.current = tab;

  useEffect(() => {
    if (id && !uid) navigate('/search', { replace: true });
  }, [id, uid, navigate]);

  // прямой заход по ссылке не имеет истории, тогда уходим в поиск
  const goBack = useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/search', { replace: true });
  }, [navigate]);

  // позиция скролла своя у каждого таба, восстанавливаем до кадра перехода
  useLayoutEffect(() => {
    if (!id) return;
    const saved = useStore.getState().artistPage.cache[id]?.scrollTopByTab?.[tab] ?? 0;
    if (scrollRef.current) scrollRef.current.scrollTop = saved;
  }, [id, tab]);

  useEffect(() => {
    return () => {
      const el = scrollRef.current;
      if (id && el) saveScrollTop(tabRef.current, el.scrollTop);
    };
  }, [id, saveScrollTop]);

  const handleTabChange = (next: ArtistTab) => {
    if (next === tab) return;

    const currentTop = scrollRef.current?.scrollTop ?? 0;
    // обзор всегда открывается сверху, иначе морф шапки уезжает вместе со скроллом
    const resetScroll = next === 'overview' || tab === 'overview';

    if (scrollRef.current) saveScrollTop(tab, currentTop);

    if (resetScroll) {
      saveScrollTop('overview', 0);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }

    const targetTop = resetScroll
      ? 0
      : id
        ? useStore.getState().artistPage.cache[id]?.scrollTopByTab?.[next] ?? 0
        : 0;

    // морф аватара имеет смысл только когда шапка видна в обоих состояниях
    const headerVisibleNow = tab === 'overview' ? resetScroll || currentTop < 160 : true;
    const headerVisibleNext = next === 'overview' ? resetScroll || targetTop < 160 : true;

    if (headerVisibleNow && headerVisibleNext) {
      withViewTransition(() => setTab(next));
    } else {
      setTab(next);
    }
  };

  // шапка играет тот порядок, который сейчас выбран во вкладке треков
  const baseTracks = useMemo(() => {
    const sorted = tracksSort === 'new' ? tracks : tracksPopular;
    if (sorted.length) return sorted;
    if (popular.length) return popular;
    return visibleTracks;
  }, [tracksSort, tracks, tracksPopular, popular, visibleTracks]);

  const canPlay = baseTracks.length > 0;
  const source = `артист ${artist?.username ?? ''}`.trim();

  const handlePlay = useCallback(() => {
    if (!baseTracks.length) return;
    if (useStore.getState().player.shuffle) setShuffle(false);
    void playTrack(baseTracks[0], baseTracks, 0, source);
  }, [baseTracks, playTrack, setShuffle, source]);

  // очередь ставит выбранный трек первым, поэтому старт берём случайный
  const handleShuffle = useCallback(() => {
    if (!baseTracks.length) return;
    const index = Math.floor(Math.random() * baseTracks.length);
    setShuffle(true);
    void playTrack(baseTracks[index], baseTracks, index, source);
  }, [baseTracks, playTrack, setShuffle, source]);

  const tracksKey = tracksSort === 'new' ? 'tracks' : 'tracksPopular';
  const handleTracksMore = useCallback(() => loadMore(tracksKey), [loadMore, tracksKey]);
  const handleTracksRetry = useCallback(() => retrySection(tracksKey), [retrySection, tracksKey]);
  const handlePlaylistsMore = useCallback(() => loadMore('playlists'), [loadMore]);
  const handlePlaylistsRetry = useCallback(() => retrySection('playlists'), [retrySection]);
  const handleRepostsMore = useCallback(() => loadMore('reposts'), [loadMore]);
  const handleRepostsRetry = useCallback(() => retrySection('reposts'), [retrySection]);
  const handleRelatedMore = useCallback(() => loadMore('related'), [loadMore]);

  const counts = useMemo(
    () =>
      ({
        tracks: artist?.track_count || visibleTracks.length,
        releases: releases.length,
        playlists: playlists.length,
        reposts: artist?.reposts_count || reposts.length + repostPlaylists.length,
      }) as Partial<Record<ArtistTab, number>>,
    [
      artist,
      visibleTracks.length,
      releases.length,
      playlists.length,
      reposts.length,
      repostPlaylists.length,
    ]
  );

  // разделы без содержимого не показываем, но только когда ответ по ним уже пришёл
  const hiddenTabs = useMemo<ArtistTab[]>(() => {
    const hidden: ArtistTab[] = [];

    if (
      sections.tracks.status === 'ready' &&
      sections.tracksPopular.status === 'ready' &&
      !sections.tracks.hasMore &&
      !sections.tracksPopular.hasMore &&
      !tracks.length &&
      !tracksPopular.length &&
      !popular.length
    ) {
      hidden.push('tracks');
    }

    if (sections.playlists.status === 'ready' && !sections.playlists.hasMore) {
      if (!releases.length) hidden.push('releases');
      if (!playlists.length) hidden.push('playlists');
    }

    if (
      sections.reposts.status === 'ready' &&
      !sections.reposts.hasMore &&
      !reposts.length &&
      !repostPlaylists.length
    ) {
      hidden.push('reposts');
    }

    return hidden;
  }, [
    sections,
    tracks.length,
    tracksPopular.length,
    popular.length,
    releases.length,
    playlists.length,
    reposts.length,
    repostPlaylists.length,
  ]);

  // если активный раздел оказался пустым, возвращаемся на обзор
  useEffect(() => {
    if (hiddenTabs.includes(tab)) setTab('overview');
  }, [hiddenTabs, tab, setTab]);

  if (status === 'error' && !artist) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-bg-primary/40">
        <BackRow onBack={goBack} />
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hidden flex items-center justify-center px-6">
          <ArtistEmpty
            icon="alert-circle"
            title={heroError || 'не удалось загрузить артиста'}
            hint="проверь прокси и client_id, потом попробуй снова"
            actionLabel="повторить"
            onAction={retryHero}
          />
        </div>
      </div>
    );
  }

  const isOverview = tab === 'overview';

  const heroErrorBlock =
    status === 'error' && artist ? (
      <div className="px-6 pt-3">
        <ArtistSectionError
          message={heroError || 'не удалось обновить профиль'}
          onRetry={retryHero}
          compact
        />
      </div>
    ) : null;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-bg-primary/40">
      {isOverview ? (
        <>
          <BackRow onBack={goBack} label={artist?.username} />

          <div
            ref={setScrollEl}
            aria-busy={status === 'loading'}
            className="flex-1 min-h-0 overflow-y-auto scrollbar-hidden"
          >
            {status === 'loading' && (
              <span role="status" className="sr-only">
                загрузка артиста
              </span>
            )}

            {artist ? (
              <ArtistHeader
                artist={artist}
                plays={plays}
                playlistsCount={artist.playlist_count || releases.length + playlists.length}
                onPlay={handlePlay}
                onShuffle={handleShuffle}
                canPlay={canPlay}
              />
            ) : (
              <ArtistHeroSkeleton />
            )}

            {heroErrorBlock}

            <ArtistTabs
              activeTab={tab}
              counts={counts}
              hidden={hiddenTabs}
              onChange={handleTabChange}
            />

            {artist ? (
              <ArtistOverviewTab
                sections={sections}
                popular={popular}
                releases={releases}
                playlists={playlists}
                related={related}
                onRetry={retrySection}
                onRelatedMore={handleRelatedMore}
                onChangeTab={handleTabChange}
              />
            ) : (
              <ArtistOverviewSkeleton />
            )}
          </div>
        </>
      ) : (
        <>
          <BackRow onBack={goBack} />

          {artist ? (
            <ArtistCompactHeader
              artist={artist}
              onPlay={handlePlay}
              onShuffle={handleShuffle}
              canPlay={canPlay}
            />
          ) : (
            <ArtistCompactSkeleton />
          )}

          {heroErrorBlock}

          <ArtistTabs
            activeTab={tab}
            counts={counts}
            hidden={hiddenTabs}
            onChange={handleTabChange}
          />

          <div
            ref={setScrollEl}
            aria-busy={status === 'loading'}
            className="flex-1 min-h-0 overflow-y-auto scrollbar-hidden"
          >
            {tab === 'tracks' && (
              <ArtistTracksTab
                tracks={visibleTracks}
                meta={tracksSort === 'new' ? sections.tracks : sections.tracksPopular}
                sort={tracksSort}
                onSortChange={setTracksSort}
                scrollRef={scrollRef}
                onPlay={handlePlay}
                onShuffle={handleShuffle}
                onLoadMore={handleTracksMore}
                onRetry={handleTracksRetry}
                total={artist?.track_count}
              />
            )}

            {tab === 'releases' && (
              <ArtistPlaylistsTab
                items={releases}
                meta={sections.playlists}
                variant="release"
                scrollRef={scrollRef}
                emptyTitle="у артиста нет альбомов и ep"
                emptyHint="синглы и ремиксы обычно лежат во вкладке треки"
                onLoadMore={handlePlaylistsMore}
                onRetry={handlePlaylistsRetry}
              />
            )}

            {tab === 'playlists' && (
              <ArtistPlaylistsTab
                items={playlists}
                meta={sections.playlists}
                variant="playlist"
                scrollRef={scrollRef}
                emptyTitle="у артиста нет плейлистов"
                onLoadMore={handlePlaylistsMore}
                onRetry={handlePlaylistsRetry}
              />
            )}

            {tab === 'reposts' && (
              <ArtistRepostsTab
                reposts={reposts}
                repostPlaylists={repostPlaylists}
                meta={sections.reposts}
                scrollRef={scrollRef}
                artistName={artist?.username ?? ''}
                onLoadMore={handleRepostsMore}
                onRetry={handleRepostsRetry}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default ArtistPage;
