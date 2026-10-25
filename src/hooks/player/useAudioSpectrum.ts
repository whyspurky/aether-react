import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

export interface AudioSpectrum {
  bins: number[];
  level: number;
  peak: number;
}

export function useAudioSpectrum(): AudioSpectrum {
  const [spectrum, setSpectrum] = useState<AudioSpectrum>(() => ({
    bins: new Array(64).fill(0),
    level: 0,
    peak: 0,
  }));

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    listen<AudioSpectrum>('audio:spectrum', (event) => {
      const payload = event.payload;
      if (payload && Array.isArray(payload.bins)) {
        setSpectrum({
          bins: payload.bins,
          level: payload.level ?? 0,
          peak: payload.peak ?? 0,
        });
      }
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  return spectrum;
}
