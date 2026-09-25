import { api } from '@lib/api';
import type { Track, User, Playlist } from '../types';

export interface CacheSlice {
  search: {
    query: string;
    filter: 'tracks' | 'playlists' | 'artists';
  };
  searchPage: {
    query: string;
    filter: 'tracks' | 'artists' | 'playlists';
    tracks: Track[];
    artists: User[];
    playlists: Playlist[];
    offset: number;
    hasMore: boolean;
    scrollTop: number;
    isFresh: boolean;
  };
  artistPage: {
    cache: Record<string, {
      artist: User;
      popularTracks: Track[];
      tracks: Track[];
      reposts: Track[];
      playlists: Playlist[];
      relatedArtists: User[];
      tab: 'all' | 'tracks' | 'playlists' | 'reposts';
      scrollTop: number;
    }>;
  };
  playlistPage: {
    cache: Record<string, {
      playlist: Playlist;
      tracks: Track[];
      scrollTop: number;
    }>;
  };
  homePage: {
    popularTracks: Track[];
    myWaveTracks: Track[];
    isLoadingPopular: boolean;
    isLoadingWave: boolean;
    isPopularLoaded: boolean;
    isMyWaveLoaded: boolean;
  };

  setSearchQuery: (query: string) => void;
  setSearchFilter: (filter: 'tracks' | 'playlists' | 'artists') => void;
  setSearchPage: (patch: Partial<CacheSlice['searchPage']>) => void;
  resetSearchPage: () => void;
  setArtistCache: (id: string, data: Partial<CacheSlice['artistPage']['cache'][string]>) => void;
  setPlaylistCache: (id: string, data: Partial<CacheSlice['playlistPage']['cache'][string]>) => void;
  setHomePagePopular: (tracks: Track[]) => void;
  setHomePageMyWave: (tracks: Track[]) => void;
  setHomePageLoadingPopular: (loading: boolean) => void;
  setHomePageLoadingWave: (loading: boolean) => void;
  setHomePagePopularLoaded: (loaded: boolean) => void;
  setHomePageMyWaveLoaded: (loaded: boolean) => void;
  addHomePagePopularTracks: (tracks: Track[]) => void;
  preloadHomePageData: () => Promise<void>;
}

export const createCacheSlice = (set: any, get: any) => ({
  search: {
    query: '',
    filter: 'tracks' as const,
  },
  searchPage: {
    query: '',
    filter: 'tracks' as const,
    tracks: [],
    artists: [],
    playlists: [],
    offset: 0,
    hasMore: true,
    scrollTop: 0,
    isFresh: false,
  },
  artistPage: {
    cache: {},
  },
  playlistPage: {
    cache: {},
  },
  homePage: {
    popularTracks: [],
    myWaveTracks: [],
    isLoadingPopular: false,
    isLoadingWave: false,
    isPopularLoaded: false,
    isMyWaveLoaded: false,
  },

  setSearchQuery: (query: string) => set((s: any) => ({ search: { ...s.search, query } })),

  setSearchFilter: (filter: 'tracks' | 'playlists' | 'artists') =>
    set((s: any) => ({ search: { ...s.search, filter } })),

  setSearchPage: (patch: Partial<CacheSlice['searchPage']>) =>
    set((s: any) => ({ searchPage: { ...s.searchPage, ...patch } })),

  resetSearchPage: () => set((s: any) => ({
    searchPage: { ...s.searchPage, tracks: [], artists: [], playlists: [], offset: 0, hasMore: true },
  })),

  setArtistCache: (id: string, data: Partial<CacheSlice['artistPage']['cache'][string]>) =>
    set((s: any) => ({
      artistPage: {
        cache: {
          ...s.artistPage.cache,
          [id]: { ...s.artistPage.cache[id], ...data } as any,
        },
      },
    })),

  setPlaylistCache: (id: string, data: Partial<CacheSlice['playlistPage']['cache'][string]>) =>
    set((s: any) => ({
      playlistPage: {
        cache: {
          ...s.playlistPage.cache,
          [id]: { ...s.playlistPage.cache[id], ...data } as any,
        },
      },
    })),

  setHomePagePopular: (tracks: Track[]) =>
    set((s: any) => ({ homePage: { ...s.homePage, popularTracks: tracks } })),

  setHomePageMyWave: (tracks: Track[]) =>
    set((s: any) => ({ homePage: { ...s.homePage, myWaveTracks: tracks } })),

  setHomePageLoadingPopular: (loading: boolean) =>
    set((s: any) => ({ homePage: { ...s.homePage, isLoadingPopular: loading } })),

  setHomePageLoadingWave: (loading: boolean) =>
    set((s: any) => ({ homePage: { ...s.homePage, isLoadingWave: loading } })),

  setHomePagePopularLoaded: (loaded: boolean) =>
    set((s: any) => ({ homePage: { ...s.homePage, isPopularLoaded: loaded } })),

  setHomePageMyWaveLoaded: (loaded: boolean) =>
    set((s: any) => ({ homePage: { ...s.homePage, isMyWaveLoaded: loaded } })),

  addHomePagePopularTracks: (tracks: Track[]) =>
    set((s: any) => ({ homePage: { ...s.homePage, popularTracks: [...s.homePage.popularTracks, ...tracks] } })),

  preloadHomePageData: async () => {
    const { homePage, library } = get();

    if (!homePage.isPopularLoaded && !homePage.isLoadingPopular) {
      get().setHomePageLoadingPopular(true);
      try {
        const tracks = await api.getPopular(20, 0);
        get().setHomePagePopular(tracks);
        get().setHomePagePopularLoaded(true);
      } catch {}
      get().setHomePageLoadingPopular(false);
    }

    if (!homePage.isMyWaveLoaded && !homePage.isLoadingWave) {
      get().setHomePageLoadingWave(true);
      try {
        const artists = [...new Set(library.history.map((t: Track) => t.user?.username).filter(Boolean))] as string[];
        const tracks = artists.length
          ? await api.getMyWave(artists.slice(0, 5), 6)
          : await api.getPopular(6);
        get().setHomePageMyWave(tracks);
        get().setHomePageMyWaveLoaded(true);
      } catch {}
      get().setHomePageLoadingWave(false);
    }
  },
});