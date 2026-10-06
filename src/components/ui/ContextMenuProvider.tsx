import { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';
import { ContextMenu, type ContextMenuItem } from './ContextMenu';

interface CtxValue {
  open: (x: number, y: number, items: ContextMenuItem[], anchor?: HTMLElement) => void;
  close: () => void;
}

const Ctx = createContext<CtxValue>({ open: () => {}, close: () => {} });

export const useContextMenu = () => useContext(Ctx);

interface State {
  x: number;
  y: number;
  items: ContextMenuItem[];
  anchor?: HTMLElement;
  forceClose: number;
}

export function ContextMenuProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const anchorRef = useRef<HTMLElement | undefined>(undefined);

  const open = useCallback((x: number, y: number, items: ContextMenuItem[], anchor?: HTMLElement) => {
    // повторный клик по тому же anchor — закрываем анимированно
    if (anchorRef.current && anchor === anchorRef.current) {
      setState((prev) => prev ? { ...prev, forceClose: prev.forceClose + 1 } : null);
      anchorRef.current = undefined;
      return;
    }

    anchorRef.current = anchor;
    setState({ x, y, items, anchor, forceClose: 0 });
  }, []);

  const close = useCallback(() => {
    anchorRef.current = undefined;
    setState(null);
  }, []);

  return (
    <Ctx.Provider value={{ open, close }}>
      {children}
      {state && (
        <ContextMenu
          x={state.x}
          y={state.y}
          items={state.items}
          anchor={state.anchor}
          forceClose={state.forceClose}
          onClose={close}
        />
      )}
    </Ctx.Provider>
  );
}