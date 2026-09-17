// src/hooks/useTheme.ts
import { useState, useEffect } from 'react';
import { amoledTheme, ThemeColors } from '../styles/theme';

export function useTheme() {
  const [colors] = useState<ThemeColors>(amoledTheme);

  useEffect(() => {
    const root = document.documentElement;
    const theme = amoledTheme;

    root.style.setProperty('--bg-primary', theme.background.primary);
    root.style.setProperty('--bg-secondary', theme.background.secondary);
    root.style.setProperty('--bg-tertiary', theme.background.tertiary);
    root.style.setProperty('--bg-card', theme.background.card);
    root.style.setProperty('--bg-elevated', theme.background.elevated);

    root.style.setProperty('--text-primary', theme.text.primary);
    root.style.setProperty('--text-secondary', theme.text.secondary);
    root.style.setProperty('--text-tertiary', theme.text.tertiary);
    root.style.setProperty('--text-inverse', theme.text.inverse);

    root.style.setProperty('--accent-primary', theme.accent.primary);
    root.style.setProperty('--accent-secondary', theme.accent.secondary);
    root.style.setProperty('--accent-hover', theme.accent.hover);
    root.style.setProperty('--accent-active', theme.accent.active);
    root.style.setProperty('--accent-muted', theme.accent.muted);

    root.style.setProperty('--border-subtle', theme.border.subtle);
    root.style.setProperty('--border-visible', theme.border.visible);

    root.style.setProperty('--glass-bg', theme.glass.background);
    root.style.setProperty('--glass-border', theme.glass.border);
  }, []);

  return {
    colors,
  };
}