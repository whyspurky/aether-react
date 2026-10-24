import { api } from '@lib/api';
import type {
  AudioQuality,
  BulkCacheStatus,
  CacheSizes,
  TrackCacheEntry,
} from '../types';

export interface OfflineState {
  cacheEnabled: boolean;
  quality: AudioQuality;
  autoSave: boolean;
  cacheLimitMb: number;
  entries: Record<number, TrackCacheEntry>;
  progress: Record<number, number>;
  bulk: BulkCacheStatus | null;
  sizes: CacheSizes;
}

export interface OfflineSlice {
  offline: OfflineState;
  setCacheEnabled: (enabled: boolean) => void;
  setAudioQuality: (quality: AudioQuality) => void;
  setAutoSave: (enabled: boolean) => void;
  setCacheLimit: (limitMb: number) => void;
  setCacheEntry: (entry: TrackCacheEntry) => void;
  removeCacheEntry: (trackId: number) => void;
  setCacheProgress: (trackId: number, progress: number) => void;
  setBulkStatus: (status: BulkCacheStatus | null) => void;
  setCacheSizes: (sizes: CacheSizes) => void;
  refreshCache: () => Promise<void>;
  refreshCacheSizes: () => Promise<void>;
}

const initialOffline: OfflineState = {
  cacheEnabled: true,
  quality: 'best',
  autoSave: false,
  cacheLimitMb: 2048,
  entries: {},
  progress: {},
  bulk: null,
  sizes: { temp: 0, offline: 0 },
};

export const createOfflineSlice = (set: any, get: any) => ({
  offline: { ...initialOffline },

  setCacheEnabled: (cacheEnabled: boolean) =>
    set((s: any) => ({
      offline: {
        ...s.offline,
        cacheEnabled,
        autoSave: cacheEnabled ? s.offline.autoSave : false,
      },
    })),

  setAudioQuality: (quality: AudioQuality) =>
    set((s: any) => ({ offline: { ...s.offline, quality } })),

  setAutoSave: (autoSave: boolean) =>
    set((s: any) => ({
      offline: {
        ...s.offline,
        autoSave: s.offline.cacheEnabled ? autoSave : false,
      },
    })),

  setCacheLimit: (cacheLimitMb: number) =>
    set((s: any) => ({ offline: { ...s.offline, cacheLimitMb } })),

  setCacheEntry: (entry: TrackCacheEntry) =>
    set((s: any) => {
      if (!entry.offline && !s.offline.cacheEnabled) return {};
      const progress = { ...s.offline.progress };
      delete progress[entry.trackId];
      return {
        offline: {
          ...s.offline,
          entries: { ...s.offline.entries, [entry.trackId]: entry },
          progress,
        },
      };
    }),

  removeCacheEntry: (trackId: number) =>
    set((s: any) => {
      const entries = { ...s.offline.entries };
      delete entries[trackId];
      const progress = { ...s.offline.progress };
      delete progress[trackId];
      return { offline: { ...s.offline, entries, progress } };
    }),

  setCacheProgress: (trackId: number, progress: number) =>
    set((s: any) => ({
      offline: {
        ...s.offline,
        progress: { ...s.offline.progress, [trackId]: progress },
      },
    })),

  setBulkStatus: (bulk: BulkCacheStatus | null) =>
    set((s: any) => ({ offline: { ...s.offline, bulk } })),

  setCacheSizes: (sizes: CacheSizes) =>
    set((s: any) => ({ offline: { ...s.offline, sizes } })),

  refreshCache: async () => {
    try {
      const rows = await api.trackCacheInventory('all');
      const enabled = get().offline.cacheEnabled;
      const entries: Record<number, TrackCacheEntry> = {};
      for (const row of rows) {
        if (row.offline || enabled) entries[row.trackId] = row;
      }
      set((s: any) => ({ offline: { ...s.offline, entries } }));
      await get().refreshCacheSizes();
    } catch {}
  },

  refreshCacheSizes: async () => {
    try {
      const sizes = await api.trackCacheSize();
      set((s: any) => ({ offline: { ...s.offline, sizes } }));
    } catch {}
  },
});
