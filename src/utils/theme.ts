export const lightTheme = {
  colors: {
    background: '#F0F4F8',
    surface: 'rgba(255, 255, 255, 0.45)', // Glassy
    surfaceStrong: 'rgba(255, 255, 255, 0.85)',
    primary: '#059669',          // Natural emerald green
    primaryLight: 'rgba(5, 150, 105, 0.12)',
    text: '#0F172A',
    textSecondary: '#475569',
    border: 'rgba(255, 255, 255, 0.6)',
    borderStrong: 'rgba(5, 150, 105, 0.3)',
    danger: '#EF4444',
    success: '#10B981',
    glow: 'rgba(5, 150, 105, 0.35)',
    bgGradient: ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.9)'] as readonly [string, string],
    heroGradient: ['#047857', '#10B981'] as readonly [string, string],
    cardOverlay: 'rgba(255, 255, 255, 0.75)',
  },
};

export const darkTheme = {
  colors: {
    background: '#0D1117',
    surface: 'rgba(255, 255, 255, 0.07)',
    surfaceStrong: 'rgba(255, 255, 255, 0.13)',
    primary: '#F59E0B',          // Warm gold
    primaryLight: 'rgba(245, 158, 11, 0.15)',
    text: '#F5EFE0',
    textSecondary: '#A89880',
    border: 'rgba(245, 158, 11, 0.2)',
    borderStrong: 'rgba(245, 158, 11, 0.45)',
    danger: '#F87171',
    success: '#34D399',
    glow: 'rgba(245, 158, 11, 0.35)',
    bgGradient: ['rgba(13,17,23,0.55)', 'rgba(13,17,23,0.85)'] as readonly [string, string],
    heroGradient: ['#92400E', '#D97706'] as readonly [string, string],
    cardOverlay: 'rgba(13, 17, 23, 0.72)',
  },
};

export const prayerGradients: Record<string, readonly [string, string]> = {
  fajr:    ['#4C1D95', '#7C3AED'],
  sunrise: ['#92400E', '#D97706'],
  dhuhr:   ['#0369A1', '#0EA5E9'],
  asr:     ['#065F46', '#059669'],
  maghrib: ['#9A3412', '#EA580C'],
  isha:    ['#1E3A5F', '#1D4ED8'],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 9999,
};

export const typography = {
  fontFamily: {
    regular: 'Outfit_400Regular',
    medium: 'Outfit_500Medium',
    semiBold: 'Outfit_600SemiBold',
    bold: 'Outfit_700Bold',
  },
};

export type ThemeType = typeof lightTheme;
