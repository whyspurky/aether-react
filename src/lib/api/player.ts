import { invoke } from '@tauri-apps/api/core';
import { invokeCmd, invokeCmdStrict } from './client';
import type { AudioQuality, AudioSettings, EqSettings, StreamInfo } from '@store/types';

export interface PlaybackSync {
  position_sec: number;
  real_offset_ms: number;
}

export const playerApi = {
  getStreamUrl: async (trackId: number, quality: AudioQuality = 'best'): Promise<StreamInfo> => {
    if (!trackId) throw new Error('trackId не указан');
    const data = await invoke<StreamInfo>('get_stream_url', {
      trackId: String(trackId),
      quality,
    });
    if (!data || typeof data.url !== 'string') throw new Error(`неверный url: ${data?.url}`);
    return data;
  },

  playCached: async (trackId: number): Promise<PlaybackSync> => {
    if (!trackId) throw new Error('trackId не указан');
    return await invoke<PlaybackSync>('play_cached', { trackId });
  },

  playStream: async (
    trackId: number,
    quality: AudioQuality = 'best'
  ): Promise<{ sync: PlaybackSync; stream: StreamInfo | null }> => {
    if (!trackId) throw new Error('trackId не указан');
    return await invoke('play_stream', { trackId, quality });
  },

  listOutputDevices: async (): Promise<
    { id: string; name: string; detail: string; isDefault: boolean }[]
  > => {
    return (
      (await invokeCmd<
        { id: string; name: string; detail: string; isDefault: boolean }[]
      >('list_output_devices')) ?? []
    );
  },

  setOutputDevice: async (id: string | null): Promise<string> => {
    return await invokeCmdStrict<string>('set_output_device', { id });
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

  queueNextTrack: async (
    trackId: number,
    durationMs: number,
    quality: AudioQuality = 'best'
  ): Promise<boolean> => {
    return (
      (await invokeCmd<boolean>('queue_next_track', {
        trackId,
        durationMs,
        quality,
      })) ?? false
    );
  },

  setAudioSettings: async (settings: AudioSettings): Promise<void> => {
    await invokeCmd('set_audio_settings', { settings });
  },

  setEq: async (settings: EqSettings): Promise<void> => {
    await invokeCmd('set_eq', { settings });
  },
};
