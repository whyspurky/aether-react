import { useEffect } from 'react';
import { dispatchPlayerAction } from '@hooks/app/useGlobalBinds';

export function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      console.log('[keyboard]', e.code, e.key);
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (target.isContentEditable) return;

      if (e.code === 'Space') {
        if (e.repeat) return;
        e.preventDefault();
        dispatchPlayerAction('playpause');
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}