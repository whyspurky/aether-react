import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '@components/ui/Icon';
import { useStore } from '@store/store';
import {
  DATA_KEYS,
  MOTION_KEYS,
  PAINT_KEYS,
  PERSIST_SECS_OPTIONS,
  PERF_PRESETS,
  POSITION_TICK_OPTIONS,
  type CoverQuality,
  type PerfFlags,
  type PerfPresetId,
} from '@store/slices/ui';

const BOOL_KEYS = (Object.keys(PERF_PRESETS.all.values) as (keyof PerfFlags)[]).filter(
  (key) => typeof PERF_PRESETS.all.values[key] === 'boolean'
);

function Switch({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-all duration-300 ${
        on
          ? 'bg-[var(--accent-primary)] shadow-[0_0_20px_var(--accent-muted)]'
          : 'bg-white/[0.08]'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-bg-primary shadow-md transition-all duration-300 ${
          on ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border-subtle bg-white/[0.03] p-0.5">
      {options.map((option) => (
        <button
          key={String(option.value)}
          onClick={() => onChange(option.value)}
          aria-pressed={option.value === value}
          className={`rounded-lg px-2.5 py-1 text-[11px] transition-all duration-200 ${
            option.value === value
              ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Row({
  title,
  hint,
  dimmed,
  children,
}: {
  title: string;
  hint: string;
  dimmed?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 px-5 py-3 ${dimmed ? 'opacity-45' : ''}`}>
      <div className="min-w-0">
        <p className="text-sm text-text-secondary">{title}</p>
        <p className="mt-0.5 text-xs text-text-tertiary">{hint}</p>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function GroupCard({
  icon,
  title,
  hint,
  master,
  children,
}: {
  icon: string;
  title: string;
  hint: string;
  master?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-bg-primary/40 rounded-2xl border border-border-subtle overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06]">
            <Icon name={icon} size={16} />
          </div>
          <div>
            <p className="text-sm text-text-primary">{title}</p>
            <p className="text-xs text-text-tertiary">{hint}</p>
          </div>
        </div>
        {master}
      </div>
      <div className="divide-y divide-border-subtle border-t border-border-subtle">{children}</div>
    </div>
  );
}

function useFps() {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let last = performance.now();

    const loop = (now: number) => {
      frames += 1;
      const delta = now - last;
      if (delta >= 500) {
        setFps(Math.round((frames * 1000) / delta));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return fps;
}

export function SettingsTabPerformance() {
  const perf = useStore((s) => s.perf);
  const transition = useStore((s) => s.audio.transition);
  const setPerfFlag = useStore((s) => s.setPerfFlag);
  const setPerfGroup = useStore((s) => s.setPerfGroup);
  const applyPerfPreset = useStore((s) => s.applyPerfPreset);
  const fps = useFps();

  const activePreset =
    (Object.keys(PERF_PRESETS) as PerfPresetId[]).find((id) =>
      (Object.keys(PERF_PRESETS[id].values) as (keyof PerfFlags)[]).every(
        (key) => perf[key] === PERF_PRESETS[id].values[key]
      )
    ) ?? null;

  const enabledCount = BOOL_KEYS.filter((key) => perf[key]).length;
  const transitionOff = transition === 'off';

  const groupState = (keys: (keyof PerfFlags)[]) => {
    const on = keys.filter((key) => perf[key]).length;
    return { all: on === keys.length, on };
  };

  const renderMaster = (keys: (keyof PerfFlags)[]) => (
    <Switch on={groupState(keys).all} label="переключить группу" onToggle={() => setPerfGroup(keys, !groupState(keys).all)} />
  );

  const paint = groupState(PAINT_KEYS);

  return (
    <div className="space-y-4">
      <div className="bg-bg-primary/40 rounded-2xl border border-border-subtle overflow-hidden">
        <div className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06]">
              <Icon name="gauge" size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-text-primary">производительность</p>
              <p className="truncate text-xs text-text-tertiary">
                {activePreset
                  ? PERF_PRESETS[activePreset].hint
                  : `свои настройки, включено ${enabledCount} из ${BOOL_KEYS.length}`}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {(Object.keys(PERF_PRESETS) as PerfPresetId[]).map((id) => {
              const active = activePreset === id;
              return (
                <button
                  key={id}
                  onClick={() => applyPerfPreset(id)}
                  aria-pressed={active}
                  className={`rounded-xl border px-3 py-2 text-xs transition-all duration-200 active:scale-[0.98] ${
                    active
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                      : 'border-border-subtle bg-white/[0.02] text-text-tertiary hover:border-border-visible hover:text-text-secondary'
                  }`}
                >
                  {PERF_PRESETS[id].label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <GroupCard
        icon="sparkles"
        title="движение"
        hint={`анимации и переходы, ${MOTION_KEYS.length} пунктов`}
        master={renderMaster(MOTION_KEYS)}
      >
        <Row title="переходы" hint="ховеры, смена цветов, нажатия кнопок">
          <Switch
            on={perf.motionTransitions}
            label="переключить переходы"
            onToggle={() => setPerfFlag('motionTransitions', !perf.motionTransitions)}
          />
        </Row>
        <Row title="появление экранов" hint="страницы, меню, модалки, вход плеер-бара">
          <Switch
            on={perf.motionPages}
            label="переключить появление экранов"
            onToggle={() => setPerfFlag('motionPages', !perf.motionPages)}
          />
        </Row>
        <Row title="пульсации" hint="мигающие индикаторы и полоски эквалайзера">
          <Switch
            on={perf.motionPulse}
            label="переключить пульсации"
            onToggle={() => setPerfFlag('motionPulse', !perf.motionPulse)}
          />
        </Row>
        <Row title="морф артиста" hint="плавный переход аватара между вкладками">
          <Switch
            on={perf.motionMorph}
            label="переключить морф артиста"
            onToggle={() => setPerfFlag('motionMorph', !perf.motionMorph)}
          />
        </Row>
        <Row title="бегущая строка" hint="прокрутка длинных названий в плеере">
          <Switch
            on={perf.marquee}
            label="переключить бегущую строку"
            onToggle={() => setPerfFlag('marquee', !perf.marquee)}
          />
        </Row>
      </GroupCard>

      <GroupCard
        icon="palette"
        title="отрисовка"
        hint={paint.all ? 'все слои и размытия включены' : 'часть слоёв отключена'}
        master={renderMaster(PAINT_KEYS)}
      >
        <Row title="размытие панелей" hint="плеер-бар, тайтлбар, сайдбар, меню и модалки">
          <Switch
            on={perf.panelsBlur}
            label="переключить размытие панелей"
            onToggle={() => setPerfFlag('panelsBlur', !perf.panelsBlur)}
          />
        </Row>
        <Row title="шум и зерно" hint="текстурный слой с наложением на gpu">
          <Switch
            on={perf.noise}
            label="переключить шум"
            onToggle={() => setPerfFlag('noise', !perf.noise)}
          />
        </Row>
        <Row title="тени и свечения" hint="крупные тени меню и подсветка под аватарами">
          <Switch
            on={perf.glow}
            label="переключить свечения"
            onToggle={() => setPerfFlag('glow', !perf.glow)}
          />
        </Row>
      </GroupCard>

      <GroupCard
        icon="download"
        title="данные"
        hint={`обложки ${perf.coverQuality.replace('t', '').replace('x500', ' px')}`}
        master={renderMaster(DATA_KEYS)}
      >
        <Row title="качество обложек" hint="влияет на память и трафик в списках">
          <Segmented<CoverQuality>
            value={perf.coverQuality}
            onChange={(value) => setPerfFlag('coverQuality', value)}
            options={[
              { value: 't500x500', label: '500' },
              { value: 't300x300', label: '300' },
              { value: 't200x200', label: '200' },
            ]}
          />
        </Row>
        <Row title="фоновая обложка" hint="картинка под всем окном и её размытие">
          <Switch
            on={perf.bgCover}
            label="переключить фоновую обложку"
            onToggle={() => setPerfFlag('bgCover', !perf.bgCover)}
          />
        </Row>
        <Row title="догрузка очереди" hint="похожие треки и популярное в фоне">
          <Switch
            on={perf.prefetchQueue}
            label="переключить догрузку очереди"
            onToggle={() => setPerfFlag('prefetchQueue', !perf.prefetchQueue)}
          />
        </Row>
        <Row
          title="подготовка следующего трека"
          hint={
            transitionOff
              ? 'включится вместе с gapless или crossfade'
              : 'держит следующий трек готовым заранее'
          }
          dimmed={transitionOff}
        >
          <Switch
            on={perf.nextTrackPrep}
            label="переключить подготовку следующего трека"
            onToggle={() => setPerfFlag('nextTrackPrep', !perf.nextTrackPrep)}
          />
        </Row>
      </GroupCard>

      <GroupCard icon="audio-lines" title="звук" hint="визуализация и частота прогресса">
        <Row title="спектр в эквалайзере" hint="живая кривая акустики, 25 обновлений в секунду">
          <Switch
            on={perf.spectrum}
            label="переключить спектр"
            onToggle={() => setPerfFlag('spectrum', !perf.spectrum)}
          />
        </Row>
        <Row title="частота прогресса" hint="как часто полоса обновляет позицию">
          <Segmented<number>
            value={perf.positionTickMs}
            onChange={(value) => setPerfFlag('positionTickMs', value)}
            options={POSITION_TICK_OPTIONS.map((ms) => ({ value: ms, label: `${ms} мс` }))}
          />
        </Row>
      </GroupCard>

      <GroupCard icon="database" title="хранение" hint="запись состояния на диск">
        <Row title="сохранение позиции" hint="реже писать файл во время воспроизведения">
          <Segmented<number>
            value={perf.persistSecs}
            onChange={(value) => setPerfFlag('persistSecs', value)}
            options={PERSIST_SECS_OPTIONS.map((sec) => ({ value: sec, label: `${sec} с` }))}
          />
        </Row>
      </GroupCard>

      <GroupCard icon="clock" title="диагностика" hint="проверка после переключения">
        <Row title="кадры в секунду" hint="мерится, пока открыта эта вкладка">
          <span className="rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-1 text-sm tabular-nums text-text-secondary">
            {fps}
          </span>
        </Row>
        <div className="px-5 py-3">
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-[var(--accent-primary)] transition-[width] duration-200"
              style={{ width: `${Math.min(100, (fps / 60) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-text-tertiary">
            при выключенных эффектах число держится у 60, сильнее всего просаживают размытие
            панелей и морф артиста
          </p>
        </div>
      </GroupCard>
    </div>
  );
}
