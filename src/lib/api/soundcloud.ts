import { invoke } from '@tauri-apps/api/core';
import type { Track, User, Playlist } from '@store/types';

let popularCache: { tracks: Track[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export const soundcloudApi = {
  searchTracks: async (query: string, limit = 20, offset = 0): Promise<Track[]> => {
    if (!query || !query.trim()) return [];
    try {
      const data = await invoke<any>('search_tracks', { query, limit, offset });
      return data?.collection || [];
    } catch {
      return [];
    }
  },

  searchUsers: async (query: string, offset = 0, limit = 50): Promise<User[]> => {
    try {
      const tracks = await soundcloudApi.searchTracks(query, limit, offset);
      const users = new Map<number, User>();
      for (const t of tracks) {
        if (t.user && !users.has(t.user.id)) users.set(t.user.id, t.user);
      }
      return Array.from(users.values()).slice(0, limit);
    } catch {
      return [];
    }
  },

  searchPlaylists: async (query: string, limit = 10, offset = 0): Promise<any> => {
    try {
      return await invoke('search_playlists', { query, limit, offset });
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

  getUserPopularTracks: async (userId: number): Promise<Track[]> => {
    try {
      const data = await invoke<any>('get_user_popular_tracks', { userId: String(userId) });
      return data?.collection || [];
    } catch {
      return [];
    }
  },

  getRelatedArtists: async (userId: number): Promise<User[]> => {
    try {
      const data = await invoke<any>('get_related_artists', { userId: String(userId) });
      return data?.collection || [];
    } catch {
      return [];
    }
  },

  getUserReposts: async (userId: number): Promise<Track[]> => {
    try {
      const data = await invoke<any>('get_user_reposts', { userId: String(userId) });
      const collection = data?.collection || [];
      return collection
        .map((item: any) => item.track)
        .filter((t: any) => t && t.id);
    } catch {
      return [];
    }
  },

  getUser: async (userId: number): Promise<User | null> => {
    try {
      const data = await invoke<User>('get_user', { userId: String(userId) });
      return data || null;
    } catch {
      return null;
    }
  },

  getPlaylist: async (playlistId: string): Promise<Playlist | null> => {
    try {
      const data = await invoke<Playlist>('get_playlist', { urlOrId: playlistId });
      return data || null;
    } catch {
      return null;
    }
  },

  getPlaylistTracks: async (playlistId: string): Promise<Track[]> => {
    try {
      const data = await invoke<any>('get_playlist_tracks', { urlOrId: playlistId });
      return data?.collection || [];
    } catch {
      return [];
    }
  },

  getUserPlaylists: async (userId: number): Promise<Playlist[]> => {
    try {
      const data = await invoke<any>('get_user_playlists', { userId: String(userId) });
      return data?.collection || [];
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

      let tracks = await soundcloudApi.searchTracks(artist, limit, 0);
      if (tracks.length < limit / 2) {
        const popular = await soundcloudApi.getPopular(limit);
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
    if (offset === 0 && popularCache && Date.now() - popularCache.timestamp < CACHE_TTL) {
      return popularCache.tracks.slice(0, limit);
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
        popularCache = { tracks: unique, timestamp: Date.now() };
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
        tracks = await soundcloudApi.searchTracks(historyArtists[0], limit, 0);
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
};