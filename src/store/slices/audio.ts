import type { EqBand, TransitionMode } from '@store/types';

import { EQ_PRESETS, createBandsFromPreset, createDefaultEqBands } from '@lib/eqPresets';

export interface AudioState {
  outputDevice: string;
  normalization: boolean;
  eqEnabled: boolean;
  eqPreampDb: number;
  eqBands: EqBand[];
  eqPreset: string;
  speed: number;
  pitchSemitones: number;
  linked: boolean;
  transition: TransitionMode;
  crossfadeSecs: number;
}

export interface AudioSlice {
  audio: AudioState;
  setOutputDevice: (id: string) => void;
  setNormalization: (enabled: boolean) => void;
  setEqEnabled: (enabled: boolean) => void;
  setEqPreset: (preset: string) => void;
  setEqBand: (id: number, patch: Partial<EqBand>) => void;
  setEqBandGain: (id: number, gainDb: number) => void;
  addEqBand: () => void;
  removeEqBand: (id: number) => void;
  setEqPreamp: (gain: number) => void;
  resetEq: () => void;
  setSpeed: (speed: number) => void;
  setPitchSemitones: (semitones: number) => void;
  setLinked: (linked: boolean) => void;
  setTransition: (mode: TransitionMode) => void;
  setCrossfadeSecs: (seconds: number) => void;
}

export const createAudioSlice = (set: any) => ({
  audio: {
    outputDevice: '',
    normalization: false,
    eqEnabled: false,
    eqPreampDb: 0,
    eqBands: createDefaultEqBands(),
    eqPreset: 'flat',
    speed: 1,
    pitchSemitones: 0,
    linked: true,
    transition: 'off',
    crossfadeSecs: 4,
  } as AudioState,

  setOutputDevice: (outputDevice: string) =>
    set((s: any) => ({ audio: { ...s.audio, outputDevice } })),

  setNormalization: (normalization: boolean) =>
    set((s: any) => ({ audio: { ...s.audio, normalization } })),

  setEqEnabled: (eqEnabled: boolean) =>
    set((s: any) => ({ audio: { ...s.audio, eqEnabled } })),

  setEqPreset: (presetId: string) =>
    set((s: any) => {
      if (presetId === 'custom') return s;
      const preset = EQ_PRESETS.find((item) => item.id === presetId);
      if (!preset) return s;
      return {
        audio: {
          ...s.audio,
          eqPreset: preset.id,
          eqBands: createBandsFromPreset(preset),
        },
      };
    }),

  setEqBand: (id: number, patch: Partial<EqBand>) =>
    set((s: any) => ({
      audio: {
        ...s.audio,
        eqPreset: 'custom',
        eqBands: s.audio.eqBands.map((band: EqBand) =>
          band.id === id
            ? {
                ...band,
                ...patch,
                freq:
                  patch.freq === undefined
                    ? band.freq
                    : Math.max(20, Math.min(20000, patch.freq)),
                gainDb:
                  patch.gainDb === undefined
                    ? band.gainDb
                    : Math.max(-18, Math.min(18, patch.gainDb)),
                q: patch.q === undefined ? band.q : Math.max(0.1, Math.min(10, patch.q)),
              }
            : band
        ),
      },
    })),

  setEqBandGain: (id: number, gainDb: number) =>
    set((s: any) => ({
      audio: {
        ...s.audio,
        eqPreset: 'custom',
        eqBands: s.audio.eqBands.map((band: EqBand) =>
          band.id === id
            ? { ...band, gainDb: Math.max(-18, Math.min(18, gainDb)) }
            : band
        ),
      },
    })),

  addEqBand: () =>
    set((s: any) => {
      if (s.audio.eqBands.length >= 24) return s;
      const nextId =
        s.audio.eqBands.reduce((max: number, band: EqBand) => Math.max(max, band.id), 0) + 1;
      const band: EqBand = {
        id: nextId,
        enabled: true,
        kind: 'peaking',
        freq: 1000,
        gainDb: 0,
        q: 1.414,
      };
      return {
        audio: { ...s.audio, eqPreset: 'custom', eqBands: [...s.audio.eqBands, band] },
      };
    }),

  removeEqBand: (id: number) =>
    set((s: any) => ({
      audio: {
        ...s.audio,
        eqPreset: 'custom',
        eqBands: s.audio.eqBands.filter((band: EqBand) => band.id !== id),
      },
    })),

  setEqPreamp: (eqPreampDb: number) =>
    set((s: any) => ({
      audio: {
        ...s.audio,
        eqPreset: 'custom',
        eqPreampDb: Math.max(-12, Math.min(6, eqPreampDb)),
      },
    })),

  resetEq: () =>
    set((s: any) => ({
      audio: {
        ...s.audio,
        eqPreset: 'flat',
        eqPreampDb: 0,
        eqBands: createDefaultEqBands(),
      },
    })),

  setSpeed: (speed: number) =>
    set((s: any) => {
      const nextSpeed = Math.max(0.5, Math.min(2, speed));
      return {
        audio: {
          ...s.audio,
          speed: nextSpeed,
          pitchSemitones: s.audio.linked
            ? 12 * Math.log2(nextSpeed)
            : s.audio.pitchSemitones,
        },
      };
    }),

  setPitchSemitones: (pitchSemitones: number) =>
    set((s: any) => {
      const nextPitch = Math.max(-12, Math.min(12, pitchSemitones));
      if (!s.audio.linked) {
        return { audio: { ...s.audio, pitchSemitones: nextPitch } };
      }
      const nextSpeed = Math.max(0.5, Math.min(2, 2 ** (nextPitch / 12)));
      return {
        audio: {
          ...s.audio,
          speed: nextSpeed,
          pitchSemitones: 12 * Math.log2(nextSpeed),
        },
      };
    }),

  setLinked: (linked: boolean) =>
    set((s: any) => ({
      audio: {
        ...s.audio,
        linked,
        pitchSemitones: linked
          ? 12 * Math.log2(s.audio.speed)
          : s.audio.pitchSemitones,
      },
    })),

  setTransition: (transition: TransitionMode) =>
    set((s: any) => ({ audio: { ...s.audio, transition } })),

  setCrossfadeSecs: (crossfadeSecs: number) =>
    set((s: any) => ({
      audio: {
        ...s.audio,
        crossfadeSecs: Math.max(1, Math.min(12, crossfadeSecs)),
      },
    })),
});
