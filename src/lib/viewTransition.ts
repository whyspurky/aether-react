import { flushSync } from 'react-dom';
import { useStore } from '@store/store';

type TransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

// плавный морф аватара и имени между табами, если webview умеет view transitions
export function withViewTransition(update: () => void) {
  const doc = document as TransitionDocument;
  if (typeof doc.startViewTransition !== 'function' || !useStore.getState().perf.motionMorph) {
    update();
    return;
  }

  doc.startViewTransition(() => {
    flushSync(update);
  });
}
