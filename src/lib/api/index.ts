import { playerApi } from './player';
import { soundcloudApi } from './soundcloud';
import { proxyApi } from './proxy';
import { zapretApi } from './zapret';
import { globalBindsApi } from './globalBinds';

export const api = {
  ...playerApi,
  ...soundcloudApi,
  ...proxyApi,
  ...zapretApi,
  ...globalBindsApi,
};

if (typeof window !== 'undefined') {
  (window as any).api = api;
}