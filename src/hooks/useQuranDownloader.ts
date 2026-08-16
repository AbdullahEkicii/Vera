import { useState, useCallback, useEffect } from 'react';
import { DownloadStatus } from '../services/quranDatabase';
import { checkJuzStatus, downloadJuz } from '../services/quranRepository';
import { useQuranSettings } from '../context/QuranSettingsContext';

export const useQuranDownloader = (juzNo: number, langCode: string = 'tr') => {
  const { scriptType } = useQuranSettings();
  const [status, setStatus] = useState<DownloadStatus>('NotDownloaded');
  const [progress, setProgress] = useState<number>(0);
  const [isChecking, setIsChecking] = useState(true);
  const [downloadedLang, setDownloadedLang] = useState<string | undefined>();

  const checkStatus = useCallback(async () => {
    setIsChecking(true);
    const result = await checkJuzStatus(juzNo, scriptType);
    setStatus(result.status);
    setDownloadedLang(result.langCode);
    setIsChecking(false);
  }, [juzNo, scriptType]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const startDownload = useCallback(async () => {
    if (status === 'Downloading' || status === 'Downloaded') return;
    
    setStatus('Downloading');
    setProgress(0);
    
    const success = await downloadJuz(juzNo, langCode, scriptType, (prog) => {
      setProgress(prog);
    });

    if (success) {
      setStatus('Downloaded');
      setDownloadedLang(langCode);
    } else {
      setStatus('NotDownloaded');
      setProgress(0);
    }
  }, [juzNo, langCode, status, scriptType]);

  const deleteJuz = useCallback(async () => {
    // Gelecekte silme fonksiyonu eklenebilir
    // await removeJuz(juzNo);
    // setStatus('NotDownloaded');
  }, [juzNo]);

  return {
    status,
    progress,
    isChecking,
    downloadedLang,
    startDownload,
    deleteJuz,
    refreshStatus: checkStatus
  };
};
