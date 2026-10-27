import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { api } from '@lib/api';
import { useStore } from '@store/store';

interface AutoAdvanced {
  track_id: number;
  duration_ms: number;
  position: number;
}

export function useAudioTransition() {
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let unlistenCancel: (() => void) | null = null;

    listen<Record<string, never>>('track:auto-advance-cancelled', () => {
      useStore.getState().setAutoAdvancePending(false);
    }).then((fn) => {
      unlistenCancel = fn;
    });

    listen<AutoAdvanced>('track:auto-advanced', (event) => {
      const { track_id, duration_ms, position } = event.payload;
      const state = useStore.getState();
      const index = state.queue.tracks.findIndex((track) => track.id === track_id);
      if (index < 0) {
        // очередь успела измениться: флаг не должен остаться включенным,
        // иначе детект конца трека замолчит навсегда
        state.setAutoAdvancePending(false);
        return;
      }

      const track = state.queue.tracks[index];
      useStore.setState((s: any) => ({
        queue: { ...s.queue, currentIndex: index },
        player: {
          ...s.player,
          currentTrack: track,
          duration: duration_ms / 1000,
          position,
          pendingSeek: null,
          autoAdvancePending: false,
          isAudioReady: true,
          isPlaying: true,
          isLoading: false,
        },
      }));

      state.addToHistory(track);
      api.trackMarkPlayed(track.id).catch(() => {});

      const next = state.queue.tracks[index + 1];
      if (next && state.audio.transition !== 'off' && state.perf.nextTrackPrep) {
        state.setAutoAdvancePending(true);
        api
          .queueNextTrack(next.id, next.duration, state.offline.quality)
          .then((queued) => {
            if (!queued && useStore.getState().player.currentTrack?.id === track_id) {
              useStore.getState().setAutoAdvancePending(false);
            }
          })
          .catch(() => {
            if (useStore.getState().player.currentTrack?.id === track_id) {
              useStore.getState().setAutoAdvancePending(false);
            }
          });
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) unlisten();
      if (unlistenCancel) unlistenCancel();
    };
  }, []);
}
