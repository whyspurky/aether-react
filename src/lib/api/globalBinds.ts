import { invoke } from '@tauri-apps/api/core';

export const globalBindsApi = {
  registerGlobalBinds: async (binds: Record<string, string>): Promise<void> => {
    await invoke('register_global_binds', { binds });
  },
  unregisterGlobalBinds: async (): Promise<void> => {
    await invoke('unregister_global_binds');
  },
};