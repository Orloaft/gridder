/**
 * BattleAnimationPlayer
 *
 * Takes a sequence of battle actions from the simulator and plays them back
 * as smooth, synchronized animations.
 *
 * Features:
 * - Queued animations with proper timing
 * - Speed control (1x, 2x, 4x)
 * - Pause/resume support
 * - Progress callbacks
 */

import { BattleAction } from './DeterministicBattleSimulator';
import { animateTileSlide, animateAttack, animateDamage, animateDeath } from '@/animations/tileAnimations';
import gsap from 'gsap';

export interface AnimationOptions {
  cellSize: number;
  speed: number; // 1 = normal, 2 = double speed, etc.
  onActionComplete?: (action: BattleAction, index: number) => void;
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
}

interface AnimationStep {
  action: BattleAction;
  duration: number;
  animate: () => Promise<void>;
}

export class BattleAnimationPlayer {
  private actions: BattleAction[] = [];
  private currentIndex: number = 0;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private options: AnimationOptions;
  private animationSteps: AnimationStep[] = [];
  private activeAnimations: gsap.core.Tween[] = [];

  constructor(options: AnimationOptions) {
    this.options = options;
  }

  /**
   * Load a sequence of actions to animate
   */
  public loadActions(actions: BattleAction[]) {
    this.actions = actions;
    this.currentIndex = 0;
    this.animationSteps = this.buildAnimationSteps(actions);
  }

  /**
   * Build animation steps from actions
   */
  private buildAnimationSteps(actions: BattleAction[]): AnimationStep[] {
    const steps: AnimationStep[] = [];

    // Group actions by tick for simultaneous animations
    const actionsByTick = new Map<number, BattleAction[]>();
    for (const action of actions) {
      const tick = action.tick;
      if (!actionsByTick.has(tick)) {
        actionsByTick.set(tick, []);
      }
      actionsByTick.get(tick)!.push(action);
    }

    // Create animation steps for each tick
    for (const [tick, tickActions] of actionsByTick) {
      // Group simultaneous actions
      const moves = tickActions.filter(a => a.type === 'move');
      const attacks = tickActions.filter(a => a.type === 'attack');
      const damages = tickActions.filter(a => a.type === 'damage');
      const deaths = tickActions.filter(a => a.type === 'death');
      const spawns = tickActions.filter(a => a.type === 'spawn');

      // Spawns happen first
      if (spawns.length > 0) {
        steps.push({
          action: spawns[0], // Representative action
          duration: 500 / this.options.speed,
          animate: () => this.animateSpawns(spawns)
        });
      }

      // Moves happen simultaneously
      if (moves.length > 0) {
        steps.push({
          action: moves[0], // Representative action
          duration: 300 / this.options.speed,
          animate: () => this.animateMoves(moves)
        });
      }

      // Attacks happen after moves
      for (const attack of attacks) {
        steps.push({
          action: attack,
          duration: 400 / this.options.speed,
          animate: () => this.animateAttack(attack)
        });
      }

      // Damage effects
      for (const damage of damages) {
        steps.push({
          action: damage,
          duration: 200 / this.options.speed,
          animate: () => this.animateDamage(damage)
        });
      }

      // Death animations
      for (const death of deaths) {
        steps.push({
          action: death,
          duration: 500 / this.options.speed,
          animate: () => this.animateDeath(death)
        });
      }
    }

    return steps;
  }

  /**
   * Start playing the animation sequence
   */
  public async play() {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.isPaused = false;

    while (this.currentIndex < this.animationSteps.length && !this.isPaused) {
      const step = this.animationSteps[this.currentIndex];

      // Execute animation
      await step.animate();

      // Callback
      this.options.onActionComplete?.(step.action, this.currentIndex);

      // Update progress
      const progress = (this.currentIndex + 1) / this.animationSteps.length;
      this.options.onProgress?.(progress);

      this.currentIndex++;

      // Small delay between steps for visual clarity
      if (this.currentIndex < this.animationSteps.length) {
        await this.delay(50 / this.options.speed);
      }
    }

    if (this.currentIndex >= this.animationSteps.length) {
      this.isPlaying = false;
      this.options.onComplete?.();
    }
  }

  /**
   * Pause the animation
   */
  public pause() {
    this.isPaused = true;
    this.activeAnimations.forEach(tween => tween.pause());
  }

  /**
   * Resume the animation
   */
  public resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.activeAnimations.forEach(tween => tween.resume());
    this.play(); // Continue playing from current index
  }

  /**
   * Stop and reset the animation
   */
  public stop() {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentIndex = 0;
    this.activeAnimations.forEach(tween => tween.kill());
    this.activeAnimations = [];
  }

  /**
   * Set playback speed
   */
  public setSpeed(speed: number) {
    this.options.speed = speed;
    // Update currently playing animations
    this.activeAnimations.forEach(tween => {
      tween.timeScale(speed);
    });
  }

  // ============= Animation Methods =============

  /**
   * Animate multiple units moving simultaneously
   */
  private async animateMoves(moves: BattleAction[]): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const action of moves) {
      if (action.type !== 'move') continue;

      const element = this.findUnitElement(action.unitId);
      if (!element) {
        console.error(`[AnimateMoves] Cannot find element for unit ${action.unitId}`);
        continue;
      }

      const wrapper = element.parentElement as HTMLElement;
      if (!wrapper) {
        console.error(`[AnimateMoves] Cannot find wrapper for unit ${action.unitId}`);
        continue;
      }

      console.log(`[AnimateMoves] Animating ${action.unitName} from (${action.from.row},${action.from.col}) to (${action.to.row},${action.to.col})`);

      promises.push(new Promise(resolve => {
        animateTileSlide(
          wrapper,
          action.from,
          action.to,
          this.options.cellSize,
          0.3 / this.options.speed,
          () => resolve()
        );
      }));
    }

    await Promise.all(promises);
  }

  /**
   * Animate an attack
   */
  private async animateAttack(action: BattleAction): Promise<void> {
    if (action.type !== 'attack') return;

    const attackerEl = this.findUnitElement(action.attackerId);
    const targetEl = this.findUnitElement(action.targetId);

    if (!attackerEl || !targetEl) return;

    return new Promise(resolve => {
      // Determine attack direction
      const attackerWrapper = attackerEl.parentElement as HTMLElement;
      const targetWrapper = targetEl.parentElement as HTMLElement;

      if (!attackerWrapper || !targetWrapper) {
        resolve();
        return;
      }

      const attackerX = parseFloat(attackerWrapper.style.left);
      const targetX = parseFloat(targetWrapper.style.left);
      const direction = targetX > attackerX ? 'right' : 'left';

      animateAttack(attackerEl, direction, () => resolve());
    });
  }

  /**
   * Animate damage effect
   */
  private async animateDamage(action: BattleAction): Promise<void> {
    if (action.type !== 'damage') return;

    const targetEl = this.findUnitElement(action.targetId);
    if (!targetEl) return;

    return new Promise(resolve => {
      animateDamage(targetEl, () => resolve());
    });
  }

  /**
   * Animate death
   */
  private async animateDeath(action: BattleAction): Promise<void> {
    if (action.type !== 'death') return;

    const unitEl = this.findUnitElement(action.unitId);
    if (!unitEl) return;

    return new Promise(resolve => {
      animateDeath(unitEl, () => resolve());
    });
  }

  /**
   * Animate units spawning
   */
  private async animateSpawns(spawns: BattleAction[]): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const action of spawns) {
      if (action.type !== 'spawn') continue;

      const element = this.findUnitElement(action.unitId);
      if (!element) {
        console.error(`[AnimateSpawns] Cannot find element for unit ${action.unitId}`);
        continue;
      }

      const wrapper = element.parentElement as HTMLElement;
      if (!wrapper) {
        console.error(`[AnimateSpawns] Cannot find wrapper for unit ${action.unitId}`);
        continue;
      }

      // Start from off-screen for enemies
      const startPos = action.isHero ? action.position : { ...action.position, col: 8 };

      console.log(`[AnimateSpawns] Spawning ${action.unitName} (${action.isHero ? 'hero' : 'enemy'}) from (${startPos.row},${startPos.col}) to (${action.position.row},${action.position.col})`);

      // For heroes, they should already be at their position, no animation needed
      // For enemies, they should slide in from off-screen
      if (!action.isHero) {
        promises.push(new Promise(resolve => {
          animateTileSlide(
            wrapper,
            startPos,
            action.position,
            this.options.cellSize,
            0.5 / this.options.speed,
            () => resolve()
          );
        }));
      } else {
        // Heroes start at their position, no slide needed
        console.log(`[AnimateSpawns] Hero ${action.unitName} already at position, skipping slide`);
      }
    }

    await Promise.all(promises);
  }

  /**
   * Animate wave transition
   */
  private async animateWaveTransition(action: BattleAction): Promise<void> {
    if (action.type !== 'wave-transition') return;

    const promises: Promise<void>[] = [];

    // Animate all unit movements
    for (const movement of action.unitMovements) {
      const element = this.findUnitElement(movement.unitId);
      if (!element) continue;

      const wrapper = element.parentElement as HTMLElement;
      if (!wrapper) continue;

      promises.push(new Promise(resolve => {
        animateTileSlide(
          wrapper,
          movement.from,
          movement.to,
          this.options.cellSize,
          1.0 / this.options.speed, // Longer duration for wave transitions
          () => resolve()
        );
      }));
    }

    // Also trigger background scroll
    window.dispatchEvent(new CustomEvent('waveTransition', {
      detail: {
        waveNumber: action.waveNumber,
        scrollDistance: action.scrollDistance * this.options.cellSize,
        duration: 1000 / this.options.speed
      }
    }));

    await Promise.all(promises);
  }

  // ============= Helper Methods =============

  /**
   * Find DOM element for a unit
   */
  private findUnitElement(unitId: string): HTMLElement | null {
    const element = document.querySelector(`[data-unit-id="${unitId}"]`) as HTMLElement | null;

    if (!element) {
      console.warn(`[AnimationPlayer] Element not found for ${unitId}`);
    }

    return element;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current progress
   */
  public getProgress(): number {
    if (this.animationSteps.length === 0) return 0;
    return this.currentIndex / this.animationSteps.length;
  }

  /**
   * Get total duration of animation sequence
   */
  public getTotalDuration(): number {
    return this.animationSteps.reduce((sum, step) => sum + step.duration, 0);
  }
}