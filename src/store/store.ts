import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { tauriStorage } from '../lib/store/tauriStorage';
import { createProxySlice, type ProxySlice } from './slices/proxy';
import { createUiSlice, type UiSlice } from './slices/ui';
import { createCacheSlice, type CacheSlice } from './slices/cache';
import { createLibrarySlice, type LibrarySlice } from './slices/library';
import { createPlayerSlice, type PlayerSlice } from './slices/player';
import { createGlobalBindsSlice, type GlobalBindsSlice } from './slices/globalBinds';
import { createStatsSlice, type StatsSlice } from './slices/stats';
import { createOfflineSlice, type OfflineSlice } from './slices/offline';
import { createAudioSlice, type AudioSlice } from './slices/audio';

export const useStore = create<ProxySlice & UiSlice & CacheSlice & LibrarySlice & PlayerSlice & GlobalBindsSlice & StatsSlice & OfflineSlice & AudioSlice>()(
  persist(
    (set, get) => ({
      ...createProxySlice(set),
      ...createUiSlice(set, get),
      ...createCacheSlice(set),
      ...createLibrarySlice(set),
      ...createPlayerSlice(set, get),
      ...createGlobalBindsSlice(set),
      ...createStatsSlice(set),
      ...createOfflineSlice(set, get),
      ...createAudioSlice(set),
    }),

    {
      name: 'aether-storage',
      version: 10,
      storage: createJSONStorage(() => tauriStorage),
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
              persisted.proxy.custom = {
                type: 'socks5',
                host: '127.0.0.1',
                port: 1080,
                username: '',
                password: '',
              };
            }
            if (!persisted.proxy.mode) {
              persisted.proxy.mode = 'off';
            }
          }
        }

        if (version < 3) {
          if (!persisted.blur) {
            persisted.blur = {
              enabled: true,
              amount: 60,
              opacity: 0.25,
            };
          }
        }

        if (version < 4) {
          if (persisted.blur) {
            delete persisted.blur.mode;
            delete persisted.blur.color1;
            delete persisted.blur.color2;
            delete persisted.blur.direction;
          }
        }

        if (version < 5) {
          if (!persisted.themeId) persisted.themeId = 'neutral';
          if (persisted.themeId === 'dark') persisted.themeId = 'neutral';
          if (!persisted.customPresets) persisted.customPresets = [];
        }

                if (version < 6) {
          if (persisted.accentOverride !== undefined) {
            delete persisted.accentOverride;
          }
          if (persisted.customPresets) {
            persisted.customPresets = persisted.customPresets.map((p: any) => {
              const { accentOverride, ...rest } = p;
              return rest;
            });
          }
        }

        if (version < 7) {
          if (!persisted.globalBinds) {
            persisted.globalBinds = {
              playpause: '',
              next: '',
              prev: '',
              volumeUp: '',
              volumeDown: '',
            };
          }
          if (persisted.globalBindsEnabled === undefined) {
            persisted.globalBindsEnabled = false;
          }
        }

        if (version < 8) {
          if (!persisted.offline) {
            persisted.offline = {
              cacheEnabled: true,
              quality: 'best',
              autoSave: false,
              cacheLimitMb: 2048,
            };
          } else {
            if (!persisted.offline.quality) persisted.offline.quality = 'best';
            if (persisted.offline.autoSave === undefined) persisted.offline.autoSave = false;
            if (!persisted.offline.cacheLimitMb) persisted.offline.cacheLimitMb = 2048;
          }
        }

        if (version < 9) {
          if (!persisted.offline) {
            persisted.offline = {
              cacheEnabled: true,
              quality: 'best',
              autoSave: false,
              cacheLimitMb: 2048,
            };
          } else {
            if (persisted.offline.cacheEnabled === undefined) {
              persisted.offline.cacheEnabled = true;
            }
            if (!persisted.offline.cacheEnabled) {
              persisted.offline.autoSave = false;
            }
          }
        }

        if (version < 10) {
          if (!persisted.audio) {
            persisted.audio = { outputDevice: '' };
          }
        }

        return persisted;
      },
      merge: (persisted: any, current: any) => ({
        ...current,
        ...persisted,
        // offline хранит entries и progress только в памяти, из стора приходят настройки
        offline: { ...current.offline, ...(persisted?.offline ?? {}) },
        player: { ...current.player, ...(persisted?.player ?? {}) },
        audio: { ...current.audio, ...(persisted?.audio ?? {}) },
      }),
      partialize: (s) => ({
        searchHistory: s.searchHistory,
        globalBinds: s.globalBinds,
        globalBindsEnabled: s.globalBindsEnabled,
        artistScores: s.artistScores,
        genreScores: s.genreScores,
        tracksPlayedCount: s.tracksPlayedCount,
        tracksCompletedCount: s.tracksCompletedCount,
        totalListenedMs: s.totalListenedMs,
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
        themeId: s.themeId,
        blur: {
          enabled: s.blur.enabled,
          amount: s.blur.amount,
          opacity: s.blur.opacity,
        },
        customPresets: s.customPresets,
        hideBindsWarning: s.hideBindsWarning,
        proxy: {
          mode: s.proxy.mode,
          custom: s.proxy.custom,
          zapret: {
            batPath: s.proxy.zapret.batPath,
            folder: s.proxy.zapret.folder,
          },
        },
        offline: {
          cacheEnabled: s.offline.cacheEnabled,
          quality: s.offline.quality,
          autoSave: s.offline.autoSave,
          cacheLimitMb: s.offline.cacheLimitMb,
        },
        audio: {
          outputDevice: s.audio.outputDevice,
        },
        queue: {
          tracks: s.queue.tracks.map((t: any) => ({
            id: t.id,
            title: t.title,
            user: t.user,
            duration: t.duration,
            artwork_url: t.artwork_url,
            permalink_url: t.permalink_url,
            genre: t.genre,
            playback_count: t.playback_count,
          })),
          currentIndex: s.queue.currentIndex,
          source: s.queue.source,
        },
      }),
    }
  )
);