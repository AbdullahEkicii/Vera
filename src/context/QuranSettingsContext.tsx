import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadQuranFont } from '../services/fontDownloader';

export type ScriptType = 'quran-uthmani' | 'quran-indopak' | 'quran-imlaei' | 'quran-husrev';

interface QuranSettingsState {
  scriptType: ScriptType;
  isStyleSelected: boolean;
  fontSizeMultiplier: number;
  isFontLoaded: boolean;
  setFontSizeMultiplier: (multiplier: number) => void;
  changeScriptType: (type: ScriptType) => Promise<boolean>;
  completeFirstSelection: (type: ScriptType) => Promise<boolean>;
}

const SETTINGS_KEY = 'QURAN_SETTINGS';

const defaultState: QuranSettingsState = {
  scriptType: 'quran-imlaei',
  isStyleSelected: false,
  fontSizeMultiplier: 1,
  isFontLoaded: false,
  setFontSizeMultiplier: () => {},
  changeScriptType: async () => false,
  completeFirstSelection: async () => false,
};

const QuranSettingsContext = createContext<QuranSettingsState>(defaultState);

export const QuranSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [scriptType, setScriptType] = useState<ScriptType>('quran-imlaei');
  const [isStyleSelected, setIsStyleSelected] = useState(false);
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState(1);
  const [isFontLoaded, setIsFontLoaded] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await AsyncStorage.getItem(SETTINGS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        setScriptType(parsed.scriptType ?? 'quran-imlaei');
        setIsStyleSelected(parsed.isStyleSelected ?? false);
        setFontSizeMultiplier(parsed.fontSizeMultiplier ?? 1);
        
        if (parsed.scriptType) {
          await loadQuranFont(parsed.scriptType);
        }
        setIsFontLoaded(true);
      } else {
        setIsFontLoaded(true);
      }
    } catch (e) {
      console.error('Failed to load quran settings', e);
      setIsFontLoaded(true);
    }
  };

  const saveSettings = async (newType: ScriptType, selected: boolean, multiplier: number) => {
    try {
      await AsyncStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          scriptType: newType,
          isStyleSelected: selected,
          fontSizeMultiplier: multiplier,
        })
      );
    } catch (e) {
      console.error('Failed to save quran settings', e);
    }
  };

  const setMultiplier = (multiplier: number) => {
    setFontSizeMultiplier(multiplier);
    saveSettings(scriptType, isStyleSelected, multiplier);
  };

  const changeScriptType = async (type: ScriptType): Promise<boolean> => {
    try {
      setIsFontLoaded(false);
      const success = await loadQuranFont(type);
      if (success) {
        setScriptType(type);
        saveSettings(type, true, fontSizeMultiplier);
        setIsFontLoaded(true);
        return true;
      }
      setIsFontLoaded(true);
      return false;
    } catch (error) {
      setIsFontLoaded(true);
      return false;
    }
  };

  const completeFirstSelection = async (type: ScriptType): Promise<boolean> => {
    try {
      setIsFontLoaded(false);
      const success = await loadQuranFont(type);
      if (success || type === 'quran-imlaei') {
        setScriptType(type);
        setIsStyleSelected(true);
        saveSettings(type, true, fontSizeMultiplier);
        setIsFontLoaded(true);
        return true;
      }
      setIsFontLoaded(true);
      return false;
    } catch (error) {
      setIsFontLoaded(true);
      return false;
    }
  };

  return (
    <QuranSettingsContext.Provider
      value={{
        scriptType,
        isStyleSelected,
        fontSizeMultiplier,
        isFontLoaded,
        setFontSizeMultiplier: setMultiplier,
        changeScriptType,
        completeFirstSelection,
      }}
    >
      {children}
    </QuranSettingsContext.Provider>
  );
};

export const useQuranSettings = () => useContext(QuranSettingsContext);
