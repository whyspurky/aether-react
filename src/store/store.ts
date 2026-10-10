import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { tauriStorage } from '../lib/store/tauriStorage';
import { createProxySlice, type ProxySlice } from './slices/proxy';
import { createUiSlice, type UiSlice } from './slices/ui';
import { createCacheSlice, type CacheSlice } from './slices/cache';
import { createLibrarySlice, type LibrarySlice } from './slices/library';
import { createPlayerSlice, type PlayerSlice } from './slices/player';

export const useStore = create<ProxySlice & UiSlice & CacheSlice & LibrarySlice & PlayerSlice>()(
  persist(
    (set, get) => ({
      ...createProxySlice(set),
      ...createUiSlice(set, get),
      ...createCacheSlice(set, get),
      ...createLibrarySlice(set),
      ...createPlayerSlice(set, get),
    }),

    {
      name: 'aether-storage',
      version: 6,
      storage: createJSONStorage(() => tauriStorage),
      onRehydrateStorage: () => () => {},
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
          if (!persisted.blur) {
            persisted.blur = {
              enabled: true,
              amount: 60,
              opacity: 0.25,
            };
          }
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
        themeId: s.themeId,
        blur: {
          enabled: s.blur.enabled,
          amount: s.blur.amount,
          opacity: s.blur.opacity,
        },
        customPresets: s.customPresets,
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