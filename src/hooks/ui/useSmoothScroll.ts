import { useEffect, useRef, useState } from 'react';

interface Options {
  sensitivity?: number;
  duration?: number;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function useSmoothScroll<T extends HTMLElement>(options: Options = {}) {
  const { sensitivity = 1.5, duration = 300 } = options;
  const [el, setEl] = useState<T | null>(null);

  const rafRef = useRef<number | null>(null);
  const targetRef = useRef(0);
  const startRef = useRef(0);
  const startTimeRef = useRef(0);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    if (!el) return;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      const progress = easeOutCubic(Math.min(elapsed / duration, 1));
      const pos = startRef.current + (targetRef.current - startRef.current) * progress;

      el.scrollTop = pos;

      if (elapsed < duration) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        rafRef.current = null;
        isAnimatingRef.current = false;
      }
    };

    const onWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-smooth-scroll-off]')) return;
      if (e.deltaY === 0) return;

      e.preventDefault();

      const max = el.scrollHeight - el.clientHeight;
      const base = isAnimatingRef.current ? targetRef.current : el.scrollTop;
      targetRef.current = Math.max(0, Math.min(max, base + e.deltaY * sensitivity));
      startRef.current = el.scrollTop;
      startTimeRef.current = Date.now();
      isAnimatingRef.current = true;

      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('wheel', onWheel);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      isAnimatingRef.current = false;
    };
  }, [el, sensitivity, duration]);

  return setEl;
}