import { useEffect, useRef, useState } from 'react';

interface Props {
  title: string;
  count: number;
  itemHeight?: number;
  maxHeight?: number;
  children: (scrollRef: React.RefObject<HTMLDivElement | null>) => React.ReactNode;
}

export function ScrollableSection({
  title,
  count,
  itemHeight = 56,
  maxHeight = 600,
  children,
}: Props) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);

  const height = Math.min(count * itemHeight, maxHeight);

  const checkScroll = () => {
    const el = innerRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 4);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  };

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll);
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    const dragThreshold = 5;
    let isPressed = false;
    let isDragging = false;
    let startY = 0;
    let startScrollTop = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-drag-scroll-off]')) return;

      isPressed = true;
      isDragging = false;
      startY = e.clientY;
      startScrollTop = el.scrollTop;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isPressed) return;

      const dy = e.clientY - startY;

      if (!isDragging) {
        if (Math.abs(dy) < dragThreshold) return;
        isDragging = true;
        el.style.cursor = 'grabbing';
        el.style.userSelect = 'none';
      }

      e.preventDefault();
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
    };

    el.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <section className="flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-text-primary">{title}</h2>
        <span className="text-xs text-text-tertiary tabular-nums">{count}</span>
      </div>

      <div className="relative">
        <div
          className={`pointer-events-none absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-bg-primary to-transparent z-10 transition-opacity duration-300 ${
            canScrollUp ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <div
          ref={innerRef}
          className="overflow-y-auto custom-scrollbar pr-2"
          style={{ height }}
        >
          {children(innerRef)}
        </div>

        <div
          className={`pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-bg-primary to-transparent z-10 transition-opacity duration-300 ${
            canScrollDown ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
    </section>
  );
}