import { useEffect, useRef, useState } from 'react';

interface Props {
  title: string;
  count: number;
  children: React.ReactNode;
}

export function ScrollableSection({ title, count, children }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 4);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll);
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      observer.disconnect();
    };
  }, [children]);

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
          ref={scrollRef}
          className="max-h-[600px] overflow-y-auto custom-scrollbar pr-2"
        >
          {children}
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