import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

export interface ContextMenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  anchor?: HTMLElement;
  onClose: () => void;
  forceClose?: number;
}

export function ContextMenu({ x, y, items, anchor, onClose, forceClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const [closing, setClosing] = useState(false);

  // позиционирование
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    let px = x;
    let py = y;
    if (px + rect.width > window.innerWidth - 8) px = window.innerWidth - rect.width - 8;
    if (py + rect.height > window.innerHeight - 8) py = window.innerHeight - rect.height - 8;
    if (px < 8) px = 8;
    if (py < 8) py = 8;
    setPos({ x: px, y: py });
  }, [x, y]);

  const startClose = () => {
    setClosing((prev) => {
      if (prev) return prev;
      setTimeout(() => onClose(), 120);
      return true;
    });
  };

  // внешний триггер закрытия (повторный клик по anchor)
  useEffect(() => {
    if (forceClose && forceClose > 0) {
      startClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceClose]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (anchor?.contains(target)) return;
      startClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') startClose();
    };
    const onScroll = () => startClose();

    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);

    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);

  return createPortal(
    <div
      ref={ref}
      style={{ top: pos.y, left: pos.x }}
      className={`fixed z-[9999] min-w-[180px] bg-bg-card border border-border-subtle rounded-xl shadow-2xl py-1 ${
        closing ? 'animate-menu-exit' : 'animate-menu-enter'
      }`}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => { item.onClick(); startClose(); }}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
            item.danger
              ? 'text-red-400 hover:bg-red-500/10'
              : 'text-text-secondary hover:bg-bg-secondary'
          }`}
        >
          {item.icon && <Icon name={item.icon} size={14} />}
          <span className="flex-1">{item.label}</span>
        </button>
      ))}
    </div>,
    document.body
  );
}