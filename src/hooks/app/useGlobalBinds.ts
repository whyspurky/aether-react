import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { api } from '@lib/api';
import { useStore } from '@store/store';
import type { GlobalBindAction } from '@store/slices/globalBinds';

export function dispatchPlayerAction(action: GlobalBindAction): void {
  const s = useStore.getState();

  switch (action) {
    case 'playpause':
      if (!s.player.isLoading) void s.togglePlay();
      break;
    case 'next':
      void s.nextTrack(true);
      break;
    case 'prev':
      void s.prevTrack(true);
      break;
    case 'volumeUp': {
      const next = Math.min(100, s.player.volume + 5);
      s.setVolume(next);
      break;
    }
    case 'volumeDown': {
      const next = Math.max(0, s.player.volume - 5);
      s.setVolume(next);
      break;
    }
  }
}

let listenerPromise: Promise<() => void> | null = null;

function ensureGlobalListener(): Promise<() => void> {
  if (!listenerPromise) {
    listenerPromise = listen<string>('global-bind', (e) => {
      const action = e.payload as GlobalBindAction;
      dispatchPlayerAction(action);
    });
  }
  return listenerPromise;
}

export function useGlobalBinds() {
  const enabled = useStore((s) => s.globalBindsEnabled);
  const binds = useStore((s) => s.globalBinds);

  // регистрация биндов в rust
  useEffect(() => {
    if (!enabled) {
      api.unregisterGlobalBinds().catch(() => {});
      return;
    }

    const active: Record<string, string> = {};
    for (const [action, key] of Object.entries(binds)) {
      if (key) active[action] = key;
    }

    if (Object.keys(active).length > 0) {
      api.registerGlobalBinds(active).catch(() => {});
    }

    return () => {
      api.unregisterGlobalBinds().catch(() => {});
    };
  }, [enabled, binds]);

  // singleton listener — присоединяется один раз
  useEffect(() => {
    ensureGlobalListener();
  }, []);
}