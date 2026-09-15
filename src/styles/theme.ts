// src/styles/theme.ts

export interface ThemeColors {
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    card: string;
    elevated: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };
  accent: {
    primary: string;
    secondary: string;
    hover: string;
    active: string;
    muted: string;
  };
  border: {
    subtle: string;
    visible: string;
  };
  glass: {
    background: string;
    border: string;
  };
}

// пока только амолед
// todo добавить больше тем
export const amoledTheme: ThemeColors = {
  background: {
    primary: '#0F0F0F',
    secondary: '#1A1A1A',
    tertiary: '#262626',
    card: '#181818',
    elevated: '#2A2A2A',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#C8C8C8',
    tertiary: '#888888',
    inverse: '#0F0F0F',
  },
  accent: {
    primary: '#B0B0B0',
    secondary: '#D0D0D0',
    hover: '#C8C8C8',
    active: '#808080',
    muted: 'rgba(255,255,255,0.08)',
  },
  border: {
    subtle: 'rgba(255, 255, 255, 0.06)',
    visible: 'rgba(255, 255, 255, 0.12)',
  },
  glass: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: 'rgba(255, 255, 255, 0.08)',
  },
};

export const themes = {
  amoled: amoledTheme,
};

export type ThemeKey = keyof typeof themes;