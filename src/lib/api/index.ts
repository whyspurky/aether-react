import { playerApi } from './player';
import { soundcloudApi } from './soundcloud';
import { proxyApi } from './proxy';
import { zapretApi } from './zapret';

export const api = {
  ...playerApi,
  ...soundcloudApi,
  ...proxyApi,
  ...zapretApi,
};

if (typeof window !== 'undefined') {
  (window as any).api = api;
}