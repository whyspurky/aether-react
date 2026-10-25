import { useMemo } from 'react';
import type { Track } from '@store/types';
import { upgradeCoverUrl } from '@lib/format';
import { useDisplayTrack } from './useDisplayTrack';

interface Result {
  displayTrack: Track | null;
  displayCover: string | null;
  isTrackChanging: boolean;
}

const getCover = (track: Track | null): string | null => {
  if (!track) return null;
  const raw = track.artwork_url || track.user?.avatar_url;
  return upgradeCoverUrl(raw, 't500x500') ?? null;
};

export function useTrackAnimation(currentTrack: Track | null): Result {
  const { displayTrack, isChanging } = useDisplayTrack(currentTrack);
  const displayCover = useMemo(() => getCover(displayTrack), [displayTrack]);

  return {
    displayTrack,
    displayCover,
    isTrackChanging: isChanging,
  };
}