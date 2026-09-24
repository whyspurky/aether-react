import type { Track, Playlist } from '../types';

export interface LibrarySlice {
  library: {
    favorites: Track[];
    history: Track[];
    playlists: Playlist[];
    currentPlaylist: Playlist | null;
  };
  addToFavorites: (track: Track) => void;
  removeFromFavorites: (trackId: number) => void;
  addToHistory: (track: Track) => void;
  removeFromHistory: (trackId: number) => void;
  clearHistory: () => void;
  clearFavorites: () => void;
  createPlaylist: (name: string) => void;
  importPlaylist: (name: string, tracks: Track[], artworkUrl?: string) => string;
  updatePlaylist: (id: string, name: string) => void;
  addToPlaylist: (playlistId: string, track: Track) => void;
  removeFromPlaylist: (playlistId: string, trackId: number) => void;
  deletePlaylist: (playlistId: string) => void;
  setCurrentPlaylist: (playlist: Playlist | null) => void;
}

export const createLibrarySlice = (set: any) => ({
  library: {
    favorites: [],
    history: [],
    playlists: [],
    currentPlaylist: null,
  },

  addToFavorites: (track: Track) =>
    set((s: any) => ({
      library: {
        ...s.library,
        favorites: [track, ...s.library.favorites.filter((t: Track) => t.id !== track.id)],
      },
    })),

  removeFromFavorites: (trackId: number) =>
    set((s: any) => ({
      library: { ...s.library, favorites: s.library.favorites.filter((t: Track) => t.id !== trackId) },
    })),

  addToHistory: (track: Track) =>
    set((s: any) => ({
      library: {
        ...s.library,
        history: [track, ...s.library.history.filter((t: Track) => t.id !== track.id)].slice(0, 200),
      },
    })),

  removeFromHistory: (trackId: number) =>
    set((s: any) => ({
      library: { ...s.library, history: s.library.history.filter((t: Track) => t.id !== trackId) },
    })),

  clearHistory: () => set((s: any) => ({ library: { ...s.library, history: [] } })),
  clearFavorites: () => set((s: any) => ({ library: { ...s.library, favorites: [] } })),

  createPlaylist: (name: string) => {
    const pl: Playlist = { id: Date.now().toString(), name, tracks: [], createdAt: Date.now() };
    set((s: any) => ({ library: { ...s.library, playlists: [pl, ...s.library.playlists] } }));
  },

  importPlaylist: (name: string, tracks: Track[], artworkUrl?: string) => {
    const id = Date.now().toString();
    const pl: Playlist = { id, name, tracks, createdAt: Date.now(), artwork_url: artworkUrl };
    set((s: any) => ({ library: { ...s.library, playlists: [pl, ...s.library.playlists] } }));
    return id;
  },

  updatePlaylist: (id: string, name: string) =>
    set((s: any) => ({
      library: {
        ...s.library,
        playlists: s.library.playlists.map((pl: Playlist) => (pl.id === id ? { ...pl, name } : pl)),
      },
    })),

  addToPlaylist: (playlistId: string, track: Track) =>
    set((s: any) => ({
      library: {
        ...s.library,
        playlists: s.library.playlists.map((pl: Playlist) =>
          pl.id === playlistId && !pl.tracks.some((t: Track) => t.id === track.id)
            ? { ...pl, tracks: [track, ...pl.tracks] }
            : pl
        ),
      },
    })),

  removeFromPlaylist: (playlistId: string, trackId: number) =>
    set((s: any) => ({
      library: {
        ...s.library,
        playlists: s.library.playlists.map((pl: Playlist) =>
          pl.id === playlistId ? { ...pl, tracks: pl.tracks.filter((t: Track) => t.id !== trackId) } : pl
        ),
      },
    })),

  deletePlaylist: (playlistId: string) =>
    set((s: any) => ({
      library: { ...s.library, playlists: s.library.playlists.filter((pl: Playlist) => pl.id !== playlistId) },
    })),

  setCurrentPlaylist: (playlist: Playlist | null) =>
    set((s: any) => ({ library: { ...s.library, currentPlaylist: playlist } })),
});