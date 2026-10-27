import { useEffect, useState } from 'react';
import { Icon } from '@components/ui/Icon';
import { ConfirmModal } from '@components/ui/ConfirmModal';
import { PrecisionSlider } from '@components/ui/PrecisionSlider';
import { useStore } from '@store/store';
import { api } from '@lib/api';
import type { AudioQuality } from '@store/types';
import type { AudioSection } from './SettingsSidebar';
import { EqSpectrumSection } from '@components/settings/EqSpectrumSection';
import { EQ_PRESETS } from '@lib/eqPresets';

const QUALITY_OPTIONS: { id: AudioQuality; label: string; hint: string }[] = [
  { id: 'best', label: 'максимальное', hint: 'самый высокий доступный битрейт' },
  { id: 'high', label: 'высокое', hint: 'цель 160 kbps' },
  { id: 'medium', label: 'среднее', hint: 'цель 128 kbps' },
  { id: 'low', label: 'низкое', hint: 'прогрессивный поток или самый низкий' },
];

const TRANSITION_OPTIONS = [
  { id: 'off' as const, label: 'выкл' },
  { id: 'gapless' as const, label: 'бесшовно' },
  { id: 'crossfade' as const, label: 'кроссфейд' },
];

const EQ_KIND_OPTIONS = [
  { id: 'peaking' as const, label: 'пиковый' },
  { id: 'lowShelf' as const, label: 'низкая полка' },
  { id: 'highShelf' as const, label: 'высокая полка' },
  { id: 'lowPass' as const, label: 'низкие частоты' },
  { id: 'highPass' as const, label: 'высокие частоты' },
  { id: 'notch' as const, label: 'вырез' },
  { id: 'bandPass' as const, label: 'полосовой' },
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

function DeviceGrid({
  devices,
  value,
  onChange,
}: {
  devices: { id: string; name: string; detail: string; isDefault: boolean }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const options = [
    {
      id: '',
      label: 'По умолчанию',
      subtitle: 'Системное устройство',
      icon: 'volume-2',
    },
    ...devices.map((device) => ({
      id: device.id,
      label: device.name,
      subtitle: device.detail || 'Устройство вывода',
      icon: device.isDefault ? 'volume-2' : 'audio-lines',
    })),
  ];

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {options.map((device, index) => {
        const active = device.id === value;
        return (
          <button
            key={`${device.id}-${index}`}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(device.id)}
            className={`group relative flex min-h-[88px] flex-col justify-between rounded-xl border p-3 text-left transition-all duration-200 active:scale-[0.98] ${
              active
                ? 'border-[var(--accent-primary)] bg-bg-primary/90 backdrop-blur-xl'
                : 'border-border-subtle bg-bg-primary/90 backdrop-blur-xl hover:border-border-visible hover:bg-white/[0.05]'
            }`}
          >
            <span className="flex w-full items-start justify-between">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  active
                    ? 'bg-[var(--accent-primary)] text-bg-primary'
                    : 'bg-white/[0.05] text-text-tertiary group-hover:text-text-secondary'
                }`}
              >
                <Icon name={device.icon} size={15} className={active ? 'text-bg-primary' : ''} />
              </span>
              {active && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent-primary)] text-bg-primary">
                  <Icon name="check" size={10} className="text-bg-primary" />
                </span>
              )}
            </span>
            <span className="mt-2 min-w-0">
              <span className="block break-words text-xs font-medium leading-snug text-text-primary">
                {device.label}
              </span>
              <span className="mt-1 block text-[10px] text-text-tertiary">
                {device.subtitle}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function EqNumberField({
  value,
  min,
  max,
  suffix,
  ariaLabel,
  onCommit,
}: {
  value: number;
  min: number;
  max: number;
  suffix: string;
  ariaLabel: string;
  onCommit: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(value));
  }, [focused, value]);

  const commit = (raw: string) => {
    const parsed = Number(raw.replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      setText(String(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, parsed));
    onCommit(clamped);
    setText(String(clamped));
  };

  return (
    <label className="relative">
      <input
        type="text"
        inputMode="decimal"
        value={text}
        aria-label={ariaLabel}
        onFocus={() => setFocused(true)}
        onChange={(event) => {
          const raw = event.target.value;
          setText(raw);
          const parsed = Number(raw.replace(',', '.'));
          if (raw.trim() !== '' && Number.isFinite(parsed)) {
            onCommit(Math.max(min, Math.min(max, parsed)));
          }
        }}
        onBlur={() => {
          setFocused(false);
          commit(text);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            setText(String(value));
            event.currentTarget.blur();
          }
        }}
        className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-1.5 py-1 text-right text-[10px] tabular-nums text-text-secondary outline-none focus:border-[var(--accent-primary)]"
      />
      <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-text-tertiary">
        {suffix}
      </span>
    </label>
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
  const normalization = useStore((s) => s.audio.normalization);
  const setNormalization = useStore((s) => s.setNormalization);
  const eqEnabled = useStore((s) => s.audio.eqEnabled);
  const setEqEnabled = useStore((s) => s.setEqEnabled);
  const eqPreampDb = useStore((s) => s.audio.eqPreampDb);
  const setEqPreamp = useStore((s) => s.setEqPreamp);
  const eqBands = useStore((s) => s.audio.eqBands);
  const eqPreset = useStore((s) => s.audio.eqPreset);
  const setEqPreset = useStore((s) => s.setEqPreset);
  const setEqBand = useStore((s) => s.setEqBand);
  const addEqBand = useStore((s) => s.addEqBand);
  const removeEqBand = useStore((s) => s.removeEqBand);
  const resetEq = useStore((s) => s.resetEq);
  const transition = useStore((s) => s.audio.transition);
  const setTransition = useStore((s) => s.setTransition);
  const crossfadeSecs = useStore((s) => s.audio.crossfadeSecs);
  const setCrossfadeSecs = useStore((s) => s.setCrossfadeSecs);
  const [devices, setDevices] = useState<
    { id: string; name: string; detail: string; isDefault: boolean }[]
  >([]);
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

  const chooseOutputDevice = async (id: string) => {
    if (id === outputDevice) return;
    setOutputDevice(id);
    try {
      await api.setOutputDevice(id || null);
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
            ? { borderColor: 'color-mix(in srgb, var(--accent-primary) 28%, transparent)' }
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
                  ? 'border-[var(--accent-primary)] bg-white/[0.02]'
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
                <Icon name="play" size={14} filled className={!enabled ? 'text-bg-primary' : ''} />
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
                  ? 'border-[var(--accent-primary)] bg-white/[0.02]'
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
                <Icon name="database" size={14} className={enabled ? 'text-bg-primary' : ''} />
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

      <div className={`overflow-visible rounded-2xl border border-border-subtle bg-bg-primary/40 ${section === 'playback' ? 'order-1' : 'hidden'}`}>
        <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06]">
            <Icon name="volume-2" size={16}  />
          </div>
          <div>
            <p className="text-sm text-text-primary">устройство вывода</p>
            <p className="mt-0.5 text-xs text-text-tertiary">
              куда отправлять звук, смена останавливает текущий трек
            </p>
          </div>
        </div>

        <div className="px-5 py-4">
          <DeviceGrid
            devices={devices}
            value={outputDevice}
            onChange={chooseOutputDevice}
          />
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
            <Icon name="audio-lines" size={16}  />
          </div>
          <div>
            <p className="text-sm text-text-primary">воспроизведение</p>
            <p className="mt-0.5 text-xs text-text-tertiary">
              звуковые функции, которые появятся позже
            </p>
          </div>
        </div>

        <div className="divide-y divide-border-subtle">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-text-tertiary">
                <Icon name="volume-2" size={14} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm text-text-primary">нормализация громкости</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-text-tertiary">
                  выравнивает средний уровень треков и не дает уйти в клиппинг
                </span>
              </span>
            </div>
            <Toggle
              checked={normalization}
              onChange={setNormalization}
              label={normalization ? 'выключить нормализацию' : 'включить нормализацию'}
            />
          </div>

          <div className="px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-text-tertiary">
                <Icon name="repeat" size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-text-primary">переход между треками | бета</p>
                <p className="mt-0.5 text-[11px] text-text-tertiary">
                  бесшовно без паузы, кроссфейд с наложением
                </p>
              </div>
            </div>

            <div className="relative mt-3 grid grid-cols-3 rounded-xl border border-border-subtle bg-white/[0.02] p-1">
              <span
                className="pointer-events-none absolute bottom-1 left-1 top-1 w-[calc((100%-0.5rem)/3)] rounded-lg border border-[var(--accent-primary)] bg-[var(--accent-muted)] transition-transform duration-300 ease-out"
                style={{
                  transform: `translateX(${Math.max(
                    0,
                    TRANSITION_OPTIONS.findIndex((option) => option.id === transition)
                  ) * 100}%)`,
                }}
              />
              {TRANSITION_OPTIONS.map((option) => {
                const active = transition === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setTransition(option.id)}
                    className={`relative z-10 rounded-lg px-2 py-2 text-xs transition-colors duration-200 ${
                      active
                        ? 'text-[var(--accent-primary)]'
                        : 'text-text-tertiary hover:text-text-secondary'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div
              className={`grid transition-all duration-300 ease-out ${
                transition === 'crossfade'
                  ? 'mt-3 grid-rows-[1fr] opacity-100'
                  : 'mt-0 grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="rounded-xl border border-border-subtle bg-white/[0.02] px-3 py-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span>длина кроссфейда</span>
                    <span className="tabular-nums text-text-secondary">
                      {crossfadeSecs.toFixed(1)} с
                    </span>
                  </div>
                  <div className="mt-1">
                    <PrecisionSlider
                      value={crossfadeSecs}
                      min={1}
                      max={12}
                      step={0.5}
                      ariaLabel="длина кроссфейда"
                      onChange={setCrossfadeSecs}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div
        className={`overflow-hidden rounded-2xl border bg-bg-primary/40 transition-colors duration-300 ${
          section === 'eq' ? 'order-1' : 'hidden'
        } ${eqEnabled ? 'border-[var(--accent-primary)]' : 'border-border-subtle'}`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border-subtle px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-300 ${
                eqEnabled
                  ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                  : 'bg-white/[0.06] text-text-secondary'
              }`}
            >
              <Icon name="audio-lines" size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-text-primary">эквалайзер</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] transition-colors ${
                    eqEnabled
                      ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                      : 'bg-white/[0.06] text-text-tertiary'
                  }`}
                >
                  {eqEnabled ? 'включен' : 'выключен'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-text-tertiary">
                спектр трека и 10 полос
              </p>
            </div>
          </div>
          <Toggle
            checked={eqEnabled}
            onChange={setEqEnabled}
            label={eqEnabled ? 'выключить эквалайзер' : 'включить эквалайзер'}
          />
        </div>

        <div
          className={`grid transition-all duration-300 ease-out ${
            eqEnabled ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-4 pb-4 pt-3">
              <div className="flex flex-wrap items-center gap-1 pb-2">
                {[{ id: 'custom', label: 'своя' }, ...EQ_PRESETS].map((preset) => {
                  const active = eqPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setEqPreset(preset.id)}
                      className={`rounded-lg border px-2 py-1 text-[10px] transition-all duration-150 active:scale-95 ${
                        active
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                          : 'border-border-subtle bg-white/[0.02] text-text-tertiary hover:border-border-visible hover:text-text-secondary'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              <EqSpectrumSection
                bands={eqBands}
                preampDb={eqPreampDb}
                onBandChange={(id, gainDb, freq) => setEqBand(id, { gainDb, freq })}
              />

              <div className="mt-2 flex items-center gap-3 px-1">
            <span className="w-14 flex-shrink-0 text-[10px] text-text-tertiary">усиление</span>
            <PrecisionSlider
              value={eqPreampDb}
              min={-12}
              max={6}
              step={0.5}
              ariaLabel="общий уровень эквалайзера"
              onChange={setEqPreamp}
            />
            <span className="w-12 flex-shrink-0 text-right text-[10px] tabular-nums text-text-secondary">
              {eqPreampDb > 0 ? '+' : ''}
              {eqPreampDb.toFixed(1)} дБ
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3 px-1">
            <p>
            </p>
            <button
              type="button"
              disabled={!eqEnabled}
              onClick={resetEq}
              className="rounded-lg border border-border-subtle px-2.5 py-1.5 text-[10px] text-text-tertiary transition-colors hover:border-border-visible hover:text-text-secondary disabled:cursor-not-allowed disabled:opacity-40"
            >
              сбросить
            </button>
          </div>

          <div className="mt-4 border-t border-border-subtle pt-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] text-text-primary">фильтры</p>
              <button
                type="button"
                disabled={eqBands.length >= 24}
                onClick={addEqBand}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle px-2 py-1 text-[10px] text-text-tertiary transition-colors hover:border-border-visible hover:text-text-secondary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icon name="plus" size={11} />
                добавить фильтр
              </button>
            </div>

            <div className="mt-2 space-y-1">
              {[...eqBands]
                .sort((a, b) => a.freq - b.freq || a.id - b.id)
                .map((band) => (
                <div
                  key={band.id}
                  className={`grid grid-cols-[auto_minmax(0,1fr)_64px_54px_54px_20px] items-center gap-1.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-white/[0.03] ${
                    band.enabled ? '' : 'opacity-45'
                  }`}
                >
                  <button
                    type="button"
                    role="switch"
                    aria-checked={band.enabled}
                    aria-label={band.enabled ? 'выключить фильтр' : 'включить фильтр'}
                    onClick={() => setEqBand(band.id, { enabled: !band.enabled })}
                    className={`relative h-4 w-7 flex-shrink-0 rounded-full transition-colors ${
                      band.enabled ? 'bg-[var(--accent-primary)]' : 'bg-white/[0.14]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${
                        band.enabled ? 'left-3.5' : 'left-0.5'
                      }`}
                    />
                  </button>

                  <select
                    value={band.kind}
                    onChange={(e) =>
                      setEqBand(band.id, {
                        kind: e.target.value as (typeof EQ_KIND_OPTIONS)[number]['id'],
                      })
                    }
                    aria-label="тип фильтра"
                    className="min-w-0 rounded-lg border border-border-subtle bg-white/[0.03] px-2 py-1 text-[10px] text-text-secondary outline-none focus:border-[var(--accent-primary)]"
                  >
                    {EQ_KIND_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <EqNumberField
                    value={band.freq}
                    min={20}
                    max={20000}
                    suffix="гц"
                    ariaLabel="частота фильтра"
                    onCommit={(freq) => setEqBand(band.id, { freq })}
                  />

                  <EqNumberField
                    value={band.gainDb}
                    min={-18}
                    max={18}
                    suffix="дб"
                    ariaLabel="усиление фильтра"
                    onCommit={(gainDb) => setEqBand(band.id, { gainDb })}
                  />

                  <EqNumberField
                    value={band.q}
                    min={0.1}
                    max={10}
                    suffix="q"
                    ariaLabel="добротность фильтра"
                    onCommit={(q) => setEqBand(band.id, { q })}
                  />

                  <button
                    type="button"
                    onClick={() => removeEqBand(band.id)}
                    aria-label="удалить фильтр"
                    className="flex h-5 w-5 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-white/[0.06] hover:text-text-secondary"
                  >
                    <Icon name="x" size={11} />
                  </button>
                </div>
              ))}
            </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      <div className={`overflow-hidden rounded-2xl border border-border-subtle bg-bg-primary/40 ${section === 'playback' ? 'order-2' : 'hidden'}`}>
        <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06]">
            <Icon name="sparkles" size={16} />
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
                    ? 'border-[var(--accent-primary)] bg-white/[0.02]'
                    : 'border-border-subtle bg-white/[0.02] hover:border-border-visible hover:bg-white/[0.04]'
                }`}
              >
                <span>
                  <span className="block text-sm text-text-primary">{option.label}</span>
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
                  <Icon name="check" size={10} className={active ? 'text-bg-primary' : 'text-transparent'} />
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
              <Icon name="download-cloud" size={16} />
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
              className=" group-hover:text-text-primary"
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
              className=" group-hover:text-red-400"
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
              className=" group-hover:text-red-400"
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
