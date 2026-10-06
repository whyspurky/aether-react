import { useEffect } from 'react';
import { useStore } from '@store/store';

export function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (target.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const s = useStore.getState();

      if (e.code === 'Space') {
        e.preventDefault();
        if (!s.player.isLoading) s.togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        s.nextTrack(true);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        s.prevTrack(true);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        const next = Math.min(100, s.player.volume + 5);
        s.setVolume(next);
        s.setVolumeRust(next);
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        const next = Math.max(0, s.player.volume - 5);
        s.setVolume(next);
        s.setVolumeRust(next);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}