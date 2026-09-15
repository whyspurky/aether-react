// src/components/AnimatedTrackInfo.tsx

import { useState, useEffect } from 'react';
import type { Track } from '../store/types';

interface AnimatedTrackInfoProps {
  track: Track | null;
  className?: string;
}

export function AnimatedTrackInfo({ track, className = '' }: AnimatedTrackInfoProps) {
  const [displayTrack, setDisplayTrack] = useState<Track | null>(track);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!track) {
      setDisplayTrack(null);
      return;
    }

    if (displayTrack?.id !== track.id) {
      setIsAnimating(true);

      let inner: NodeJS.Timeout;
      const outer = setTimeout(() => {
        setDisplayTrack(track);
        inner = setTimeout(() => setIsAnimating(false), 50);
      }, 200);

      return () => {
        clearTimeout(outer);
        if (inner) clearTimeout(inner);
      };
    }
  }, [track]);

  if (!displayTrack) {
    return (
      <div className={className}>
        <p className="text-sm font-medium text-text-tertiary">не играет</p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      <div
        className={`transition-all duration-200 ease-out ${
          isAnimating ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'
        }`}
      >
        <h4 className="text-sm font-medium text-text-primary truncate">
          {displayTrack.title || 'без названия'}
        </h4>
        <p className="text-xs text-text-tertiary truncate">
          {displayTrack.user?.username || ''}
        </p>
      </div>
    </div>
  );
}