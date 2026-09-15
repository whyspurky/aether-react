// src/store/types.ts

export interface User {
  id: number;
  username: string;
  avatar_url?: string;
  followers_count?: number;
}

export interface Track {
  id: number;
  title: string;
  permalink_url: string;
  duration: number; // мс
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
}