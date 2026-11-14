import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { AppStorage } from './storageService';

const RECITER_KEY = 'QURAN_RECITER_ID';

export interface QuranReciter {
  id: string;
  nameTR: string;
  nameEN: string;
  /** Folder name on everyayah.com's public per-ayah audio archive. */
  folder: string;
}

// everyayah.com hosts free, publicly downloadable per-ayah recitations, filed as
// {folder}/{surah 3-digit}{ayah 3-digit}.mp3 — no API key required.
export const QURAN_RECITERS: QuranReciter[] = [
  { id: 'alafasy', nameTR: 'Mişari Raşid el-Afasi', nameEN: 'Mishary Alafasy', folder: 'Alafasy_128kbps' },
  { id: 'abdulbasit', nameTR: 'Abdulbasit Abdussamed', nameEN: 'Abdul Basit', folder: 'Abdul_Basit_Murattal_192kbps' },
  { id: 'husary', nameTR: 'Mahmud Halil el-Husarî', nameEN: 'Al-Husary', folder: 'Husary_128kbps' },
  { id: 'minshawy', nameTR: 'Muhammed Sıddîk el-Minşâvî', nameEN: 'Al-Minshawy', folder: 'Minshawy_Murattal_128kbps' },
  { id: 'shuraym', nameTR: 'Suud eş-Şüreym', nameEN: 'Saud Al-Shuraym', folder: 'Saud_ash-Shuraym_128kbps' },
];

// How long a single ayah may take to start loading before we treat the stream as failed.
const AYAH_LOAD_TIMEOUT_MS = 8000;

const pad3 = (n: number) => String(n).padStart(3, '0');

export const getAyahAudioUrl = (reciterFolder: string, surahNo: number, ayahNo: number): string =>
  `https://everyayah.com/data/${reciterFolder}/${pad3(surahNo)}${pad3(ayahNo)}.mp3`;

export async function getSelectedReciter(): Promise<QuranReciter> {
  try {
    const saved = await AppStorage.getItem(RECITER_KEY);
    const found = saved ? QURAN_RECITERS.find((r) => r.id === saved) : null;
    return found || QURAN_RECITERS[0];
  } catch {
    return QURAN_RECITERS[0];
  }
}

export async function setSelectedReciter(id: string): Promise<void> {
  await AppStorage.setItem(RECITER_KEY, id);
}

export interface AyahRef {
  surahNo: number;
  ayahNo: number;
}

interface PlaybackCallbacks {
  onAyahStart?: (ayah: AyahRef) => void;
  onAyahEnd?: (ayah: AyahRef) => void;
  onError?: (ayah: AyahRef, error: unknown) => void;
  onStopped?: () => void;
}

/**
 * Sequential ayah-by-ayah recitation player. Streams directly from everyayah.com —
 * no bundled audio, no per-reciter download step.
 */
class QuranAudioPlayer {
  private player: any = null;
  private statusSubscription: any = null;
  private queue: AyahRef[] = [];
  private queueIndex = 0;
  private reciterFolder: string = QURAN_RECITERS[0].folder;
  private callbacks: PlaybackCallbacks = {};
  // Bumped by stop(); a play() overtaken while awaiting checks it and bails out.
  private playGen = 0;
  private stopped = true;
  private paused = false;
  private loadTimeout: ReturnType<typeof setTimeout> | null = null;

  isPlaying(): boolean {
    return !this.stopped;
  }

  async play(ayahs: AyahRef[], reciterFolder: string, callbacks: PlaybackCallbacks = {}) {
    await this.stop();
    if (ayahs.length === 0) return;
    const gen = this.playGen;

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
        shouldPlayInBackground: true,
        allowsRecording: false,
        shouldRouteThroughEarpiece: false,
      });
    } catch {}
    // stop() ran while we were awaiting (e.g. the reading screen unmounted): don't start.
    if (gen !== this.playGen) return;

    this.queue = ayahs;
    this.queueIndex = 0;
    this.reciterFolder = reciterFolder;
    this.callbacks = callbacks;
    this.stopped = false;

    this.playCurrent();
  }

  private playCurrent() {
    if (this.stopped || this.queueIndex >= this.queue.length) {
      this.finish();
      return;
    }

    const ayah = this.queue[this.queueIndex];
    const url = getAyahAudioUrl(this.reciterFolder, ayah.surahNo, ayah.ayahNo);
    // Per-ayah guard: a repeated 'ended' event (or a late timeout) must not advance twice.
    let settled = false;
    let loaded = false;

    try {
      this.player = createAudioPlayer(url);
      this.callbacks.onAyahStart?.(ayah);

      // Streaming from the network can hang silently when offline: give up if nothing loads.
      this.loadTimeout = setTimeout(() => {
        if (settled || loaded || this.stopped) return;
        settled = true;
        this.fail(ayah, new Error('Ayah audio load timed out'));
      }, AYAH_LOAD_TIMEOUT_MS);

      if (this.player && typeof this.player.addListener === 'function') {
        this.statusSubscription = this.player.addListener('playbackStatusUpdate', (status: any) => {
          if (settled || this.stopped) return;
          if (status?.error || status?.playbackState === 'error') {
            settled = true;
            this.fail(ayah, status?.error ?? new Error('Ayah audio playback error'));
            return;
          }
          if (status?.isLoaded || status?.playing || status?.currentTime > 0) {
            loaded = true;
            this.clearLoadTimeout();
          }
          const finished =
            status?.didJustFinish ||
            status?.playbackState === 'ended' ||
            (!status?.playing && status?.currentTime > 0 && status?.duration > 0 && Math.abs(status.currentTime - status.duration) < 0.4);
          if (finished && !this.paused) {
            settled = true;
            this.callbacks.onAyahEnd?.(ayah);
            this.advance();
          }
        });
      }

      this.player?.play();
    } catch (e) {
      settled = true;
      this.fail(ayah, e);
    }
  }

  private clearLoadTimeout() {
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
      this.loadTimeout = null;
    }
  }

  /** Report a failed ayah and stop cleanly (no auto-advance to the next page). */
  private fail(ayah: AyahRef, error: unknown) {
    const onError = this.callbacks.onError;
    this.destroyCurrentPlayer();
    this.stopped = true;
    this.paused = false;
    this.queue = [];
    this.queueIndex = 0;
    this.callbacks = {};
    onError?.(ayah, error);
  }

  /** Pause the current ayah; resume() continues from the same position. */
  pause() {
    if (this.stopped || this.paused || !this.player) return;
    try {
      this.player.pause?.();
      this.paused = true;
    } catch {}
  }

  resume() {
    if (this.stopped || !this.paused || !this.player) return;
    try {
      this.player.play?.();
    } catch {}
    this.paused = false;
  }

  isPaused(): boolean {
    return this.paused;
  }

  private advance() {
    if (this.stopped) return;
    this.destroyCurrentPlayer();
    this.queueIndex += 1;
    this.playCurrent();
  }

  private destroyCurrentPlayer() {
    this.clearLoadTimeout();
    if (this.statusSubscription) {
      try { this.statusSubscription.remove?.(); } catch {}
      this.statusSubscription = null;
    }
    if (this.player) {
      try {
        this.player.pause?.();
        this.player.remove?.();
      } catch {}
      this.player = null;
    }
  }

  private finish() {
    this.destroyCurrentPlayer();
    const wasPlaying = !this.stopped;
    this.stopped = true;
    this.paused = false;
    this.queue = [];
    this.queueIndex = 0;
    if (wasPlaying) {
      this.callbacks.onStopped?.();
    }
    this.callbacks = {};
  }

  async stop() {
    this.playGen++;
    this.destroyCurrentPlayer();
    this.stopped = true;
    this.paused = false;
    this.queue = [];
    this.queueIndex = 0;
    // Drop the screen's closures (state setters) so this singleton doesn't retain them.
    this.callbacks = {};
  }
}

export const quranAudioPlayer = new QuranAudioPlayer();
