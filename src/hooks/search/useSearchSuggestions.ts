import { useEffect, useRef, useState } from 'react';
import { api } from '@lib/api';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const TRACKS_LIMIT = 3;
const ARTISTS_LIMIT = 4;
const CACHE_SIZE = 50;

export interface Suggestion {
  id: string;
  type: 'track' | 'artist';
  label: string;
  sublabel?: string;
  value: string;
}

const cache = new Map<string, Suggestion[]>();

if (import.meta.hot) {
  import.meta.hot.dispose(() => cache.clear());
}

export function useSearchSuggestions(query: string, enabled: boolean) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled || !query || query.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      return;
    }

    const q = query.trim().toLowerCase();

    const cached = cache.get(q);
    if (cached) {
      setSuggestions(cached);
      return;
    }

    const reqId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const [tracks, artists] = await Promise.all([
          api.searchTracks(q, TRACKS_LIMIT, 0),
          api.searchUsers(q, 0, ARTISTS_LIMIT * 2),
        ]);

        if (reqId !== requestIdRef.current) return;

        const seen = new Set<string>();
        const result: Suggestion[] = [];

        for (const t of tracks.slice(0, TRACKS_LIMIT)) {
          if (!t.title || seen.has(t.title.toLowerCase())) continue;
          seen.add(t.title.toLowerCase());
          result.push({
            id: `t-${t.id}`,
            type: 'track',
            label: t.title,
            sublabel: t.user?.username,
            value: t.title,
          });
        }

        const filteredArtists = artists
          .filter((a) => (a.track_count ?? 0) > 0)
          .slice(0, ARTISTS_LIMIT);

        for (const a of filteredArtists) {
          if (!a.username || seen.has(a.username.toLowerCase())) continue;
          seen.add(a.username.toLowerCase());
          result.push({
            id: `a-${a.id}`,
            type: 'artist',
            label: a.username,
            value: a.username,
          });
        }

        if (cache.size >= CACHE_SIZE) {
          const firstKey = cache.keys().next().value;
          if (firstKey) cache.delete(firstKey);
        }
        cache.set(q, result);
        setSuggestions(result);
      } catch {
        if (reqId === requestIdRef.current) setSuggestions([]);
      } finally {
        if (reqId === requestIdRef.current) setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, enabled]);

  return { suggestions, isLoading };
}