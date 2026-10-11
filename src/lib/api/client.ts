import { invoke } from '@tauri-apps/api/core';

export async function invokeCmd<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  try {
    return await invoke<T>(cmd, args);
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn(`[invoke] ${cmd} failed:`, e);
    }
    return null;
  }
}