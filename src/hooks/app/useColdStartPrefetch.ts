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
      if (s.queue.currentIndex < 0) return;
      if (s.player.isAudioReady) return;

      fired = true;
      unsub();

      (async () => {
        try {
          const stream = await api.getStreamUrl(track.id);
          if (!stream?.url) return;
          await api.prefetchAudio(stream.url, track.id);
        } catch {}
      })();
    });

    return unsub;
  }, []);
}