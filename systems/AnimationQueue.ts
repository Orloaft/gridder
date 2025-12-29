/**
 * AnimationQueue - Ensures animations happen sequentially with position locks
 *
 * This queue processes animations one at a time, ensuring that position
 * updates and visual animations stay perfectly synchronized.
 */

import { Position } from '@/systems/PositionStore';
import { animateTileSlide, animateAttack, animateDamage, animateDeath } from '@/animations/tileAnimations';

export interface AnimationTask {
  id: string;
  type: 'move' | 'attack' | 'damage' | 'death' | 'spawn' | 'batch-move';
  unitId: string;
  from?: Position;
  to?: Position;
  moveId?: string; // Associated move transaction ID
  direction?: 'left' | 'right';
  onComplete?: () => void;
  priority?: number; // Lower numbers = higher priority
}

interface QueuedAnimation extends AnimationTask {
  promise: {
    resolve: (value: void) => void;
    reject: (reason?: any) => void;
  };
}

export class AnimationQueue {
  private queue: QueuedAnimation[] = [];
  private isProcessing: boolean = false;
  private currentAnimation: QueuedAnimation | null = null;
  private cellSize: number = 60; // Default cell size

  constructor(cellSize: number = 60) {
    this.cellSize = cellSize;
  }

  /**
   * Add an animation to the queue
   * Returns a promise that resolves when the animation completes
   */
  async enqueue(task: AnimationTask): Promise<void> {
    return new Promise((resolve, reject) => {
      const queuedAnimation: QueuedAnimation = {
        ...task,
        id: task.id || `${task.type}_${task.unitId}_${Date.now()}`,
        promise: { resolve, reject }
      };

      // Insert based on priority
      if (task.priority !== undefined) {
        const insertIndex = this.queue.findIndex(item =>
          (item.priority ?? Infinity) > (task.priority ?? Infinity)
        );
        if (insertIndex === -1) {
          this.queue.push(queuedAnimation);
        } else {
          this.queue.splice(insertIndex, 0, queuedAnimation);
        }
      } else {
        this.queue.push(queuedAnimation);
      }

      console.log(`[AnimationQueue] Enqueued ${task.type} for ${task.unitId}, queue length: ${this.queue.length}`);

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process animations from the queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      this.currentAnimation = this.queue.shift()!;

      try {
        console.log(`[AnimationQueue] Processing ${this.currentAnimation.type} for ${this.currentAnimation.unitId}`);
        await this.executeAnimation(this.currentAnimation);

        // Resolve the promise
        this.currentAnimation.promise.resolve();

        // Call onComplete callback if provided
        this.currentAnimation.onComplete?.();
      } catch (error) {
        console.error(`[AnimationQueue] Animation failed:`, error);
        this.currentAnimation.promise.reject(error);
      }
    }

    this.currentAnimation = null;
    this.isProcessing = false;
  }

  /**
   * Execute a single animation
   */
  private async executeAnimation(task: QueuedAnimation): Promise<void> {
    // Find the element to animate
    const element = this.findElement(task.unitId);
    if (!element) {
      console.warn(`[AnimationQueue] Element not found for unit ${task.unitId}`);
      return;
    }

    // Get the wrapper element (parent of the card)
    const wrapper = element.parentElement;
    if (!wrapper || !(wrapper instanceof HTMLElement)) {
      console.warn(`[AnimationQueue] Wrapper not found for unit ${task.unitId}`);
      return;
    }

    switch (task.type) {
      case 'move':
        if (task.from && task.to) {
          await this.animateMove(wrapper, task.from, task.to);
        }
        break;

      case 'attack':
        await this.animateAttackEffect(element, task.direction || 'right');
        break;

      case 'damage':
        await this.animateDamageEffect(element);
        break;

      case 'death':
        await this.animateDeathEffect(element);
        break;

      case 'spawn':
        if (task.from && task.to) {
          await this.animateSpawn(wrapper, task.from, task.to);
        }
        break;

      case 'batch-move':
        // For batch moves (like wave transitions), we might want special handling
        if (task.from && task.to) {
          await this.animateMove(wrapper, task.from, task.to, 1.0); // Longer duration for wave transitions
        }
        break;
    }
  }

  /**
   * Find the DOM element for a unit
   */
  private findElement(unitId: string): HTMLElement | null {
    return document.querySelector(`[data-unit-id="${unitId}"]`);
  }

  /**
   * Animate a unit moving from one position to another
   */
  private animateMove(wrapper: HTMLElement, from: Position, to: Position, duration: number = 0.3): Promise<void> {
    return new Promise((resolve) => {
      animateTileSlide(
        wrapper,
        from,
        to,
        this.cellSize,
        duration,
        () => resolve()
      );
    });
  }

  /**
   * Animate an attack effect
   */
  private animateAttackEffect(element: HTMLElement, direction: 'left' | 'right'): Promise<void> {
    return new Promise((resolve) => {
      animateAttack(element, direction, () => resolve());
    });
  }

  /**
   * Animate damage effect
   */
  private animateDamageEffect(element: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      animateDamage(element, () => resolve());
    });
  }

  /**
   * Animate death effect
   */
  private animateDeathEffect(element: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      animateDeath(element, () => resolve());
    });
  }

  /**
   * Animate a unit spawning (sliding in from off-screen)
   */
  private animateSpawn(wrapper: HTMLElement, from: Position, to: Position): Promise<void> {
    return new Promise((resolve) => {
      // Start from off-screen position
      const offscreenFrom = { ...from, col: 8 }; // Col 8 is off-screen right
      animateTileSlide(
        wrapper,
        offscreenFrom,
        to,
        this.cellSize,
        0.5, // Spawn animations are slightly longer
        () => resolve()
      );
    });
  }

  /**
   * Clear all pending animations
   */
  clearQueue(): void {
    // Reject all pending animations
    this.queue.forEach(animation => {
      animation.promise.reject(new Error('Animation queue cleared'));
    });

    this.queue = [];
    console.log('[AnimationQueue] Queue cleared');
  }

  /**
   * Get the current queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Check if currently processing animations
   */
  isAnimating(): boolean {
    return this.isProcessing;
  }

  /**
   * Get the current animation being processed
   */
  getCurrentAnimation(): AnimationTask | null {
    return this.currentAnimation;
  }

  /**
   * Update cell size (for responsive layouts)
   */
  setCellSize(cellSize: number): void {
    this.cellSize = cellSize;
  }

  /**
   * Batch enqueue multiple animations
   * Useful for wave transitions where many units move at once
   */
  async enqueueBatch(tasks: AnimationTask[]): Promise<void> {
    console.log(`[AnimationQueue] Batch enqueuing ${tasks.length} animations`);

    // Add all tasks to queue
    const promises = tasks.map(task => this.enqueue(task));

    // Wait for all to complete
    await Promise.all(promises);
  }

  /**
   * Priority enqueue - adds an animation with high priority
   */
  async enqueuePriority(task: AnimationTask): Promise<void> {
    return this.enqueue({ ...task, priority: 0 });
  }
}