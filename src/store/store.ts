// src/store/store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';
import type { Track, Playlist } from './types';
import { createProxySlice, type ProxySlice } from './slices/proxy';
import { createUiSlice, type UiSlice } from './slices/ui';
import { createCacheSlice, type CacheSlice } from './slices/cache';
import { createLibrarySlice, type LibrarySlice } from './slices/library';
import { createPlayerSlice, type PlayerSlice } from './slices/player';

let positionInterval: ReturnType<typeof setInterval> | null = null;
let isTrackEnding = false;

const clearPositionInterval = () => {
  if (positionInterval) {
    clearInterval(positionInterval);
    positionInterval = null;
  }
};

export const useStore = create<ProxySlice & UiSlice & CacheSlice & LibrarySlice & PlayerSlice>()(
  persist(
    (set, get) => ({
      ...createProxySlice(set),
      ...createUiSlice(set),
      ...createCacheSlice(set, get),
      ...createLibrarySlice(set),
      ...createPlayerSlice(set, get, {
        startPositionLoop: (isValid) => {
          clearPositionInterval();
          isTrackEnding = false;

          if (!isValid()) return;

          positionInterval = setInterval(async () => {
            if (!isValid()) {
              clearPositionInterval();
              return;
            }

            try {
              const pos = await api.getPosition();
              const duration = get().player.duration;

              if (duration > 0 && pos >= duration - 0.3 && !isTrackEnding) {
                isTrackEnding = true;
                clearPositionInterval();
                if (isValid()) await get().nextTrack();
                return;
              }

              set((s) => ({ player: { ...s.player, position: pos } }));
            } catch {}
          }, 250);
        },
      }),
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