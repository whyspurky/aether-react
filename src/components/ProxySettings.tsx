import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { api } from '../lib/api';
import { useStore } from '../store/store';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import type { ProxyMode } from '../store/types';

interface ModeOption {
  id: ProxyMode;
  title: string;
  desc: string;
  icon: string;
  disabled?: boolean;
}

const modes: ModeOption[] = [
  { id: 'off', title: 'выключен', desc: 'не оборачивать запросы в прокси | рекомендуется использовать с VPN', icon: 'x-circle' },
  { id: 'builtin', title: 'встроенный', desc: 'оборачвать запросы серверный прокси | в разработке', icon: 'shield', disabled: true },
  { id: 'custom', title: 'личный', desc: 'оборачивать запросы в прокси', icon: 'settings' },
  { id: 'zapret', title: 'запрет', desc: 'обход блокировок через zapret', icon: 'globe' },
];

interface ApiResult {
  ok: boolean;
  status: number;
  time_ms: number;
  error: string | null;
}

interface CdnResult {
  ok: boolean;
  status: number;
  time_ms: number;
  error: string | null;
}

interface ListCheck {
  file: string;
  exists: boolean;
  has_sndcdn: boolean;
  has_soundcloud: boolean;
  sndcdn_lines: string[];
}

export function ProxySettings() {
  const mode = useStore((s) => s.proxy?.mode ?? 'off');
  const custom = useStore((s) => s.proxy?.custom);
  const zapret = useStore((s) => s.proxy?.zapret);

  const setProxyMode = useStore((s) => s.setProxyMode);
  const setCustomProxy = useStore((s) => s.setCustomProxy);
  const setZapretBatPath = useStore((s) => s.setZapretBatPath);
  const setZapretStatus = useStore((s) => s.setZapretStatus);

  const [testLoading, setTestLoading] = useState(false);
  const [apiResult, setApiResult] = useState<ApiResult | null>(null);
  const [cdnResult, setCdnResult] = useState<CdnResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const handleTest = async () => {
    setTestLoading(true);
    setApiResult(null);
    setCdnResult(null);
    setTestError(null);

    const apiPromise = api
      .proxyTestApi()
      .then(setApiResult)
      .catch((e) => setTestError(String(e)));

    const cdnPromise = api
      .proxyTestCdn()
      .then(setCdnResult)
      .catch(() => {});

    await Promise.all([apiPromise, cdnPromise]);
    setTestLoading(false);
  };

  useEffect(() => {
    setApiResult(null);
    setCdnResult(null);
    setTestError(null);
  }, [mode]);

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

      {/* проверка подключения */}
      <div className="rounded-2xl border border-border-subtle bg-bg-primary p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-primary">проверка подключения</p>
            <p className="text-xs text-text-tertiary mt-0.5">
              тест связи с доменами soundcloud
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(apiResult || cdnResult || testError) && (
              <div className="flex flex-col gap-1 text-xs text-right">
                {testError ? (
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-red-400">✕</span>
                    <span className="text-red-400 font-mono">error</span>
                  </div>
                ) : (
                  <>
                    <CompactResult label="api" result={apiResult} />
                    <CompactResult label="cdn" result={cdnResult} />
                  </>
                )}
              </div>
            )}

            <button
              onClick={handleTest}
              disabled={testLoading}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-bg-secondary text-text-secondary hover:bg-text-secondary hover:text-bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              {testLoading ? 'проверка...' : 'проверить'}
            </button>
          </div>
        </div>
      </div>

      {/* карточки режимов */}
      <div className="space-y-2">
        {modes.map((m) => {
          const active = mode === m.id;
          const isDisabled = m.disabled;
          return (
            <button
              key={m.id}
              disabled={isDisabled}
              onClick={() => !isDisabled && setProxyMode(m.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 ${
                active
                  ? 'bg-bg-secondary border-border-visible'
                  : 'bg-bg-primary border-border-subtle hover:border-border-visible'
              } ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="w-9 h-9 rounded-lg bg-bg-secondary flex items-center justify-center flex-shrink-0">
                <Icon
                  name={m.icon}
                  size={16}
                  className={active ? 'text-text-primary' : 'text-text-tertiary'}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={`text-sm font-medium ${
                      active ? 'text-text-primary' : 'text-text-secondary'
                    }`}
                  >
                    {m.title}
                  </p>
                  {m.id === 'zapret' && zapret?.status === 'running' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-text-tertiary mt-0.5">{m.desc}</p>
              </div>
              {active && !isDisabled && (
                <Icon name="check" size={16} className="text-text-secondary flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

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

interface CompactResultProps {
  label: string;
  result: ApiResult | CdnResult | null;
}

function CompactResult({ label, result }: CompactResultProps) {
  if (!result) {
    return (
      <div className="flex items-center gap-1.5 justify-end">
        <span className="text-text-tertiary">·</span>
        <span className="text-text-tertiary font-mono">{label}</span>
        <span className="text-text-tertiary font-mono text-[10px]">...</span>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="flex items-center gap-1.5 justify-end">
        <span className="text-red-400">✕</span>
        <span className="text-red-400 font-mono">{label}</span>
        <span className="text-red-400 font-mono text-[10px]">error</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 justify-end">
      <span className={result.ok ? 'text-green-500' : 'text-red-400'}>
        {result.ok ? '✓' : '✕'}
      </span>
      <span className="text-text-secondary font-mono">{label}</span>
      <span className="text-text-tertiary font-mono text-[10px]">
        {result.status} · {result.time_ms}ms
      </span>
    </div>
  );
}

interface CustomProxyFormProps {
  config: {
    type: 'socks5' | 'http' | 'https';
    host: string;
    port: number;
    username: string;
    password: string;
  };
  onChange: (config: Partial<CustomProxyFormProps['config']>) => void;
}

function CustomProxyForm({ config, onChange }: CustomProxyFormProps) {
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

interface ZapretFormProps {
  batPath: string;
  folder: string;
  status: 'unknown' | 'running' | 'stopped' | 'not_installed';
  onChangeBatPath: (path: string) => void;
  onStatusChange: (status: 'unknown' | 'running' | 'stopped' | 'not_installed') => void;
}

function ZapretForm({ batPath, status, folder, onChangeBatPath, onStatusChange }: ZapretFormProps) {
  const setZapretFolder = useStore((s) => s.setZapretFolder);

  const [loading, setLoading] = useState(false);
  const [warming, setWarming] = useState(false);

  const [strategies, setStrategies] = useState<{ filename: string; path: string }[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [scanLoading, setScanLoading] = useState(false);

  const [listChecks, setListChecks] = useState<ListCheck[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ downloaded: number; total: number } | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const s = await api.zapretStatus();
        onStatusChange(s);
      } catch {
        onStatusChange('not_installed');
      }
    };
    fetch();
    const interval = setInterval(fetch, 3000);
    return () => clearInterval(interval);
  }, [onStatusChange]);

  useEffect(() => {
    if (!folder.trim()) {
      setStrategies([]);
      return;
    }
    const scan = async () => {
      setScanLoading(true);
      try {
        const list = await api.zapretScanStrategies(folder);
        setStrategies(list);

        if (list.length) {
          const saved = batPath && list.find((s) => s.path === batPath);
          setSelectedStrategy(saved ? saved.path : list[0].path);
        }
      } catch {
        setStrategies([]);
      } finally {
        setScanLoading(false);
      }
    };
    scan();
  }, [folder, batPath]);

  useEffect(() => {
    if (!folder.trim()) {
      setListChecks([]);
      return;
    }
    const check = async () => {
      setListLoading(true);
      setListError(null);
      try {
        const result = await api.zapretCheckLists(folder);
        setListChecks(result);
      } catch (e) {
        setListError(String(e));
        setListChecks([]);
      } finally {
        setListLoading(false);
      }
    };
    check();
  }, [folder]);

  useEffect(() => {
    const unlisten = listen<{ downloaded: number; total: number }>(
      'zapret:download-progress',
      (e) => {
        setDownloadProgress({
          downloaded: e.payload.downloaded,
          total: e.payload.total,
        });
      }
    );
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const handlePickFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'выберите папку zapret',
      });
      if (selected && typeof selected === 'string') {
        setZapretFolder(selected);
      }
    } catch (e) {
      useStore.getState().showToast(`выбор папки: ${e}`, 'error');
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadProgress({ downloaded: 0, total: 0 });
    setDownloadError(null);

    try {
      const path = await api.zapretDownload();
      setZapretFolder(path);
      useStore
        .getState()
    } catch (e) {
      setDownloadError(String(e));
      useStore.getState().showToast(`скачивание: ${e}`, 'error');
    } finally {
      setDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handleAddDomains = async () => {
    if (!folder.trim()) return;
    setListLoading(true);
    setListError(null);
    try {
      await api.zapretAddSoundcloudDomains(folder);
      const result = await api.zapretCheckLists(folder);
      setListChecks(result);
      useStore.getState().showToast('домены soundcloud добавлены', 'success');
    } catch (e) {
      setListError(String(e));
      useStore.getState().showToast(`zapret: ${e}`, 'error');
    } finally {
      setListLoading(false);
    }
  };

  const handleOpenFile = async (filename: string) => {
    const path = `${folder}\\lists\\${filename}`;
    try {
      await api.zapretOpenFile(path);
    } catch (e) {
      useStore.getState().showToast(`открыть: ${e}`, 'error');
    }
  };

  const handleStartSelected = async () => {
    if (!selectedStrategy) return;

    setLoading(true);
    onStatusChange('running');
    setWarming(true);

    try {
      await api.zapretRunBat(selectedStrategy);
      onChangeBatPath(selectedStrategy);

      setTimeout(async () => {
        try {
          const s = await api.zapretStatus();
          onStatusChange(s);
        } catch {}
      }, 1500);
    } catch (e) {
      useStore.getState().showToast(`zapret: ${e}`, 'error');
      onStatusChange('stopped');
      setWarming(false);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    onStatusChange('stopped');
    setWarming(false);

    try {
      await api.zapretStop();
      const s = await api.zapretStatus();
      onStatusChange(s);
    } catch (e) {
      useStore.getState().showToast(`zapret: ${e}`, 'error');
      onStatusChange('running');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* папка zapret */}
      <div className="rounded-2xl border border-border-subtle bg-bg-primary p-5 space-y-4">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={folder}
              onChange={(e) => setZapretFolder(e.target.value)}
              placeholder="C:\zapret"
              className="flex-1 px-3 py-2 bg-bg-secondary border border-border-subtle rounded-lg outline-none focus:border-border-visible text-sm text-text-primary placeholder:text-text-tertiary font-mono"
            />
            <button
              onClick={handlePickFolder}
              title="выбрать папку"
              className="px-3 py-2 rounded-lg text-text-tertiary hover:bg-bg-secondary hover:text-text-primary transition-all"
            >
              <Icon name="folder" size={16} />
            </button>
          </div>

          {!folder.trim() && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full px-3 py-2 rounded-lg text-xs bg-bg-secondary text-text-secondary hover:bg-text-secondary hover:text-bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? 'скачивание...' : 'скачать zapret'}
            </button>
          )}

          {downloadProgress && downloadProgress.total > 0 && (
            <div className="space-y-1">
              <div className="h-1 bg-bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-text-secondary transition-all duration-200"
                  style={{
                    width: `${(downloadProgress.downloaded / downloadProgress.total) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-text-tertiary text-center font-mono">
                {(downloadProgress.downloaded / 1024 / 1024).toFixed(1)} /{' '}
                {(downloadProgress.total / 1024 / 1024).toFixed(1)} МБ
              </p>
            </div>
          )}

          {downloadError && (
            <p className="text-xs text-red-400 font-mono truncate" title={downloadError}>
              {downloadError}
            </p>
          )}
        </div>
      </div>

      {/* стратегии */}
      {folder.trim() && (
        <div className="rounded-2xl border border-border-subtle bg-bg-primary p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-primary">стратегии</p>
            <span className="text-xs text-text-tertiary">
              {scanLoading ? 'сканирование...' : ``}
            </span>
          </div>

          {strategies.length === 0 && !scanLoading && (
            <p className="text-xs text-text-tertiary">
              в папке нет general*.bat файлов. проверь путь.
            </p>
          )}

          {strategies.length > 0 && (
            <>
              <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                {strategies.map((s) => {
                  const active = selectedStrategy === s.path;
                  const locked = status === 'running' || warming;
                  return (
                    <button
                      key={s.path}
                      disabled={locked}
                      onClick={() => !locked && setSelectedStrategy(s.path)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs transition-all ${
                        active
                          ? 'bg-bg-secondary text-text-primary'
                          : 'text-text-tertiary hover:bg-bg-secondary hover:text-text-secondary'
                      } ${
                        locked
                          ? 'opacity-50 cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-tertiary'
                          : ''
                      }`}
                    >
                      <Icon name={active ? 'check' : 'file'} size={14} />
                      <span className="flex-1 truncate font-mono">{s.filename}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                {status === 'running' || warming ? (
                  <button
                    onClick={handleStop}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    {loading ? '...' : 'остановить'}
                  </button>
                ) : (
                  <button
                    onClick={handleStartSelected}
                    disabled={loading || !selectedStrategy}
                    className="px-3 py-1.5 rounded-lg text-xs text-text-secondary bg-bg-secondary hover:bg-text-secondary hover:text-bg-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-bg-secondary disabled:hover:text-text-secondary"
                  >
                    {loading ? '...' : 'запустить'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* списки доменов */}
      {folder.trim() && (
        <div className="rounded-2xl border border-border-subtle bg-bg-primary p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-primary">списки доменов</p>
            <div className="flex items-center gap-2">
              {listLoading && (
                <span className="text-xs text-text-tertiary">проверка...</span>
              )}
              <button
                onClick={handleAddDomains}
                disabled={listLoading}
                className="px-2.5 py-1 rounded-lg text-xs text-text-secondary bg-bg-secondary hover:bg-text-secondary hover:text-bg-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                добавить домены
              </button>
            </div>
          </div>

          {listError && (
            <p className="text-xs text-red-400 font-mono truncate" title={listError}>
              {listError}
            </p>
          )}

          {listChecks.length > 0 && (
            <div className="space-y-1">
              {listChecks.map((lc) => (
                <div
                  key={lc.file}
                  className="flex items-center gap-3 px-2 py-1.5 rounded-lg text-xs"
                >
                  <span className={lc.exists ? 'text-green-500' : 'text-text-tertiary'}>
                    {lc.exists ? '✓' : '·'}
                  </span>

                  <span className="flex-1 truncate font-mono text-text-secondary">
                    {lc.file}
                  </span>

                  {lc.exists && (
                    <div className="flex items-center gap-2">
                      <span
                        className={lc.has_sndcdn ? 'text-green-500' : 'text-red-400'}
                        title={
                          lc.has_sndcdn
                            ? `${lc.sndcdn_lines.length} строк`
                            : 'sndcdn не найден'
                        }
                      >
                        {lc.has_sndcdn ? '✓' : '✕'}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => handleOpenFile(lc.file)}
                    title="открыть"
                    className="p-1 rounded text-text-tertiary hover:bg-bg-secondary hover:text-text-primary transition-all"
                  >
                    <Icon name="external-link" size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}