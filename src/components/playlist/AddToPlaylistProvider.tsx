import { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';
import { AddToPlaylistMenu } from './AddToPlaylistMenu';
import type { Track } from '@store/types';

interface ContextValue {
  open: (track: Track, anchor: HTMLElement, source?: string) => void;
  close: () => void;
  openTrackId: number | null;
  openSource: string | null;
}

const Ctx = createContext<ContextValue>({
  open: () => {},
  close: () => {},
  openTrackId: null,
  openSource: null,
});

export const useAddToPlaylist = () => useContext(Ctx);

export function AddToPlaylistProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ track: Track; anchor: HTMLElement; source?: string } | null>(null);
  const [closing, setClosing] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const closeTimerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const open = useCallback((track: Track, anchor: HTMLElement, source?: string) => {
    clearTimer();

    const current = stateRef.current;

    if (current && current.anchor === anchor) {
      setClosing(true);
      closeTimerRef.current = window.setTimeout(() => {
        setState(null);
        setClosing(false);
        closeTimerRef.current = null;
      }, 150);
      return;
    }

    setClosing(false);
    setState({ track, anchor, source });
  }, []);

  const close = useCallback(() => {
    clearTimer();
    setClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      setState(null);
      setClosing(false);
      closeTimerRef.current = null;
    }, 150);
  }, []);

  return (
    <Ctx.Provider
      value={{
        open,
        close,
        openTrackId: state?.track.id ?? null,
        openSource: state?.source ?? null,
      }}
    >
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