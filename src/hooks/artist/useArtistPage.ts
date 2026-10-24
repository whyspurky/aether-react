import { useCallback, useEffect, useMemo, useRef } from 'react';
import { api } from '@lib/api';
import { isRelease } from '@lib/playlist';
import { useStore } from '@store/store';
import { createEmptyArtistEntry } from '@store/slices/cache';
import type {
  ArtistSectionKey,
  ArtistTab,
  ArtistTracksSort,
  Playlist,
  Track,
  User,
} from '@store/types';

const CACHE_TTL_MS = 5 * 60 * 1000;
const TRACKS_PAGE = 30;
const POPULAR_LIMIT = 10;
const SIDE_LIMIT = 12;
const LOAD_CONCURRENCY = 2;

const BASE_SECTIONS: ArtistSectionKey[] = [
  'popular',
  'tracksPopular',
  'tracks',
  'playlists',
  'reposts',
  'related',
];

export function mapArtistError(error: unknown): string {
  const raw = (error instanceof Error ? error.message : String(error ?? '')).toLowerCase();
  if (raw.includes('unauthorized') || raw.includes('401')) {
    return 'soundcloud не принял client_id, нужен свежий ключ в api/mod.rs';
  }
  if (raw.includes('429')) return 'soundcloud ограничил запросы, попробуй через минуту';
  if (raw.includes('не найдено') || raw.includes('404')) return 'артист не найден';
  if (raw.includes('сеть') || raw.includes('network')) return 'нет связи с soundcloud, проверь прокси';
  return 'не удалось загрузить';
}

const dedupeById = <T extends { id?: number | string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const id = item?.id;
    if (id === undefined || id === null) continue;
    const key = String(id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
};

// пока грузится профиль, шапку можно нарисовать по user из трека
function findSeedArtist(uid: number): User | null {
  const state = useStore.getState();
  const pools = [state.library.favorites, state.library.history, state.queue.tracks];
  for (const pool of pools) {
    const user = pool.find((track) => track.user?.id === uid)?.user;
    if (user) return user;
  }
  return null;
}

type SectionMode = 'initial' | 'more';

export type ArtistLoadMoreKey = 'tracks' | 'tracksPopular' | 'playlists' | 'reposts' | 'related';

export function useArtistPage(id: string | undefined) {
  const uid = useMemo(() => {
    const n = Number(id);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [id]);

  const entry = useStore((s) => (id ? s.artistPage.cache[id] : undefined));
  const setArtistCache = useStore((s) => s.setArtistCache);
  const updateArtistSection = useStore((s) => s.updateArtistSection);
  const plays = useStore((s) => (uid ? s.artistScores[uid]?.plays ?? 0 : 0));

  const requestRef = useRef(0);
  const loadingRef = useRef<Set<ArtistSectionKey>>(new Set());

  const loadSection = useCallback(
    async (key: ArtistSectionKey, mode: SectionMode = 'initial', force = false) => {
      if (!id || !uid) return;
      if (loadingRef.current.has(key)) return;

      const current = useStore.getState().artistPage.cache[id];
      if (!current) return;

      const meta = current.sections[key];
      if (mode === 'initial' && !force && meta.status === 'ready') return;
      if (mode === 'more' && !meta.hasMore) return;

      const token = requestRef.current;
      const offset = mode === 'more' ? meta.offset : 0;

      loadingRef.current.add(key);
      // статус loading нужен и при догрузке, иначе спиннер пагинации не показывается
      updateArtistSection(id, key, { meta: { status: 'loading', error: null } });

      try {
        let result: {
          items: Track[] | User[] | Playlist[];
          hasMore: boolean;
          count?: number;
          cursor?: string;
        };
        let repostAlbums: Playlist[] | null = null;

        switch (key) {
          case 'popular':
            result = await api.getUserPopularTracks(uid, POPULAR_LIMIT);
            break;
          case 'tracksPopular':
            result = await api.getUserTracks(uid, TRACKS_PAGE, offset, 'popular');
            break;
          case 'tracks':
            // у новых треков страницы идут по курсору из next_href, числовой offset api-v2 не понимает
            result = await api.getUserTracks(
              uid,
              TRACKS_PAGE,
              offset,
              'new',
              mode === 'more' ? meta.cursor ?? undefined : undefined
            );
            break;
          case 'playlists':
            result = await api.getUserPlaylists(uid, TRACKS_PAGE, offset);
            break;
          case 'reposts': {
            const reposts = await api.getUserReposts(uid, TRACKS_PAGE, offset);
            result = reposts;
            repostAlbums = reposts.playlists;
            break;
          }
          case 'related':
            result = await api.getRelatedArtists(uid, SIDE_LIMIT, offset);
            break;
        }

        if (token !== requestRef.current) return;

        const existing = (current as unknown as Record<string, { id?: number | string }[]>)[key] ?? [];
        const existingIds = new Set(existing.map((item) => String(item.id)));
        const fresh =
          mode === 'more' ? result.items.filter((item) => !existingIds.has(String(item.id))) : result.items;

        // страница целиком из дублей значит пагинация зациклилась, стоп
        const hasMore = result.items.length > 0 && result.hasMore && (mode === 'initial' || fresh.length > 0);

        let extra: { repostPlaylists?: Playlist[] } | undefined;
        if (key === 'reposts' && repostAlbums) {
          const albums =
            mode === 'more' ? dedupeById([...current.repostPlaylists, ...repostAlbums]) : repostAlbums;
          extra = { repostPlaylists: albums };
        }

        updateArtistSection(id, key, {
          items: fresh as Track[] | Playlist[] | User[],
          mode: mode === 'more' ? 'append' : 'replace',
          extra,
          meta: {
            status: 'ready',
            error: null,
            hasMore,
            offset: offset + (result.count ?? result.items.length),
            cursor: key === 'tracks' ? result.cursor ?? null : null,
          },
        });
      } catch (error) {
        if (token !== requestRef.current) return;
        updateArtistSection(id, key, {
          meta: { status: 'error', error: mapArtistError(error), hasMore: meta.hasMore },
        });
      } finally {
        loadingRef.current.delete(key);
      }
    },
    [id, uid, updateArtistSection]
  );

  const bootstrap = useCallback(
    async (force = false) => {
      if (!id || !uid) return;

      const token = ++requestRef.current;
      const state = useStore.getState();
      const cached = state.artistPage.cache[id];
      const stale = !cached || Date.now() - cached.updatedAt > CACHE_TTL_MS;

      if (!cached) {
        setArtistCache(id, createEmptyArtistEntry(null));
      }

      // seed из трека это не полный профиль, обновляем его как обычную загрузку
      const hasRealArtist = !!cached?.artist && cached.updatedAt > 0;

      if (!hasRealArtist) {
        const seed = cached?.artist ?? findSeedArtist(uid);
        setArtistCache(id, { status: 'loading', error: null, ...(seed ? { artist: seed } : {}) });
        try {
          const user = await api.getUser(uid);
          if (token !== requestRef.current) return;
          if (!user) {
            setArtistCache(id, { status: 'error', error: 'артист не найден' });
            return;
          }
          setArtistCache(id, { artist: user, status: 'ready', error: null, updatedAt: Date.now() });
        } catch (error) {
          if (token !== requestRef.current) return;
          const message = mapArtistError(error);
          setArtistCache(id, { status: 'error', error: message });
          // секции без профиля всё равно грузим, но показываем им ту же ошибку
          for (const key of BASE_SECTIONS) {
            updateArtistSection(id, key, {
              meta: { status: 'error', error: message, hasMore: false },
            });
          }
          return;
        }
      }

      if (!stale && !force) return;

      const fresh = useStore.getState().artistPage.cache[id];
      const activeSort: ArtistTracksSort = fresh?.tracksSort ?? 'popular';
      const activeTracksKey: ArtistSectionKey = activeSort === 'new' ? 'tracks' : 'tracksPopular';
      const order = Array.from(new Set<ArtistSectionKey>([...BASE_SECTIONS, activeTracksKey]));

      const keys = order.filter((key) => {
        if (force || stale) return true;
        const meta = fresh?.sections[key];
        return !meta || meta.status !== 'ready';
      });

      let cursor = 0;
      const worker = async () => {
        while (cursor < keys.length) {
          const key = keys[cursor];
          cursor += 1;
          if (token !== requestRef.current) return;
          await loadSection(key, 'initial', true);
        }
      };

      await Promise.all(Array.from({ length: LOAD_CONCURRENCY }, () => worker()));
    },
    [id, uid, loadSection, setArtistCache, updateArtistSection]
  );

  useEffect(() => {
    void bootstrap();
    return () => {
      requestRef.current += 1;
    };
  }, [bootstrap]);

  const allPlaylists = entry?.playlists ?? [];

  const releases = useMemo(() => allPlaylists.filter(isRelease), [allPlaylists]);
  const playlists = useMemo(() => allPlaylists.filter((p) => !isRelease(p)), [allPlaylists]);

  const tracksSort = entry?.tracksSort ?? 'popular';
  const tracks = entry?.tracks ?? [];
  const tracksPopular = entry?.tracksPopular ?? [];
  const visibleTracks = tracksSort === 'new' ? tracks : tracksPopular;
  const popular = entry?.popular ?? [];
  const reposts = entry?.reposts ?? [];
  const repostPlaylists = entry?.repostPlaylists ?? [];
  const related = entry?.related ?? [];

  const setTab = useCallback(
    (tab: ArtistTab) => {
      if (!id) return;
      setArtistCache(id, { tab });
    },
    [id, setArtistCache]
  );

  const setTracksSort = useCallback(
    (sort: ArtistTracksSort) => {
      if (!id) return;
      setArtistCache(id, { tracksSort: sort });
      const key: ArtistSectionKey = sort === 'new' ? 'tracks' : 'tracksPopular';
      const current = useStore.getState().artistPage.cache[id];
      if (current && current.sections[key].status !== 'ready') {
        void loadSection(key, 'initial');
      }
    },
    [id, loadSection, setArtistCache]
  );

  const saveScrollTop = useCallback(
    (tab: ArtistTab, top: number) => {
      if (!id) return;
      const current = useStore.getState().artistPage.cache[id];
      if (!current) return;
      setArtistCache(id, { scrollTopByTab: { ...current.scrollTopByTab, [tab]: top } });
    },
    [id, setArtistCache]
  );

  const loadMore = useCallback(
    (key: ArtistLoadMoreKey) => loadSection(key, 'more'),
    [loadSection]
  );

  const retrySection = useCallback(
    (key: ArtistSectionKey) => loadSection(key, 'initial', true),
    [loadSection]
  );

  const sections = entry?.sections ?? createEmptyArtistEntry().sections;

  return {
    uid,
    artist: entry?.artist ?? null,
    status: entry?.status ?? 'loading',
    heroError: entry?.error ?? null,
    tab: entry?.tab ?? 'overview',
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
    retryHero: () => bootstrap(true),
  };
}
