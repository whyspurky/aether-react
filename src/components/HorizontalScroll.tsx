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

    useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;


      const stop = () => {
        if (animationRef.current !== null) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
      };

      const scrollTo = (target: number) => {
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

      const onWheel = (e: WheelEvent) => {
        if (e.deltaY === 0) return;
        e.preventDefault();

        const target = el.scrollLeft + e.deltaY * 2.5;
        const max = el.scrollWidth - el.clientWidth;
        scrollTo(Math.max(0, Math.min(max, target)));
      };


      const dragThreshold = 5;
      let isPressed = false;
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let startScrollLeft = 0;

      const onMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return;

        isPressed = true;
        isDragging = false;
        startX = e.clientX;
        startY = e.clientY;
        startScrollLeft = el.scrollLeft;
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!isPressed) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (!isDragging) {
          if (Math.abs(dx) < dragThreshold && Math.abs(dy) < dragThreshold) return;

          isDragging = true;
          el.style.cursor = 'grabbing';
          el.style.userSelect = 'none';
          stop();
        }

        e.preventDefault();
        el.scrollLeft = startScrollLeft - dx;
      };

      const onMouseUp = () => {
        if (isDragging) {
          const blockClick = (ev: MouseEvent) => {
            ev.stopPropagation();
            ev.preventDefault();
          };
          el.addEventListener('click', blockClick, { capture: true, once: true });
          setTimeout(() => {
            el.removeEventListener('click', blockClick, { capture: true });
          }, 0);
        }

        isPressed = false;
        isDragging = false;
        el.style.cursor = '';
        el.style.userSelect = '';
      };

el.addEventListener('wheel', onWheel, { passive: false });
el.addEventListener('mousedown', onMouseDown);
document.addEventListener('mousemove', onMouseMove);
document.addEventListener('mouseup', onMouseUp);

return () => {
  el.removeEventListener('wheel', onWheel);
  el.removeEventListener('mousedown', onMouseDown);
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
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
        data-smooth-scroll-off
        className={`flex overflow-x-auto scrollbar-hidden ${className}`}
        style={{ gap, ...style }}
      >
        {children}
      </div>
    );
  }
);

HorizontalScroll.displayName = 'HorizontalScroll';