import { useEffect } from 'react';
import { api } from '@lib/api';
import { useStore } from '@store/store';

const DEBOUNCE_MS = 500;

// свой client_id хранится в rust, фронт только держит поле и пересылает при изменении
export function useAuthSync() {
  const clientId = useStore((s) => s.auth.clientId);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        await api.authSetClientId(clientId);
      } catch {}
    }, DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [clientId]);
}
