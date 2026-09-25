import { invoke } from '@tauri-apps/api/core';
import { invokeCmd } from './client';

export const playerApi = {
  getStreamUrl: async (trackId: number): Promise<string> => {
    if (!trackId) throw new Error('trackId не указан');
    const url = await invoke<string>('get_stream_url', { trackId: String(trackId) });
    if (!url || typeof url !== 'string') throw new Error(`неверный url: ${url}`);
    return url;
  },

  playAudio: async (url: string, trackId: number): Promise<void> => {
    if (!url) throw new Error('url не указан');
    if (!trackId) throw new Error('trackId не указан');
    await invoke('play_audio', { url, trackId });
  },

  pauseAudio: async (): Promise<void> => { await invokeCmd('pause_audio'); },
  resumeAudio: async (): Promise<void> => { await invokeCmd('resume_audio'); },
  stopAudio: async (): Promise<void> => { await invokeCmd('stop_audio'); },
  muteAudio: async (): Promise<void> => { await invokeCmd('mute_audio'); },
  unmuteAudio: async (): Promise<void> => { await invokeCmd('unmute_audio'); },

  setVolume: async (volume: number): Promise<void> => {
    await invokeCmd('set_volume', { volume });
  },

  getPosition: async (): Promise<number> => {
    const pos = await invokeCmd<number>('get_position');
    return typeof pos === 'number' ? pos : 0;
  },

  seekAudio: async (seconds: number): Promise<void> => {
    await invokeCmd('seek_audio', { seconds });
  },

  setTrackDuration: async (durationMs: number): Promise<void> => {
    await invokeCmd('set_track_duration', { durationMs });
  },

  prefetchAudio: async (url: string, trackId: number): Promise<void> => {
    await invokeCmd('prefetch_audio', { url, trackId });
  },

  cancelPrefetch: async (): Promise<void> => {
    await invokeCmd('cancel_prefetch');
  },
};