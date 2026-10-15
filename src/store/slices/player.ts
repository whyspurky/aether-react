import { api } from '@lib/api';
import type { Track } from '../types';

const QUEUE_MAX = 200;
const PRELOAD_REMAINING = 3;
const PRELOAD_ARTISTS = 5;
const PRELOAD_POOL_MAX = 30;
const RETRY_DELAY_MS = 1000;
const PREV_RESTART_THRESHOLD = 3;
const VOLUME_RUST_THROTTLE_MS = 100;

export interface PlayerSlice {
  queue: {
    tracks: Track[];
    currentIndex: number;
    source: string;
    originalTracks: Track[] | null;
  };
  player: {
    isPlaying: boolean;
    isLoading: boolean;
    isAudioReady: boolean;
    currentTrack: Track | null;
    volume: number;
    shuffle: boolean;
    repeat: 'none' | 'all' | 'one';
    position: number;
    duration: number;
    pendingSeek: number | null;
    shuffleHistory: number[];
  };
  preload: {
    isPreloading: boolean;
  };

  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: number) => void;
  playTrack: (track: Track, tracks: Track[], index: number, source?: string, _errorDepth?: number) => Promise<void>;
  nextTrack: (manual?: boolean) => Promise<void>;
  prevTrack: (manual?: boolean) => Promise<void>;
  togglePlay: () => Promise<void>;
  setVolume: (volume: number, force?: boolean) => void;  setPosition: (position: number) => void;
  setShuffle: (shuffle: boolean) => void;
  setRepeat: (repeat: 'none' | 'all' | 'one') => void;
  getUserTopArtists: (limit?: number) => string[];
  preloadMoreTracks: () => Promise<void>;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface QueueSetup {
  tracks: Track[];
  index: number;
  original: Track[] | null;
}

function computeQueue(
  track: Track,
  tracks: Track[],
  index: number,
  shuffleOn: boolean,
  isSameQueue: boolean,
): QueueSetup {
  if (!shuffleOn || isSameQueue) {
    return {
      tracks,
      index,
      original: shuffleOn ? tracks : null,
    };
  }

  const targetTrack = tracks[index] || track;
  const others = tracks.filter((t) => t.id !== targetTrack.id);
  return {
    tracks: [targetTrack, ...shuffleArray(others)],
    index: 0,
    original: tracks,
  };
}

function enrichTrack(track: Track, stream: { genre: string | null; playback_count: number | null }): Track {
  if (!stream.genre && stream.playback_count === null) return track;
  return {
    ...track,
    genre: stream.genre || undefined,
    playback_count: stream.playback_count ?? undefined,
  };
}

function shouldPreloadQueue(remaining: number, repeat: 'none' | 'all' | 'one'): boolean {
  return remaining <= PRELOAD_REMAINING && repeat === 'none';
}

let lastVolumePush = 0;
let lastTogglePlayAt = 0;

const TOGGLE_PLAY_DEBOUNCE_MS = 100;

export const createPlayerSlice = (set: any, get: any) => ({
  queue: {
    tracks: [] as Track[],
    currentIndex: -1,
    source: '',
    originalTracks: null,
  },
  player: {
    isPlaying: false,
    isLoading: false,
    isAudioReady: false,
    currentTrack: null,
    volume: 80,
    shuffle: false,
    repeat: 'none' as const,
    position: 0,
    duration: 0,
    pendingSeek: null,
    shuffleHistory: [] as number[],
  },
  preload: {
    isPreloading: false,
  },

  addToQueue: (track: Track) =>
    set((s: any) => {
      if (s.queue.tracks.some((t: Track) => t.id === track.id)) {
        return s;
      }
      return { queue: { ...s.queue, tracks: [...s.queue.tracks, track] } };
    }),


  removeFromQueue: (trackId: number) => {
    const s = get();
    const idx = s.queue.tracks.findIndex((t: Track) => t.id === trackId);
    if (idx === -1) return;

    const isCurrent = s.queue.currentIndex === idx;
    const newTracks = s.queue.tracks.filter((t: Track) => t.id !== trackId);
    const newOriginal = s.queue.originalTracks
      ? s.queue.originalTracks.filter((t: Track) => t.id !== trackId)
      : null;

if (isCurrent) {
  set({
    queue: {
      ...s.queue,
      tracks: newTracks,
      originalTracks: newOriginal,
      currentIndex: idx - 1,
    },
  });
  get().nextTrack(true);
  return;
}

    const currentIndex = idx < s.queue.currentIndex
      ? s.queue.currentIndex - 1
      : s.queue.currentIndex;

    set({
      queue: {
        ...s.queue,
        tracks: newTracks,
        originalTracks: newOriginal,
        currentIndex: Math.max(0, currentIndex),
      },
    });
  },

  playTrack: async (track: Track, tracks: Track[], index: number, source = 'queue', _errorDepth = 0) => {
    const state = get();

    if (state.player.isLoading && state.player.currentTrack?.id === track.id) {
      return;
    }

    // фиксируем клик по треку (5 баллов)
    get().addTrackClick({ user: track.user, genre: track.genre });

    try { await api.muteAudio(); } catch {}
    try { await api.stopAudio(); } catch {}

    const savedSeek = get().player.pendingSeek;
    const startPos = savedSeek && savedSeek > 0 ? savedSeek : 0;

    const { player, queue: currentQueue } = get();
    const shuffleOn = player.shuffle;
    const isSameQueue = currentQueue.tracks === tracks;

    const setup = computeQueue(track, tracks, index, shuffleOn, isSameQueue);

    set((s: any) => ({
      queue: {
        tracks: setup.tracks,
        currentIndex: setup.index,
        source,
        originalTracks: setup.original,
      },
      player: {
        ...s.player,
        currentTrack: track,
        isLoading: true,
        isAudioReady: false,
        isPlaying: false,
        position: startPos,
        duration: track.duration ? track.duration / 1000 : 0,
        pendingSeek: savedSeek && savedSeek > 0 ? savedSeek : null,
      },
    }));

    const isValid = () => get().player.currentTrack?.id === track.id;

    let started = false;
    const MAX_ATTEMPTS = 2;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !started; attempt++) {
      if (!isValid()) return;

      try {
        const stream = await api.getStreamUrl(track.id);
        if (!isValid()) return;

        const enriched = enrichTrack(track, stream);
        if (enriched !== track) {
          set((s: any) => ({
            player: { ...s.player, currentTrack: enriched },
          }));
        }

        const sync = await api.playAudio(stream.url, track.id);
        if (sync) {
          set((s: any) => ({
            player: {
              ...s.player,
              position: sync.position_sec,
            },
          }));
        }

        try {
          await api.setVolume(get().player.volume);
        } catch {}
        if (!isValid()) {
          await api.stopAudio();
          return;
        }

        await api.setTrackDuration(track.duration || 0);

        const pending = get().player.pendingSeek;
        if (pending !== null && pending > 0) {
          try { await api.seekAudio(pending); } catch {}
          set((s: any) => ({ player: { ...s.player, pendingSeek: null } }));
        }

        try { await api.unmuteAudio(); } catch {}

        set((s: any) => ({
          player: { ...s.player, isAudioReady: true, isPlaying: true, isLoading: false },
        }));

        started = true;
        get().addToHistory(track);

        const nextIdx = index + 1;
        const nextTrack = tracks[nextIdx];
        if (nextTrack?.id) {
          (async () => {
            try {
              if (!isValid()) return;
              const nextStream = await api.getStreamUrl(nextTrack.id);
              if (!isValid()) return;
              await api.prefetchAudio(nextStream.url, nextTrack.id);
            } catch {}
          })();
        }

        const remaining = get().queue.tracks.length - index - 1;
        if (shouldPreloadQueue(remaining, get().player.repeat)) {
          get().preloadMoreTracks().catch(() => {});
        }

      } catch (err) {
        if (!isValid()) return;

        if (err instanceof Error && err.message === 'Request cancelled') {
          set((s: any) => ({ player: { ...s.player, isLoading: false, isAudioReady: false, isPlaying: false } }));
          return;
        }

        if (attempt < MAX_ATTEMPTS) {
          await delay(RETRY_DELAY_MS);
          continue;
        }

        set((s: any) => ({ player: { ...s.player, isLoading: false, isAudioReady: false, isPlaying: false } }));

        const next = index + 1;
        if (next < tracks.length && isValid() && _errorDepth < 3) {
          await get().playTrack(tracks[next], tracks, next, source, _errorDepth + 1);
        } else {
          set((s: any) => ({
            player: { ...s.player, currentTrack: null, isAudioReady: false, isPlaying: false, isLoading: false },
          }));
        }
      }
    }
  },

  nextTrack: async (manual = false) => {
    try { await api.stopAudio(); } catch {}

    set((s: any) => ({
      player: {
        ...s.player,
        isPlaying: false,
        position: 0,
        repeat: manual && s.player.repeat === 'one' ? 'none' : s.player.repeat,
      },
    }));

    const { queue, player } = get();

    if (!manual && player.repeat === 'one') {
      const current = get().player.currentTrack;
      if (current) {
        await get().playTrack(current, get().queue.tracks, get().queue.currentIndex, get().queue.source);
      }
      return;
    }

    let nextIndex = queue.currentIndex + 1;

    if (nextIndex >= queue.tracks.length) {
      if (player.repeat === 'all') {
        nextIndex = 0;
      } else {
        await get().preloadMoreTracks();

        const q = get().queue;
        if (q.tracks.length > queue.tracks.length) {
          nextIndex = q.currentIndex + 1;
        } else {
          set((s: any) => ({
            player: { ...s.player, currentTrack: null, isPlaying: false, isLoading: false },
          }));
          return;
        }
      }
    }

    const next = get().queue.tracks[nextIndex];
    if (next) {
      await get().playTrack(next, get().queue.tracks, nextIndex, get().queue.source);
    }
  },

  prevTrack: async (manual = false) => {
    const { player } = get();

    if (player.currentTrack && player.position > PREV_RESTART_THRESHOLD) {
      try {
        await api.seekAudio(0);
      } catch {}

      set((s: any) => ({
        player: { ...s.player, position: 0 },
      }));
      return;
    }

    try { await api.stopAudio(); } catch {}

    set((s: any) => ({
      player: {
        ...s.player,
        isPlaying: false,
        position: 0,
        repeat: manual && s.player.repeat === 'one' ? 'none' : s.player.repeat,
      },
    }));

    const { queue } = get();
    const prevIndex = Math.max(0, queue.currentIndex - 1);
    const prev = get().queue.tracks[prevIndex];

    if (prev) {
      await get().playTrack(prev, get().queue.tracks, prevIndex, get().queue.source);
    }
  },

  togglePlay: async () => {
    const now = performance.now();
    if (now - lastTogglePlayAt < TOGGLE_PLAY_DEBOUNCE_MS) return;
    lastTogglePlayAt = now;

    const { isPlaying, isLoading, isAudioReady, currentTrack, position } = get().player;

    if (isLoading) return;

    if (!isAudioReady && currentTrack) {
      const { queue } = get();
      const tracks = queue.tracks.length ? queue.tracks : [currentTrack];
      const index = queue.tracks.length ? queue.currentIndex : 0;
      set((s: any) => ({ player: { ...s.player, pendingSeek: position > 0 ? position : null } }));
      await get().playTrack(currentTrack, tracks, index, queue.source || 'restore');
      return;
    }

    if (!isAudioReady) return;

    if (isPlaying) {
      set((s: any) => ({ player: { ...s.player, isPlaying: false } }));
      await api.pauseAudio();
    } else {
      set((s: any) => ({ player: { ...s.player, isPlaying: true } }));
      const sync = await api.resumeAudio();
      if (sync) {
        set((s: any) => ({ player: { ...s.player, position: sync.position_sec } }));
      }
    }
  },

  setVolume: (volume: number, force = false) => {
    set((s: any) => ({ player: { ...s.player, volume } }));

    if (force) {
      lastVolumePush = performance.now();
      api.setVolume(volume).catch(() => {});
      return;
    }

    const now = performance.now();
    if (now - lastVolumePush < VOLUME_RUST_THROTTLE_MS) return;
    lastVolumePush = now;
    api.setVolume(volume).catch(() => {});
  },

  setPosition: (position: number) => {
    const { isAudioReady, isLoading } = get().player;

    if (!isAudioReady || isLoading) {
      set((s: any) => ({ player: { ...s.player, position, pendingSeek: position } }));
      return;
    }

    set((s: any) => ({ player: { ...s.player, position } }));
  },

  setShuffle: (shuffle: boolean) => {
    const { queue, player } = get();

    if (shuffle && !player.shuffle) {
      if (queue.tracks.length < 2) {
        set((s: any) => ({ player: { ...s.player, shuffle: true } }));
        return;
      }

      const current = player.currentTrack;
      if (!current) {
        set((s: any) => ({ player: { ...s.player, shuffle: true } }));
        return;
      }

      const others = queue.tracks.filter((t: Track) => t.id !== current.id);
      const shuffled = [current, ...shuffleArray(others)];

      set((s: any) => ({
        player: { ...s.player, shuffle: true },
        queue: {
          ...s.queue,
          tracks: shuffled,
          currentIndex: 0,
          originalTracks: s.queue.originalTracks || s.queue.tracks,
        },
      }));
      return;
    }

    if (!shuffle && player.shuffle) {
      const original = queue.originalTracks;
      if (!original) {
        set((s: any) => ({ player: { ...s.player, shuffle: false } }));
        return;
      }

      const current = player.currentTrack;
      const newIndex = current ? original.findIndex((t: Track) => t.id === current.id) : 0;

      set((s: any) => ({
        player: { ...s.player, shuffle: false },
        queue: {
          ...s.queue,
          tracks: original,
          currentIndex: newIndex >= 0 ? newIndex : 0,
          originalTracks: null,
        },
      }));
      return;
    }

    set((s: any) => ({ player: { ...s.player, shuffle } }));
  },

  setRepeat: (repeat: 'none' | 'all' | 'one') =>
    set((s: any) => ({ player: { ...s.player, repeat } })),

  getUserTopArtists: (limit = 5) => {
    const { library } = get();
    const source = [...library.history, ...library.favorites];
    if (!source.length) return [];

    const freq: Record<string, number> = {};
    for (const t of source) {
      const a = t.user?.username;
      if (a) freq[a] = (freq[a] || 0) + 1;
    }

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map((e) => e[0]);
  },

  preloadMoreTracks: async () => {
    const { queue, player, library, preload } = get();
    if (preload.isPreloading || player.repeat === 'one') return;

    set((s: any) => ({ preload: { ...s.preload, isPreloading: true } }));

    try {
      const existing = new Set(queue.tracks.map((t: Track) => t.id));
      let artists = get().getUserTopArtists(PRELOAD_ARTISTS);

      if (!artists.length && queue.tracks.length) {
        artists = [...new Set(queue.tracks.map((t: Track) => t.user?.username).filter(Boolean))] as string[];
      }

      if (!artists.length) {
        artists = ['popular', 'music', 'track', 'new', 'hot'];
      }

      let pool: Track[] = [];
      for (const a of artists.slice(0, PRELOAD_ARTISTS)) {
        const rel = await api.getRelatedTracks(queue.tracks, 15, [a]);
        pool.push(...rel);
        if (pool.length > PRELOAD_POOL_MAX) break;
      }

      if (!pool.length) {
        pool = await api.getPopular(30);
      }

      if (!pool.length) {
        const random = ['new', 'fresh', 'hot', 'trending', 'hit'];
        const word = random[Math.floor(Math.random() * random.length)];
        pool = await api.searchTracks(word, 20, 0);
      }

      const unique = new Map<number, Track>();
      for (const t of pool) {
        if (t?.id) unique.set(t.id, t);
      }

      let fresh = Array.from(unique.values()).filter((t: Track) => !existing.has(t.id));

      if (!fresh.length) {
        const fallback = [...library.history, ...library.favorites].find((t: Track) => t?.id && !existing.has(t.id));
        if (fallback) fresh = [fallback];
      }

      if (!fresh.length) {
        const emergency = await api.searchTracks('music', 20, 0);
        fresh = emergency.filter((t: Track) => t?.id && !existing.has(t.id));
      }

      if (fresh.length) {
        set((s: any) => {
          const tracks = [...s.queue.tracks, ...fresh];
          const originalTracks = s.queue.originalTracks
            ? [...s.queue.originalTracks, ...fresh]
            : null;
          if (tracks.length > QUEUE_MAX) {
            const removed = tracks.length - QUEUE_MAX;
            return {
              queue: {
                ...s.queue,
                tracks: tracks.slice(removed),
                originalTracks: originalTracks ? originalTracks.slice(removed) : null,
                currentIndex: Math.max(0, s.queue.currentIndex - removed),
              },
            };
          }
          return { queue: { ...s.queue, tracks, originalTracks } };
        });
      }
    } catch {
    } finally {
      set((s: any) => ({ preload: { ...s.preload, isPreloading: false } }));
    }
  },
});