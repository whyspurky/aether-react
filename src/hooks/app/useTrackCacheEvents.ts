import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { api } from '@lib/api';
import { useStore } from '@store/store';
import type { BulkCacheStatus } from '@store/types';

interface CacheChanged {
  trackId: number;
  offline: boolean;
}

interface DownloadProgress {
  trackId: number;
  progress: number;
  source: string;
}

interface BulkProgress {
  phase: string;
  scope: string;
  status: BulkCacheStatus['phase'];
  total: number;
  done: number;
  failed: number;
  skipped: number;
}

export function useTrackCacheEvents() {
  useEffect(() => {
    const unlisteners: Array<() => void> = [];
    let cancelled = false;

    const add = (promise: Promise<() => void>) => {
      promise.then((unlisten) => {
        if (cancelled) unlisten();
        else unlisteners.push(unlisten);
      });
    };

    add(
      listen<CacheChanged>('track:cache-changed', async (event) => {
        const { trackId } = event.payload;
        const enabled = useStore.getState().offline.cacheEnabled;
        const entry = await api.trackCacheInfo(trackId);
        if (entry && (entry.offline || enabled)) {
          useStore.getState().setCacheEntry(entry);
        } else {
          useStore.getState().removeCacheEntry(trackId);
        }
        useStore.getState().refreshCacheSizes();
      })
    );

    add(
      listen<DownloadProgress>('track:download-progress', (event) => {
        const { trackId, progress } = event.payload;
        useStore.getState().setCacheProgress(trackId, progress);
      })
    );

    add(
      listen('track:cache-cleared', () => {
        useStore.getState().refreshCache();
      })
    );

    add(
      listen<BulkProgress>('track:bulk-cache-progress', (event) => {
        const p = event.payload;
        useStore.getState().setBulkStatus({
          scope: p.scope,
          phase: p.status,
          total: p.total,
          done: p.done,
          failed: p.failed,
          skipped: p.skipped,
        });
      })
    );

    useStore.getState().refreshCache();
    api
      .trackEnforceLimit(useStore.getState().offline.cacheLimitMb)
      .catch(() => {});

    return () => {
      cancelled = true;
      for (const unlisten of unlisteners) unlisten();
    };
  }, []);
}
