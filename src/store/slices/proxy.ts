import type { ProxyMode, CustomProxyConfig } from '../types';

export interface ProxySlice {
  proxy: {
    mode: ProxyMode;
    custom: CustomProxyConfig;
    zapret: {
      status: 'unknown' | 'running' | 'stopped' | 'not_installed';
      batPath: string;
      folder: string;
    };
  };
  setProxyMode: (mode: ProxyMode) => void;
  setCustomProxy: (config: Partial<CustomProxyConfig>) => void;
  setZapretFolder: (folder: string) => void;
  setZapretStatus: (status: 'unknown' | 'running' | 'stopped' | 'not_installed') => void;
  setZapretBatPath: (path: string) => void;
}

export const initialProxyState = {
  mode: 'off' as ProxyMode,
  custom: {
    type: 'socks5' as const,
    host: '127.0.0.1',
    port: 1080,
    username: '',
    password: '',
  },
  zapret: {
    status: 'unknown' as const,
    batPath: '',
    folder: '',
  },
};

export const createProxySlice = (set: any) => ({
  proxy: initialProxyState,

  setProxyMode: (mode: ProxyMode) => set((s: any) => ({ proxy: { ...s.proxy, mode } })),

  setCustomProxy: (config: Partial<CustomProxyConfig>) =>
    set((s: any) => ({ proxy: { ...s.proxy, custom: { ...s.proxy.custom, ...config } } })),

  setZapretFolder: (folder: string) =>
    set((s: any) => ({ proxy: { ...s.proxy, zapret: { ...s.proxy.zapret, folder } } })),

  setZapretStatus: (status: 'unknown' | 'running' | 'stopped' | 'not_installed') =>
    set((s: any) => ({ proxy: { ...s.proxy, zapret: { ...s.proxy.zapret, status } } })),

  setZapretBatPath: (path: string) =>
    set((s: any) => ({ proxy: { ...s.proxy, zapret: { ...s.proxy.zapret, batPath: path } } })),
});