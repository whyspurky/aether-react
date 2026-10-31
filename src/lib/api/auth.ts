import { invoke } from '@tauri-apps/api/core';

export const authApi = {
  // пустая строка возвращает встроенный client_id
  authSetClientId: async (clientId: string): Promise<void> => {
    await invoke('auth_set_client_id', { clientId: clientId.trim() || null });
  },

  authClientId: async (): Promise<string> => {
    return await invoke('auth_client_id');
  },

  // живая проверка ключа запросом к api-v2, кидает текст ошибки от бэка
  authCheckClientId: async (clientId: string): Promise<void> => {
    await invoke('auth_check_client_id', { clientId: clientId.trim() });
  },
};
