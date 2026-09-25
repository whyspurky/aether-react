import { invoke } from '@tauri-apps/api/core';

export const zapretApi = {
  zapretStatus: async (): Promise<'running' | 'stopped' | 'not_installed'> => {
    return await invoke('zapret_status');
  },

  zapretStart: async (): Promise<void> => {
    await invoke('zapret_start');
  },

  zapretStop: async (): Promise<void> => {
    await invoke('zapret_stop');
  },

  zapretRunBat: async (batPath: string): Promise<void> => {
    await invoke('zapret_run_bat', { batPath });
  },

  zapretProcessRunning: async (): Promise<boolean> => {
    return await invoke('zapret_process_running');
  },

  zapretDownload: async (): Promise<string> => {
    return await invoke('zapret_download');
  },

  zapretOpenFolder: async (path: string): Promise<void> => {
    await invoke('zapret_open_folder', { path });
  },

  zapretOpenFile: async (path: string): Promise<void> => {
    await invoke('zapret_open_file', { path });
  },

  zapretScanStrategies: async (folder: string): Promise<{ filename: string; path: string }[]> => {
    return await invoke('zapret_scan_strategies', { folder });
  },

  zapretCheckLists: async (folder: string): Promise<{
    file: string;
    exists: boolean;
    has_sndcdn: boolean;
    has_soundcloud: boolean;
    sndcdn_lines: string[];
  }[]> => {
    return await invoke('zapret_check_lists', { folder });
  },

  zapretAddSoundcloudDomains: async (folder: string): Promise<void> => {
    await invoke('zapret_add_soundcloud_domains', { folder });
  },
};