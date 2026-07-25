import * as Font from 'expo-font';
import type { ScriptType } from '../context/QuranSettingsContext';

const FONT_ASSETS = {
  'quran-uthmani': require('../../assets/fonts/quran-uthmani.ttf'),
  'quran-indopak': require('../../assets/fonts/quran-indopak.ttf'), 
};

export const loadQuranFont = async (scriptType: ScriptType): Promise<boolean> => {
  // İmlai için sistemin varsayılan fontu yeterli olabilir
  if (scriptType === 'quran-imlaei') {
    return true; 
  }

  const fontAsset = FONT_ASSETS[scriptType];
  if (!fontAsset) return true;

  const fontName = scriptType;

  // Eğer belleğe daha önce yüklendiyse direkt geç
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
