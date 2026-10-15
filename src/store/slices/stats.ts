export interface ArtistScore {
  id: number;
  username: string;
  avatar_url?: string;
  score: number;
  plays: number;
}

interface TrackLike {
  user?: {
    id?: number;
    username?: string;
    avatar_url?: string;
  };
  duration?: number;
  genre?: string;
}

export interface StatsSlice {
  artistScores: Record<number, ArtistScore>;
  genreScores: Record<string, number>;
  tracksPlayedCount: number;
  tracksCompletedCount: number;
  totalListenedMs: number;

  addTrackClick: (track: TrackLike) => void;
  addTrackCompleted: (track: TrackLike) => void;
  resetStats: () => void;
}

const CLICK_POINTS = 5;
const COMPLETED_POINTS = 100;

function normalizeGenre(genre: string | undefined): string | null {
  if (!genre) return null;
  const g = genre.trim().toLowerCase();
  return g.length > 0 ? g : null;
}

export const createStatsSlice = (set: any) => ({
  artistScores: {} as Record<number, ArtistScore>,
  genreScores: {} as Record<string, number>,
  tracksPlayedCount: 0,
  tracksCompletedCount: 0,
  totalListenedMs: 0,

  addTrackClick: (track: TrackLike) => {
    const u = track.user;
    const genre = normalizeGenre(track.genre);

    set((s: any) => {
      const updates: any = {
        tracksPlayedCount: s.tracksPlayedCount + 1,
      };

      if (u?.id && u.username) {
        const userId: number = u.id;
        const existing = s.artistScores[userId] as ArtistScore | undefined;
        const updated: ArtistScore = existing
          ? { ...existing, score: existing.score + CLICK_POINTS, plays: existing.plays + 1 }
          : {
              id: userId,
              username: u.username,
              avatar_url: u.avatar_url,
              score: CLICK_POINTS,
              plays: 1,
            };
        updates.artistScores = { ...s.artistScores, [userId]: updated };
      }

      if (genre) {
        updates.genreScores = {
          ...s.genreScores,
          [genre]: (s.genreScores[genre] || 0) + CLICK_POINTS,
        };
      }

      return updates;
    });
  },

  addTrackCompleted: (track: TrackLike) => {
    const u = track.user;
    const genre = normalizeGenre(track.genre);
    const duration: number = track.duration || 0;

    set((s: any) => {
      const updates: any = {
        tracksCompletedCount: s.tracksCompletedCount + 1,
        totalListenedMs: s.totalListenedMs + duration,
      };

      if (u?.id && u.username) {
        const userId: number = u.id;
        const existing = s.artistScores[userId] as ArtistScore | undefined;
        const updated: ArtistScore = existing
          ? { ...existing, score: existing.score + COMPLETED_POINTS, plays: existing.plays + 1 }
          : {
              id: userId,
              username: u.username,
              avatar_url: u.avatar_url,
              score: COMPLETED_POINTS,
              plays: 1,
            };
        updates.artistScores = { ...s.artistScores, [userId]: updated };
      }

      if (genre) {
        updates.genreScores = {
          ...s.genreScores,
          [genre]: (s.genreScores[genre] || 0) + COMPLETED_POINTS,
        };
      }

      return updates;
    });
  },

  resetStats: () =>
    set({
      artistScores: {},
      genreScores: {},
      tracksPlayedCount: 0,
      tracksCompletedCount: 0,
      totalListenedMs: 0,
    }),
});