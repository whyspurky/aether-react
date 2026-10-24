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

export async function invokeCmdStrict<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn(`[invoke] ${cmd} failed:`, e);
    }
    throw new Error(typeof e === 'string' ? e : e instanceof Error ? e.message : 'ошибка запроса');
  }
}