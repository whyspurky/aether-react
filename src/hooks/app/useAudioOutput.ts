import { useEffect } from 'react';
import { api } from '@lib/api';
import { useStore } from '@store/store';

export function useAudioOutput() {
  useEffect(() => {
    const apply = async () => {
      const saved = useStore.getState().audio.outputDevice;
      if (!saved) return;

      try {
        const devices = await api.listOutputDevices();
        const matched =
          devices.find((device) => device.id === saved) ||
          devices.find((device) => device.name === saved);

        if (!matched) {
          useStore.getState().setOutputDevice('');
          await api.setOutputDevice(null);
          return;
        }

        await api.setOutputDevice(matched.id);
        if (matched.id !== saved) {
          useStore.getState().setOutputDevice(matched.id);
        }
      } catch {
        useStore.getState().setOutputDevice('');
        await api.setOutputDevice(null).catch(() => {});
      }
    };

    if (useStore.persist.hasHydrated()) {
      apply();
      return;
    }
    return useStore.persist.onFinishHydration(apply);
  }, []);
}
