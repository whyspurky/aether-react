import { forwardRef, ReactNode, useRef, useEffect, CSSProperties } from 'react';

interface HorizontalScrollProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  gap?: number;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export const HorizontalScroll = forwardRef<HTMLDivElement, HorizontalScrollProps>(
  ({ children, className = '', style = {}, gap = 16 }, ref) => {
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const animationRef = useRef<number | null>(null);

    const stop = () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };

    const scrollTo = (target: number) => {
      const el = scrollRef.current;
      if (!el) return;

      stop();

      const start = el.scrollLeft;
      const distance = target - start;
      if (Math.abs(distance) < 1) return;

      const startTime = performance.now();

      const step = (now: number) => {
        const progress = Math.min(1, (now - startTime) / 175);
        el.scrollLeft = start + distance * easeOutCubic(progress);
        animationRef.current = progress < 1 ? requestAnimationFrame(step) : null;
      };

      animationRef.current = requestAnimationFrame(step);
    };

    useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;

      const onWheel = (e: WheelEvent) => {
        if (e.deltaY === 0) return;
        e.preventDefault();
        const target = el.scrollLeft + e.deltaY * 2.5;
        const max = el.scrollWidth - el.clientWidth;
        scrollTo(Math.max(0, Math.min(max, target)));
      };

      el.addEventListener('wheel', onWheel, { passive: false });
      return () => {
        el.removeEventListener('wheel', onWheel);
        stop();
      };
    }, []);

    return (
      <div
        ref={(node) => {
          scrollRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={`flex overflow-x-auto scrollbar-hidden ${className}`}
        style={{ gap, ...style }}
      >
        {children}
      </div>
    );
  }
);

HorizontalScroll.displayName = 'HorizontalScroll';