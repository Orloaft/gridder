// Central animation controller for managing all GSAP animations
import gsap from 'gsap';

export class AnimationManager {
  private activeAnimations: Map<string, gsap.core.Timeline | gsap.core.Tween> = new Map();

  /**
   * Play an animation with a unique ID
   * If an animation with the same ID exists, it will be killed first
   */
  play(id: string, animation: gsap.core.Timeline | gsap.core.Tween): void {
    // Kill existing animation with same ID
    this.kill(id);

    // Store and play new animation
    this.activeAnimations.set(id, animation);

    animation.eventCallback('onComplete', () => {
      this.activeAnimations.delete(id);
    });
  }

  /**
   * Kill a specific animation by ID
   */
  kill(id: string): void {
    const animation = this.activeAnimations.get(id);
    if (animation) {
      animation.kill();
      this.activeAnimations.delete(id);
    }
  }

  /**
   * Kill all active animations
   */
  killAll(): void {
    this.activeAnimations.forEach((animation) => animation.kill());
    this.activeAnimations.clear();
  }

  /**
   * Pause a specific animation by ID
   */
  pause(id: string): void {
    this.activeAnimations.get(id)?.pause();
  }

  /**
   * Resume a specific animation by ID
   */
  resume(id: string): void {
    this.activeAnimations.get(id)?.resume();
  }

  /**
   * Set playback speed for a specific animation
   * @param speed - Playback speed multiplier (0.5x, 1x, 2x, etc.)
   */
  setSpeed(id: string, speed: number): void {
    const animation = this.activeAnimations.get(id);
    if (animation && 'timeScale' in animation) {
      animation.timeScale(speed);
    }
  }

  /**
   * Set global playback speed for all future animations
   */
  setGlobalSpeed(speed: number): void {
    gsap.globalTimeline.timeScale(speed);
  }

  /**
   * Check if an animation is currently active
   */
  isActive(id: string): boolean {
    return this.activeAnimations.has(id);
  }

  /**
   * Get the number of active animations
   */
  getActiveCount(): number {
    return this.activeAnimations.size;
  }

  /**
   * Pause all active animations
   */
  pauseAll(): void {
    this.activeAnimations.forEach((animation) => animation.pause());
  }

  /**
   * Resume all paused animations
   */
  resumeAll(): void {
    this.activeAnimations.forEach((animation) => animation.resume());
  }
}

// Singleton instance
export const animationManager = new AnimationManager();
