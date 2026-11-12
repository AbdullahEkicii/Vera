export const lightTheme = {
  colors: {
    background: '#F0F4F8',
    surface: 'rgba(255, 255, 255, 0.45)', // Glassy
    surfaceStrong: 'rgba(255, 255, 255, 0.85)',
    primary: '#059669',          // Natural emerald green
    primaryText: '#047857',      // Accent safe to use as text on the light background (>= 4.5:1)
    primaryLight: 'rgba(5, 150, 105, 0.12)',
    text: '#0F172A',
    textSecondary: '#475569',
    border: 'rgba(255, 255, 255, 0.6)',
    borderStrong: 'rgba(5, 150, 105, 0.3)',
    danger: '#EF4444',
    success: '#10B981',
    glow: 'rgba(5, 150, 105, 0.35)',
    bgGradient: ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.9)'] as readonly [string, string],
    heroGradient: ['#047857', '#058060'] as readonly [string, string],
    cardOverlay: 'rgba(255, 255, 255, 0.75)',
  },
};

export const darkTheme = {
  colors: {
    background: '#0D1117',
    surface: 'rgba(255, 255, 255, 0.07)',
    surfaceStrong: 'rgba(255, 255, 255, 0.13)',
    primary: '#F59E0B',          // Warm gold
    primaryText: '#F59E0B',      // Gold on the dark background is already 8.8:1
    primaryLight: 'rgba(245, 158, 11, 0.15)',
    text: '#F5EFE0',
    textSecondary: '#A89880',
    border: 'rgba(245, 158, 11, 0.2)',
    borderStrong: 'rgba(245, 158, 11, 0.45)',
    danger: '#F87171',
    success: '#34D399',
    glow: 'rgba(245, 158, 11, 0.35)',
    bgGradient: ['rgba(13,17,23,0.55)', 'rgba(13,17,23,0.85)'] as readonly [string, string],
    heroGradient: ['#92400E', '#B45309'] as readonly [string, string],
    cardOverlay: 'rgba(13, 17, 23, 0.72)',
  },
};

export const prayerGradients: Record<string, readonly [string, string]> = {
  fajr:    ['#4C1D95', '#7C3AED'],
  sunrise: ['#92400E', '#B45309'],
  dhuhr:   ['#0369A1', '#0277B5'],
  asr:     ['#065F46', '#047857'],
  maghrib: ['#9A3412', '#C2410C'],
  isha:    ['#1E3A5F', '#1D4ED8'],
};

const parseColor = (color: string): [number, number, number] | null => {
  const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, (c) => c + c) : hex[1];
    return [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16)) as [number, number, number];
  }
  const rgb = color.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null;
};

const relativeLuminance = ([r, g, b]: [number, number, number]) => {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};

const contrastBetween = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const DARK_INK = '#1A1207';
const LIGHT_INK = '#FFFFFF';
const DARK_INK_LUM = relativeLuminance([26, 18, 7]);

/** Text/icon colour with the higher WCAG contrast on `bg` (alpha ignored). Falls back to white. */
export const readableTextOn = (bg: string): string => {
  const rgb = parseColor(bg);
  if (!rgb) return LIGHT_INK;
  const lum = relativeLuminance(rgb);
  return contrastBetween(1, lum) >= contrastBetween(DARK_INK_LUM, lum) ? LIGHT_INK : DARK_INK;
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

export const palettes: Record<string, { primary: string; primaryLight: string; glow: string; borderStrong: string; name: string }> = {
  emerald: {
    name: 'Emerald',
    primary: '#10B981',
    primaryLight: 'rgba(16, 185, 129, 0.15)',
    glow: 'rgba(16, 185, 129, 0.35)',
    borderStrong: 'rgba(16, 185, 129, 0.45)',
  },
  ocean: {
    name: 'Ocean',
    primary: '#0EA5E9',
    primaryLight: 'rgba(14, 165, 233, 0.15)',
    glow: 'rgba(14, 165, 233, 0.35)',
    borderStrong: 'rgba(14, 165, 233, 0.45)',
  },
  rose: {
    name: 'Rose',
    primary: '#F43F5E',
    primaryLight: 'rgba(244, 63, 94, 0.15)',
    glow: 'rgba(244, 63, 94, 0.35)',
    borderStrong: 'rgba(244, 63, 94, 0.45)',
  },
  gold: {
    name: 'Gold',
    primary: '#F59E0B',
    primaryLight: 'rgba(245, 158, 11, 0.15)',
    glow: 'rgba(245, 158, 11, 0.35)',
    borderStrong: 'rgba(245, 158, 11, 0.45)',
  },
  amethyst: {
    name: 'Amethyst',
    primary: '#8B5CF6',
    primaryLight: 'rgba(139, 92, 246, 0.15)',
    glow: 'rgba(139, 92, 246, 0.35)',
    borderStrong: 'rgba(139, 92, 246, 0.45)',
  },
  crimson: {
    name: 'Crimson',
    primary: '#DC2626',
    primaryLight: 'rgba(220, 38, 38, 0.15)',
    glow: 'rgba(220, 38, 38, 0.35)',
    borderStrong: 'rgba(220, 38, 38, 0.45)',
  },
  indigo: {
    name: 'Indigo',
    primary: '#4F46E5',
    primaryLight: 'rgba(79, 70, 229, 0.15)',
    glow: 'rgba(79, 70, 229, 0.35)',
    borderStrong: 'rgba(79, 70, 229, 0.45)',
  },
  teal: {
    name: 'Teal',
    primary: '#0D9488',
    primaryLight: 'rgba(13, 148, 136, 0.15)',
    glow: 'rgba(13, 148, 136, 0.35)',
    borderStrong: 'rgba(13, 148, 136, 0.45)',
  },
  mint: {
    name: 'Mint',
    primary: '#059669',
    primaryLight: 'rgba(5, 150, 105, 0.15)',
    glow: 'rgba(5, 150, 105, 0.35)',
    borderStrong: 'rgba(5, 150, 105, 0.45)',
  },
  slate: {
    name: 'Slate',
    primary: '#475569',
    primaryLight: 'rgba(71, 85, 105, 0.15)',
    glow: 'rgba(71, 85, 105, 0.35)',
    borderStrong: 'rgba(71, 85, 105, 0.45)',
  },
};

const luminance = (hex: string): number => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

export const contrastRatio = (a: string, b: string): number => {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/**
 * Nudges an accent colour toward black (light backgrounds) or white (dark backgrounds)
 * until it reaches `min` contrast, so palette accents stay readable when used as text.
 */
export const accentForText = (accent: string, background: string, min = 4.5): string => {
  if (!/^#[0-9a-fA-F]{6}$/.test(accent) || !/^#[0-9a-fA-F]{6}$/.test(background)) return accent;
  const towards = luminance(background) > 0.5 ? 0 : 255;
  let rgb = [1, 3, 5].map((i) => parseInt(accent.slice(i, i + 2), 16));
  for (let i = 0; i < 40 && contrastRatio(`#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`, background) < min; i++) {
    rgb = rgb.map((v) => Math.round(v + (towards - v) * 0.08));
  }
  return `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};
