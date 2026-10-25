import { useMemo, useState } from 'react';
import { Icon } from '@components/ui/Icon';
import { useStore } from '@store/store';
import { themes } from '@/theme/themes';
import { BLUR_AMOUNT_MAX, BLUR_OPACITY_MAX, PRESET_NAME_MAX } from '@store/slices/ui';

export function SettingsTabAppearance() {
  const themeId = useStore((s) => s.themeId);
  const setThemeId = useStore((s) => s.setThemeId);
  const blur = useStore((s) => s.blur);
  const setBlurEnabled = useStore((s) => s.setBlurEnabled);
  const setBlurAmount = useStore((s) => s.setBlurAmount);
  const setBlurOpacity = useStore((s) => s.setBlurOpacity);
  const customPresets = useStore((s) => s.customPresets);
  const saveCustomPreset = useStore((s) => s.saveCustomPreset);
  const applyCustomPreset = useStore((s) => s.applyCustomPreset);
  const deleteCustomPreset = useStore((s) => s.deleteCustomPreset);

  const [presetName, setPresetName] = useState('');
  const [showSave, setShowSave] = useState(false);

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    saveCustomPreset(presetName.trim());
    setPresetName('');
    setShowSave(false);
  };

  const themeList = useMemo(() => Object.values(themes), []);

  return (
    <div className="space-y-4">
      {/* тема */}
      <div className="bg-bg-primary/40 rounded-2xl border border-border-subtle overflow-hidden">
        <div className="px-5 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
              <Icon name="palette" size={16} />
            </div>
            <div>
              <p className="text-sm text-text-primary">тема</p>
              <p className="text-xs text-text-tertiary">палитра интерфейса</p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {themeList.map((t, index) => {
              const active = themeId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setThemeId(t.id)}
                  className="flex flex-col items-center gap-2 transition-all duration-200 group"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  {/* круг-превью */}
                  <div className="relative">
                    {/* accent glow при активной */}
                    <div
                      className={`absolute -inset-1.5 rounded-full transition-all duration-300 ${
                        active
                          ? 'bg-[var(--accent-primary)] opacity-30 blur-md scale-100'
                          : 'opacity-0 scale-90'
                      }`}
                    />
                    {/* круг с цветами */}
                    <div
                      className={`relative w-12 h-12 rounded-full overflow-hidden transition-all duration-200 ${
                        active
                          ? 'ring-2 ring-offset-2 ring-offset-bg-primary ring-[var(--accent-primary)] scale-105'
                          : 'ring-1 ring-white/[0.06] group-hover:ring-white/[0.12] group-hover:scale-105'
                      }`}
                      style={{ backgroundColor: t.colors.background.primary }}
                    >
                      {/* разделение на 3 части через conic-gradient */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `conic-gradient(
                            ${t.colors.background.secondary} 0deg 120deg,
                            ${t.colors.accent.primary} 120deg 240deg,
                            ${t.colors.background.primary} 240deg 360deg
                          )`,
                        }}
                      />
 
                    </div>
                  </div>

                  {/* имя темы */}
                  <span
                    className={`text-[10px] transition-colors duration-200 ${
                      active
                        ? 'text-[var(--accent-primary)] font-medium'
                        : 'text-text-tertiary group-hover:text-text-secondary'
                    }`}
                  >
                    {t.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* размытие обложки */}
      <div className="bg-bg-primary/40 rounded-2xl border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
                <Icon name="sparkles" size={16} />
              </div>
              <div>
                <p className="text-sm text-text-primary">размытие обложки</p>
                <p className="text-xs text-text-tertiary">фон поверх темы</p>
              </div>
            </div>
            <button
              onClick={() => setBlurEnabled(!blur.enabled)}
              className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
                blur.enabled
                  ? 'bg-[var(--accent-primary)] shadow-[0_0_20px_var(--accent-muted)]'
                  : 'bg-white/[0.08]'
              }`}
              aria-label="переключить размытие"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-bg-primary shadow-md transition-all duration-300 ${
                  blur.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {blur.enabled && (
            <div className="space-y-4 animate-content-fade-in">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-text-tertiary">сила размытия</p>
                  <span className="px-2 py-0.5 rounded-md text-[10px] tabular-nums bg-white/[0.04] text-text-secondary font-mono">
                    {blur.amount}px
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={BLUR_AMOUNT_MAX}
                  step={1}
                  value={blur.amount}
                  onChange={(e) => setBlurAmount(parseInt(e.target.value, 10))}
                  className="settings-slider"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-text-tertiary">яркость</p>
                  <span className="px-2 py-0.5 rounded-md text-[10px] tabular-nums bg-white/[0.04] text-text-secondary font-mono">
                    {Math.round(blur.opacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={BLUR_OPACITY_MAX}
                  step={0.001}
                  value={blur.opacity}
                  onChange={(e) => setBlurOpacity(parseFloat(e.target.value))}
                  className="settings-slider"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* свои пресеты */}
      <div className="bg-bg-primary/40 rounded-2xl border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
                <Icon name="bookmark" size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-text-primary">свои пресеты</p>
                  {customPresets.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-[var(--accent-muted)] text-[var(--accent-primary)] tabular-nums">
                      {customPresets.length}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-tertiary">текущая тема и настройки</p>
              </div>
            </div>
            <button
              onClick={() => setShowSave((v) => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all duration-200 ${
                showSave
                  ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]'
                  : 'bg-white/[0.08] text-text-primary hover:bg-white/[0.14]'
              }`}
            >
              {showSave ? 'отмена' : 'сохранить'}
            </button>
          </div>

          {showSave && (
            <div className="flex gap-2 animate-content-fade-in">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="название пресета"
                maxLength={PRESET_NAME_MAX}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                className="flex-1 px-3 py-2 bg-white/[0.04] border border-border-subtle rounded-lg outline-none focus:border-[var(--accent-primary)] focus:bg-white/[0.06] text-sm text-text-primary placeholder:text-text-tertiary transition-all"
              />
              <button
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                className="px-3 py-2 rounded-lg text-xs bg-white/[0.08] text-text-primary hover:bg-white/[0.14] transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ок
              </button>
            </div>
          )}

          {customPresets.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              {customPresets.map((p, index) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-2 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition group animate-content-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <button
                    onClick={() => applyCustomPreset(p.id)}
                    className="flex-1 text-left text-sm text-text-primary truncate hover:text-[var(--accent-primary)] transition-colors"
                  >
                    {p.name}
                  </button>
                  <button
                    onClick={() => deleteCustomPreset(p.id)}
                    className="p-1.5 rounded-md text-text-tertiary opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                    aria-label="удалить"
                  >
                    <Icon name="trash-2" size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-tertiary py-2">нет сохранённых пресетов</p>
          )}
        </div>
      </div>
    </div>
  );
}