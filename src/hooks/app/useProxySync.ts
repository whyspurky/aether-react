import { useEffect } from 'react';
import { api } from '@lib/api';
import { useStore } from '@store/store';

const DEBOUNCE_MS = 500;

export function useProxySync() {
  const proxyMode = useStore((s) => s.proxy.mode);
  const customProxy = useStore((s) => s.proxy.custom);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        if (proxyMode === 'custom') {
          if (!customProxy.host.trim() || customProxy.port <= 0) return;
          await api.proxySetCustom({
            kind: customProxy.type,
            host: customProxy.host.trim(),
            port: customProxy.port,
            username: customProxy.username,
            password: customProxy.password,
          });
        } else {
          await api.proxyClear();
        }
      } catch {}
    }, DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [
    proxyMode,
    customProxy.type,
    customProxy.host,
    customProxy.port,
    customProxy.username,
    customProxy.password,
  ]);
}