interface CustomProxyConfig {
  type: 'socks5' | 'http' | 'https';
  host: string;
  port: number;
  username: string;
  password: string;
}

interface Props {
  config: CustomProxyConfig;
  onChange: (config: Partial<CustomProxyConfig>) => void;
}

export function CustomProxyForm({ config, onChange }: Props) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-primary p-5 space-y-4">
      <div>
        <label className="text-xs text-text-tertiary mb-2 block">тип</label>
        <div className="flex gap-2">
          {(['socks5', 'http', 'https'] as const).map((t) => (
            <button
              key={t}
              onClick={() => onChange({ type: t })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                config.type === t
                  ? 'bg-bg-secondary text-text-primary'
                  : 'text-text-tertiary hover:bg-bg-secondary hover:text-text-secondary'
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-text-tertiary mb-2 block">хост</label>
          <input
            type="text"
            value={config.host}
            onChange={(e) => onChange({ host: e.target.value })}
            placeholder="127.0.0.1"
            className="w-full px-3 py-2 bg-bg-secondary border border-border-subtle rounded-lg outline-none focus:border-border-visible text-sm text-text-primary placeholder:text-text-tertiary"
          />
        </div>
        <div>
          <label className="text-xs text-text-tertiary mb-2 block">порт</label>
          <input
            type="number"
            value={config.port}
            onChange={(e) => onChange({ port: parseInt(e.target.value) || 0 })}
            placeholder="1080"
            className="w-full px-3 py-2 bg-bg-secondary border border-border-subtle rounded-lg outline-none focus:border-border-visible text-sm text-text-primary placeholder:text-text-tertiary"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-text-tertiary mb-2 block">логин (опционально)</label>
          <input
            type="text"
            value={config.username}
            onChange={(e) => onChange({ username: e.target.value })}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-subtle rounded-lg outline-none focus:border-border-visible text-sm text-text-primary placeholder:text-text-tertiary"
          />
        </div>
        <div>
          <label className="text-xs text-text-tertiary mb-2 block">пароль (опционально)</label>
          <input
            type="password"
            value={config.password}
            onChange={(e) => onChange({ password: e.target.value })}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-subtle rounded-lg outline-none focus:border-border-visible text-sm text-text-primary placeholder:text-text-tertiary"
          />
        </div>
      </div>

      <p className="text-xs text-text-tertiary leading-relaxed pt-2 border-t border-border-subtle">
        укажите адрес уже запущенного прокси (например, xray/sing-box на 127.0.0.1:1080).
        приложение не запускает его самостоятельно.
      </p>
    </div>
  );
}