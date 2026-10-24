export interface UserVisual {
  visual_url?: string;
}

export interface UserVisuals {
  enabled?: boolean;
  visuals?: UserVisual[];
}

export interface User {
  id: number;
  username: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  permalink?: string;
  permalink_url?: string;
  avatar_url?: string;
  description?: string;
  followers_count?: number;
  followings_count?: number;
  track_count?: number;
  reposts_count?: number;
  likes_count?: number;
  playlist_count?: number;
  comments_count?: number;
  verified?: boolean;
  city?: string;
  country_code?: string;
  created_at?: string;
  last_modified?: string;
  web_profiles?: string[];
  visuals?: UserVisuals;
  badges?: { kind?: string }[];
  station_permalink?: string;
}

export interface Track {
  id: number;
  title: string;
  permalink_url: string;
  duration: number;
  artwork_url?: string;
  user?: User;
  streamable?: boolean;
  access?: string;
  playback_count?: number;
  genre?: string;
  created_at?: string;
}

export interface Playlist {
  id: string | number;
  name: string;
  // soundcloud возвращает title, локально используем name
  title?: string;
  tracks: Track[];
  artwork_url?: string;
  createdAt?: number;
  user?: User;
  track_count?: number;
  duration?: number;
  playlist_type?: 'playlist' | 'album' | 'ep' | 'single' | 'compilation';
  is_album?: boolean;
  release_date?: string;
  created_at?: string;
  permalink_url?: string;
  description?: string;
  genre?: string;
  label_name?: string;
  likes_count?: number;
}

export type ArtistTab = 'overview' | 'tracks' | 'releases' | 'playlists' | 'reposts';

export type ArtistSectionKey =
  | 'popular'
  | 'tracks'
  | 'tracksPopular'
  | 'playlists'
  | 'reposts'
  | 'related';

export type ArtistTracksSort = 'popular' | 'new';

export type ArtistSectionStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ArtistSectionMeta {
  status: ArtistSectionStatus;
  error: string | null;
  hasMore: boolean;
  offset: number;
  // курсор api-v2 из next_href, у новых треков offset это не число
  cursor?: string | null;
}

export type AudioQuality = 'best' | 'high' | 'medium' | 'low';

export interface StreamInfo {
  url: string;
  genre: string | null;
  playback_count: number | null;
  preset: string;
  protocol: string;
  bitrate: number | null;
  quality: AudioQuality;
}

export interface TrackCacheEntry {
  trackId: number;
  path: string;
  quality: AudioQuality;
  preset: string;
  bitrate: number | null;
  source: string;
  offline: boolean;
  size: number;
  durationMs: number | null;
}

export interface EnsureCachedResult {
  entry: TrackCacheEntry;
  stream: StreamInfo | null;
}

export interface CacheSizes {
  temp: number;
  offline: number;
}

export interface BulkCacheStatus {
  scope: string;
  phase: 'running' | 'done' | 'cancelled';
  total: number;
  done: number;
  failed: number;
  skipped: number;
}

export type ProxyMode = 'off' | 'builtin' | 'custom' | 'zapret';

export type CustomProxyType = 'socks5' | 'http' | 'https';

export interface CustomProxyConfig {
  type: CustomProxyType;
  host: string;
  port: number;
  username: string;
  password: string;
}