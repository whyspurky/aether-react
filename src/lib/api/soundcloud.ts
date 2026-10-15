import { invokeCmd } from './client';
import type { Track, User, Playlist } from '@store/types';

let popularCache: { tracks: Track[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    popularCache = null;
  });
}

export const soundcloudApi = {
  searchTracks: async (query: string, limit = 20, offset = 0): Promise<Track[]> => {
    if (!query || !query.trim()) return [];
    const data = await invokeCmd<any>('search_tracks', { query, limit, offset });
    return data?.collection || [];
  },



  searchUsers: async (query: string, offset = 0, limit = 50): Promise<User[]> => {
    const data = await invokeCmd<any>('search_users', { query, limit, offset });
    const users: User[] = data?.collection || [];
    return users.filter((u) => (u.track_count ?? 0) > 0);
  },

  searchPlaylists: async (query: string, limit = 10, offset = 0): Promise<Playlist[]> => {
    const data = await invokeCmd<any>('search_playlists', { query, limit, offset });
    return data?.collection || [];
  },

  searchSuggestions: async (query: string, limit = 10): Promise<string[]> => {
    const data = await invokeCmd<any>('search_suggestions', { query, limit });
    const collection = data?.collection || [];
    return collection
      .map((item: any) => item.query)
      .filter((s: any): s is string => typeof s === 'string' && s.length > 0);
  },

  getUserTracks: async (userId: number): Promise<Track[]> => {
    const data = await invokeCmd<any>('get_user_tracks', { userId: String(userId) });
    return data?.collection || [];
  },

  getUserPopularTracks: async (userId: number): Promise<Track[]> => {
    const data = await invokeCmd<any>('get_user_popular_tracks', { userId: String(userId) });
    return data?.collection || [];
  },

  getRelatedArtists: async (userId: number): Promise<User[]> => {
    const data = await invokeCmd<any>('get_related_artists', { userId: String(userId) });
    return data?.collection || [];
  },

  getUserReposts: async (userId: number): Promise<Track[]> => {
    const data = await invokeCmd<any>('get_user_reposts', { userId: String(userId) });
    const collection = data?.collection || [];
    return collection
      .map((item: any) => item.track)
      .filter((t: any) => t && t.id);
  },

  getUser: async (userId: number): Promise<User | null> => {
    return await invokeCmd<User>('get_user', { userId: String(userId) });
  },

  getPlaylist: async (playlistId: string): Promise<Playlist | null> => {
    return await invokeCmd<Playlist>('get_playlist', { urlOrId: playlistId });
  },

  getPlaylistTracks: async (playlistId: string): Promise<Track[]> => {
    const data = await invokeCmd<any>('get_playlist_tracks', { urlOrId: playlistId });
    return data?.collection || [];
  },

  getUserPlaylists: async (userId: number): Promise<Playlist[]> => {
    const data = await invokeCmd<any>('get_user_playlists', { userId: String(userId) });
    return data?.collection || [];
  },

  getRelatedTracks: async (currentTracks: Track[], limit = 15, artists: string[] = []): Promise<Track[]> => {
    let artist = '';
    if (artists.length) artist = artists[0];
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
  },

  getPopular: async (limit = 20, offset = 0): Promise<Track[]> => {
    if (offset === 0 && popularCache && Date.now() - popularCache.timestamp < CACHE_TTL) {
      return popularCache.tracks.slice(0, limit);
    }

    const data = await invokeCmd<any>('get_popular', { limit, offset });
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
  },

  getMyWave: async (historyArtists: string[]): Promise<Track[]> => {
    if (!historyArtists.length) return [];
    const data = await invokeCmd<any>('get_my_wave', { historyArtists: historyArtists.slice(0, 5) });
    return data?.collection || [];
  },

  fetchUrl: async (url: string): Promise<any> => {
    return await invokeCmd('fetch_url', { url });
  },
};