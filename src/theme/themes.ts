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

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
}

export const amoledTheme: Theme = {
  id: 'amoled',
  name: 'amoled',
  colors: {
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
      subtle: 'rgba(255,255,255,0.06)',
      visible: 'rgba(255,255,255,0.12)',
    },
    glass: {
      background: 'rgba(255,255,255,0.05)',
      border: 'rgba(255,255,255,0.08)',
    },
  },
};

export const neutralTheme: Theme = {
  id: 'neutral',
  name: 'neutral',
  colors: {
    background: {
      primary: '#161616',
      secondary: '#212121',
      tertiary: '#2E2E2E',
      card: '#1E1E1E',
      elevated: '#333333',
    },
    text: {
      primary: '#F5F5F5',
      secondary: '#C0C0C0',
      tertiary: '#808080',
      inverse: '#161616',
    },
    accent: {
      primary: '#9CA3AF',
      secondary: '#D1D5DB',
      hover: '#B0B7C3',
      active: '#6B7280',
      muted: 'rgba(255,255,255,0.08)',
    },
    border: {
      subtle: 'rgba(255,255,255,0.08)',
      visible: 'rgba(255,255,255,0.16)',
    },
    glass: {
      background: 'rgba(255,255,255,0.06)',
      border: 'rgba(255,255,255,0.1)',
    },
  },
};

export const midnightTheme: Theme = {
  id: 'midnight',
  name: 'midnight',
  colors: {
    background: {
      primary: '#0A0E1A',
      secondary: '#111827',
      tertiary: '#1E293B',
      card: '#0F1524',
      elevated: '#1F2A40',
    },
    text: {
      primary: '#E5E7EB',
      secondary: '#9CA3AF',
      tertiary: '#6B7280',
      inverse: '#0A0E1A',
    },
    accent: {
      primary: '#60A5FA',
      secondary: '#93C5FD',
      hover: '#7DB4FB',
      active: '#3B82F6',
      muted: 'rgba(96,165,250,0.12)',
    },
    border: {
      subtle: 'rgba(96,165,250,0.08)',
      visible: 'rgba(96,165,250,0.2)',
    },
    glass: {
      background: 'rgba(96,165,250,0.06)',
      border: 'rgba(96,165,250,0.12)',
    },
  },
};

export const coffeeTheme: Theme = {
  id: 'coffee',
  name: 'coffee',
  colors: {
    background: {
      primary: '#1A1411',
      secondary: '#251C18',
      tertiary: '#33261F',
      card: '#1F1814',
      elevated: '#3A2A21',
    },
    text: {
      primary: '#F5EBE0',
      secondary: '#C8B8A8',
      tertiary: '#8A7666',
      inverse: '#1A1411',
    },
    accent: {
      primary: '#C9A27E',
      secondary: '#DEBB95',
      hover: '#D4B08C',
      active: '#A88566',
      muted: 'rgba(201,162,126,0.12)',
    },
    border: {
      subtle: 'rgba(201,162,126,0.08)',
      visible: 'rgba(201,162,126,0.2)',
    },
    glass: {
      background: 'rgba(201,162,126,0.06)',
      border: 'rgba(201,162,126,0.12)',
    },
  },
};

export const aquaTheme: Theme = {
  id: 'aqua',
  name: 'aqua',
  colors: {
    background: {
      primary: '#0A1414',
      secondary: '#0F1E1E',
      tertiary: '#152B2B',
      card: '#0C1818',
      elevated: '#1D3838',
    },
    text: {
      primary: '#E0F5F5',
      secondary: '#A8CCCC',
      tertiary: '#6B8A8A',
      inverse: '#0A1414',
    },
    accent: {
      primary: '#5EEAD4',
      secondary: '#99F6E4',
      hover: '#7DEFD8',
      active: '#2DD4BF',
      muted: 'rgba(94,234,212,0.12)',
    },
    border: {
      subtle: 'rgba(94,234,212,0.08)',
      visible: 'rgba(94,234,212,0.2)',
    },
    glass: {
      background: 'rgba(94,234,212,0.06)',
      border: 'rgba(94,234,212,0.12)',
    },
  },
};

export const themes: Record<string, Theme> = {
  amoled: amoledTheme,
  neutral: neutralTheme,
  midnight: midnightTheme,
  coffee: coffeeTheme,
  aqua: aquaTheme,
};

export const DEFAULT_THEME_ID = 'neutral';