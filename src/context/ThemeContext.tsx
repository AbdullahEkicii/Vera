import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme, StatusBar } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { lightTheme, darkTheme, ThemeType } from '../utils/theme';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextData {
  mode: ThemeMode;
  theme: ThemeType;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  isFullscreen: boolean;
  setIsFullscreen: (val: boolean) => void;
}

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

const THEME_STORAGE_KEY = 'app_theme_mode';
const FULLSCREEN_STORAGE_KEY = 'app_fullscreen_mode';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const [isFullscreen, setIsFullscreenState] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Hide immediately on mount to prevent statusbar layout flash on first launch
    StatusBar.setHidden(true, 'none');

    const loadSettings = async () => {
      try {
        const storedTheme = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
        if (storedTheme) {
          setMode(storedTheme as ThemeMode);
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

  const isDark = mode === 'system' ? systemColorScheme === 'dark' : mode === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  if (!isReady) return null;

  return (
    <ThemeContext.Provider value={{ mode, theme, setThemeMode, isDark, isFullscreen, setIsFullscreen }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
