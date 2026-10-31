import { useEffect, useState } from 'react';
import { Icon } from '@components/ui/Icon';
import { useStore } from '@store/store';
import { api } from '@lib/api';

const INPUT_CLASS =
  'w-full pl-3 pr-9 py-2 bg-white/[0.04] border border-border-subtle rounded-lg outline-none focus:border-[var(--accent-primary)] focus:bg-white/[0.06] text-sm text-text-primary placeholder:text-text-tertiary';

// ключи звук облака это буквы и цифры, длина у живых 32, диапазон берем с запасом
const CLIENT_ID_PATTERN = /^[A-Za-z0-9]{16,64}$/;

export function SettingsTabAccount() {
  const storedClientId = useStore((s) => s.auth.clientId);
  const setAuthClientId = useStore((s) => s.setAuthClientId);

  const [draft, setDraft] = useState(storedClientId);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [checking, setChecking] = useState(false);

  const value = draft.trim();

  // стор гидрируется асинхронно, поэтому подтягиваем сохраненный ключ когда он появился
  useEffect(() => {
    setDraft(storedClientId);
  }, [storedClientId]);

  const handleCheck = async () => {
    setAccepted(false);
    setError(null);

    if (!value) {
      setAuthClientId('');
      setDraft('');
      return;
    }
    if (!CLIENT_ID_PATTERN.test(value)) {
      setError('неверный формат client id: нужны латиница и цифры, 16-64 символа');
      return;
    }

    setChecking(true);
    try {
      await api.authCheckClientId(value);
      // применяем сразу, не дожидаясь debounce из useAuthSync
      await api.authSetClientId(value);
      setAuthClientId(value);
      setDraft(value);
      setAccepted(true);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'не удалось проверить client id');
    } finally {
      setChecking(false);
    }
  };

  const handleReset = async () => {
    setDraft('');
    setError(null);
    setAccepted(false);
    setAuthClientId('');
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border-subtle bg-bg-primary/40 overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <p className="text-sm text-text-primary">client id</p>
          <p className="text-xs text-text-tertiary mt-0.5">
            свой ключ вместо встроенного, если soundcloud отозвал текущий
          </p>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                aria-label="client id"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setError(null);
                  setAccepted(false);
                }}
                placeholder="встроенный"
                spellCheck={false}
                autoComplete="off"
                className={INPUT_CLASS}
              />
              <span
                role="img"
                aria-label="ключ хранится локально и подставляется в запросы к api-v2"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary"
              >
                <Icon name="info" size={14} />
              </span>
            </div>

            <button
              type="button"
              onClick={handleReset}
              disabled={checking}
              aria-label="сбросить client id"
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-white/[0.06] transition-colors disabled:opacity-40"
            >
              <Icon name="x" size={14} />
            </button>

            <button
              type="button"
              onClick={handleCheck}
              disabled={checking}
              aria-label="проверить и сохранить client id"
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--accent-primary)] text-bg-primary hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              <Icon name="check" size={16} />
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30">
              <Icon name="alert-circle" size={14} className="text-red-400 shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {accepted && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <Icon name="check-circle" size={14} className="text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-400">client id принят</p>
            </div>
          )}

          {!error && !accepted && (
            <p className="text-xs text-text-tertiary leading-relaxed">
              ключ хранится локально и подставляется в запросы к api-v2. пустое поле значит встроенный
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
