import gsap from 'gsap';
import { GridPosition } from '@/types/grid.types';
import { PositionManager } from './PositionManager';

/**
 * Animation context for tracking individual animations
 */
interface AnimationContext {
  unitId: string;
  type: 'move' | 'attack' | 'damage' | 'death' | 'spawn' | 'scroll';
  transactionId?: string;
  timeline?: gsap.core.Timeline;
  startTime: number;
  promise: Promise<void>;
  resolve?: () => void;
  reject?: (error: Error) => void;
}

/**
 * AnimationCoordinator: Manages all unit animations and ensures they're synchronized with position state
 *
 * This class acts as the bridge between the logical position system (PositionManager)
 * and the visual animation system (GSAP), ensuring animations complete properly and
 * state remains consistent.
 */
export class AnimationCoordinator {
  private activeAnimations: Map<string, AnimationContext> = new Map();
  private positionManager: PositionManager;
  private cellSize: number = 100; // Default cell size

  constructor(positionManager: PositionManager) {
    this.positionManager = positionManager;
  }

  /**
   * Set the cell size for position calculations
   */
  public setCellSize(size: number): void {
    this.cellSize = size;
  }

  /**
   * Animate a unit movement
   */
  public async animateMove(
    unitId: string,
    element: HTMLElement,
    from: GridPosition,
    to: GridPosition,
    transactionId: string,
    duration: number = 0.3
  ): Promise<void> {
    // Wait for any existing animation to complete
    await this.waitForUnit(unitId);

    // Create animation context
    const context = await this.createContext(unitId, 'move', transactionId);

    try {
      // Tell PositionManager animation is starting
      if (!this.positionManager.startAnimation(transactionId)) {
        throw new Error('Failed to start animation in PositionManager');
      }

      // Calculate pixel positions
      const fromX = from.col * this.cellSize;
      const fromY = from.row * this.cellSize;
      const toX = to.col * this.cellSize;
      const toY = to.row * this.cellSize;

      // Create GSAP timeline
      const timeline = gsap.timeline({
        onComplete: () => {
          this.completeAnimation(context);
        },
        onInterrupt: () => {
          this.handleAnimationError(context, new Error('Animation interrupted'));
        }
      });

      context.timeline = timeline;

      // Ensure element is at starting position
      gsap.set(element, {
        left: fromX,
        top: fromY,
        x: 0,
        y: 0
      });

      // Animate to destination
      timeline.to(element, {
        left: toX,
        top: toY,
        duration,
        ease: 'power2.inOut'
      });

      // Wait for animation to complete
      await context.promise;

      // Tell PositionManager animation completed
      this.positionManager.completeTransaction(transactionId);

    } catch (error) {
      console.error(`[AnimationCoordinator] Move animation failed for ${unitId}:`, error);
      // Force sync on error
      this.positionManager.forceSyncVisualToLogical(unitId);
      throw error;
    }
  }

  /**
   * Animate an attack (quick forward and back motion)
   */
  public async animateAttack(
    unitId: string,
    element: HTMLElement,
    direction: 'left' | 'right',
    duration: number = 0.35
  ): Promise<void> {
    await this.waitForUnit(unitId);

    const context = await this.createContext(unitId, 'attack');

    try {
      const distance = direction === 'left' ? -30 : 30;

      const timeline = gsap.timeline({
        onComplete: () => this.completeAnimation(context),
        onInterrupt: () => this.handleAnimationError(context, new Error('Animation interrupted'))
      });

      context.timeline = timeline;

      // Quick dash forward
      timeline.to(element, {
        x: distance,
        duration: duration * 0.4,
        ease: 'power2.out'
      });

      // Return to original position
      timeline.to(element, {
        x: 0,
        duration: duration * 0.6,
        ease: 'power2.in'
      });

      await context.promise;

    } catch (error) {
      console.error(`[AnimationCoordinator] Attack animation failed for ${unitId}:`, error);
      gsap.set(element, { x: 0 }); // Reset on error
      throw error;
    }
  }

  /**
   * Animate damage (shake effect)
   */
  public async animateDamage(
    unitId: string,
    element: HTMLElement,
    duration: number = 0.3
  ): Promise<void> {
    // Damage animations can overlap, so we don't wait
    const context = await this.createContext(unitId, 'damage');

    try {
      const timeline = gsap.timeline({
        onComplete: () => this.completeAnimation(context),
        onInterrupt: () => this.handleAnimationError(context, new Error('Animation interrupted'))
      });

      context.timeline = timeline;

      timeline.fromTo(element,
        { x: -5 },
        {
          x: 5,
          duration: duration / 6,
          repeat: 5,
          yoyo: true,
          ease: 'power1.inOut'
        }
      );

      timeline.set(element, { x: 0 });

      await context.promise;

    } catch (error) {
      console.error(`[AnimationCoordinator] Damage animation failed for ${unitId}:`, error);
      gsap.set(element, { x: 0 });
      throw error;
    }
  }

  /**
   * Animate wave scroll for all units
   */
  public async animateWaveScroll(
    units: Array<{unitId: string, element: HTMLElement}>,
    scrollDistance: number,
    duration: number = 1
  ): Promise<void> {
    // Lock movement during scroll
    this.positionManager.lockMovement();

    const scrollPixels = scrollDistance * this.cellSize;
    const promises: Promise<void>[] = [];

    for (const unit of units) {
      const context = await this.createContext(unit.unitId, 'scroll');

      const promise = new Promise<void>((resolve, reject) => {
        const currentPos = this.positionManager.getVisualPosition(unit.unitId);
        if (!currentPos) {
          reject(new Error(`No position for ${unit.unitId}`));
          return;
        }

        const currentLeft = currentPos.col * this.cellSize;
        const currentTop = currentPos.row * this.cellSize;
        const newLeft = currentLeft - scrollPixels;

        gsap.fromTo(unit.element,
          {
            left: currentLeft,
            top: currentTop
          },
          {
            left: newLeft,
            top: currentTop,
            duration,
            ease: 'ease-in-out',
            onComplete: () => {
              this.completeAnimation(context);
              resolve();
            },
            onInterrupt: () => {
              this.handleAnimationError(context, new Error('Scroll interrupted'));
              reject(new Error('Scroll interrupted'));
            }
          }
        );
      });

      promises.push(promise);
    }

    try {
      // Wait for all scroll animations to complete
      await Promise.all(promises);

      // Update positions in PositionManager
      await this.positionManager.executeWaveScroll(scrollDistance);

    } finally {
      // Always unlock movement
      this.positionManager.unlockMovement();
    }
  }

  /**
   * Sync visual positions to logical positions for all units
   */
  public syncAllVisualPositions(
    units: Array<{unitId: string, element: HTMLElement}>
  ): void {
    for (const unit of units) {
      const logicalPos = this.positionManager.getLogicalPosition(unit.unitId);
      if (logicalPos) {
        gsap.set(unit.element, {
          left: logicalPos.col * this.cellSize,
          top: logicalPos.row * this.cellSize,
          x: 0,
          y: 0
        });
      }
    }
  }

  /**
   * Wait for a unit's current animation to complete
   */
  private async waitForUnit(unitId: string): Promise<void> {
    const existing = this.activeAnimations.get(unitId);
    if (existing) {
      console.log(`[AnimationCoordinator] Waiting for ${unitId}'s ${existing.type} animation`);
      try {
        await existing.promise;
      } catch {
        // Ignore errors from previous animation
      }
    }
  }

  /**
   * Create an animation context
   */
  private async createContext(
    unitId: string,
    type: AnimationContext['type'],
    transactionId?: string
  ): Promise<AnimationContext> {
    let resolve: () => void;
    let reject: (error: Error) => void;

    const promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const context: AnimationContext = {
      unitId,
      type,
      transactionId,
      startTime: Date.now(),
      promise,
      resolve: resolve!,
      reject: reject!
    };

    this.activeAnimations.set(unitId, context);
    return context;
  }

  /**
   * Complete an animation successfully
   */
  private completeAnimation(context: AnimationContext): void {
    this.activeAnimations.delete(context.unitId);
    context.resolve?.();
    console.log(`[AnimationCoordinator] Completed ${context.type} animation for ${context.unitId}`);
  }

  /**
   * Handle animation error
   */
  private handleAnimationError(context: AnimationContext, error: Error): void {
    this.activeAnimations.delete(context.unitId);
    context.reject?.(error);
    console.error(`[AnimationCoordinator] Animation error for ${context.unitId}:`, error);
  }

  /**
   * Check if any unit is animating
   */
  public isAnyUnitAnimating(): boolean {
    return this.activeAnimations.size > 0;
  }

  /**
   * Check if specific unit is animating
   */
  public isUnitAnimating(unitId: string): boolean {
    return this.activeAnimations.has(unitId);
  }

  /**
   * Get all active animations (for debugging)
   */
  public getActiveAnimations(): string[] {
    return Array.from(this.activeAnimations.entries()).map(
      ([unitId, context]) => `${unitId}: ${context.type}`
    );
  }

  /**
   * Force stop all animations
   */
  public stopAllAnimations(): void {
    for (const [unitId, context] of this.activeAnimations) {
      if (context.timeline) {
        context.timeline.kill();
      }
      this.handleAnimationError(context, new Error('Force stopped'));
    }
    this.activeAnimations.clear();
  }
}