import { Icon } from '@components/ui/Icon';
import { useStore } from '@store/store';
import { ProxyModeSelector } from './ProxyModeSelector';
import { ProxyConnectionTest } from './ProxyConnectionTest';
import { CustomProxyForm } from './CustomProxyForm';
import { ZapretForm } from './ZapretForm';

export function ProxySettings() {
  const mode = useStore((s) => s.proxy?.mode ?? 'off');
  const custom = useStore((s) => s.proxy?.custom);
  const zapret = useStore((s) => s.proxy?.zapret);

  const setProxyMode = useStore((s) => s.setProxyMode);
  const setCustomProxy = useStore((s) => s.setCustomProxy);
  const setZapretBatPath = useStore((s) => s.setZapretBatPath);
  const setZapretStatus = useStore((s) => s.setZapretStatus);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border-subtle bg-bg-primary p-5">
        <div className="flex items-center gap-3 mb-1">
          <Icon name="shield" size={18} className="text-text-secondary" />
          <h2 className="text-sm font-medium text-text-primary">прокси</h2>
        </div>
        <p className="text-xs text-text-tertiary">
          маршрутизация трафика и обход ограничений
        </p>
      </div>

      <ProxyConnectionTest mode={mode} />

      <ProxyModeSelector
        mode={mode}
        zapretRunning={zapret?.status === 'running'}
        onChange={setProxyMode}
      />

      {mode === 'custom' && custom && (
        <CustomProxyForm config={custom} onChange={setCustomProxy} />
      )}

      {mode === 'zapret' && zapret && (
        <ZapretForm
          batPath={zapret.batPath ?? ''}
          folder={zapret.folder ?? ''}
          status={zapret.status ?? 'unknown'}
          onChangeBatPath={setZapretBatPath}
          onStatusChange={setZapretStatus}
        />
      )}
    </div>
  );
}