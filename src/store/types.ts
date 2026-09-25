export interface User {
  id: number;
  username: string;
  full_name?: string;
  permalink_url?: string;
  avatar_url?: string;
  description?: string;
  followers_count?: number;
  followings_count?: number;
  track_count?: number;
  reposts_count?: number;
  likes_count?: number;
  verified?: boolean;
  city?: string;
  country_code?: string;
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
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  artwork_url?: string;
  createdAt?: number;
  title?: string;
  user?: User;
  track_count?: number;
  duration?: number;
  playlist_type?: 'playlist' | 'album' | 'ep';
  permalink_url?: string;
  description?: string;
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