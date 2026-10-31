import { useEffect, useRef, useState } from 'react';
import { getCoverCandidates, type CoverSize } from '@lib/format';

interface CoverBackgroundState {
  current: string | null;
  previous: string | null;
}

const EMPTY: CoverBackgroundState = { current: null, previous: null };

// столько же, сколько длится анимация выхода старого слоя
const FADE_MS = 320;

// грузит обложку по цепочке кандидатов и держит предыдущую для кроссфейда
export function useCoverBackground(
  artworkUrl: string | null,
  coverQuality: CoverSize
): CoverBackgroundState {
  const [state, setState] = useState<CoverBackgroundState>(EMPTY);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let probe: HTMLImageElement | null = null;

    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    if (!artworkUrl) {
      clearTimer();
      setState((s) => (s.current || s.previous ? EMPTY : s));
      return;
    }

    const candidates = getCoverCandidates(artworkUrl, coverQuality);

    const load = (index: number) => {
      if (cancelled) return;
      if (index >= candidates.length) {
        clearTimer();
        setState(EMPTY);
        return;
      }

      const url = candidates[index];
      const image = new Image();
      probe = image;
      image.decoding = 'async';

      const fail = () => {
        if (!cancelled) load(index + 1);
      };

      const done = () => {
        if (cancelled) return;
        clearTimer();
        setState((s) => (s.current === url ? s : { current: url, previous: s.current }));
        timerRef.current = window.setTimeout(() => {
          setState((s) => (s.previous ? { ...s, previous: null } : s));
          timerRef.current = null;
        }, FADE_MS);
      };

      if (typeof image.decode === 'function') {
        image.src = url;
        image.decode().then(done, fail);
      } else {
        image.onload = done;
        image.onerror = fail;
        image.src = url;
      }
    };

    load(0);

    return () => {
      cancelled = true;
      clearTimer();
      if (probe) {
        probe.onload = null;
        probe.onerror = null;
      }
    };
  }, [artworkUrl, coverQuality]);

  return state;
}
