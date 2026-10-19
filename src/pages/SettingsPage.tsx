import { useEffect, useRef, useState } from 'react';
import { useStore } from '@store/store';
import { api } from '@lib/api';
import { ProxySettings } from '@components/proxy/ProxySettings';
import { SettingsSidebar, type SettingsTab } from '@components/settings/SettingsSidebar';
import { SettingsTabData } from '@components/settings/SettingsTabData';
import { SettingsTabAppearance } from '@components/settings/SettingsTabAppearance';
import { SettingsTabAbout } from '@components/settings/SettingsTabAbout';
import { SettingsTabBinds } from '@components/settings/SettingsTabBinds';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('data');
  const scrollRef = useRef<HTMLElement>(null);
  const zapretStatus = useStore((s) => s.proxy.zapret.status);
  const setZapretStatus = useStore((s) => s.setZapretStatus);

  useEffect(() => {
    if (activeTab !== 'proxy') return;
    (async () => {
      try {
        const s = await api.zapretStatus();
        setZapretStatus(s);
      } catch {}
    })();
  }, [setZapretStatus, activeTab]);

  return (
    <div className="flex-1 min-h-0 flex bg-bg-primary/40 rounded-2xl overflow-hidden border border-border-subtle">
      <SettingsSidebar
        activeTab={activeTab}
        zapretRunning={zapretStatus === 'running'}
        onChange={setActiveTab}
      />

      <main ref={scrollRef} className="flex-1 overflow-auto p-6 scrollbar-hidden overscroll-contain">
        <div key={activeTab} className="max-w-2xl mx-auto animate-page-in">
          {activeTab === 'data' && <SettingsTabData />}
          {activeTab === 'appearance' && <SettingsTabAppearance />}
          {activeTab === 'proxy' && <ProxySettings />}
          {activeTab === 'binds' && <SettingsTabBinds />}
          {activeTab === 'about' && <SettingsTabAbout />}
        </div>
      </main>
    </div>
  );
}