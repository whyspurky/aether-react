import { useState, useEffect, useRef } from 'react';
import type { Track } from '@store/types';
import { useDisplayTrack } from '@hooks/player/useDisplayTrack';

interface AnimatedTrackInfoProps {
  track: Track | null;
  className?: string;
  onTitleClick?: () => void;
  onArtistClick?: () => void;
}

export function MarqueeText({
  text,
  className,
  style,
  onClick,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const shouldScrollRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number | null = null;

    const check = () => {
      const cw = container.clientWidth;
      const sw = container.scrollWidth;
      const effective = shouldScrollRef.current ? sw / 2 : sw;
      const next = effective > cw + 2;
      shouldScrollRef.current = next;
      setShouldScroll(next);
    };

    rafId = requestAnimationFrame(check);

    const observer = new ResizeObserver(() => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(check);
    });
    observer.observe(container);

    const timeout = window.setTimeout(check, 100);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.clearTimeout(timeout);
      observer.disconnect();
    };
  }, [text]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden min-w-0 w-full ${className || ''}`}
      style={style}
    >
      <div className={`whitespace-nowrap flex w-max ${shouldScroll ? 'animate-marquee' : ''}`}>
        <span onClick={onClick} className={onClick ? 'cursor-pointer' : ''}>
          {text}
        </span>
        {shouldScroll && (
          <span onClick={onClick} className={`pl-12 ${onClick ? 'cursor-pointer' : ''}`} aria-hidden>
            {text}
          </span>
        )}
      </div>
    </div>
  );
}

export function AnimatedTrackInfo({ track, className = '', onTitleClick, onArtistClick }: AnimatedTrackInfoProps) {
  const { displayTrack, isChanging } = useDisplayTrack(track);

  if (!displayTrack) {
    return (
      <div className={className}>
        <p className="text-sm font-medium text-text-tertiary">не играет</p>
      </div>
    );
  }

  const title = displayTrack.title || 'без названия';
  const artist = displayTrack.user?.username || '';

  return (
    <div className={`overflow-hidden ${className}`}>
      <div
        className={`transition-all duration-200 ease-out ${
          isChanging ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'
        }`}
      >
        <MarqueeText
          text={title}
          className="text-sm font-medium text-text-primary"
          onClick={onTitleClick}
        />
        <div className="text-xs text-text-tertiary truncate">
          {onArtistClick && displayTrack.user?.id ? (
            <span
              onClick={onArtistClick}
              className="cursor-pointer hover:text-text-secondary transition-colors"
            >
              {artist}
            </span>
          ) : (
            artist
          )}
        </div>
      </div>
    </div>
  );
}