import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme, StatusBar } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { lightTheme, darkTheme, ThemeType } from '../utils/theme';

type ThemeMode = 'light' | 'dark';
export type TimeFormat = '12h' | '24h';
export type ColorPalette = 'default' | 'emerald' | 'ocean' | 'rose' | 'gold' | 'amethyst';

interface ThemeContextData {
  mode: ThemeMode;
  theme: ThemeType;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  isFullscreen: boolean;
  setIsFullscreen: (val: boolean) => void;
  timeFormat: TimeFormat;
  setTimeFormat: (format: TimeFormat) => void;
  colorPalette: ColorPalette;
  setColorPalette: (palette: ColorPalette) => void;
  circlePalette: ColorPalette;
  setCirclePalette: (palette: ColorPalette) => void;
}

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

const THEME_STORAGE_KEY = 'app_theme_mode';
const FULLSCREEN_STORAGE_KEY = 'app_fullscreen_mode';
const TIME_FORMAT_KEY = 'app_time_format';
const COLOR_PALETTE_KEY = 'app_color_palette';
const CIRCLE_PALETTE_KEY = 'app_circle_palette';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('light');
  const [isFullscreen, setIsFullscreenState] = useState(true);
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>('24h');
  const [colorPalette, setColorPaletteState] = useState<ColorPalette>('default');
  const [circlePalette, setCirclePaletteState] = useState<ColorPalette>('default');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Hide immediately on mount to prevent statusbar layout flash on first launch
    StatusBar.setHidden(true, 'none');

    const loadSettings = async () => {
      try {
        const storedTheme = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
        if (storedTheme) {
          if (storedTheme === 'system') {
            setMode('light');
            SecureStore.setItemAsync(THEME_STORAGE_KEY, 'light').catch(() => {});
          } else {
            setMode(storedTheme as ThemeMode);
          }
        }
        const storedFullscreen = await SecureStore.getItemAsync(FULLSCREEN_STORAGE_KEY);
        if (storedFullscreen) {
          const isFull = storedFullscreen === 'true';
          setIsFullscreenState(isFull);
          StatusBar.setHidden(isFull, 'slide');
        } else {
          // If no setting stored yet, ensure it is hidden by default
          StatusBar.setHidden(true, 'slide');
        }

        const storedTimeFormat = await SecureStore.getItemAsync(TIME_FORMAT_KEY);
        if (storedTimeFormat === '12h' || storedTimeFormat === '24h') {
          setTimeFormatState(storedTimeFormat);
        }

        const storedColorPalette = await SecureStore.getItemAsync(COLOR_PALETTE_KEY);
        if (storedColorPalette) {
          setColorPaletteState(storedColorPalette as ColorPalette);
        }

        const storedCirclePalette = await SecureStore.getItemAsync(CIRCLE_PALETTE_KEY);
        if (storedCirclePalette) {
          setCirclePaletteState(storedCirclePalette as ColorPalette);
        }
      } catch (error) {
        console.error('Failed to load settings', error);
      } finally {
        setIsReady(true);
      }
    };
    loadSettings();
  }, []);

  const setThemeMode = async (newMode: ThemeMode) => {
    setMode(newMode);
    try {
      await SecureStore.setItemAsync(THEME_STORAGE_KEY, newMode);
    } catch (error) {
      console.error('Failed to save theme', error);
    }
  };

  const setIsFullscreen = async (val: boolean) => {
    setIsFullscreenState(val);
    StatusBar.setHidden(val, 'slide');
    try {
      await SecureStore.setItemAsync(FULLSCREEN_STORAGE_KEY, String(val));
    } catch (error) {
      console.error('Failed to save fullscreen pref', error);
    }
  };

  const setTimeFormat = async (format: TimeFormat) => {
    setTimeFormatState(format);
    try {
      await SecureStore.setItemAsync(TIME_FORMAT_KEY, format);
    } catch (error) {
      console.error('Failed to save time format', error);
    }
  };

  const setColorPalette = async (palette: ColorPalette) => {
    setColorPaletteState(palette);
    try {
      await SecureStore.setItemAsync(COLOR_PALETTE_KEY, palette);
    } catch (error) {
      console.error('Failed to save color palette', error);
    }
  };

  const setCirclePalette = async (palette: ColorPalette) => {
    setCirclePaletteState(palette);
    try {
      await SecureStore.setItemAsync(CIRCLE_PALETTE_KEY, palette);
    } catch (error) {
      console.error('Failed to save circle palette', error);
    }
  };

  const isDark = mode === 'dark';
  
  // Here we can merge the selected color palette into the base theme
  // We'll update the theme object if a custom palette is selected
  let baseTheme = isDark ? darkTheme : lightTheme;
  const theme = { ...baseTheme }; // Deep copy could be needed if we mutate nested properties, but we'll manage in theme.ts

  if (colorPalette !== 'default') {
    const { palettes } = require('../utils/theme');
    const selectedPalette = palettes[colorPalette];
    if (selectedPalette) {
      theme.colors = {
        ...theme.colors,
        primary: selectedPalette.primary,
        primaryLight: selectedPalette.primaryLight,
        glow: selectedPalette.glow,
        borderStrong: selectedPalette.borderStrong,
        heroGradient: isDark 
          ? [selectedPalette.primary, selectedPalette.primaryLight] 
          : [selectedPalette.primary, selectedPalette.borderStrong || selectedPalette.primary],
      };
    }
  }

  if (!isReady) return null;

  return (
    <ThemeContext.Provider value={{ mode, theme, setThemeMode, isDark, isFullscreen, setIsFullscreen, timeFormat, setTimeFormat, colorPalette, setColorPalette, circlePalette, setCirclePalette }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
