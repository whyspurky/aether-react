import { invoke } from '@tauri-apps/api/core';
import { invokeCmd } from './client';

interface PlaybackSync {
  position_sec: number;
  real_offset_ms: number;
}

export const playerApi = {
  getStreamUrl: async (trackId: number): Promise<{
    url: string;
    genre: string | null;
    playback_count: number | null;
  }> => {
    if (!trackId) throw new Error('trackId не указан');
    const data = await invoke<{
      url: string;
      genre: string | null;
      playback_count: number | null;
    }>('get_stream_url', { trackId: String(trackId) });
    if (!data || typeof data.url !== 'string') throw new Error(`неверный url: ${data?.url}`);
    return data;
  },

  playAudio: async (url: string, trackId: number): Promise<PlaybackSync> => {
    if (!url) throw new Error('url не указан');
    if (!trackId) throw new Error('trackId не указан');
    return await invoke<PlaybackSync>('play_audio', { url, trackId });
  },

  pauseAudio: async (): Promise<void> => { await invokeCmd('pause_audio'); },
  resumeAudio: async (): Promise<PlaybackSync | null> => {
    return await invokeCmd<PlaybackSync>('resume_audio');
  },
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

  seekAudio: async (seconds: number): Promise<PlaybackSync | null> => {
    return await invokeCmd<PlaybackSync>('seek_audio', { seconds });
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