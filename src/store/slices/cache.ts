import type { Track, User, Playlist } from '../types';

export interface CacheSlice {
  searchHistory: string[];
  addSearchHistory: (query: string) => void;
  removeSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
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
    cache: {
      tracks: { items: Track[]; offset: number; hasMore: boolean; loaded: boolean; query: string };
      artists: { items: User[]; offset: number; hasMore: boolean; loaded: boolean; query: string };
      playlists: { items: Playlist[]; offset: number; hasMore: boolean; loaded: boolean; query: string };
    };
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

  setSearchPage: (patch: Partial<CacheSlice['searchPage']>) => void;
  resetSearchPage: () => void;
  setSearchCache: (
    tab: 'tracks' | 'artists' | 'playlists',
    patch: Partial<{
      items: Track[] | User[] | Playlist[];
      offset: number;
      hasMore: boolean;
      loaded: boolean;
      query: string;
    }>
  ) => void;
  setArtistCache: (id: string, data: Partial<CacheSlice['artistPage']['cache'][string]>) => void;
  setPlaylistCache: (id: string, data: Partial<CacheSlice['playlistPage']['cache'][string]>) => void;
  setHomePagePopular: (tracks: Track[]) => void;
  setHomePageMyWave: (tracks: Track[]) => void;
  setHomePageLoadingPopular: (loading: boolean) => void;
  setHomePageLoadingWave: (loading: boolean) => void;
  setHomePagePopularLoaded: (loaded: boolean) => void;
  setHomePageMyWaveLoaded: (loaded: boolean) => void;
  addHomePagePopularTracks: (tracks: Track[]) => void;
}

const SEARCH_HISTORY_MAX = 10;

export const createCacheSlice = (set: any) => ({
  searchHistory: [] as string[],

  addSearchHistory: (query: string) => {
    const q = query.trim();
    if (!q) return;
    set((s: any) => ({
      searchHistory: [q, ...s.searchHistory.filter((h: string) => h !== q)].slice(0, SEARCH_HISTORY_MAX),
    }));
  },

  removeSearchHistory: (query: string) =>
    set((s: any) => ({ searchHistory: s.searchHistory.filter((h: string) => h !== query) })),

  clearSearchHistory: () => set({ searchHistory: [] }),

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
    cache: {
      tracks: { items: [], offset: 0, hasMore: true, loaded: false, query: '' },
      artists: { items: [], offset: 0, hasMore: true, loaded: false, query: '' },
      playlists: { items: [], offset: 0, hasMore: true, loaded: false, query: '' },
    },
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

  setSearchPage: (patch: Partial<CacheSlice['searchPage']>) =>
    set((s: any) => ({ searchPage: { ...s.searchPage, ...patch } })),

  resetSearchPage: () => set((s: any) => ({
    searchPage: {
      ...s.searchPage,
      query: '',
      tracks: [],
      artists: [],
      playlists: [],
      offset: 0,
      hasMore: true,
      cache: {
        tracks: { items: [], offset: 0, hasMore: true, loaded: false, query: '' },
        artists: { items: [], offset: 0, hasMore: true, loaded: false, query: '' },
        playlists: { items: [], offset: 0, hasMore: true, loaded: false, query: '' },
      },
    },
  })),

  setSearchCache: (
    tab: 'tracks' | 'artists' | 'playlists',
    patch: Partial<{
      items: Track[] | User[] | Playlist[];
      offset: number;
      hasMore: boolean;
      loaded: boolean;
      query: string;
    }>
  ) =>
    set((s: any) => ({
      searchPage: {
        ...s.searchPage,
        cache: {
          ...s.searchPage.cache,
          [tab]: { ...s.searchPage.cache[tab], ...patch } as any,
        },
      },
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
});