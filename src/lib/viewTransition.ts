import { flushSync } from 'react-dom';

type TransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

// плавный морф аватара и имени между табами, если webview умеет view transitions
export function withViewTransition(update: () => void) {
  const doc = document as TransitionDocument;
  if (typeof doc.startViewTransition !== 'function') {
    update();
    return;
  }

  doc.startViewTransition(() => {
    flushSync(update);
  });
}
