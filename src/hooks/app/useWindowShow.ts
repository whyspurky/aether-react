import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export function useWindowShow() {
  useEffect(() => {
    getCurrentWindow().show();
  }, []);
}