import { invoke } from '@tauri-apps/api/core';

export const proxyApi = {
  proxySetCustom: async (config: {
    kind: 'socks5' | 'http' | 'https';
    host: string;
    port: number;
    username: string;
    password: string;
  }): Promise<void> => {
    await invoke('proxy_set_custom', {
      kind: config.kind,
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
    });
  },

  proxyClear: async (): Promise<void> => {
    await invoke('proxy_clear');
  },

  proxyGetStatus: async (): Promise<null | {
    kind: string;
    host: string;
    port: number;
    username: string;
    password: string;
  }> => {
    return await invoke('proxy_get_status');
  },

  proxyTestApi: async (): Promise<{
    ok: boolean;
    status: number;
    time_ms: number;
    error: string | null;
  }> => {
    return await invoke('proxy_test_api');
  },

  proxyTestCdn: async (): Promise<{
    ok: boolean;
    status: number;
    time_ms: number;
    error: string | null;
  }> => {
    return await invoke('proxy_test_cdn');
  },
};