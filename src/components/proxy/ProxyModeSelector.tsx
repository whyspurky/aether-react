import { Icon } from '@components/ui/Icon';
import type { ProxyMode } from '@store/types';

interface ModeOption {
  id: ProxyMode;
  title: string;
  desc: string;
  icon: string;
  disabled?: boolean;
}

const MODES: ModeOption[] = [
  { id: 'off', title: 'выключен', desc: 'не оборачивать запросы в прокси | рекомендуется использовать с VPN', icon: 'x-circle' },
  { id: 'builtin', title: 'встроенный', desc: 'оборачивать запросы серверный прокси | в разработке', icon: 'shield', disabled: true },
  { id: 'custom', title: 'личный', desc: 'оборачивать запросы в прокси', icon: 'settings' },
  { id: 'zapret', title: 'запрет', desc: 'обход блокировок через zapret', icon: 'globe' },
];

interface Props {
  mode: ProxyMode;
  zapretRunning: boolean;
  onChange: (mode: ProxyMode) => void;
}

export function ProxyModeSelector({ mode, zapretRunning, onChange }: Props) {
  return (
    <div className="space-y-2">
      {MODES.map((m) => {
        const active = mode === m.id;
        const isDisabled = m.disabled;
        return (
          <button
            key={m.id}
            disabled={isDisabled}
            onClick={() => !isDisabled && onChange(m.id)}
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
                {m.id === 'zapret' && zapretRunning && (
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
  );
}