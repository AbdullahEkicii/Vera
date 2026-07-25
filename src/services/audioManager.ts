import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import notifee from '@notifee/react-native';

class AudioManager {
  private player: any = null;
  private timeoutId: any = null;

  async init() {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'doNotMix', // Requests focus
        shouldPlayInBackground: false, // Prevents expo-audio from starting AudioControlsService, Notifee handles foreground!
        allowsRecording: false,
        shouldRouteThroughEarpiece: false,
      });
      console.log('[AudioManager] Audio mode configured successfully.');
    } catch (e) {
      console.error('[AudioManager] Failed to set audio mode', e);
    }
  }

  async playAdhan(type: 'adhan' | 'azizallah') {
    try {
      await this.init(); // Configure audio mode to request focus
      await this.stopAdhan(); // Ensure any previous sound is stopped

      const source = type === 'azizallah' 
        ? require('../../assets/sounds/azizallah.mp3')
        : require('../../assets/sounds/adhan.mp3');

      console.log(`[AudioManager] Creating audio player for: ${type}`);
      
      this.player = createAudioPlayer(source);
      
      // Start playback
      this.player.play();
      console.log(`[AudioManager] Playback started for: ${type}`);
      
      // Auto-stop after 4 minutes to ensure foreground service is released
      if (this.timeoutId) clearTimeout(this.timeoutId);
      this.timeoutId = setTimeout(() => {
        console.log('[AudioManager] Auto-stopping playback after 4 minutes');
        this.stopAdhan();
      }, 240000);
    } catch (error) {
      console.error('[AudioManager] Error playing adhan sound', error);
      notifee.stopForegroundService().catch(() => {});
    }
  }

  async stopAdhan() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    if (this.player) {
      try {
        console.log('[AudioManager] Stopping playback');
        this.player.pause();
        this.player.release();
      } catch (e) {
        console.error('[AudioManager] Error stopping adhan sound', e);
      } finally {
        this.player = null;
      }
    }
    
    // Always release the foreground service when audio stops
    try {
      await notifee.stopForegroundService();
      console.log('[AudioManager] Foreground service stopped');
    } catch (e) {
      console.error('[AudioManager] Error stopping foreground service', e);
    }
  }
}

export const audioManager = new AudioManager();
