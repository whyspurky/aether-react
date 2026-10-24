import { useEffect, useRef, useState } from 'react';
import { Icon } from '@components/ui/Icon';
import { ConfirmModal } from '@components/ui/ConfirmModal';
import { useStore } from '@store/store';
import { api } from '@lib/api';
import type { AudioQuality } from '@store/types';
import type { AudioSection } from './SettingsSidebar';

const QUALITY_OPTIONS: { id: AudioQuality; label: string; hint: string }[] = [
  { id: 'best', label: 'максимальное', hint: 'самый высокий доступный битрейт' },
  { id: 'high', label: 'высокое', hint: 'цель 160 kbps' },
  { id: 'medium', label: 'среднее', hint: 'цель 128 kbps' },
  { id: 'low', label: 'низкое', hint: 'прогрессивный поток или самый низкий' },
];

function formatSize(bytes: number): string {
  if (!bytes) return '0 мб';
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} мб`;
}

function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-all duration-300 active:scale-95 overflow-hidden ${
        checked ? '' : 'bg-white/[0.12] hover:bg-white/[0.16]'
      } ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
      style={
        checked
          ? {
              background:
                'color-mix(in srgb, var(--accent-primary) 35%, transparent)',
              boxShadow:
                'inset 0 0 0 1px color-mix(in srgb, var(--accent-primary) 40%, transparent)',
            }
          : undefined
      }
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full shadow-sm transition-all duration-300 ${
          checked ? 'left-[22px]' : 'left-0.5'
        } ${checked ? 'bg-white' : 'bg-text-tertiary'}`}
        style={
          checked
            ? {
                boxShadow:
                  '0 0 0 1px rgba(255,255,255,0.6), 0 0 8px rgba(255,255,255,0.4)',
              }
            : undefined
        }
      />
    </button>
  );
}

function RoadmapRow({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-text-tertiary">
          <Icon name={icon} size={14} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm text-text-primary">{title}</span>
          <span className="mt-0.5 block text-[11px] leading-snug text-text-tertiary">
            {description}
          </span>
        </span>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[9px] uppercase tracking-wider text-text-tertiary">
          скоро
        </span>
        <Toggle
          checked={false}
          onChange={() => {}}
          disabled
          label={`${title}, скоро`}
        />
      </div>
    </div>
  );
}

function DeviceSelect({
  devices,
  value,
  onChange,
}: {
  devices: { name: string; isDefault: boolean }[];
  value: string;
  onChange: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = value || 'системное по умолчанию';
  const known = !value || devices.some((device) => device.name === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const pick = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="устройство вывода звука"
        onClick={() => setOpen((next) => !next)}
        className="flex w-full items-center gap-2.5 rounded-xl border border-border-subtle bg-white/[0.04] px-3 py-2.5 text-left text-sm text-text-primary outline-none transition-colors hover:border-border-visible focus-visible:border-[var(--accent-primary)]"
      >
        <Icon name="volume-2" size={15} className="flex-shrink-0 text-text-tertiary" />
        <span className="min-w-0 flex-1 truncate">{selected}</span>
        <Icon
          name="chevron-right"
          size={14}
          className={`flex-shrink-0 text-text-tertiary transition-transform duration-200 ${
            open ? 'rotate-90' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="список устройств вывода"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-xl border border-border-subtle bg-bg-card/95 p-1 shadow-2xl backdrop-blur-xl animate-menu-enter"
        >
          <button
            type="button"
            role="option"
            aria-selected={!value}
            onClick={() => pick('')}
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
              !value
                ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                : 'text-text-secondary hover:bg-white/[0.05]'
            }`}
          >
            <span className="min-w-0 flex-1 truncate">системное по умолчанию</span>
            {!value && <Icon name="check" size={13} className="flex-shrink-0" />}
          </button>

          {value && !known && (
            <button
              type="button"
              role="option"
              aria-selected
              onClick={() => pick(value)}
              className="flex w-full items-center gap-2 rounded-lg bg-[var(--accent-muted)] px-2.5 py-2 text-left text-sm text-[var(--accent-primary)]"
            >
              <span className="min-w-0 flex-1 truncate">{value}</span>
              <Icon name="check" size={13} className="flex-shrink-0" />
            </button>
          )}

          <div className="max-h-56 overflow-auto scrollbar-hidden">
            {devices.map((device, index) => {
              const active = device.name === value;
              return (
                <button
                  key={`${device.name}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(device.name)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                    active
                      ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                      : 'text-text-secondary hover:bg-white/[0.05]'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {device.name}
                    {device.isDefault && (
                      <span className="ml-1.5 text-[10px] text-text-tertiary">
                        по умолчанию
                      </span>
                    )}
                  </span>
                  {active && <Icon name="check" size={13} className="flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

type ClearScope = 'temp' | 'offline' | 'all' | null;

export function SettingsTabAudio({ section }: { section: AudioSection }) {
  const offline = useStore((s) => s.offline);
  const setCacheEnabled = useStore((s) => s.setCacheEnabled);
  const setAudioQuality = useStore((s) => s.setAudioQuality);
  const setAutoSave = useStore((s) => s.setAutoSave);
  const setCacheLimit = useStore((s) => s.setCacheLimit);
  const refreshCache = useStore((s) => s.refreshCache);
  const outputDevice = useStore((s) => s.audio.outputDevice);
  const setOutputDevice = useStore((s) => s.setOutputDevice);
  const [devices, setDevices] = useState<{ name: string; isDefault: boolean }[]>([]);
  const [clearScope, setClearScope] = useState<ClearScope>(null);
  const [limitDraft, setLimitDraft] = useState(String(offline.cacheLimitMb));
  const entries = Object.values(offline.entries);
  const tempCount = entries.filter((entry) => !entry.offline).length;
  const offlineCount = entries.filter((entry) => entry.offline).length;
  const totalSize = offline.sizes.temp + offline.sizes.offline;
  const enabled = offline.cacheEnabled;

  useEffect(() => {
    refreshCache();
    api
      .listOutputDevices()
      .then((list) => setDevices(list))
      .catch(() => {});
  }, [refreshCache]);

  useEffect(() => {
    setLimitDraft(String(offline.cacheLimitMb));
  }, [offline.cacheLimitMb]);

  const applyLimit = async () => {
    const value = Math.max(128, Number(limitDraft) || 2048);
    setCacheLimit(value);
    await api.trackEnforceLimit(value);
    await refreshCache();
  };

  const toggleCache = async (next: boolean) => {
    if (next === offline.cacheEnabled) return;
    setCacheEnabled(next);
    if (!next) {
      await api.stopAudio();
      useStore.setState((s: any) => ({
        player: {
          ...s.player,
          isPlaying: false,
          isAudioReady: false,
          position: 0,
        },
      }));
      await api.trackClearCache('temp');
      await refreshCache();
    }
  };

  const chooseOutputDevice = async (name: string) => {
    setOutputDevice(name);
    try {
      await api.setOutputDevice(name || null);
      await api.stopAudio();
      useStore.setState((s: any) => ({
        player: {
          ...s.player,
          isPlaying: false,
          isAudioReady: false,
          position: 0,
        },
      }));
    } catch {
      setOutputDevice('');
      await api.setOutputDevice(null).catch(() => {});
    }
  };

  const confirmClear = async () => {
    if (!clearScope) return;
    await api.trackClearCache(clearScope);
    setClearScope(null);
    await refreshCache();
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`relative overflow-hidden rounded-2xl border p-5 transition-colors ${section === 'cache' ? 'order-1' : 'hidden'} ${
          enabled ? '' : 'border-border-subtle bg-bg-primary/40'
        }`}
        style={
          enabled
            ? {
                borderColor: 'color-mix(in srgb, var(--accent-primary) 28%, transparent)',
                background:
                  'linear-gradient(135deg, color-mix(in srgb, var(--accent-primary) 12%, transparent), transparent 68%)',
              }
            : undefined
        }
      >
        <div className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-[var(--accent-muted)] blur-3xl" />

        <div className="relative">
          <div className="flex min-w-0 gap-3.5">
            <div
              className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl transition-colors ${
                enabled
                  ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                  : 'bg-white/[0.06] text-text-tertiary'
              }`}
            >
              <Icon name={enabled ? 'database' : 'play'} size={20} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-text-primary">
                  режим прослушивания
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    enabled
                      ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                      : 'bg-white/[0.06] text-text-tertiary'
                  }`}
                >
                  {enabled ? 'кэш' : 'поток'}
                </span>
              </div>

              <p className="mt-1.5 max-w-[390px] text-xs leading-relaxed text-text-tertiary">
                {enabled
                  ? 'треки прогреваются заранее и остаются на диске. можно включить автосохранение прослушанного'
                  : 'трек загружается в память и играет сразу, без записи на диск и без прогрева следующего'}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-text-tertiary">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2 py-1">
                  <Icon name="database" size={11} />
                  {formatSize(totalSize)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2 py-1">
                  {tempCount + offlineCount} треков
                </span>
                {offlineCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-muted)] px-2 py-1 text-[var(--accent-primary)]">
                    <Icon name="download-cloud" size={11} />
                    {offlineCount} в офлайн
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => toggleCache(false)}
              className={`group flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all duration-200 ${
                !enabled
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-muted)]'
                  : 'border-border-subtle bg-white/[0.02] hover:border-border-visible hover:bg-white/[0.04]'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  !enabled
                    ? 'bg-[var(--accent-primary)] text-bg-primary'
                    : 'bg-white/[0.05] text-text-tertiary group-hover:text-text-secondary'
                }`}
              >
                <Icon name="play" size={14} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm text-text-primary">только слушать</span>
                <span className="mt-0.5 block text-[10px] text-text-tertiary">
                  без загрузки и кэша
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => toggleCache(true)}
              className={`group flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all duration-200 ${
                enabled
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-muted)]'
                  : 'border-border-subtle bg-white/[0.02] hover:border-border-visible hover:bg-white/[0.04]'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  enabled
                    ? 'bg-[var(--accent-primary)] text-bg-primary'
                    : 'bg-white/[0.05] text-text-tertiary group-hover:text-text-secondary'
                }`}
              >
                <Icon name="database" size={14} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm text-text-primary">кэшировать</span>
                <span className="mt-0.5 block text-[10px] text-text-tertiary">
                  быстрый старт и офлайн
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className={`overflow-hidden rounded-2xl border border-border-subtle bg-bg-primary/40 ${section === 'playback' ? 'order-1' : 'hidden'}`}>
        <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06]">
            <Icon name="volume-2" size={16} className="text-text-secondary" />
          </div>
          <div>
            <p className="text-sm text-text-primary">устройство вывода</p>
            <p className="mt-0.5 text-xs text-text-tertiary">
              куда отправлять звук, смена останавливает текущий трек
            </p>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="relative">
            <select
              value={outputDevice}
              onChange={(e) => chooseOutputDevice(e.target.value)}
              aria-label="устройство вывода звука"
              className="w-full appearance-none rounded-xl border border-border-subtle bg-white/[0.04] px-3 py-2.5 pr-9 text-sm text-text-primary outline-none transition-colors hover:border-border-visible focus:border-[var(--accent-primary)]"
            >
              <option value="">системное по умолчанию</option>
              {devices.map((device, index) => (
                <option key={`${device.name}-${index}`} value={device.name}>
                  {device.name}
                  {device.isDefault ? ' (по умолчанию)' : ''}
                </option>
              ))}
            </select>
            <Icon
              name="chevron-right"
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-text-tertiary"
            />
          </div>
          {devices.length === 0 && (
            <p className="mt-2 text-[11px] text-text-tertiary">
              список устройств недоступен, используется системное
            </p>
          )}
        </div>
      </div>

      <div className={`overflow-hidden rounded-2xl border border-border-subtle bg-bg-primary/40 ${section === 'playback' ? 'order-3' : 'hidden'}`}>
        <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06]">
            <Icon name="audio-lines" size={16} className="text-text-secondary" />
          </div>
          <div>
            <p className="text-sm text-text-primary">воспроизведение</p>
            <p className="mt-0.5 text-xs text-text-tertiary">
              звуковые функции, которые появятся позже
            </p>
          </div>
        </div>

        <div className="divide-y divide-border-subtle">
          <RoadmapRow
            icon="volume-2"
            title="нормализация громкости"
            description="автоматическое выравнивание уровня громкости для всех треков"
          />
          <RoadmapRow
            icon="audio-lines"
            title="бесшовное воспроизведение"
            description="плавный переход между треками без пауз и задержек"
          />
          <RoadmapRow
            icon="repeat"
            title="кроссфейд"
            description="плавное затухание в конце трека и нарастание в начале следующего"
          />
        </div>
      </div>

      <div className={`overflow-hidden rounded-2xl border border-border-subtle bg-bg-primary/40 ${section === 'playback' ? 'order-2' : 'hidden'}`}>
        <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06]">
            <Icon name="sparkles" size={16} className="text-text-secondary" />
          </div>
          <div>
            <p className="text-sm text-text-primary">качество</p>
            <p className="mt-0.5 text-xs text-text-tertiary">
              применяется и к потоку, и к загрузке в кэш
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
          {QUALITY_OPTIONS.map((option) => {
            const active = offline.quality === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setAudioQuality(option.id)}
                className={`group relative flex min-h-[64px] items-start justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${
                  active
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-muted)]'
                    : 'border-border-subtle bg-white/[0.02] hover:border-border-visible hover:bg-white/[0.04]'
                }`}
              >
                <span>
                  <span
                    className={`block text-sm ${active ? 'text-[var(--accent-primary)]' : 'text-text-primary'}`}
                  >
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-text-tertiary">
                    {option.hint}
                  </span>
                </span>
                <span
                  className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                    active
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-bg-primary'
                      : 'border-white/[0.18] text-transparent'
                  }`}
                >
                  <Icon name="check" size={10} />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`overflow-hidden rounded-2xl border border-border-subtle bg-bg-primary/40 ${section === 'cache' ? 'order-2' : 'hidden'}`}>
        <div className="flex items-center justify-between gap-4 border-b border-border-subtle px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06]">
              <Icon name="download-cloud" size={16} className="text-text-secondary" />
            </div>
            <div>
              <p className="text-sm text-text-primary">сохранять прослушанное</p>
              <p className="mt-0.5 text-xs text-text-tertiary">
                каждый запущенный трек остаётся в постоянном офлайн-кэше
              </p>
            </div>
          </div>
          <Toggle
            checked={offline.autoSave}
            onChange={setAutoSave}
            disabled={!enabled}
            label={offline.autoSave ? 'выключить автосохранение' : 'включить автосохранение'}
          />
        </div>

        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-sm text-text-primary">лимит кэша воспроизведения</p>
            <p className="mt-0.5 text-xs text-text-tertiary">
              старые временные файлы удаляются по LRU
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={limitDraft}
              disabled={!enabled}
              onChange={(e) => setLimitDraft(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={applyLimit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyLimit();
              }}
              className="w-20 rounded-lg border border-border-subtle bg-white/[0.06] px-2 py-1.5 text-right text-sm text-text-primary outline-none transition-colors focus:border-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="лимит кэша в мегабайтах"
            />
            <span className="text-xs text-text-tertiary">мб</span>
          </div>
        </div>
      </div>

      <div className={`overflow-hidden rounded-2xl border border-border-subtle bg-bg-primary/40 ${section === 'cache' ? 'order-3' : 'hidden'}`}>
        <div className="border-b border-border-subtle px-5 py-4">
          <p className="text-sm text-text-primary">хранилище</p>
          <p className="mt-0.5 text-xs text-text-tertiary">
            офлайн-файлы удаляются только вручную
          </p>
        </div>

        <div className="grid grid-cols-2 divide-x divide-border-subtle border-b border-border-subtle">
          <div className="p-4 text-center">
            <p className="text-lg font-bold tabular-nums text-text-primary">
              {formatSize(offline.sizes.temp)}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-text-tertiary">
              временный кэш
            </p>
            <p className="mt-0.5 text-[10px] text-text-tertiary">{tempCount} треков</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-lg font-bold tabular-nums text-text-primary">
              {formatSize(offline.sizes.offline)}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-text-tertiary">
              офлайн
            </p>
            <p className="mt-0.5 text-[10px] text-text-tertiary">{offlineCount} треков</p>
          </div>
        </div>

        <div className="divide-y divide-border-subtle">
          <button
            type="button"
            onClick={() => setClearScope('temp')}
            className="group flex w-full items-center justify-between px-5 py-3.5 transition-colors hover:bg-white/[0.03]"
          >
            <span className="flex items-center gap-3 text-sm text-text-primary">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-text-tertiary group-hover:text-text-primary">
                <Icon name="database" size={14} />
              </span>
              очистить временный кэш
            </span>
            <Icon
              name="trash-2"
              size={15}
              className="text-text-tertiary group-hover:text-text-primary"
            />
          </button>

          <button
            type="button"
            onClick={() => setClearScope('offline')}
            className="group flex w-full items-center justify-between px-5 py-3.5 transition-colors hover:bg-red-500/[0.04]"
          >
            <span className="flex items-center gap-3 text-sm text-text-primary">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-text-tertiary group-hover:text-red-400">
                <Icon name="download-cloud" size={14} />
              </span>
              очистить офлайн
            </span>
            <Icon
              name="trash-2"
              size={15}
              className="text-text-tertiary group-hover:text-red-400"
            />
          </button>

          <button
            type="button"
            onClick={() => setClearScope('all')}
            className="group flex w-full items-center justify-between px-5 py-3.5 transition-colors hover:bg-red-500/[0.04]"
          >
            <span className="flex items-center gap-3 text-sm text-text-primary">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
                <Icon name="trash-2" size={14} />
              </span>
              очистить весь кэш
            </span>
            <Icon
              name="trash-2"
              size={15}
              className="text-text-tertiary group-hover:text-red-400"
            />
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={clearScope !== null}
        title="очистка кэша"
        message={
          clearScope === 'offline'
            ? 'удалить все сохраненные офлайн-треки?'
            : clearScope === 'temp'
              ? 'удалить временный кэш воспроизведения?'
              : 'удалить весь кэш, включая офлайн-треки?'
        }
        confirmText="удалить"
        onConfirm={confirmClear}
        onCancel={() => setClearScope(null)}
      />
    </div>
  );
}
