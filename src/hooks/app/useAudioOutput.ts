import { useEffect } from 'react';
import { api } from '@lib/api';
import { useStore } from '@store/store';

export function useAudioOutput() {
  useEffect(() => {
    const apply = () => {
      const name = useStore.getState().audio.outputDevice;
      api
        .setOutputDevice(name || null)
        .catch(() => {
          if (name) {
            api.setOutputDevice(null).catch(() => {});
            useStore.getState().setOutputDevice('');
          }
        });
    };

    if (useStore.persist.hasHydrated()) {
      apply();
      return;
    }
    return useStore.persist.onFinishHydration(apply);
  }, []);
}
