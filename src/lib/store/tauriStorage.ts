import { StateStorage } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

export const tauriStorage: StateStorage = {
  getItem: async (name) => {
    try {
      const val = await invoke<string | null>('load_store', { key: name });
      return val ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      await invoke('save_store', { key: name, value });
    } catch {}
  },
  removeItem: async (name) => {
    try {
      await invoke('save_store', { key: name, value: '' });
    } catch {}
  },
};

export async function clearTauriStorage(): Promise<void> {
  await invoke('clear_store');
}

export async function savePosition(pos: number): Promise<void> {
  try {
    const raw = await invoke<string | null>('load_store', { key: 'aether-storage' });
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data.state) data.state = {};
    if (!data.state.player) data.state.player = {};
    data.state.player.position = pos;
    await invoke('save_store', { key: 'aether-storage', value: JSON.stringify(data) });
  } catch {}
}