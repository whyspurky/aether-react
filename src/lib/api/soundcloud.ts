import { invokeCmd, invokeCmdStrict } from './client';
import type { Track, User, Playlist } from '@store/types';

export interface ArtistSectionResult<T> {
  items: T[];
  hasMore: boolean;
  // сколько элементов пришло в сыром ответе, для смещения пагинации
  count?: number;
  // курсор следующей страницы из next_href
  cursor?: string;
}

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

  getUserTracks: async (
    userId: number,
    limit = 30,
    offset = 0,
    sort: 'popular' | 'new' = 'new',
    cursor?: string
  ): Promise<ArtistSectionResult<Track>> => {
    const data = await invokeCmdStrict<any>('get_user_tracks', {
      userId: String(userId),
      limit,
      offset,
      cursor: cursor ?? null,
      sort,
    });
    return {
      items: data?.collection || [],
      hasMore: !!data?.has_more,
      count: typeof data?.count === 'number' ? data.count : undefined,
      cursor: typeof data?.next_cursor === 'string' ? data.next_cursor : undefined,
    };
  },

  getUserPopularTracks: async (userId: number, limit = 10): Promise<ArtistSectionResult<Track>> => {
    const data = await invokeCmdStrict<any>('get_user_popular_tracks', { userId: String(userId), limit });
    return {
      items: data?.collection || [],
      hasMore: !!data?.has_more,
      count: typeof data?.count === 'number' ? data.count : undefined,
    };
  },

  getRelatedArtists: async (
    userId: number,
    limit = 12,
    offset = 0
  ): Promise<ArtistSectionResult<User>> => {
    const data = await invokeCmdStrict<any>('get_related_artists', {
      userId: String(userId),
      limit,
      offset,
    });
    return {
      items: data?.collection || [],
      hasMore: !!data?.has_more,
      count: typeof data?.count === 'number' ? data.count : undefined,
    };
  },

  // в репостах бывают и треки и альбомы, разбираем на два списка
  getUserReposts: async (
    userId: number,
    limit = 30,
    offset = 0
  ): Promise<ArtistSectionResult<Track> & { playlists: Playlist[] }> => {
    const data = await invokeCmdStrict<any>('get_user_reposts', { userId: String(userId), limit, offset });
    const collection = data?.collection || [];
    const tracks: Track[] = [];
    const playlists: Playlist[] = [];

    for (const item of collection) {
      if (item?.track?.id) tracks.push(item.track);
      else if (item?.playlist?.id) playlists.push(item.playlist);
    }

    return {
      items: tracks,
      playlists,
      hasMore: !!data?.has_more,
      count: collection.length,
    };
  },

  getUser: async (userId: number): Promise<User | null> => {
    return await invokeCmdStrict<User>('get_user', { userId: String(userId) });
  },

  getPlaylist: async (playlistId: string): Promise<Playlist | null> => {
    return await invokeCmd<Playlist>('get_playlist', { urlOrId: playlistId });
  },

  getPlaylistTracks: async (playlistId: string): Promise<Track[]> => {
    const data = await invokeCmd<any>('get_playlist_tracks', { urlOrId: playlistId });
    return data?.collection || [];
  },

  getUserPlaylists: async (userId: number, limit = 30, offset = 0): Promise<ArtistSectionResult<Playlist>> => {
    const data = await invokeCmdStrict<any>('get_user_playlists', { userId: String(userId), limit, offset });
    return {
      items: data?.collection || [],
      hasMore: !!data?.has_more,
      count: typeof data?.count === 'number' ? data.count : undefined,
    };
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