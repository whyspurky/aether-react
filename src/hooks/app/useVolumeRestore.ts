import { useEffect } from 'react';
import { api } from '@lib/api';
import { useStore } from '@store/store';

export function useVolumeRestore() {
  useEffect(() => {
    let unsub: (() => void) | null = null;
    unsub = useStore.persist.onFinishHydration(() => {
      const v = useStore.getState().player.volume;
      if (typeof v === 'number') {
        api.setVolume(v).catch(() => {});
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);
}