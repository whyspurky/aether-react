import { EqVisualizer } from '@components/settings/EqVisualizer';
import { useAudioSpectrum } from '@hooks/player/useAudioSpectrum';
import { useStore } from '@store/store';
import type { EqBand } from '@store/types';

interface Props {
  bands: EqBand[];
  preampDb: number;
  onBandChange: (id: number, gainDb: number, freq: number) => void;
}

// спектр обновляется 25 раз в секунду, поэтому живёт в отдельном компоненте
export function EqSpectrumSection({ bands, preampDb, onBandChange }: Props) {
  const spectrumOn = useStore((s) => s.perf.spectrum);
  const spectrum = useAudioSpectrum(spectrumOn);

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-gradient-to-b from-white/[0.035] to-transparent px-2 py-2">
        <EqVisualizer
          bands={bands}
          preampDb={preampDb}
          spectrum={spectrum.bins}
          onBandChange={onBandChange}
        />
      </div>
    </>
  );
}
