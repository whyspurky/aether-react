// src/store/store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import type { Track, User, Playlist, ProxyMode, CustomProxyConfig } from './types';
let positionInterval: ReturnType<typeof setInterval> | null = null;
let isTrackEnding = false;


interface AppState {
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
  queue: {
    tracks: Track[];
    currentIndex: number;
    source: string;
    originalTracks: Track[] | null;
  };
  proxy: {
  mode: ProxyMode;
  custom: CustomProxyConfig;
zapret: {
  status: 'unknown' | 'running' | 'stopped' | 'not_installed';
  batPath: string; 
  folder: string; 
},
};
  homePage: {
    popularTracks: Track[];
    myWaveTracks: Track[];
    isLoadingPopular: boolean;
    isLoadingWave: boolean;
    isPopularLoaded: boolean;
    isMyWaveLoaded: boolean;
  };
  player: {
    isPlaying: boolean;
    isLoading: boolean;
    isAudioReady: boolean;
    currentTrack: Track | null;
    volume: number;
    shuffle: boolean;
    repeat: 'none' | 'all' | 'one';
    position: number;
    duration: number;
    pendingSeek: number | null;
    shuffleHistory: number[];

  };
  library: {
    favorites: Track[];
    history: Track[];
    playlists: Playlist[];
    currentPlaylist: Playlist | null;
  };
  toast: { message: string; type: 'error' | 'success' | 'info' } | null;
  preload: {
    isPreloading: boolean;
  };
}


const initialState: AppState = {
  search: {
    query: '',
    filter: 'tracks',
  },
    searchPage: {
    query: '',
    filter: 'tracks',
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
  queue: {
    tracks: [],
    currentIndex: -1,
    source: '',
    originalTracks: null,
  },
  proxy: {
  mode: 'off',
  custom: {
    type: 'socks5',
    host: '127.0.0.1',
    port: 1080,
    username: '',
    password: '',
  },
zapret: {
  status: 'unknown',
  batPath: '',
  folder: '',
},
},
  homePage: {
    popularTracks: [],
    myWaveTracks: [],
    isLoadingPopular: false,
    isLoadingWave: false,
    isPopularLoaded: false,
    isMyWaveLoaded: false,
  },
  player: {
    isPlaying: false,
    isLoading: false,
    isAudioReady: false,
    currentTrack: null,
    volume: 80,
    shuffle: false,
    repeat: 'none',
    position: 0,
    duration: 0,
    pendingSeek: null,
    shuffleHistory: [],
  },
  library: {
    favorites: [],
    history: [],
    playlists: [],
    currentPlaylist: null,
  },
  toast: null,
  preload: {
    isPreloading: false,
  },
};


const clearPositionInterval = () => {
  if (positionInterval) {
    clearInterval(positionInterval);
    positionInterval = null;
  }
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));


export const useStore = create<AppState & {
  setSearchQuery: (query: string) => void;
  setSearchPage: (patch: Partial<AppState['searchPage']>) => void;
  resetSearchPage: () => void;
    setArtistCache: (id: string, data: Partial<AppState['artistPage']['cache'][string]>) => void;
  setPlaylistCache: (id: string, data: Partial<AppState['playlistPage']['cache'][string]>) => void;
  setSearchFilter: (filter: 'tracks' | 'playlists' | 'artists') => void;
  setZapretFolder: (folder: string) => void;
  setHomePagePopular: (tracks: Track[]) => void;
  setHomePageMyWave: (tracks: Track[]) => void;
  setHomePageLoadingPopular: (loading: boolean) => void;
  setHomePageLoadingWave: (loading: boolean) => void;
  setHomePagePopularLoaded: (loaded: boolean) => void;
  setHomePageMyWaveLoaded: (loaded: boolean) => void;
  addHomePagePopularTracks: (tracks: Track[]) => void;

setProxyMode: (mode: ProxyMode) => void;
setCustomProxy: (config: Partial<CustomProxyConfig>) => void;
setZapretStatus: (status: 'unknown' | 'running' | 'stopped' | 'not_installed') => void;
setZapretBatPath: (path: string) => void;
  addToQueue: (track: Track) => void;
  playTrack: (track: Track, tracks: Track[], index: number, source?: string) => Promise<void>;
nextTrack: (manual?: boolean) => Promise<void>;
prevTrack: (manual?: boolean) => Promise<void>;
  togglePlay: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  setPosition: (position: number) => void;
  preloadHomePageData: () => Promise<void>;
  setShuffle: (shuffle: boolean) => void;
  setRepeat: (repeat: 'none' | 'all' | 'one') => void;

  addToFavorites: (track: Track) => void;
  removeFromFavorites: (trackId: number) => void;
  addToHistory: (track: Track) => void;
  removeFromHistory: (trackId: number) => void;
  clearHistory: () => void;
  clearFavorites: () => void;

  createPlaylist: (name: string) => void;
  updatePlaylist: (id: string, name: string) => void;
  addToPlaylist: (playlistId: string, track: Track) => void;
  removeFromPlaylist: (playlistId: string, trackId: number) => void;
  deletePlaylist: (playlistId: string) => void;
  setCurrentPlaylist: (playlist: Playlist | null) => void;

  showToast: (message: string, type: 'error' | 'success' | 'info') => void;
  hideToast: () => void;

  getUserTopArtists: (limit?: number) => string[];
  preloadMoreTracks: () => Promise<void>;
}>()(
  persist(
    (set, get) => ({
      ...initialState,


      setSearchQuery: (query) => set((s) => ({ search: { ...s.search, query } })),
      setSearchFilter: (filter) => set((s) => ({ search: { ...s.search, filter } })),
      setSearchPage: (patch) => set((s) => ({ searchPage: { ...s.searchPage, ...patch } })),

      resetSearchPage: () => set((s) => ({
        searchPage: { ...s.searchPage, tracks: [], artists: [], playlists: [], offset: 0, hasMore: true },
      })),
      setArtistCache: (id, data) => set((s) => ({
        artistPage: {
          cache: {
            ...s.artistPage.cache,
            [id]: { ...s.artistPage.cache[id], ...data } as any,
          },
        },
      })),

      setPlaylistCache: (id, data) => set((s) => ({
        playlistPage: {
          cache: {
            ...s.playlistPage.cache,
            [id]: { ...s.playlistPage.cache[id], ...data } as any,
          },
        },
      })),
setProxyMode: (mode) => set((s) => ({ proxy: { ...s.proxy, mode } })),

setCustomProxy: (config) =>
  set((s) => ({ proxy: { ...s.proxy, custom: { ...s.proxy.custom, ...config } } })),

setZapretFolder: (folder) =>
  set((s) => ({ proxy: { ...s.proxy, zapret: { ...s.proxy.zapret, folder } } })),

setZapretStatus: (status) =>
  set((s) => ({ proxy: { ...s.proxy, zapret: { ...s.proxy.zapret, status } } })),

setZapretBatPath: (path) =>
  set((s) => ({ proxy: { ...s.proxy, zapret: { ...s.proxy.zapret, batPath: path } } })),
      setHomePagePopular: (tracks) => set((s) => ({ homePage: { ...s.homePage, popularTracks: tracks } })),
      setHomePageMyWave: (tracks) => set((s) => ({ homePage: { ...s.homePage, myWaveTracks: tracks } })),
      setHomePageLoadingPopular: (loading) => set((s) => ({ homePage: { ...s.homePage, isLoadingPopular: loading } })),
      setHomePageLoadingWave: (loading) => set((s) => ({ homePage: { ...s.homePage, isLoadingWave: loading } })),
      setHomePagePopularLoaded: (loaded) => set((s) => ({ homePage: { ...s.homePage, isPopularLoaded: loaded } })),
      setHomePageMyWaveLoaded: (loaded) => set((s) => ({ homePage: { ...s.homePage, isMyWaveLoaded: loaded } })),

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
      const artists = [...new Set(library.history.map((t) => t.user?.username).filter(Boolean))] as string[];
      const tracks = artists.length
        ? await api.getMyWave(artists.slice(0, 5), 6)
        : await api.getPopular(6);
      get().setHomePageMyWave(tracks);
      get().setHomePageMyWaveLoaded(true);
    } catch {}
    get().setHomePageLoadingWave(false);
  }
},

      addHomePagePopularTracks: (tracks) =>
        set((s) => ({ homePage: { ...s.homePage, popularTracks: [...s.homePage.popularTracks, ...tracks] } })),


      addToQueue: (track) => set((s) => ({ queue: { ...s.queue, tracks: [...s.queue.tracks, track] } })),


      playTrack: async (track, tracks, index, source = 'queue') => {
        clearPositionInterval();
        isTrackEnding = false;

        try { await api.muteAudio(); } catch {}
        try { await api.stopAudio(); } catch {}

        const savedSeek = get().player.pendingSeek;
        const startPos = savedSeek && savedSeek > 0 ? savedSeek : 0;

set((s) => ({
  queue: {
    tracks,
    currentIndex: index,
    source,
    originalTracks: s.queue.originalTracks,
  },
  player: {
    ...s.player,
    currentTrack: track,
    isLoading: true,
    isAudioReady: false,
    isPlaying: false,
    position: startPos,
    duration: track.duration ? track.duration / 1000 : 0,
    pendingSeek: savedSeek && savedSeek > 0 ? savedSeek : null,
  },
}));

        const isValid = () => get().player.currentTrack?.id === track.id;

        let started = false;
        for (let attempt = 1; attempt <= 2 && !started; attempt++) {
          if (!isValid()) return;

          try {
            const url = await api.getStreamUrl(track.id);
            if (!isValid()) return;

            await api.playAudio(url);
            if (!isValid()) {
              await api.stopAudio();
              return;
            }

            await api.setTrackDuration(track.duration || 0);

            const pending = get().player.pendingSeek;
            if (pending !== null && pending > 0) {
              try { await api.seekAudio(pending); } catch {}
              set((s) => ({ player: { ...s.player, pendingSeek: null } }));
            }

            try { await api.unmuteAudio(); } catch {}

            set((s) => ({
              player: { ...s.player, isAudioReady: true, isPlaying: true, isLoading: false },
            }));

            started = true;
            get().addToHistory(track);
            startPositionLoop(isValid);

const remaining = get().queue.tracks.length - index - 1;
if (remaining <= 3 && get().player.repeat === 'none') {
  get().preloadMoreTracks().catch(() => {});
}

          } catch (err) {
            if (!isValid()) return;

            if (err instanceof Error && err.message === 'Request cancelled') {
              set((s) => ({ player: { ...s.player, isLoading: false, isAudioReady: false, isPlaying: false } }));
              return;
            }

            if (attempt < 2) {
              await delay(1000);
              continue;
            }

            set((s) => ({ player: { ...s.player, isLoading: false, isAudioReady: false, isPlaying: false } }));
            get().showToast(`ошибка: ${track.title}`, 'error');

            const next = index + 1;
            if (next < tracks.length && isValid()) {
              await get().playTrack(tracks[next], tracks, next, source);
            } else {
              set((s) => ({
                player: { ...s.player, currentTrack: null, isAudioReady: false, isPlaying: false, isLoading: false },
              }));
            }
          }
        }
      },

nextTrack: async (manual = false) => {
  clearPositionInterval();
  isTrackEnding = false;

  try { await api.stopAudio(); } catch {}

set((s) => ({
  player: {
    ...s.player,
    isPlaying: false,
    position: 0,
    repeat: manual && s.player.repeat === 'one' ? 'none' : s.player.repeat,
  },
}));

  const { queue, player } = get();

  // repeat one - повторяем только если трек кончился сам
  // при ручном next - переключаем
  if (!manual && player.repeat === 'one') {
    const current = get().player.currentTrack;
    if (current) {
      await get().playTrack(current, get().queue.tracks, get().queue.currentIndex, get().queue.source);
    }
    return;
  }

let nextIndex = queue.currentIndex + 1;

if (nextIndex >= queue.tracks.length) {
  // repeat all - крутим имеющиеся треки, не дозагружаем
  if (player.repeat === 'all') {
    nextIndex = 0;
  } else {
    // repeat none - дозагружаем
    await get().preloadMoreTracks();

    const q = get().queue;
    if (q.tracks.length > queue.tracks.length) {
      nextIndex = q.currentIndex + 1;
    } else {
      set((s) => ({
        player: { ...s.player, currentTrack: null, isPlaying: false, isLoading: false },
      }));
      return;
    }
  }
}

  const next = get().queue.tracks[nextIndex];
  if (next) {
    await get().playTrack(next, get().queue.tracks, nextIndex, get().queue.source);
  }
},

prevTrack: async (manual = false) => {
  clearPositionInterval();
  isTrackEnding = false;

  try { await api.stopAudio(); } catch {}

set((s) => ({
  player: {
    ...s.player,
    isPlaying: false,
    position: 0,
    repeat: manual && s.player.repeat === 'one' ? 'none' : s.player.repeat,
  },
}));

  const { queue } = get();
  const prevIndex = Math.max(0, queue.currentIndex - 1);
  const prev = get().queue.tracks[prevIndex];

  if (prev) {
    await get().playTrack(prev, get().queue.tracks, prevIndex, get().queue.source);
  }
},

togglePlay: async () => {
  const { isPlaying, isLoading, isAudioReady, currentTrack, position } = get().player;

  if (isLoading) return;

  if (!isAudioReady && currentTrack) {
    const { queue } = get();
    const tracks = queue.tracks.length ? queue.tracks : [currentTrack];
    const index = queue.tracks.length ? queue.currentIndex : 0;
    set((s) => ({ player: { ...s.player, pendingSeek: position > 0 ? position : null } }));
    await get().playTrack(currentTrack, tracks, index, queue.source || 'restore');
    return;
  }

  if (!isAudioReady) return;

  if (isPlaying) {
    set((s) => ({ player: { ...s.player, isPlaying: false } }));
    await api.pauseAudio();
  } else {
    set((s) => ({ player: { ...s.player, isPlaying: true } }));
    await api.resumeAudio();
  }
},

      setVolume: async (volume) => {
        set((s) => ({ player: { ...s.player, volume } }));
        await api.setVolume(volume);
      },

      setPosition: (position) => {
  const { isAudioReady, isLoading } = get().player;

  if (!isAudioReady || isLoading) {
    set((s) => ({ player: { ...s.player, position, pendingSeek: position } }));
    return;
  }

  set((s) => ({ player: { ...s.player, position } }));
},

setShuffle: (shuffle) => {
  const { queue, player } = get();

  // включаем shuffle
  if (shuffle && !player.shuffle) {
    if (queue.tracks.length < 2) {
      set((s) => ({ player: { ...s.player, shuffle: true } }));
      return;
    }

    const current = player.currentTrack;
    if (!current) {
      set((s) => ({ player: { ...s.player, shuffle: true } }));
      return;
    }

    // текущий трек в начало, остальные после него в случайном порядке
    const others = queue.tracks.filter((t) => t.id !== current.id);
    const shuffled = [current, ...others.sort(() => Math.random() - 0.5)];

    set((s) => ({
      player: { ...s.player, shuffle: true },
      queue: {
        ...s.queue,
        tracks: shuffled,
        currentIndex: 0,
        originalTracks: s.queue.tracks,
      },
    }));
    return;
  }

  // выключаем shuffle
  if (!shuffle && player.shuffle) {
    const original = queue.originalTracks;
    if (!original) {
      set((s) => ({ player: { ...s.player, shuffle: false } }));
      return;
    }

    const current = player.currentTrack;
    const newIndex = current ? original.findIndex((t) => t.id === current.id) : 0;

    set((s) => ({
      player: { ...s.player, shuffle: false },
      queue: {
        ...s.queue,
        tracks: original,
        currentIndex: newIndex >= 0 ? newIndex : 0,
        originalTracks: null,
      },
    }));
    return;
  }

  // ничего не меняется
  set((s) => ({ player: { ...s.player, shuffle } }));
},
        setRepeat: (repeat) => set((s) => ({ player: { ...s.player, repeat } })),


      addToFavorites: (track) =>
        set((s) => ({
          library: { ...s.library, favorites: [track, ...s.library.favorites.filter((t) => t.id !== track.id)] },
        })),

      removeFromFavorites: (trackId) =>
        set((s) => ({
          library: { ...s.library, favorites: s.library.favorites.filter((t) => t.id !== trackId) },
        })),

      addToHistory: (track) =>
        set((s) => ({
          library: {
            ...s.library,
            history: [track, ...s.library.history.filter((t) => t.id !== track.id)].slice(0, 200),
          },
        })),

      removeFromHistory: (trackId) =>
        set((s) => ({
          library: { ...s.library, history: s.library.history.filter((t) => t.id !== trackId) },
        })),

      clearHistory: () => set((s) => ({ library: { ...s.library, history: [] } })),
      clearFavorites: () => set((s) => ({ library: { ...s.library, favorites: [] } })),

      createPlaylist: (name) => {
        const pl: Playlist = { id: Date.now().toString(), name, tracks: [], createdAt: Date.now() };
        set((s) => ({ library: { ...s.library, playlists: [pl, ...s.library.playlists] } }));
      },

      updatePlaylist: (id, name) =>
        set((s) => ({
          library: {
            ...s.library,
            playlists: s.library.playlists.map((pl) => (pl.id === id ? { ...pl, name } : pl)),
          },
        })),

      addToPlaylist: (playlistId, track) =>
        set((s) => ({
          library: {
            ...s.library,
            playlists: s.library.playlists.map((pl) =>
              pl.id === playlistId && !pl.tracks.some((t) => t.id === track.id)
                ? { ...pl, tracks: [track, ...pl.tracks] }
                : pl
            ),
          },
        })),

      removeFromPlaylist: (playlistId, trackId) =>
        set((s) => ({
          library: {
            ...s.library,
            playlists: s.library.playlists.map((pl) =>
              pl.id === playlistId ? { ...pl, tracks: pl.tracks.filter((t) => t.id !== trackId) } : pl
            ),
          },
        })),

      deletePlaylist: (playlistId) =>
        set((s) => ({
          library: { ...s.library, playlists: s.library.playlists.filter((pl) => pl.id !== playlistId) },
        })),

      setCurrentPlaylist: (playlist) => set((s) => ({ library: { ...s.library, currentPlaylist: playlist } })),


      showToast: (message, type) => set({ toast: { message, type } }),
      hideToast: () => set({ toast: null }),


      getUserTopArtists: (limit = 5) => {
        const { library } = get();
        const source = [...library.history, ...library.favorites];
        if (!source.length) return [];

        const freq: Record<string, number> = {};
        for (const t of source) {
          const a = t.user?.username;
          if (a) freq[a] = (freq[a] || 0) + 1;
        }

        return Object.entries(freq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map((e) => e[0]);
      },

      preloadMoreTracks: async () => {
        const { queue, preload, player, library } = get();
        if (preload.isPreloading || player.repeat === 'one') return;

        set((s) => ({ preload: { ...s.preload, isPreloading: true } }));

        try {
          const existing = new Set(queue.tracks.map((t) => t.id));
          let artists = get().getUserTopArtists(5);

          if (!artists.length && queue.tracks.length) {
            artists = [...new Set(queue.tracks.map((t) => t.user?.username).filter(Boolean))] as string[];
          }

          if (!artists.length) {
            artists = ['popular', 'music', 'track', 'new', 'hot'];
          }

          let pool: Track[] = [];
          for (const a of artists.slice(0, 5)) {
            const rel = await api.getRelatedTracks(queue.tracks, 15, [a]);
            pool.push(...rel);
            if (pool.length > 30) break;
          }

          if (!pool.length) {
            pool = await api.getPopular(30);
          }

          if (!pool.length) {
            const random = ['new', 'fresh', 'hot', 'trending', 'hit'];
            const word = random[Math.floor(Math.random() * random.length)];
            pool = await api.searchTracks(word, 20, 0);
          }

          const unique = new Map<number, Track>();
          for (const t of pool) {
            if (t?.id) unique.set(t.id, t);
          }

          let fresh = Array.from(unique.values()).filter((t) => !existing.has(t.id));

          if (!fresh.length) {
            const fallback = [...library.history, ...library.favorites].find((t) => t?.id && !existing.has(t.id));
            if (fallback) fresh = [fallback];
          }

          if (!fresh.length) {
            const emergency = await api.searchTracks('music', 20, 0);
            fresh = emergency.filter((t) => t?.id && !existing.has(t.id));
          }

          if (fresh.length) {
set((s) => {
  const tracks = [...s.queue.tracks, ...fresh];
  const originalTracks = s.queue.originalTracks
    ? [...s.queue.originalTracks, ...fresh]
    : null;
  const max = 200;
  if (tracks.length > max) {
    const removed = tracks.length - max;
    return {
      queue: {
        ...s.queue,
        tracks: tracks.slice(removed),
        originalTracks: originalTracks ? originalTracks.slice(removed) : null,
        currentIndex: Math.max(0, s.queue.currentIndex - removed),
      },
    };
  }
  return { queue: { ...s.queue, tracks, originalTracks } };
});
          }
        } catch {
        } finally {
          set((s) => ({ preload: { ...s.preload, isPreloading: false } }));
        }
      },
    }),

{
  name: 'aether-storage',
  version: 2,
  migrate: (persisted: any, version) => {
    if (version < 2) {
      if (!persisted.proxy) {
        persisted.proxy = {
          mode: 'off',
          custom: { type: 'socks5', host: '127.0.0.1', port: 1080, username: '', password: '' },
          zapret: { status: 'unknown', batPath: '' },
        };
      } else {
        if (!persisted.proxy.zapret || 'path' in (persisted.proxy.zapret || {})) {
          persisted.proxy.zapret = {
            status: 'unknown',
            batPath: persisted.proxy.zapret?.path || '',
          };
        }
        if (!persisted.proxy.custom) {
          persisted.proxy.custom = { type: 'socks5', host: '127.0.0.1', port: 1080, username: '', password: '' };
        }
        if (!persisted.proxy.mode) {
          persisted.proxy.mode = 'off';
        }
      }
    }
    return persisted;
  },
      partialize: (s) => ({
        library: {
          favorites: s.library.favorites,
          history: s.library.history,
          playlists: s.library.playlists,
        },
        player: {
          volume: s.player.volume,
          shuffle: s.player.shuffle,
          repeat: s.player.repeat,
          currentTrack: s.player.currentTrack,
          position: s.player.position,
        },
proxy: {
  mode: s.proxy.mode,
  custom: s.proxy.custom,
zapret: {
  batPath: s.proxy.zapret.batPath,
  folder: s.proxy.zapret.folder,
},
},
        queue: {
          tracks: s.queue.tracks.map((t) => ({
            id: t.id,
            title: t.title,
            user: t.user,
            duration: t.duration,
            artwork_url: t.artwork_url,
            permalink_url: t.permalink_url,
          })),
          currentIndex: s.queue.currentIndex,
          source: s.queue.source,
        },
      }),
    }
  )
);


function startPositionLoop(isValid: () => boolean) {
  clearPositionInterval();

  positionInterval = setInterval(async () => {
    if (!isValid()) {
      clearPositionInterval();
      return;
    }

    try {
      const pos = await api.getPosition();
      const duration = useStore.getState().player.duration;

      if (duration > 0 && pos >= duration - 0.3 && !isTrackEnding) {
        isTrackEnding = true;
        clearPositionInterval();
        if (isValid()) await useStore.getState().nextTrack();
        return;
      }

      useStore.setState((s) => ({ player: { ...s.player, position: pos } }));
    } catch {
    }
  }, 250);
}