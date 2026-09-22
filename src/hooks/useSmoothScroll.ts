import { useEffect, useRef, useState, useCallback } from 'react';

interface Options {
  sensitivity?: number;
  duration?: number;
  dragThreshold?: number;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function useSmoothScroll<T extends HTMLElement>(options: Options = {}) {
  const {
    sensitivity = 1.5,
    duration = 95,
    dragThreshold = 5,
  } = options;
  const ref = useRef<T | null>(null);
  const animationRef = useRef<number | null>(null);
  const [, forceRender] = useState(0);

  const setRef = useCallback((node: T | null) => {
    if (ref.current === node) return;
    ref.current = node;
    forceRender((n) => n + 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;


    const stop = () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };

    const scrollTo = (target: number) => {
      stop();
      const start = el.scrollTop;
      const distance = target - start;
      if (Math.abs(distance) < 1) return;

      const startTime = performance.now();

      const step = (now: number) => {
        const progress = Math.min(1, (now - startTime) / duration);
        el.scrollTop = start + distance * easeOutCubic(progress);
        animationRef.current = progress < 1 ? requestAnimationFrame(step) : null;
      };

      animationRef.current = requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;

      if (target?.closest('[data-smooth-scroll-off]')) return;

      let inner: HTMLElement | null = target;
      while (inner && inner !== el) {
        const style = getComputedStyle(inner);
        const oy = style.overflowY;
        if ((oy === 'auto' || oy === 'scroll') && inner.scrollHeight > inner.clientHeight) {
          return;
        }
        inner = inner.parentElement;
      }

      if (e.deltaY === 0) return;
      e.preventDefault();

      const targetScroll = el.scrollTop + e.deltaY * sensitivity;
      const max = el.scrollHeight - el.clientHeight;
      scrollTo(Math.max(0, Math.min(max, targetScroll)));
    };


    let isPressed = false;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;
    let startScrollTop = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;

      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-smooth-scroll-off]')) return;

      isPressed = true;
      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;
      startScrollLeft = el.scrollLeft;
      startScrollTop = el.scrollTop;
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
        document.body.classList.add('dragging');
        stop();
      }

      e.preventDefault();
      el.scrollLeft = startScrollLeft - dx;
      el.scrollTop = startScrollTop - dy;
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
      document.body.classList.remove('dragging');
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
  }, [sensitivity, duration, dragThreshold]);

  return setRef;
}