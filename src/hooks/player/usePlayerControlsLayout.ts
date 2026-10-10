import { useEffect, useState } from 'react';
import { useElementBounds } from '@hooks/ui/useElementBounds';

interface Params {
  containerRef: React.RefObject<HTMLElement | null>;
  shuffleRef: React.RefObject<HTMLElement | null>;
  rightButtonsRef: React.RefObject<HTMLElement | null>;
}

interface Result {
  volumeWidth: number;
  volumeMode: 'full' | 'icon';
}

const MIN_VOLUME_WIDTH = 40;
const ICON_MODE_THRESHOLD = 100;
const MAX_VOLUME_WIDTH = 400;
const GAP = 16;

export function usePlayerControlsLayout({
  containerRef,
  shuffleRef,
  rightButtonsRef,
}: Params): Result {
  const bounds = useElementBounds({
    container: containerRef,
    shuffle: shuffleRef,
    right: rightButtonsRef,
  });

  const [result, setResult] = useState<Result>({
    volumeWidth: MAX_VOLUME_WIDTH,
    volumeMode: 'full',
  });

  useEffect(() => {
    const { container, shuffle } = bounds;
    if (container.width === 0) return;

    const available = shuffle.left - container.left - GAP;

    const width = Math.round(
      Math.max(MIN_VOLUME_WIDTH, Math.min(MAX_VOLUME_WIDTH, available))
    );
    const mode: 'full' | 'icon' = width < ICON_MODE_THRESHOLD ? 'icon' : 'full';

    setResult((prev) => {
      if (prev.volumeWidth === width && prev.volumeMode === mode) return prev;
      return { volumeWidth: width, volumeMode: mode };
    });
  }, [bounds]);

  return result;
}