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

export interface UiSlice {
  themeId: string;
  blur: {
    enabled: boolean;
    amount: number;
    opacity: number;
  };
  customPresets: CustomPreset[];
  hideBindsWarning: boolean;

  setThemeId: (id: string) => void;
  setBlurEnabled: (enabled: boolean) => void;
  setBlurAmount: (amount: number) => void;
  setBlurOpacity: (opacity: number) => void;

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
  customPresets: [],
  hideBindsWarning: false,

  setThemeId: (id: string) => set({ themeId: id }),
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