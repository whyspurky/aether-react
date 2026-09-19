// src/lib/api.ts

import { invoke } from '@tauri-apps/api/core';
import type { Track, User } from '../store/types';

let cache: { tracks: Track[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export const api = {

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

  searchTracks: async (query: string, limit = 20, offset = 0): Promise<Track[]> => {
    if (!query || !query.trim()) return [];
    try {
      const data = await invoke<any>('search_tracks', { query, limit, offset });
      return data?.collection || [];
    } catch {
      return [];
    }
  },

zapretStatus: async (): Promise<'running' | 'stopped' | 'not_installed'> => {
  return await invoke('zapret_status');
},

zapretStart: async (): Promise<void> => {
  await invoke('zapret_start');
},

zapretStop: async (): Promise<void> => {
  await invoke('zapret_stop');
},

zapretRunBat: async (batPath: string): Promise<void> => {
  await invoke('zapret_run_bat', { batPath });
},

zapretProcessRunning: async (): Promise<boolean> => {
  return await invoke('zapret_process_running');
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

zapretDownload: async (): Promise<string> => {
  return await invoke('zapret_download');
},

zapretOpenFolder: async (path: string): Promise<void> => {
  await invoke('zapret_open_folder', { path });
},

zapretOpenFile: async (path: string): Promise<void> => {
  await invoke('zapret_open_file', { path });
},

zapretScanStrategies: async (folder: string): Promise<{ filename: string; path: string }[]> => {
  return await invoke('zapret_scan_strategies', { folder });
},

zapretCheckLists: async (folder: string): Promise<{
  file: string;
  exists: boolean;
  has_sndcdn: boolean;
  has_soundcloud: boolean;
  sndcdn_lines: string[];
}[]> => {
  return await invoke('zapret_check_lists', { folder });
},

zapretAddSoundcloudDomains: async (folder: string): Promise<void> => {
  await invoke('zapret_add_soundcloud_domains', { folder });
},

  searchUsers: async (query: string, offset = 0, limit = 50): Promise<User[]> => {
    try {
      const tracks = await api.searchTracks(query, limit, offset);
      const users = new Map<number, User>();
      for (const t of tracks) {
        if (t.user && !users.has(t.user.id)) users.set(t.user.id, t.user);
      }
      return Array.from(users.values()).slice(0, limit);
    } catch {
      return [];
    }
  },

  getUserTracks: async (userId: number): Promise<Track[]> => {
    try {
      const data = await invoke<any>('get_user_tracks', { userId: String(userId) });
      return data?.collection || [];
    } catch {
      return [];
    }
  },

  getPlaylistTracks: async (playlistId: string): Promise<any> => {
    try {
      return await invoke('get_playlist_tracks', { urlOrId: playlistId });
    } catch {
      return null;
    }
  },

  searchPlaylists: async (query: string, limit = 10, offset = 0): Promise<any> => {
    try {
      return await invoke('search_playlists', { query, limit, offset });
    } catch {
      return [];
    }
  },

  getRelatedTracks: async (currentTracks: Track[], limit = 15, artists: string[] = []): Promise<Track[]> => {
    try {
      let artist = '';
      if (artists.length) artist = artists[Math.floor(Math.random() * artists.length)];
      else if (currentTracks.length) artist = currentTracks[currentTracks.length - 1]?.user?.username || '';
      if (!artist) artist = 'popular';

      let tracks = await api.searchTracks(artist, limit, 0);
      if (tracks.length < limit / 2) {
        const popular = await api.getPopular(limit);
        tracks = [...tracks, ...popular];
      }

      const unique = new Map<number, Track>();
      for (const t of tracks) {
        if (t?.id && t.permalink_url) unique.set(t.id, t);
      }
      return Array.from(unique.values());
    } catch {
      return [];
    }
  },

  getPopular: async (limit = 20, offset = 0): Promise<Track[]> => {
    if (offset === 0 && cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return cache.tracks.slice(0, limit);
    }

    try {
      const data = await invoke<any>('get_popular', { limit, offset });
      const tracks: Track[] = data?.collection || [];

      const seen = new Set<number>();
      const unique: Track[] = [];
      for (const t of tracks) {
        if (t?.id && !seen.has(t.id)) {
          seen.add(t.id);
          unique.push(t);
        }
      }

      if (offset === 0 && unique.length) {
        cache = { tracks: unique, timestamp: Date.now() };
      }

      return unique.slice(0, limit);
    } catch {
      return [];
    }
  },

  getMyWave: async (historyArtists: string[], limit = 20): Promise<Track[]> => {
    if (!historyArtists.length) return [];
    try {
      const data = await invoke<any>('get_my_wave', { historyArtists: historyArtists.slice(0, 5) });
      let tracks = data?.collection || [];
      if (!tracks.length) {
        tracks = await api.searchTracks(historyArtists[0], limit, 0);
      }
      return tracks;
    } catch {
      return [];
    }
  },

  fetchUrl: async (url: string): Promise<any> => {
    try {
      return await invoke('fetch_url', { url });
    } catch {
      return null;
    }
  },


  getStreamUrl: async (trackId: number): Promise<string> => {
    if (!trackId) throw new Error('trackId не указан');
    const url = await invoke<string>('get_stream_url', { trackId: String(trackId) });
    if (!url || typeof url !== 'string') throw new Error(`неверный url: ${url}`);
    return url;
  },

  playAudio: async (url: string): Promise<void> => {
    if (!url) throw new Error('url не указан');
    await invoke('play_audio', { url });
  },

  pauseAudio: async (): Promise<void> => {
    try { await invoke('pause_audio'); } catch {}
  },

  resumeAudio: async (): Promise<void> => {
    try { await invoke('resume_audio'); } catch {}
  },

  stopAudio: async (): Promise<void> => {
    try { await invoke('stop_audio'); } catch {}
  },

  muteAudio: async (): Promise<void> => {
    try { await invoke('mute_audio'); } catch {}
  },

  unmuteAudio: async (): Promise<void> => {
    try { await invoke('unmute_audio'); } catch {}
  },

  setVolume: async (volume: number): Promise<void> => {
    try { await invoke('set_volume', { volume }); } catch {}
  },

  getPosition: async (): Promise<number> => {
    try {
      const pos = await invoke<number>('get_position');
      return typeof pos === 'number' ? pos : 0;
    } catch {
      return 0;
    }
  },

  seekAudio: async (seconds: number): Promise<void> => {
    try { await invoke('seek_audio', { seconds }); } catch {}
  },

  setTrackDuration: async (durationMs: number): Promise<void> => {
    try { await invoke('set_track_duration', { durationMs }); } catch {}
  },
};

if (typeof window !== 'undefined') {
  (window as any).api = api;
}