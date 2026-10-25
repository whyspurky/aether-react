import type { EqBand } from '@store/types';

export const EQ_FREQUENCIES = [
  31.25, 62.5, 125, 250, 500, 1000, 2000, 4000, 8000, 16000,
];

function bandsFromGains(gains: number[]): EqBand[] {
  return EQ_FREQUENCIES.map((freq, index) => ({
    id: index + 1,
    enabled: true,
    kind: 'peaking',
    freq,
    gainDb: gains[index] ?? 0,
    q: 1.414,
  }));
}

export function createDefaultEqBands(): EqBand[] {
  return bandsFromGains(EQ_FREQUENCIES.map(() => 0));
}

export interface EqPreset {
  id: string;
  label: string;
  gains: number[];
}

export const EQ_PRESETS: EqPreset[] = [
  { id: 'flat', label: 'ровная', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { id: 'bass', label: 'больше басов', gains: [6, 5, 4, 2, 0, -1, -1, 0, 0, 0] },
  { id: 'less-bass', label: 'меньше басов', gains: [-5, -4, -3, -1, 0, 1, 1, 0, 0, 0] },
  { id: 'treble', label: 'больше высоких', gains: [0, 0, 0, 0, 0, 1, 2, 4, 5, 5] },
  { id: 'vocal', label: 'вокал', gains: [-2, -1, 0, -2, -1, 1, 3, 3, 2, 1] },
  { id: 'rock', label: 'рок', gains: [4, 3, 1, -1, -2, -1, 1, 3, 4, 3] },
  { id: 'pop', label: 'поп', gains: [2, 2, 1, 0, -1, 0, 2, 2, 2, 1] },
  { id: 'jazz', label: 'джаз', gains: [3, 2, 1, 0, -1, -1, 1, 2, 2, 1] },
  { id: 'classical', label: 'классика', gains: [1, 1, 0, 0, -1, -1, 0, 1, 2, 2] },
  { id: 'electronic', label: 'электроника', gains: [5, 4, 2, 0, -1, 0, 2, 3, 4, 3] },
];

export function createBandsFromPreset(preset: EqPreset): EqBand[] {
  return bandsFromGains(preset.gains);
}
