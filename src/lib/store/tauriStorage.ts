import { StateStorage } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

let pendingKey: string | null = null;
let pendingValue: string | null = null;
let debounceTimer: number | null = null;

const DEBOUNCE_MS = 500;

async function flush() {
  if (pendingKey === null || pendingValue === null) return;
  const key = pendingKey;
  const value = pendingValue;
  pendingKey = null;
  pendingValue = null;
  try {
    await invoke('save_store', { key, value });
  } catch {}
}

export async function flushPending(): Promise<void> {
  if (debounceTimer !== null) {
    window.clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  await flush();
}

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
    pendingKey = name;
    pendingValue = value;

    if (debounceTimer !== null) {
      window.clearTimeout(debounceTimer);
    }
    debounceTimer = window.setTimeout(() => {
      debounceTimer = null;
      flush();
    }, DEBOUNCE_MS);
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

export async function saveNow(): Promise<void> {
  if (debounceTimer !== null) {
    window.clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  await flush();
}