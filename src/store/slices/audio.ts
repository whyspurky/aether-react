export interface AudioState {
  // пустая строка значит системное устройство по умолчанию
  outputDevice: string;
}

export interface AudioSlice {
  audio: AudioState;
  setOutputDevice: (name: string) => void;
}

export const createAudioSlice = (set: any) => ({
  audio: {
    outputDevice: '',
  } as AudioState,

  setOutputDevice: (outputDevice: string) =>
    set((s: any) => ({ audio: { ...s.audio, outputDevice } })),
});
