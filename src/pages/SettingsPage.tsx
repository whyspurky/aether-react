import { useEffect, useState } from 'react';
import { useStore } from '@store/store';
import { useSmoothScroll } from '@hooks/ui/useSmoothScroll';
import { api } from '@lib/api';
import { ProxySettings } from '@components/proxy/ProxySettings';
import { SettingsSidebar, type SettingsTab } from '@components/settings/SettingsSidebar';
import { SettingsTabData } from '@components/settings/SettingsTabData';
import { SettingsTabAppearance } from '@components/settings/SettingsTabAppearance';
import { SettingsTabAbout } from '@components/settings/SettingsTabAbout';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('data');
  const scrollRef = useSmoothScroll<HTMLElement>();
  const zapretStatus = useStore((s) => s.proxy?.zapret?.status ?? 'unknown');

  useEffect(() => {
    const fetch = async () => {
      try {
        const s = await api.zapretStatus();
        useStore.getState().setZapretStatus(s);
      } catch {}
    };
    fetch();
    const interval = setInterval(fetch, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex bg-bg-primary rounded-2xl overflow-hidden border border-border-subtle">
      <SettingsSidebar
        activeTab={activeTab}
        zapretRunning={zapretStatus === 'running'}
        onChange={setActiveTab}
      />

      <main ref={scrollRef} className="flex-1 overflow-auto p-6 scrollbar-hidden">
        <div key={activeTab} className="max-w-2xl mx-auto animate-page-in">
          {activeTab === 'data' && <SettingsTabData />}
          {activeTab === 'appearance' && <SettingsTabAppearance />}
          {activeTab === 'proxy' && <ProxySettings />}
          {activeTab === 'about' && <SettingsTabAbout />}
        </div>
      </main>
    </div>
  );
}