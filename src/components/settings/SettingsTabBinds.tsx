import { useEffect, useState } from 'react';
import { Icon } from '@components/ui/Icon';
import { useStore } from '@store/store';
import type { GlobalBindAction } from '@store/slices/globalBinds';

const GLOBAL_ACTIONS: GlobalBindAction[] = ['playpause', 'next', 'prev', 'volumeUp', 'volumeDown'];

const ACTION_META: Record<GlobalBindAction, { label: string; desc: string; icon: string }> = {
  playpause: {
    label: 'плей / пауза',
    desc: 'запускает и останавливает воспроизведение',
    icon: 'play',
  },
  next: {
    label: 'следующий трек',
    desc: 'переключает на следующий в очереди',
    icon: 'skip-forward',
  },
  prev: {
    label: 'предыдущий трек',
    desc: 'возвращает к началу или прошлому треку',
    icon: 'skip-back',
  },
  volumeUp: {
    label: 'громкость +',
    desc: 'увеличивает громкость на 5%',
    icon: 'volume-3',
  },
  volumeDown: {
    label: 'громкость −',
    desc: 'уменьшает громкость на 5%',
    icon: 'volume-off',
  },
};

const MODIFIER_CODES = new Set([
  'ControlLeft', 'ControlRight',
  'ShiftLeft', 'ShiftRight',
  'AltLeft', 'AltRight',
  'MetaLeft', 'MetaRight',
]);

function formatBind(bind: string): string {
  if (!bind) return '—';
  return bind
    .replace(/Key([A-Z])/, '$1')
    .replace(/Digit(\d)/, '$1')
    .replace('Arrow', '')
    .replace('Media', '')
    .replace('+', ' + ');
}

function codeToDisplay(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num' + code.slice(6);
  if (code.startsWith('Arrow')) return code.slice(5);
  if (code.startsWith('Media')) return code.slice(5);
  return code;
}

const KEY_CAPTURE_TIMEOUT_MS = 3000;

export function SettingsTabBinds() {
  const globalBindsEnabled = useStore((s) => s.globalBindsEnabled);
  const globalBinds = useStore((s) => s.globalBinds);
  const setGlobalBindsEnabled = useStore((s) => s.setGlobalBindsEnabled);
  const setGlobalBind = useStore((s) => s.setGlobalBind);
  const resetGlobalBinds = useStore((s) => s.resetGlobalBinds);

  const hideWarning = useStore((s) => s.hideBindsWarning);
  const setHideWarning = useStore((s) => s.setHideBindsWarning);

  const [capturing, setCapturing] = useState<GlobalBindAction | null>(null);
  const [capturedKeys, setCapturedKeys] = useState<string[]>([]);
  const [warningDismissed, setWarningDismissed] = useState(false);

  // таймаут захвата
  useEffect(() => {
    if (!capturing) return;
    const timer = setTimeout(() => {
      setCapturing(null);
    }, KEY_CAPTURE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [capturing]);

  // запись комбинации
  useEffect(() => {
    if (!capturing) {
      setCapturedKeys([]);
      return;
    }

    const pressedMods = new Set<string>();

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.code === 'Escape') {
        setCapturing(null);
        return;
      }

      if (MODIFIER_CODES.has(e.code)) {
        pressedMods.add(e.code);
        setCapturedKeys(Array.from(pressedMods));
        return;
      }

      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');
      parts.push(e.code);

      setGlobalBind(capturing, parts.join('+'));
      setCapturing(null);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (MODIFIER_CODES.has(e.code)) {
        pressedMods.delete(e.code);
        setCapturedKeys(Array.from(pressedMods));
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
  }, [capturing, setGlobalBind]);

  const activeCount = GLOBAL_ACTIONS.filter((a) => globalBinds[a]).length;

  return (
    <div className="space-y-4">
      {/* предупреждение */}
      {!hideWarning && !warningDismissed && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] animate-content-fade-in">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
          <div className="p-4 flex gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Icon name="alert-circle" size={18} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary mb-1">важно знать</p>
              <ul className="text-xs text-text-tertiary space-y-1 leading-relaxed">
                <li>• избегай простых комбинаций — они часто заняты другими приложениями</li>
                <li>• системные горячие клавиши (например <span className="font-mono text-text-secondary">Alt+Tab</span>) не работают</li>
                <li>• если бинд уже занят — приложение не сможет его перехватить</li>
              </ul>
              <label className="flex items-center gap-2 mt-3 cursor-pointer group">
                <span
                  className={`relative w-4 h-4 rounded border transition-all flex items-center justify-center ${
                    hideWarning
                      ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                      : 'border-border-visible group-hover:border-[var(--accent-primary)]'
                  }`}
                >
                  {hideWarning && (
                    <Icon name="check" size={10} className="text-bg-primary" />
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={hideWarning}
                  onChange={(e) => setHideWarning(e.target.checked)}
                  className="sr-only"
                />
                <span className="text-[11px] text-text-tertiary group-hover:text-text-secondary transition-colors">
                  больше не показывать
                </span>
              </label>
            </div>
            <button
              onClick={() => setWarningDismissed(true)}
              className="flex-shrink-0 p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-white/[0.06] transition-all"
              aria-label="скрыть"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        </div>
      )}

      {/* карточка биндов */}
      <div className="bg-bg-primary/40 rounded-2xl border border-border-subtle overflow-hidden">
        {/* заголовок */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
              <Icon name="command" size={16} className="text-text-secondary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-text-primary">глобальные бинды</p>
                {globalBindsEnabled && activeCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-[var(--accent-muted)] text-[var(--accent-primary)] tabular-nums">
                    {activeCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-text-tertiary">
                {globalBindsEnabled ? 'работают даже при свёрнутом окне' : 'выключены'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setGlobalBindsEnabled(!globalBindsEnabled)}
            className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
              globalBindsEnabled
                ? 'bg-[var(--accent-primary)] shadow-[0_0_20px_var(--accent-muted)]'
                : 'bg-white/[0.08]'
            }`}
            aria-label="переключить глобальные бинды"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-bg-primary shadow-md transition-all duration-300 ${
                globalBindsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* список */}
        {globalBindsEnabled && (
          <div className="divide-y divide-border-subtle animate-content-fade-in">
            {GLOBAL_ACTIONS.map((action, index) => {
              const meta = ACTION_META[action];
              const current = globalBinds[action];
              const isCapturing = capturing === action;

              const display = isCapturing
                ? capturedKeys.length > 0
                  ? capturedKeys.map(codeToDisplay).join(' + ') + ' + ...'
                  : 'нажмите...'
                : formatBind(current);

              return (
                <div
                  key={action}
                  className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                        current
                          ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                          : 'bg-white/[0.04] text-text-tertiary'
                      }`}
                    >
                      <Icon name={meta.icon} size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-primary truncate">{meta.label}</p>
                      <p className="text-[11px] text-text-tertiary truncate">{meta.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => {
                        if (isCapturing) {
                          setCapturing(null);
                        } else {
                          setCapturing(action);
                        }
                      }}
                      className={`relative px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 min-w-[80px] ${
                        isCapturing
                          ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                          : current
                            ? 'bg-white/[0.04] text-text-secondary hover:bg-white/[0.08] hover:text-text-primary'
                            : 'bg-white/[0.02] text-text-tertiary hover:bg-white/[0.06] hover:text-text-secondary'
                      }`}
                      style={
                        isCapturing
                          ? { boxShadow: 'inset 0 0 0 1px var(--accent-primary)' }
                          : undefined
                      }
                    >
                      <span className={isCapturing ? 'animate-pulse' : ''}>{display}</span>
                      {isCapturing && (
                        <span
                          className="absolute inset-0 rounded-lg animate-ping pointer-events-none"
                          style={{ boxShadow: '0 0 0 2px var(--accent-primary)' }}
                        />
                      )}
                    </button>

                    {current && !isCapturing && (
                      <button
                        onClick={() => setGlobalBind(action, '')}
                        className="p-1.5 rounded-md text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 animate-menu-enter"
                        aria-label="очистить"
                      >
                        <Icon name="x" size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* footer */}
        {globalBindsEnabled && (
          <div className="border-t border-border-subtle px-5 py-3 flex items-center justify-between">
            <p className="text-[11px] text-text-tertiary">
              нажми на поле чтобы записать новую комбинацию
            </p>
            {activeCount > 0 && (
              <button
                onClick={resetGlobalBinds}
                className="text-xs text-text-tertiary hover:text-red-400 transition-colors duration-200"
              >
                очистить все
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}