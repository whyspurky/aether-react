import { forwardRef, ReactNode, useRef, useEffect, useCallback, CSSProperties } from 'react';

interface HorizontalScrollProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  gap?: number;
}

const FRICTION = 0.9999;
const MIN_VELOCITY = 0.3;

export const HorizontalScroll = forwardRef<HTMLDivElement, HorizontalScrollProps>(
  ({ children, className = '', style = {}, gap = 16 }, ref) => {
    const innerRef = useRef<HTMLDivElement | null>(null);

    const setRefs = useCallback((node: HTMLDivElement | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    }, [ref]);

    useEffect(() => {
      const el = innerRef.current;
      if (!el) return;

      const dragThreshold = 5;
      let isPressed = false;
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let startScrollLeft = 0;
      let lastX = 0;
      let lastTime = 0;
      let velocity = 0;
      let rafId: number | null = null;

      const stopInertia = () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      };

      const runInertia = () => {
        velocity *= FRICTION;

        if (Math.abs(velocity) < MIN_VELOCITY) {
          stopInertia();
          return;
        }

        const max = el.scrollWidth - el.clientWidth;
        let next = el.scrollLeft - velocity;

        if (next <= 0) {
          el.scrollLeft = 0;
          stopInertia();
          return;
        }
        if (next >= max) {
          el.scrollLeft = max;
          stopInertia();
          return;
        }

        el.scrollLeft = next;
        rafId = requestAnimationFrame(runInertia);
      };

      const onMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return;

        stopInertia();

        isPressed = true;
        isDragging = false;
        startX = e.clientX;
        startY = e.clientY;
        startScrollLeft = el.scrollLeft;
        lastX = e.clientX;
        lastTime = performance.now();
        velocity = 0;
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
        }

        e.preventDefault();
        el.scrollLeft = startScrollLeft - dx;

        const now = performance.now();
        const dt = now - lastTime;
        if (dt > 0) {
          const instant = (e.clientX - lastX) / dt;
          velocity = velocity * 0.7 + instant * 0.3;
        }
        lastX = e.clientX;
        lastTime = now;
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

          if (Math.abs(velocity) > MIN_VELOCITY) {
            rafId = requestAnimationFrame(runInertia);
          }
        }

        isPressed = false;
        isDragging = false;
        el.style.cursor = '';
        el.style.userSelect = '';
      };

      el.addEventListener('mousedown', onMouseDown);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);

      return () => {
        el.removeEventListener('mousedown', onMouseDown);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        stopInertia();
      };
    }, []);

    return (
      <div
        ref={setRefs}
        className={`flex overflow-x-auto scrollbar-hidden ${className}`}
        style={{ gap, ...style }}
      >
        {children}
      </div>
    );
  }
);

HorizontalScroll.displayName = 'HorizontalScroll';