import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VOLUME_KEY = 'ADHAN_VOLUME';

class AudioManager {
  private player: any = null;
  private timeoutId: any = null;
  private currentVolume: number = 0.75;
  private statusSubscription: any = null;
  private onEndCallback: (() => void) | null = null;
  // Bumped by every play/stop request. A play call that was overtaken while awaiting
  // (a second tap, or stopAdhan() from an unmounting screen) must not create its
  // player afterwards, or that player is orphaned and never released.
  private playGen = 0;

  async init() {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'doNotMix', // Requests focus
        shouldPlayInBackground: true,
        allowsRecording: false,
        shouldRouteThroughEarpiece: false,
      });
      const savedVol = await AsyncStorage.getItem(VOLUME_KEY);
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          this.currentVolume = parsed;
        }
      }
      console.log('[AudioManager] Audio mode configured, volume:', this.currentVolume);
    } catch (e) {
      console.error('[AudioManager] Failed to set audio mode', e);
    }
  }

  async getVolume(): Promise<number> {
    try {
      const savedVol = await AsyncStorage.getItem(VOLUME_KEY);
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        if (!isNaN(parsed)) return parsed;
      }
    } catch {}
    return this.currentVolume;
  }

  async setVolume(volume: number) {
    this.currentVolume = Math.max(0.1, Math.min(1.0, volume));
    await AsyncStorage.setItem(VOLUME_KEY, this.currentVolume.toString());
    if (this.player) {
      try {
        this.player.volume = this.currentVolume;
      } catch {}
    }
  }

  /** Releases the player when it finishes on its own. */
  private watchForEnd() {
    if (!this.player || typeof this.player.addListener !== 'function') return;
    this.statusSubscription = this.player.addListener('playbackStatusUpdate', (status: any) => {
      if (
        status?.didJustFinish ||
        status?.playbackState === 'ended' ||
        (!status?.playing && status?.currentTime > 0 && status?.duration > 0 && Math.abs(status.currentTime - status.duration) < 0.5)
      ) {
        console.log('[AudioManager] Playback finished naturally');
        this.stopAdhan();
      }
    });
  }

  async playAdhan(
    type: 'adhan' | 'azizallah' | 'adhan_25minutes' | 'allahu_akbar' | string,
    onEnd?: () => void
  ) {
    const gen = ++this.playGen;
    try {
      await this.init(); // Configure audio mode to request focus
      if (gen !== this.playGen) {
        onEnd?.(); // let the caller reset its "playing" UI
        return;
      }
      this.release(); // Ensure any previous sound is stopped

      this.onEndCallback = onEnd || null;

      let source = require('../../assets/sounds/azizallah.mp3');
      if (type === 'adhan_25minutes') {
        source = require('../../assets/sounds/adhan_25minutes.mp3');
      } else if (type === 'allahu_akbar') {
        source = require('../../assets/sounds/allahu_akbar.mp3');
      } else if (type === 'adhan') {
        source = require('../../assets/sounds/adhan.mp3');
      }

      console.log(`[AudioManager] Creating audio player for: ${type} with volume: ${this.currentVolume}`);

      this.player = createAudioPlayer(source);
      if (this.player) {
        this.player.volume = this.currentVolume;
        this.watchForEnd();
        this.player.play();
      }
      console.log(`[AudioManager] Playback started for: ${type}`);

      // Auto-stop after 4 minutes
      if (this.timeoutId) clearTimeout(this.timeoutId);
      this.timeoutId = setTimeout(() => {
        console.log('[AudioManager] Auto-stopping playback after 4 minutes');
        this.stopAdhan();
      }, 240000);
    } catch (error) {
      console.error('[AudioManager] Error playing adhan sound', error);
      this.stopAdhan();
    }
  }

  async playVictorySound() {
    const gen = ++this.playGen;
    try {
      await this.init();
      if (gen !== this.playGen) return;
      this.release();

      console.log('[AudioManager] Creating victory sound player');
      const source = require('../../assets/sounds/victory.mp3');
      this.player = createAudioPlayer(source);

      if (this.player) {
        this.player.volume = this.currentVolume;
        this.watchForEnd();
        this.player.play();
      }
    } catch (error) {
      console.error('[AudioManager] Error playing victory sound', error);
    }
  }

  async stopAdhan() {
    this.playGen++; // cancels any play call still awaiting init()
    this.release();
  }

  /** Stops and frees the current player, then fires its onEnd callback. */
  private release() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.statusSubscription) {
      try {
        if (typeof this.statusSubscription.remove === 'function') {
          this.statusSubscription.remove();
        }
      } catch {}
      this.statusSubscription = null;
    }

    if (this.player) {
      try {
        console.log('[AudioManager] Stopping playback');
        if (typeof this.player.pause === 'function') this.player.pause();
        if (typeof this.player.remove === 'function') this.player.remove();
        else if (typeof this.player.release === 'function') this.player.release();
      } catch (e) {
        console.error('[AudioManager] Error stopping adhan sound', e);
      } finally {
        this.player = null;
      }
    }

    if (this.onEndCallback) {
      const cb = this.onEndCallback;
      this.onEndCallback = null;
      try {
        cb();
      } catch {}
    }
  }
}

export const audioManager = new AudioManager();
