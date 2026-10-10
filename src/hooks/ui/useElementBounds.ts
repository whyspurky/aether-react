import { useCallback, useEffect, useRef, useState } from 'react';

export interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

const EMPTY: Bounds = { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 };

function boundsEqual(a: Bounds, b: Bounds): boolean {
  return (
    a.left === b.left &&
    a.right === b.right &&
    a.top === b.top &&
    a.bottom === b.bottom &&
    a.width === b.width &&
    a.height === b.height
  );
}

export function useElementBounds<T extends Record<string, React.RefObject<HTMLElement | null>>>(
  refs: T
): { [K in keyof T]: Bounds } {
  const [bounds, setBounds] = useState<{ [K in keyof T]: Bounds }>(() => {
    const initial = {} as { [K in keyof T]: Bounds };
    for (const key in refs) {
      initial[key] = EMPTY;
    }
    return initial;
  });

  const rafRef = useRef<number | null>(null);
  const refsKey = Object.keys(refs).join(',');

  const measure = useCallback(() => {
    const next = {} as { [K in keyof T]: Bounds };
    for (const key in refs) {
      const el = refs[key].current;
      if (el) {
        const r = el.getBoundingClientRect();
        next[key] = {
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
          width: r.width,
          height: r.height,
        };
      } else {
        next[key] = EMPTY;
      }
    }

    setBounds((prev) => {
      let changed = false;
      for (const key in next) {
        if (!boundsEqual(prev[key], next[key])) {
          changed = true;
          break;
        }
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refsKey]);

  const scheduleMeasure = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      measure();
    });
  }, [measure]);

  useEffect(() => {
    scheduleMeasure();

    const observer = new ResizeObserver(scheduleMeasure);
    for (const key in refs) {
      const el = refs[key].current;
      if (el) observer.observe(el);
    }

    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('scroll', scheduleMeasure, true);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      observer.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('scroll', scheduleMeasure, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleMeasure, refsKey]);

  return bounds;
}