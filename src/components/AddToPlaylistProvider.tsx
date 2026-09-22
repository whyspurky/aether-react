import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { AddToPlaylistMenu } from './AddToPlaylistMenu';
import type { Track } from '../store/types';

interface ContextValue {
  open: (track: Track, anchor: HTMLElement) => void;
  close: () => void;
  openTrackId: number | null;
}

const Ctx = createContext<ContextValue>({ open: () => {}, close: () => {}, openTrackId: null });

export const useAddToPlaylist = () => useContext(Ctx);

export function AddToPlaylistProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ track: Track; anchor: HTMLElement } | null>(null);
  const [closing, setClosing] = useState(false);

  const open = useCallback((track: Track, anchor: HTMLElement) => {
    setClosing(false);
    setState({ track, anchor });
  }, []);

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setState(null);
      setClosing(false);
    }, 150);
  }, []);

  return (
    <Ctx.Provider value={{ open, close, openTrackId: state?.track.id ?? null }}>
      {children}
      {state && (
        <AddToPlaylistMenu
          track={state.track}
          anchorEl={state.anchor}
          onClose={close}
          isClosing={closing}
        />
      )}
    </Ctx.Provider>
  );
}