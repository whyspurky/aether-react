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
  preload: {
    isPreloading: boolean;
  };
  themeId: string;
  blur: {
    enabled: boolean;
    amount: number;
    opacity: number;
  };
  customPresets: CustomPreset[];

  setThemeId: (id: string) => void;
  setBlurEnabled: (enabled: boolean) => void;
  setBlurAmount: (amount: number) => void;
  setBlurOpacity: (opacity: number) => void;

  saveCustomPreset: (name: string) => void;
  applyCustomPreset: (id: string) => void;
  deleteCustomPreset: (id: string) => void;
  renameCustomPreset: (id: string, name: string) => void;
}

export const createUiSlice = (set: any, get: any) => ({
  preload: {
    isPreloading: false,
  },
  themeId: 'neutral',
  blur: {
    enabled: true,
    amount: 60,
    opacity: 0.25,
  },
  customPresets: [],

  setThemeId: (id: string) => set({ themeId: id }),
  setBlurEnabled: (enabled: boolean) =>
    set((s: any) => ({ blur: { ...s.blur, enabled } })),
  setBlurAmount: (amount: number) =>
    set((s: any) => ({ blur: { ...s.blur, amount: Math.max(0, Math.min(120, amount)) } })),
  setBlurOpacity: (opacity: number) =>
    set((s: any) => ({ blur: { ...s.blur, opacity: Math.max(0, Math.min(0.5, opacity)) } })),

  saveCustomPreset: (name: string) => {
    const s = get();
    const preset: CustomPreset = {
      id: `preset-${Date.now()}`,
      name: name.slice(0, 24),
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
        p.id === id ? { ...p, name: name.slice(0, 24) } : p
      ),
    });
  },
});