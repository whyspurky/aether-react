import { useEffect, useRef } from 'react';
interface Props {
  title: string;
  count: number;
  itemHeight?: number;
  maxHeight?: number;
  children: (scrollRef: React.RefObject<HTMLDivElement | null>) => React.ReactNode;
}

const DEFAULT_ITEM_HEIGHT = 60;
const DEFAULT_MAX_HEIGHT = 600;
const DRAG_THRESHOLD_PX = 5;

export function ScrollableSection({
  title,
  count,
  itemHeight = DEFAULT_ITEM_HEIGHT,
  maxHeight = DEFAULT_MAX_HEIGHT,
  children,
}: Props) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const height = Math.min(count * itemHeight, maxHeight);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    let isPressed = false;
    let isDragging = false;
    let startY = 0;
    let startScrollTop = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;

      isPressed = true;
      isDragging = false;
      startY = e.clientY;
      startScrollTop = el.scrollTop;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isPressed) return;

      const dy = e.clientY - startY;

      if (!isDragging) {
        if (Math.abs(dy) < DRAG_THRESHOLD_PX) return;
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
          ref={innerRef}
          className="overflow-y-auto custom-scrollbar pr-2"
          style={{ height }}
        >
          {children(innerRef)}
        </div>

      </div>
    </section>
  );
}