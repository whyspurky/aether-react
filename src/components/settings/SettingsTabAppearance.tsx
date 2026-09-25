import { Icon } from '@components/ui/Icon';

export function SettingsTabAppearance() {
  return (
    <div className="space-y-4">
      <div className="bg-bg-primary rounded-2xl border border-border-subtle overflow-hidden">
        <div className="px-5 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-bg-secondary flex items-center justify-center">
              <Icon name="palette" size={16} className="text-text-secondary" />
            </div>
            <div>
              <p className="text-sm text-text-primary">тема оформления</p>
              <p className="text-xs text-text-tertiary">AMOLED · минимализм</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="w-2 h-2 rounded-full bg-text-secondary" />
            <p className="text-sm text-text-secondary">
              AMOLED - максимально черный фон, серый акцент
            </p>
          </div>
        </div>
      </div>

      <div className="bg-bg-primary rounded-2xl border border-border-subtle overflow-hidden">
        <div className="px-5 py-4">
          <p className="text-xs text-text-tertiary mb-3">цветовая палитра</p>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <div className="w-full aspect-square rounded-xl bg-bg-primary border border-border-subtle" />
              <p className="text-xs text-text-tertiary mt-1.5 text-center">фон</p>
            </div>
            <div>
              <div className="w-full aspect-square rounded-xl bg-bg-secondary border border-border-subtle" />
              <p className="text-xs text-text-tertiary mt-1.5 text-center">карточки</p>
            </div>
            <div>
              <div className="w-full aspect-square rounded-xl bg-text-secondary" />
              <p className="text-xs text-text-tertiary mt-1.5 text-center">акцент</p>
            </div>
            <div>
              <div className="w-full aspect-square rounded-xl bg-text-primary" />
              <p className="text-xs text-text-tertiary mt-1.5 text-center">текст</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}