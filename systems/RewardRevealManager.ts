import { GridPosition } from '@/types/grid.types';
import { Rarity } from '@/types/core.types';
import { ParticleManager } from './ParticleManager';

export enum RevealPhase {
  Victory = 'victory',
  GoldCounter = 'gold-counter',
  GemCounter = 'gem-counter',
  ChestAppear = 'chest-appear',
  ItemReveal = 'item-reveal',
  Summary = 'summary',
  Complete = 'complete',
}

export interface RewardItem {
  id: string;
  name: string;
  rarity: Rarity;
  icon: string;
  value: number;
}

export interface BattleRewards {
  goldEarned: number;
  gemsEarned: number;
  items: RewardItem[];
}

export interface RevealState {
  phase: RevealPhase;
  phaseStartTime: number;
  currentGoldDisplay: number;
  currentGemDisplay: number;
  revealedItemIndex: number;
  isSkipping: boolean;
  isFastForwarding: boolean;
}

export type RevealCallback = (state: RevealState) => void;

/**
 * RewardRevealManager: Orchestrates the multi-phase reward reveal sequence
 *
 * Phases:
 * 0. Victory (1s) - Grid flash with victory banner
 * 1. Gold Counter (2-3s) - Coin drop, counter tick-up, particles
 * 2. Gem Counter (2-3s) - Gem spiral, counter tick-up, rainbow particles
 * 3. Chest Appear (1s) - Chest drop, bounce, shake, lid open
 * 4. Item Reveal (variable) - Slot machine reveals for each item
 * 5. Summary - Total value display, continue button
 */
export class RewardRevealManager {
  private rewards: BattleRewards;
  private state: RevealState;
  private particleManager: ParticleManager;
  private callback: RevealCallback | null = null;
  private animationFrameId: number | null = null;
  private lastUpdateTime: number = 0;
  private lastCallbackTime: number = 0;
  private readonly CALLBACK_THROTTLE_MS = 50; // Update React only 20 times per second instead of 60

  // Phase durations (milliseconds)
  private readonly PHASE_DURATIONS = {
    [RevealPhase.Victory]: 1000,
    [RevealPhase.GoldCounter]: 2500,
    [RevealPhase.GemCounter]: 2500,
    [RevealPhase.ChestAppear]: 1000,
    [RevealPhase.ItemReveal]: 0, // Variable per item
    [RevealPhase.Summary]: 0, // User-controlled
  };

  // Item reveal durations by rarity
  private readonly ITEM_REVEAL_DURATIONS: Record<Rarity, number> = {
    [Rarity.Common]: 1000,
    [Rarity.Uncommon]: 1500,
    [Rarity.Rare]: 2000,
    [Rarity.Epic]: 2500,
    [Rarity.Legendary]: 4000,
  };

  constructor(rewards: BattleRewards) {
    this.rewards = rewards;
    this.particleManager = new ParticleManager();
    this.state = {
      phase: RevealPhase.Victory,
      phaseStartTime: 0,
      currentGoldDisplay: 0,
      currentGemDisplay: 0,
      revealedItemIndex: -1,
      isSkipping: false,
      isFastForwarding: false,
    };
  }

  /**
   * Start the reward reveal sequence
   */
  public start(callback: RevealCallback): void {
    this.callback = callback;
    this.state.phaseStartTime = Date.now();
    this.lastUpdateTime = Date.now();

    // Start animation loop
    this.animate();
  }

  /**
   * Skip to next phase
   */
  public skip(): void {
    this.state.isSkipping = true;
    this.advancePhase();
  }

  /**
   * Toggle fast-forward (2x speed)
   */
  public toggleFastForward(): void {
    this.state.isFastForwarding = !this.state.isFastForwarding;
  }

  /**
   * Stop the reveal sequence
   */
  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.particleManager.clear();
  }

  /**
   * Get current state
   */
  public getState(): RevealState {
    return { ...this.state };
  }

  /**
   * Get particle manager for rendering
   */
  public getParticleManager(): ParticleManager {
    return this.particleManager;
  }

  /**
   * Get rewards data
   */
  public getRewards(): BattleRewards {
    return this.rewards;
  }

  // ========================================
  // Animation Loop
  // ========================================

  private animate = (): void => {
    const now = Date.now();
    const deltaTime = now - this.lastUpdateTime;
    this.lastUpdateTime = now;

    // Apply fast-forward multiplier
    const effectiveDelta = this.state.isFastForwarding ? deltaTime * 2 : deltaTime;

    // Update current phase
    this.updatePhase(effectiveDelta);

    // Update particles
    this.particleManager.update(effectiveDelta);

    // Throttle callback to reduce React re-renders
    // Only update React ~20 times per second instead of 60
    const timeSinceLastCallback = now - this.lastCallbackTime;
    if (this.callback && timeSinceLastCallback >= this.CALLBACK_THROTTLE_MS) {
      this.callback(this.state);
      this.lastCallbackTime = now;
    }

    // Continue animation loop unless complete
    if (this.state.phase !== RevealPhase.Complete) {
      this.animationFrameId = requestAnimationFrame(this.animate);
    }
  };

  // ========================================
  // Phase Management
  // ========================================

  private updatePhase(deltaTime: number): void {
    const phaseElapsed = Date.now() - this.state.phaseStartTime;

    switch (this.state.phase) {
      case RevealPhase.Victory:
        this.updateVictoryPhase(phaseElapsed);
        break;

      case RevealPhase.GoldCounter:
        this.updateGoldCounterPhase(phaseElapsed);
        break;

      case RevealPhase.GemCounter:
        this.updateGemCounterPhase(phaseElapsed);
        break;

      case RevealPhase.ChestAppear:
        this.updateChestAppearPhase(phaseElapsed);
        break;

      case RevealPhase.ItemReveal:
        this.updateItemRevealPhase(phaseElapsed);
        break;

      case RevealPhase.Summary:
        // User-controlled, don't auto-advance
        break;

      case RevealPhase.Complete:
        // Done
        break;
    }
  }

  private advancePhase(): void {
    const phaseOrder = [
      RevealPhase.Victory,
      RevealPhase.GoldCounter,
      RevealPhase.GemCounter,
      RevealPhase.ChestAppear,
      RevealPhase.ItemReveal,
      RevealPhase.Summary,
      RevealPhase.Complete,
    ];

    const currentIndex = phaseOrder.indexOf(this.state.phase);
    const nextPhase = phaseOrder[currentIndex + 1];

    if (nextPhase) {
      this.state.phase = nextPhase;
      this.state.phaseStartTime = Date.now();
      this.state.isSkipping = false;

      // Trigger phase-specific setup
      this.onPhaseEnter(nextPhase);

      // Force immediate callback update on phase change
      if (this.callback) {
        this.callback(this.state);
        this.lastCallbackTime = Date.now();
      }
    }
  }

  private onPhaseEnter(phase: RevealPhase): void {
    switch (phase) {
      case RevealPhase.Victory:
        // Flash effect
        break;

      case RevealPhase.GoldCounter:
        this.state.currentGoldDisplay = 0;
        break;

      case RevealPhase.GemCounter:
        this.state.currentGemDisplay = 0;
        break;

      case RevealPhase.ChestAppear:
        // Prepare chest animation
        break;

      case RevealPhase.ItemReveal:
        this.state.revealedItemIndex = -1;
        break;

      case RevealPhase.Summary:
        // Show final totals
        break;
    }
  }

  // ========================================
  // Phase Update Logic
  // ========================================

  private updateVictoryPhase(elapsed: number): void {
    const duration = this.PHASE_DURATIONS[RevealPhase.Victory];

    if (elapsed >= duration) {
      this.advancePhase();
    }
  }

  private updateGoldCounterPhase(elapsed: number): void {
    const duration = this.PHASE_DURATIONS[RevealPhase.GoldCounter];
    const progress = Math.min(elapsed / duration, 1.0);

    // Tick up gold counter
    this.state.currentGoldDisplay = Math.floor(this.rewards.goldEarned * progress);

    // Emit coin particles at start
    if (elapsed < 200 && elapsed > 0) {
      // Particles emitted in first 200ms
      const centerPos: GridPosition = { row: 4, col: 6 };
      this.particleManager.emitCoinDrop(centerPos, 5);
    }

    // Lock-in effect at 90% progress
    if (progress >= 0.9 && this.state.currentGoldDisplay < this.rewards.goldEarned) {
      this.state.currentGoldDisplay = this.rewards.goldEarned;
      const centerPos: GridPosition = { row: 4, col: 6 };
      this.particleManager.emitSparkles(centerPos, 8);
    }

    if (elapsed >= duration) {
      this.state.currentGoldDisplay = this.rewards.goldEarned;
      this.advancePhase();
    }
  }

  private updateGemCounterPhase(elapsed: number): void {
    const duration = this.PHASE_DURATIONS[RevealPhase.GemCounter];
    const progress = Math.min(elapsed / duration, 1.0);

    // Tick up gem counter
    this.state.currentGemDisplay = Math.floor(this.rewards.gemsEarned * progress);

    // Emit gem spiral at start
    if (elapsed < 200 && elapsed > 0) {
      const centerPos: GridPosition = { row: 4, col: 8 };
      this.particleManager.emitGemSpiral(centerPos, 8);
    }

    // Lock-in effect at 90% progress
    if (progress >= 0.9 && this.state.currentGemDisplay < this.rewards.gemsEarned) {
      this.state.currentGemDisplay = this.rewards.gemsEarned;
      const centerPos: GridPosition = { row: 4, col: 8 };
      this.particleManager.emitSparkles(centerPos, 8);
    }

    if (elapsed >= duration) {
      this.state.currentGemDisplay = this.rewards.gemsEarned;
      this.advancePhase();
    }
  }

  private updateChestAppearPhase(elapsed: number): void {
    const duration = this.PHASE_DURATIONS[RevealPhase.ChestAppear];

    // Chest drop and bounce animation handled by layout
    // We just emit particles when chest appears

    if (elapsed < 100 && elapsed > 0) {
      const chestPos: GridPosition = { row: 6, col: 6 };
      this.particleManager.emitSparkles(chestPos, 5);
    }

    if (elapsed >= duration) {
      this.advancePhase();
    }
  }

  private updateItemRevealPhase(elapsed: number): void {
    // If no items, skip immediately to summary
    if (this.rewards.items.length === 0) {
      this.advancePhase();
      return;
    }

    // Check if we need to start revealing the next item
    if (this.state.revealedItemIndex < this.rewards.items.length - 1) {
      const nextItemIndex = this.state.revealedItemIndex + 1;
      const nextItem = this.rewards.items[nextItemIndex];
      const itemDuration = this.ITEM_REVEAL_DURATIONS[nextItem.rarity];

      // Check if enough time has passed for current item
      if (this.state.revealedItemIndex === -1 || elapsed >= itemDuration) {
        // Advance to next item
        this.state.revealedItemIndex = nextItemIndex;
        this.state.phaseStartTime = Date.now(); // Reset timer for this item

        // Emit particles based on rarity
        this.emitItemRevealParticles(nextItem, nextItemIndex);
      }
    } else {
      // All items revealed - get the last revealed item
      const lastItem = this.rewards.items[this.state.revealedItemIndex];
      if (lastItem) {
        const itemDuration = this.ITEM_REVEAL_DURATIONS[lastItem.rarity];

        if (elapsed >= itemDuration) {
          this.advancePhase();
        }
      } else {
        // Safety check - if lastItem is undefined, advance immediately
        this.advancePhase();
      }
    }
  }

  private emitItemRevealParticles(item: RewardItem, index: number): void {
    const itemPos: GridPosition = { row: 8, col: index };

    switch (item.rarity) {
      case Rarity.Common:
        this.particleManager.emitSparkles(itemPos, 3);
        break;
      case Rarity.Uncommon:
        this.particleManager.emitSparkles(itemPos, 5);
        break;
      case Rarity.Rare:
        this.particleManager.emitSparkles(itemPos, 8);
        break;
      case Rarity.Epic:
        this.particleManager.emitConfetti(itemPos, 12);
        break;
      case Rarity.Legendary:
        this.particleManager.emitRainbow(itemPos, 30);
        break;
    }
  }
}
