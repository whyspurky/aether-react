import { useEffect, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';

export function SettingsTabAbout() {
  const [version, setVersion] = useState('');

  useEffect(() => {
    getVersion().then(setVersion);
  }, []);

  return (
    <div className="bg-bg-primary rounded-2xl border border-border-subtle overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-bg-secondary flex items-center justify-center border border-border-subtle">
            <span className="text-text-secondary text-lg font-bold">a</span>
          </div>
          <div>
            <p className="text-base font-medium text-text-primary">aether</p>
            <p className="text-xs text-text-tertiary">версия {version}</p>
          </div>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">
          десктопный музыкальный плеер с интеграцией soundcloud
        </p>
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <p className="text-xs text-text-tertiary">© 2026 aether</p>
        </div>
      </div>
    </div>
  );
}