import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useStore } from '@store/store';
import { setCoverQuality } from '@lib/format';

// быстрый режим: классы на html гасят css-эффекты без ререндеров компонентов
export function usePerfFlags() {
  const perf = useStore((s) => s.perf);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('no-transitions', !perf.motionTransitions);
    root.classList.toggle('no-enter', !perf.motionPages);
    root.classList.toggle('no-pulse', !perf.motionPulse);
    root.classList.toggle('no-backdrop', !perf.panelsBlur);
    root.classList.toggle('no-glow', !perf.glow);
    setCoverQuality(perf.coverQuality);
  }, [perf]);

  useEffect(() => {
    void invoke('set_perf_flags', { positionTickMs: perf.positionTickMs }).catch(() => {});
  }, [perf.positionTickMs]);
}
