import { playerApi } from './player';
import { soundcloudApi } from './soundcloud';
import { proxyApi } from './proxy';
import { zapretApi } from './zapret';
import { globalBindsApi } from './globalBinds';
import { trackCacheApi } from './trackCache';
import { authApi } from './auth';

export const api = {
  ...playerApi,
  ...soundcloudApi,
  ...proxyApi,
  ...zapretApi,
  ...globalBindsApi,
  ...trackCacheApi,
  ...authApi,
};

if (typeof window !== 'undefined') {
  (window as any).api = api;
}