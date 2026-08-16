import * as Font from 'expo-font';
import type { ScriptType } from '../context/QuranSettingsContext';

const FONT_ASSETS: Record<string, any> = {
  'quran-imlaei': require('../../assets/fonts/quran-diyanet.ttf'),
  'quran-uthmani': require('../../assets/fonts/quran-uthmani.ttf'),
  'quran-indopak': require('../../assets/fonts/quran-indopak.ttf'),
};

export const loadQuranFont = async (scriptType: ScriptType): Promise<boolean> => {
  // Hüsrev Hattı uses PDF download directly instead of TTF font
  if (scriptType === 'quran-husrev') {
    return true;
  }

  const fontAsset = FONT_ASSETS[scriptType];
  if (!fontAsset) return true;

  const fontName = scriptType;

  if (Font.isLoaded(fontName)) {
    return true;
  }

  try {
    console.log(`Loading font ${fontName} into memory from local assets...`);
    await Font.loadAsync({
      [fontName]: fontAsset,
    });

    return true;
  } catch (error) {
    console.error(`Failed to load font ${fontName}:`, error);
    return false;
  }
};
