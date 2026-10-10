import { useState } from 'react';
import { Icon } from '@components/ui/Icon';
import { useStore } from '@store/store';
import { themes } from '@/theme/themes';

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

  const themeList = Object.values(themes);

  return (
    <div className="space-y-4">
      {/* тема */}
      <div className="bg-bg-primary/40 rounded-2xl border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
              <Icon name="palette" size={16} className="text-text-secondary" />
            </div>
            <div>
              <p className="text-sm text-text-primary">тема</p>
              <p className="text-xs text-text-tertiary">палитра интерфейса</p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 mt-2">
            {themeList.map((t) => (
              <button
                key={t.id}
                onClick={() => setThemeId(t.id)}
                className={`flex flex-col items-center gap-2 p-2 rounded-xl transition-all ${
                  themeId === t.id
                    ? 'bg-white/[0.08] ring-1 ring-white/[0.15]'
                    : 'hover:bg-white/[0.05]'
                }`}
              >
                <div
                  className="w-full aspect-square rounded-lg border border-white/[0.08] overflow-hidden"
                  style={{ backgroundColor: t.colors.background.primary }}
                >
                  <div className="flex h-full">
                    <div
                      className="flex-1"
                      style={{ backgroundColor: t.colors.background.secondary }}
                    />
                    <div
                      className="flex-1"
                      style={{ backgroundColor: t.colors.accent.primary }}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-text-secondary">{t.name}</span>
              </button>
            ))}
          </div>

 
        </div>
      </div>

      {/* размытие обложки */}
      <div className="bg-bg-primary/40 rounded-2xl border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
                <Icon name="sparkles" size={16} className="text-text-secondary" />
              </div>
              <div>
                <p className="text-sm text-text-primary">размытие обложки</p>
                <p className="text-xs text-text-tertiary">фон поверх темы</p>
              </div>
            </div>
            <button
              onClick={() => setBlurEnabled(!blur.enabled)}
              className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${
                blur.enabled ? 'bg-text-secondary' : 'bg-white/[0.08]'
              }`}
              aria-label="переключить размытие"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-bg-primary transition-transform duration-200 ${
                  blur.enabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {blur.enabled && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-text-tertiary">сила размытия</p>
                  <p className="text-xs text-text-tertiary tabular-nums">{blur.amount}px</p>
                </div>
                <input
                  type="range"
                  min={0}
                  max={120}
                  step={2}
                  value={blur.amount}
                  onChange={(e) => setBlurAmount(parseInt(e.target.value))}
                  className="settings-slider"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-text-tertiary">яркость</p>
                  <p className="text-xs text-text-tertiary tabular-nums">
                    {Math.round(blur.opacity * 100)}%
                  </p>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  value={Math.round(blur.opacity * 100)}
                  onChange={(e) => setBlurOpacity(parseInt(e.target.value) / 100)}
                  className="settings-slider"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* свои пресеты */}
      <div className="bg-bg-primary/40 rounded-2xl border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
                <Icon name="bookmark" size={16} className="text-text-secondary" />
              </div>
              <div>
                <p className="text-sm text-text-primary">свои пресеты</p>
                <p className="text-xs text-text-tertiary">текущая тема и настройки</p>
              </div>
            </div>
            <button
              onClick={() => setShowSave((v) => !v)}
              className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.08] text-text-primary hover:bg-white/[0.14] transition"
            >
              сохранить
            </button>
          </div>

          {showSave && (
            <div className="flex gap-2">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="название пресета"
                maxLength={24}
                onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                className="flex-1 px-3 py-2 bg-white/[0.04] border border-border-subtle rounded-lg outline-none focus:border-border-visible focus:bg-white/[0.06] text-sm text-text-primary placeholder:text-text-tertiary"
              />
              <button
                onClick={handleSavePreset}
                className="px-3 py-2 rounded-lg text-xs bg-white/[0.08] text-text-primary hover:bg-white/[0.14] transition"
              >
                ок
              </button>
            </div>
          )}

          {customPresets.length > 0 ? (
            <div className="space-y-2 pt-2">
              {customPresets.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-bg-primary/40 hover:bg-white/[0.05] transition group"
                >
                  <button
                    onClick={() => applyCustomPreset(p.id)}
                    className="flex-1 text-left text-sm text-text-primary truncate"
                  >
                    {p.name}
                  </button>
                  <button
                    onClick={() => deleteCustomPreset(p.id)}
                    className="p-1.5 rounded-md text-text-tertiary opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition"
                    aria-label="удалить"
                  >
                    <Icon name="trash-2" size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-tertiary">нет сохранённых пресетов</p>
          )}
        </div>
      </div>
    </div>
  );
}