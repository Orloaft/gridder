/**
 * Audio Manager
 * Handles background music and sound effects for the game
 */

class AudioManager {
  private currentMusic: HTMLAudioElement | null = null;
  private musicVolume: number = 0.5;
  private isMuted: boolean = false;

  /**
   * Play background music with crossfade
   * @param musicPath Path to the music file in public directory
   * @param loop Whether to loop the music (default: true)
   * @param fadeInDuration Duration of fade in (seconds)
   * @param fadeOutDuration Duration of fade out for previous track (seconds)
   */
  playMusic(
    musicPath: string,
    loop: boolean = true,
    fadeInDuration: number = 1,
    fadeOutDuration: number = 1
  ): void {
    // If same track is already playing, do nothing
    if (this.currentMusic && this.currentMusic.src.endsWith(musicPath)) {
      return;
    }

    // Create new audio element
    const newMusic = new Audio(musicPath);
    newMusic.loop = loop;
    newMusic.volume = 0; // Start at 0 for fade in

    // Fade out current music if it exists
    if (this.currentMusic) {
      this.fadeOut(this.currentMusic, fadeOutDuration);
    }

    // Play and fade in new music
    newMusic.play().catch((error) => {
      console.error('Failed to play music:', error);
    });

    this.fadeIn(newMusic, fadeInDuration);
    this.currentMusic = newMusic;
  }

  /**
   * Stop current music with fade out
   * @param fadeOutDuration Duration of fade out (seconds)
   */
  stopMusic(fadeOutDuration: number = 1): void {
    if (this.currentMusic) {
      this.fadeOut(this.currentMusic, fadeOutDuration);
      this.currentMusic = null;
    }
  }

  /**
   * Fade in audio element
   */
  private fadeIn(audio: HTMLAudioElement, duration: number): void {
    const targetVolume = this.isMuted ? 0 : this.musicVolume;
    const steps = 20;
    const stepDuration = (duration * 1000) / steps;
    const volumeStep = targetVolume / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      audio.volume = Math.min(volumeStep * currentStep, targetVolume);

      if (currentStep >= steps) {
        clearInterval(interval);
      }
    }, stepDuration);
  }

  /**
   * Fade out audio element and stop it
   */
  private fadeOut(audio: HTMLAudioElement, duration: number): void {
    const startVolume = audio.volume;
    const steps = 20;
    const stepDuration = (duration * 1000) / steps;
    const volumeStep = startVolume / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      audio.volume = Math.max(startVolume - volumeStep * currentStep, 0);

      if (currentStep >= steps) {
        clearInterval(interval);
        audio.pause();
        audio.src = '';
      }
    }, stepDuration);
  }

  /**
   * Set music volume (0-1)
   */
  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.currentMusic && !this.isMuted) {
      this.currentMusic.volume = this.musicVolume;
    }
  }

  /**
   * Toggle mute
   */
  toggleMute(): void {
    this.isMuted = !this.isMuted;
    if (this.currentMusic) {
      this.currentMusic.volume = this.isMuted ? 0 : this.musicVolume;
    }
  }

  /**
   * Get mute state
   */
  isMusicMuted(): boolean {
    return this.isMuted;
  }
}

// Export singleton instance
export const audioManager = new AudioManager();
