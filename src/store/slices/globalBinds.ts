export type GlobalBindAction = 'playpause' | 'next' | 'prev' | 'volumeUp' | 'volumeDown';

export interface GlobalBindsSlice {
  globalBindsEnabled: boolean;
  globalBinds: Record<GlobalBindAction, string>;
  setGlobalBindsEnabled: (enabled: boolean) => void;
  setGlobalBind: (action: GlobalBindAction, key: string) => void;
  resetGlobalBinds: () => void;
}

export const DEFAULT_GLOBAL_BINDS: Record<GlobalBindAction, string> = {
  playpause: '',
  next: '',
  prev: '',
  volumeUp: '',
  volumeDown: '',
};

export const createGlobalBindsSlice = (set: any) => ({
  globalBindsEnabled: false,
  globalBinds: { ...DEFAULT_GLOBAL_BINDS },
  setGlobalBindsEnabled: (enabled: boolean) => set({ globalBindsEnabled: enabled }),
  setGlobalBind: (action: GlobalBindAction, key: string) =>
    set((s: any) => ({ globalBinds: { ...s.globalBinds, [action]: key } })),
  resetGlobalBinds: () => set({ globalBinds: { ...DEFAULT_GLOBAL_BINDS } }),
});