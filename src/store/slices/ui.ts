export interface UiSlice {
  preload: {
    isPreloading: boolean;
  };
}

export const createUiSlice = (_set: any) => ({
  preload: {
    isPreloading: false,
  },
});