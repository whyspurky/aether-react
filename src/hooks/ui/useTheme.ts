import { useEffect } from 'react';
import { useStore } from '@store/store';
import { themes, DEFAULT_THEME_ID } from '@/theme/themes';

export function useTheme() {
  const themeId = useStore((s) => s.themeId);

  useEffect(() => {
    const theme = themes[themeId] || themes[DEFAULT_THEME_ID];
    const c = theme.colors;
    const root = document.documentElement;

    root.style.setProperty('--bg-primary', c.background.primary);
    root.style.setProperty('--bg-secondary', c.background.secondary);
    root.style.setProperty('--bg-tertiary', c.background.tertiary);
    root.style.setProperty('--bg-card', c.background.card);
    root.style.setProperty('--bg-elevated', c.background.elevated);

    root.style.setProperty('--text-primary', c.text.primary);
    root.style.setProperty('--text-secondary', c.text.secondary);
    root.style.setProperty('--text-tertiary', c.text.tertiary);
    root.style.setProperty('--text-inverse', c.text.inverse);

    root.style.setProperty('--accent-primary', c.accent.primary);
    root.style.setProperty('--accent-secondary', c.accent.secondary);
    root.style.setProperty('--accent-hover', c.accent.hover);
    root.style.setProperty('--accent-active', c.accent.active);
    root.style.setProperty('--accent-muted', c.accent.muted);

    root.style.setProperty('--border-subtle', c.border.subtle);
    root.style.setProperty('--border-visible', c.border.visible);

    root.style.setProperty('--glass-bg', c.glass.background);
    root.style.setProperty('--glass-border', c.glass.border);
  }, [themeId]);
}