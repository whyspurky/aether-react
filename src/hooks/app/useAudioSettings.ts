import { useEffect } from 'react';
import { api } from '@lib/api';
import { useStore } from '@store/store';

export function useAudioSettings() {
  const normalization = useStore((s) => s.audio.normalization);
  const speed = useStore((s) => s.audio.speed);
  const pitchSemitones = useStore((s) => s.audio.pitchSemitones);
  const linked = useStore((s) => s.audio.linked);
  const transition = useStore((s) => s.audio.transition);
  const crossfadeSecs = useStore((s) => s.audio.crossfadeSecs);
  const eqEnabled = useStore((s) => s.audio.eqEnabled);
  const eqPreampDb = useStore((s) => s.audio.eqPreampDb);
  const eqBands = useStore((s) => s.audio.eqBands);

  useEffect(() => {
    api
      .setAudioSettings({ normalization, speed, pitchSemitones, linked, transition, crossfadeSecs })
      .catch(() => {});
  }, [normalization, speed, pitchSemitones, linked, transition, crossfadeSecs]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      api
        .setEq({ enabled: eqEnabled, preampDb: eqPreampDb, bands: eqBands })
        .catch(() => {});
    }, 120);
    return () => window.clearTimeout(timer);
  }, [eqEnabled, eqPreampDb, eqBands]);
}
