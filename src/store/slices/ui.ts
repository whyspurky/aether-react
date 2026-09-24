export interface UiSlice {
  toast: { message: string; type: 'error' | 'success' | 'info' } | null;
  preload: {
    isPreloading: boolean;
  };
  showToast: (message: string, type: 'error' | 'success' | 'info') => void;
  hideToast: () => void;
}

export const createUiSlice = (set: any) => ({
  toast: null,
  preload: {
    isPreloading: false,
  },

  showToast: (message: string, type: 'error' | 'success' | 'info') =>
    set({ toast: { message, type } }),

  hideToast: () => set({ toast: null }),
});