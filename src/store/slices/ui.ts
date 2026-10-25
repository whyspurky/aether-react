export const BLUR_AMOUNT_MAX = 120;
export const BLUR_OPACITY_MAX = 0.5;
export const BLUR_AMOUNT_DEFAULT = 60;
export const BLUR_OPACITY_DEFAULT = 0.25;
export const PRESET_NAME_MAX = 24;

export interface CustomPreset {
  id: string;
  name: string;
  themeId: string;
  blur: {
    enabled: boolean;
    amount: number;
    opacity: number;
  };
  createdAt: number;
}

export const BLUR_AMOUNT_MIN = 0;
export const POSITION_TICK_OPTIONS = [100, 250];
export const PERSIST_SECS_OPTIONS = [1, 5];

export type CoverQuality = 't500x500' | 't300x300' | 't200x200';

// true значит эффект включён, тумблер в настройках читается буквально
export interface PerfFlags {
  // движение
  motionTransitions: boolean;
  motionPages: boolean;
  motionPulse: boolean;
  motionMorph: boolean;
  marquee: boolean;
  // отрисовка
  panelsBlur: boolean;
  noise: boolean;
  glow: boolean;
  // данные
  coverQuality: CoverQuality;
  bgCover: boolean;
  prefetchQueue: boolean;
  nextTrackPrep: boolean;
  // звук и бекенд
  spectrum: boolean;
  positionTickMs: number;
  // хранение
  persistSecs: number;
}

export type PerfPresetId = 'all' | 'balanced' | 'max';

export const PERF_DEFAULTS: PerfFlags = {
  motionTransitions: true,
  motionPages: true,
  motionPulse: true,
  motionMorph: true,
  marquee: true,
  panelsBlur: true,
  noise: true,
  glow: true,
  coverQuality: 't500x500',
  bgCover: true,
  prefetchQueue: true,
  nextTrackPrep: true,
  spectrum: true,
  positionTickMs: 100,
  persistSecs: 1,
};

export const PERF_PRESETS: Record<PerfPresetId, { label: string; hint: string; values: PerfFlags }> = {
  all: {
    label: 'всё включено',
    hint: 'полное оформление',
    values: { ...PERF_DEFAULTS },
  },
  balanced: {
    label: 'сбалансированный',
    hint: 'без размытия панелей, шума и свечений, обложки t300',
    values: { ...PERF_DEFAULTS, panelsBlur: false, noise: false, glow: false, coverQuality: 't300x300' },
  },
  max: {
    label: 'максимум',
    hint: 'все эффекты выключены, обложки t200, редкие тик и сохранение',
    values: {
      motionTransitions: false,
      motionPages: false,
      motionPulse: false,
      motionMorph: false,
      marquee: false,
      panelsBlur: false,
      noise: false,
      glow: false,
      coverQuality: 't200x200',
      bgCover: false,
      prefetchQueue: false,
      nextTrackPrep: false,
      spectrum: false,
      positionTickMs: 250,
      persistSecs: 5,
    },
  },
};

export const MOTION_KEYS: (keyof PerfFlags)[] = [
  'motionTransitions',
  'motionPages',
  'motionPulse',
  'motionMorph',
  'marquee',
];
export const PAINT_KEYS: (keyof PerfFlags)[] = ['panelsBlur', 'noise', 'glow'];
export const DATA_KEYS: (keyof PerfFlags)[] = ['bgCover', 'prefetchQueue', 'nextTrackPrep'];

export interface UiSlice {
  themeId: string;
  blur: {
    enabled: boolean;
    amount: number;
    opacity: number;
  };
  perf: PerfFlags;
  customPresets: CustomPreset[];
  hideBindsWarning: boolean;

  setThemeId: (id: string) => void;
  setBlurEnabled: (enabled: boolean) => void;
  setBlurAmount: (amount: number) => void;
  setBlurOpacity: (opacity: number) => void;
  setPerfFlag: <K extends keyof PerfFlags>(key: K, value: PerfFlags[K]) => void;
  setPerfGroup: (keys: (keyof PerfFlags)[], value: boolean) => void;
  applyPerfPreset: (id: PerfPresetId) => void;

  saveCustomPreset: (name: string) => void;
  applyCustomPreset: (id: string) => void;
  deleteCustomPreset: (id: string) => void;
  renameCustomPreset: (id: string, name: string) => void;
  setHideBindsWarning: (hide: boolean) => void;
}

export const createUiSlice = (set: any, get: any) => ({
  themeId: 'neutral',
  blur: {
    enabled: true,
    amount: BLUR_AMOUNT_DEFAULT,
    opacity: BLUR_OPACITY_DEFAULT,
  },
  perf: { ...PERF_DEFAULTS },
  customPresets: [],
  hideBindsWarning: false,

  setThemeId: (id: string) => set({ themeId: id }),
  setPerfFlag: <K extends keyof PerfFlags>(key: K, value: PerfFlags[K]) =>
    set((s: any) => ({ perf: { ...s.perf, [key]: value } })),
  setPerfGroup: (keys: (keyof PerfFlags)[], value: boolean) =>
    set((s: any) => {
      const perf: any = { ...s.perf };
      for (const key of keys) perf[key] = value;
      return { perf };
    }),
  applyPerfPreset: (id: PerfPresetId) => set({ perf: { ...PERF_PRESETS[id].values } }),

  setBlurEnabled: (enabled: boolean) =>
    set((s: any) => ({ blur: { ...s.blur, enabled } })),
  setBlurAmount: (amount: number) =>
    set((s: any) => ({ blur: { ...s.blur, amount: Math.max(0, Math.min(BLUR_AMOUNT_MAX, amount)) } })),
  setBlurOpacity: (opacity: number) =>
    set((s: any) => ({ blur: { ...s.blur, opacity: Math.max(0, Math.min(BLUR_OPACITY_MAX, opacity)) } })),

  saveCustomPreset: (name: string) => {
    const s = get();
    const preset: CustomPreset = {
      id: `preset-${Date.now()}`,
      name: name.slice(0, PRESET_NAME_MAX),
      themeId: s.themeId,
      blur: { ...s.blur },
      createdAt: Date.now(),
    };
    set({ customPresets: [preset, ...s.customPresets] });
  },

  applyCustomPreset: (id: string) => {
    const s = get();
    const p = s.customPresets.find((x: CustomPreset) => x.id === id);
    if (!p) return;
    set({
      themeId: p.themeId,
      blur: { ...p.blur },
    });
  },

  deleteCustomPreset: (id: string) => {
    const s = get();
    set({ customPresets: s.customPresets.filter((x: CustomPreset) => x.id !== id) });
  },

  renameCustomPreset: (id: string, name: string) => {
    const s = get();
    set({
      customPresets: s.customPresets.map((p: CustomPreset) =>
        p.id === id ? { ...p, name: name.slice(0, PRESET_NAME_MAX) } : p
      ),
    });
  },

  setHideBindsWarning: (hide: boolean) => set({ hideBindsWarning: hide }),
});