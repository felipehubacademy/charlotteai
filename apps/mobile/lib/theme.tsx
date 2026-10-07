// lib/theme.tsx
// ThemeProvider centralizado — suporta light/dark baseado no sistema.
// Uso: const { colors, isDark } = useTheme();

import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

// ── Paletas ──────────────────────────────────────────────────────────────────

export interface ThemeColors {
  bg:         string;
  card:       string;
  navy:       string;
  navyMid:    string;
  navyLight:  string;
  navyGhost:  string;
  green:      string;
  greenDark:  string;
  greenBg:    string;
  blue:       string;
  blueBg:     string;
  pink:       string;
  pinkBg:     string;
  orange:     string;
  gold:       string;
  shadow:     string;
  error:      string;
  border:     string;
  textPrimary:   string;
  textSecondary: string;
  textMuted:     string;
}

export const lightColors: ThemeColors = {
  bg:         '#FAF7F0',
  card:       '#FFFFFF',
  navy:       '#16131F',
  navyMid:    '#4D4858',
  navyLight:  '#8A8494',
  navyGhost:  'rgba(22,19,31,0.06)',
  green:      '#DCFF4A',
  greenDark:  '#08804A',
  greenBg:    '#F8FFE0',
  blue:       '#60A5FA',
  blueBg:     '#EFF6FF',
  pink:       '#FF4F8B',
  pinkBg:     '#FFEEF4',
  orange:     '#FF6B35',
  gold:       '#F59E0B',
  shadow:     'rgba(22,19,31,0.08)',
  error:      '#EF4444',
  border:     'rgba(22,19,31,0.07)',
  textPrimary:   '#16131F',
  textSecondary: '#4D4858',
  textMuted:     '#8A8494',
};

export const darkColors: ThemeColors = {
  bg:         '#0E0C14',
  card:       '#1C1926',
  navy:       '#F3F1EC',
  navyMid:    '#BDB8C6',
  navyLight:  '#77718A',
  navyGhost:  'rgba(255,255,255,0.06)',
  green:      '#DCFF4A',
  greenDark:  '#8AE025',
  greenBg:    'rgba(220,255,74,0.10)',
  blue:       '#60A5FA',
  blueBg:     'rgba(96,165,250,0.10)',
  pink:       '#FF4F8B',
  pinkBg:     'rgba(255,79,139,0.10)',
  orange:     '#FF6B35',
  gold:       '#F59E0B',
  shadow:     'rgba(0,0,0,0.3)',
  error:      '#F87171',
  border:     'rgba(255,255,255,0.08)',
  textPrimary:   '#F3F1EC',
  textSecondary: '#BDB8C6',
  textMuted:     '#77718A',
};

// ── Context ──────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Dark mode disabled — full implementation planned for future release.
  // When re-enabling: restore `const scheme = useColorScheme();` and
  // set `isDark = scheme === 'dark'` and `colors = isDark ? darkColors : lightColors`.
  const isDark = false;
  const colors = lightColors;

  return (
    <ThemeContext.Provider value={{ colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
