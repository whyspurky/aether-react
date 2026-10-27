import { useEffect } from 'react';
import { api } from '@lib/api';
import { useStore } from '@store/store';

export function useColdStartPrefetch() {
  useEffect(() => {
    let fired = false;

    const unsub = useStore.subscribe((s) => {
      if (fired) return;

      const track = s.player.currentTrack;
      if (!track) return;
      if (!s.offline.cacheEnabled) return;
      if (s.queue.currentIndex < 0) return;
      if (s.player.isAudioReady) return;
      // playTrack уже качает этот трек, второй запрос только мешает
      if (s.player.isLoading) return;

      fired = true;
      unsub();

      (async () => {
        try {
          const quality = useStore.getState().offline.quality;
          await api.trackEnsureCached(track.id, {
            quality,
            durationMs: track.duration,
            offline: false,
          });
        } catch {}
      })();
    });

    return unsub;
  }, []);
}