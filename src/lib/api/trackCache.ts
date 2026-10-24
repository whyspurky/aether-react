import { invokeCmd, invokeCmdStrict } from './client';
import type {
  AudioQuality,
  BulkCacheStatus,
  CacheSizes,
  EnsureCachedResult,
  TrackCacheEntry,
} from '@store/types';

export interface CacheOptions {
  quality?: AudioQuality;
  durationMs?: number;
  offline?: boolean;
}

export const trackCacheApi = {
  trackEnsureCached: async (trackId: number, options: CacheOptions = {}): Promise<EnsureCachedResult> => {
    return await invokeCmdStrict<EnsureCachedResult>('track_ensure_cached', {
      trackId,
      quality: options.quality ?? 'best',
      durationMs: options.durationMs ?? null,
      offline: options.offline ?? false,
    });
  },

  trackPreload: async (tracks: { trackId: number; durationMs?: number }[], quality: AudioQuality): Promise<void> => {
    await invokeCmd('track_preload', { tracks, quality });
  },

  trackRemoveCached: async (trackId: number, offlineOnly = false): Promise<boolean> => {
    return (await invokeCmd<boolean>('track_remove_cached', { trackId, offlineOnly })) ?? false;
  },

  trackCacheInfo: async (trackId: number): Promise<TrackCacheEntry | null> => {
    return await invokeCmd<TrackCacheEntry | null>('track_cache_info', { trackId });
  },

  trackIsCached: async (trackId: number): Promise<boolean> => {
    return (await invokeCmd<boolean>('track_is_cached', { trackId })) ?? false;
  },

  trackCacheSize: async (): Promise<CacheSizes> => {
    return (await invokeCmd<CacheSizes>('track_cache_size')) ?? { temp: 0, offline: 0 };
  },

  trackClearCache: async (scope: 'temp' | 'offline' | 'all' = 'all'): Promise<void> => {
    await invokeCmd('track_clear_cache', { scope });
  },

  trackEnforceLimit: async (limitMb: number): Promise<void> => {
    await invokeCmd('track_enforce_cache_limit', { limitMb });
  },

  trackCacheInventory: async (scope: 'temp' | 'offline' | 'all' = 'all'): Promise<TrackCacheEntry[]> => {
    return (await invokeCmd<TrackCacheEntry[]>('track_cache_inventory', { scope })) ?? [];
  },

  trackBulkStart: async (
    scope: string,
    tracks: { trackId: number; durationMs?: number }[],
    quality: AudioQuality
  ): Promise<void> => {
    await invokeCmdStrict('track_bulk_cache_start', { scope, tracks, quality });
  },

  trackBulkStatus: async (): Promise<BulkCacheStatus | null> => {
    return await invokeCmd<BulkCacheStatus | null>('track_bulk_cache_status');
  },

  trackBulkCancel: async (): Promise<void> => {
    await invokeCmd('track_bulk_cache_cancel');
  },

  trackMarkPlayed: async (trackId: number): Promise<void> => {
    await invokeCmd('track_mark_played', { trackId });
  },
};
