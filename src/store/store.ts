import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { tauriStorage } from '../lib/store/tauriStorage';
import { createProxySlice, type ProxySlice } from './slices/proxy';
import {
  createUiSlice,
  normalizeCoverBackground,
  PERF_DEFAULTS,
  type UiSlice,
} from './slices/ui';
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
      version: 19,
      storage: createJSONStorage(() => tauriStorage),
      migrate: (persisted: any, version) => {
        // старый плоский perf раскладываем по группам
        const legacyPerf = persisted.perf;
        if (!legacyPerf || !('motionTransitions' in legacyPerf)) {
          if (!legacyPerf) {
            persisted.perf = { ...PERF_DEFAULTS };
          } else {
            const motion = !!legacyPerf.animations;
            persisted.perf = {
              ...PERF_DEFAULTS,
              motionTransitions: motion,
              motionPages: motion,
              motionPulse: motion,
              motionMorph: motion,
              marquee: legacyPerf.marquee ?? true,
              noise: legacyPerf.noise ?? true,
              spectrum: legacyPerf.spectrum ?? true,
            };
          }
        }
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

        if (version < 12) {
          if (!persisted.audio) persisted.audio = {};
          if (persisted.audio.pitchSemitones === undefined) persisted.audio.pitchSemitones = 0;
        }

        if (version < 15) {
          if (!persisted.audio) persisted.audio = {};
          if (!persisted.audio.eqPreset) persisted.audio.eqPreset = 'custom';
        }

        if (version < 14) {
          if (!persisted.audio) persisted.audio = {};
          if (!Array.isArray(persisted.audio.eqBands)) {
            const freqs = [31.25, 62.5, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
            const gains = Array.isArray(persisted.audio.eqGains) ? persisted.audio.eqGains : [];
            persisted.audio.eqBands = freqs.map((freq, index) => ({
              id: index + 1,
              enabled: true,
              kind: 'peaking',
              freq,
              gainDb: gains[index] ?? 0,
              q: 1.414,
            }));
          }
          delete persisted.audio.eqGains;
        }

        if (version < 18) {
          if (!persisted.audio) persisted.audio = {};
          // цель нормализации: -14 LUFS как в стриминге
          if (persisted.audio.normalizationTargetLufs === undefined) {
            persisted.audio.normalizationTargetLufs = -14;
          }
        }

        if (version < 13) {
          if (!persisted.audio) persisted.audio = {};
          if (persisted.audio.linked === undefined) persisted.audio.linked = true;
          if (persisted.audio.linked) {
            const speed = persisted.audio.speed ?? 1;
            persisted.audio.pitchSemitones = 12 * Math.log2(speed);
          }
        }

        if (version < 11) {
          if (!persisted.audio) persisted.audio = {};
          if (persisted.audio.normalization === undefined) persisted.audio.normalization = false;
          if (persisted.audio.eqEnabled === undefined) persisted.audio.eqEnabled = false;
          if (persisted.audio.eqPreampDb === undefined) persisted.audio.eqPreampDb = 0;
          if (!Array.isArray(persisted.audio.eqGains) || persisted.audio.eqGains.length !== 10) {
            persisted.audio.eqGains = Array(10).fill(0);
          }
          if (persisted.audio.speed === undefined) persisted.audio.speed = 1;
          if (!persisted.audio.transition) persisted.audio.transition = 'off';
          if (persisted.audio.crossfadeSecs === undefined) persisted.audio.crossfadeSecs = 4;
        }

        // v19: blur и perf.bgCover сведены в один объект фона
        if (persisted.coverBackground === undefined) {
          const legacy = persisted.blur;
          persisted.coverBackground = normalizeCoverBackground({
            enabled: legacy?.enabled !== false && persisted.perf?.bgCover !== false,
            amount: legacy?.amount,
            opacity: legacy?.opacity,
          });
        }
        persisted.coverBackground = normalizeCoverBackground(persisted.coverBackground);
        delete persisted.blur;
        if (persisted.perf) delete persisted.perf.bgCover;

        if (Array.isArray(persisted.customPresets)) {
          persisted.customPresets = persisted.customPresets.map((preset: any) => {
            const { blur, ...rest } = preset;
            return {
              ...rest,
              coverBackground: normalizeCoverBackground(preset.coverBackground ?? blur),
            };
          });
        }

        return persisted;
      },
      merge: (persisted: any, current: any) => ({
        ...current,
        ...persisted,
        coverBackground: normalizeCoverBackground(
          persisted?.coverBackground ?? current.coverBackground
        ),
        perf: { ...current.perf, ...(persisted?.perf ?? {}) },
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
        coverBackground: {
          enabled: s.coverBackground.enabled,
          amount: s.coverBackground.amount,
          opacity: s.coverBackground.opacity,
        },
        perf: s.perf,
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
          normalization: s.audio.normalization,
          normalizationTargetLufs: s.audio.normalizationTargetLufs,
          eqEnabled: s.audio.eqEnabled,
          eqPreampDb: s.audio.eqPreampDb,
          eqBands: s.audio.eqBands,
          eqPreset: s.audio.eqPreset,
          speed: s.audio.speed,
          pitchSemitones: s.audio.pitchSemitones,
          linked: s.audio.linked,
          transition: s.audio.transition,
          crossfadeSecs: s.audio.crossfadeSecs,
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