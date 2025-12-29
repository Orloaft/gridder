import { GridPosition } from '@/types/grid.types';
import { Rarity } from '@/types/core.types';
import { ParticleManager } from './ParticleManager';

export enum RevealPhase {
  Victory = 'victory',          // 1s - Victory banner with celebration
  Breakdown = 'breakdown',      // 2.5s - Show reward calculation breakdown
  GachaPrepare = 'gacha-prepare', // 0.5s - Gacha machine appears
  GachaSpin = 'gacha-spin',     // Variable - Slot machine spins and reveals items
  Summary = 'summary',          // User controlled - Continue button
  Complete = 'complete',
}

export interface RewardItem {
  id: string;
  name: string;
  rarity: Rarity;
  icon: string;
  value: number;
}

export interface RewardBreakdown {
  baseGold: number;
  waveMultiplier: number;
  wavesCompleted: number;
  medicalCosts: number;
  casualties: number;
  finalGold: number;
}

export interface BattleRewards {
  goldEarned: number;
  gemsEarned: number;
  items: RewardItem[];
  breakdown?: RewardBreakdown; // Optional performance breakdown
}

export interface RevealState {
  phase: RevealPhase;
  phaseStartTime: number;
  currentGoldDisplay: number;
  currentGemDisplay: number;
  revealedItemIndex: number;
  isSkipping: boolean;
  isFastForwarding: boolean;
  // Breakdown animation state
  showBaseGold: boolean;
  showWaveMultiplier: boolean;
  showMedicalCosts: boolean;
  showFinalGold: boolean;
  // Gacha state
  isSpinning: boolean;
  spinningItemIndex: number;
}

export type RevealCallback = (state: RevealState) => void;

/**
 * RewardRevealManager: Orchestrates the gacha-style reward reveal sequence
 *
 * NEW GACHA PHASES:
 * 1. Victory (1s) - Victory banner with celebration
 * 2. Breakdown (2.5s) - Show reward calculation step-by-step
 * 3. Gacha Prepare (0.5s) - Gacha machine appears
 * 4. Gacha Spin (variable) - Slot machine reveals items one by one
 * 5. Summary - Final rewards displayed, user controls continue
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
    [RevealPhase.Victory]: 1000,        // Victory celebration
    [RevealPhase.Breakdown]: 2500,      // Reward breakdown reveal
    [RevealPhase.GachaPrepare]: 500,    // Gacha machine appears
    [RevealPhase.GachaSpin]: 0,         // Variable - depends on items
    [RevealPhase.Summary]: 0,           // User-controlled
  };

  // Gacha timing
  private readonly GACHA_SPIN_TIME = 800;  // Time for slot to spin
  private readonly GACHA_REVEAL_DELAY = 400; // Delay between each item reveal

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
      showBaseGold: false,
      showWaveMultiplier: false,
      showMedicalCosts: false,
      showFinalGold: false,
      isSpinning: false,
      spinningItemIndex: -1,
    };
    console.log('🎮 RewardRevealManager initialized with GACHA phases starting at:', RevealPhase.Victory);
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
   * Skip to Summary phase
   */
  public skip(): void {
    this.state.isSkipping = true;

    // Jump directly to Summary phase, bypassing all animations
    this.state.phase = RevealPhase.Summary;
    this.state.phaseStartTime = Date.now();

    // Trigger Summary phase setup to ensure all values are set
    this.onPhaseEnter(RevealPhase.Summary);

    // Force immediate callback update
    if (this.callback) {
      this.callback(this.state);
      this.lastCallbackTime = Date.now();
    }
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

    // Update particles (but clear them in Summary phase to avoid clutter)
    if (this.state.phase === RevealPhase.Summary) {
      this.particleManager.clear();
    } else {
      this.particleManager.update(effectiveDelta);
    }

    // Throttle callback to reduce React re-renders
    // Only update React ~20 times per second instead of 60
    const timeSinceLastCallback = now - this.lastCallbackTime;
    if (this.callback && timeSinceLastCallback >= this.CALLBACK_THROTTLE_MS) {
      this.callback(this.state);
      this.lastCallbackTime = now;
    }

    // Continue animation loop unless complete or in Summary phase (user-controlled)
    if (this.state.phase !== RevealPhase.Complete && this.state.phase !== RevealPhase.Summary) {
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

      case RevealPhase.Breakdown:
        this.updateBreakdownPhase(phaseElapsed);
        break;

      case RevealPhase.GachaPrepare:
        this.updateGachaPreparePhase(phaseElapsed);
        break;

      case RevealPhase.GachaSpin:
        this.updateGachaSpinPhase(phaseElapsed);
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
      RevealPhase.Breakdown,
      RevealPhase.GachaPrepare,
      RevealPhase.GachaSpin,
      RevealPhase.Summary,
      RevealPhase.Complete,
    ];

    const currentIndex = phaseOrder.indexOf(this.state.phase);
    let nextPhase = phaseOrder[currentIndex + 1];

    // Skip gacha phases if no items
    if (nextPhase === RevealPhase.GachaPrepare && this.rewards.items.length === 0) {
      nextPhase = RevealPhase.Summary;
    }

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
        // Victory celebration - emit big particle burst
        const centerPos: GridPosition = { row: 4, col: 4 };
        this.particleManager.emitConfetti(centerPos, 30);
        break;

      case RevealPhase.Breakdown:
        // Reset breakdown flags
        this.state.showBaseGold = false;
        this.state.showWaveMultiplier = false;
        this.state.showMedicalCosts = false;
        this.state.showFinalGold = false;
        this.state.currentGoldDisplay = 0;
        this.state.currentGemDisplay = 0;
        break;

      case RevealPhase.GachaPrepare:
        // Gacha machine appears
        const gachaPos: GridPosition = { row: 3, col: 3 };
        this.particleManager.emitSparkles(gachaPos, 10);
        break;

      case RevealPhase.GachaSpin:
        // Reset item reveal state
        this.state.revealedItemIndex = -1;
        this.state.spinningItemIndex = -1;
        this.state.isSpinning = false;
        break;

      case RevealPhase.Summary:
        // Ensure all values are at final amounts
        this.state.currentGoldDisplay = this.rewards.goldEarned;
        this.state.currentGemDisplay = this.rewards.gemsEarned;
        this.state.revealedItemIndex = this.rewards.items.length > 0 ? this.rewards.items.length - 1 : -1;
        this.state.isSpinning = false;
        break;
    }
  }

  // ========================================
  // Phase Update Logic
  // ========================================

  private updateVictoryPhase(elapsed: number): void {
    const duration = this.PHASE_DURATIONS[RevealPhase.Victory];

    // Continuous sparkle emission during victory
    if (elapsed % 100 < 16) { // Roughly every 100ms
      const randomRow = Math.floor(Math.random() * 8);
      const randomCol = Math.floor(Math.random() * 8);
      this.particleManager.emitSparkles({ row: randomRow, col: randomCol }, 2);
    }

    if (elapsed >= duration) {
      this.advancePhase();
    }
  }

  private updateBreakdownPhase(elapsed: number): void {
    const duration = this.PHASE_DURATIONS[RevealPhase.Breakdown];

    // Staggered reveal of breakdown components
    if (elapsed >= 300 && !this.state.showBaseGold) {
      this.state.showBaseGold = true;
      // Emit coin particles
      const pos: GridPosition = { row: 2, col: 1 };
      this.particleManager.emitCoinDrop(pos, 5);
    }

    if (elapsed >= 900 && !this.state.showWaveMultiplier) {
      this.state.showWaveMultiplier = true;
      // Emit sparkles
      const pos: GridPosition = { row: 3, col: 1 };
      this.particleManager.emitSparkles(pos, 8);
    }

    if (elapsed >= 1500 && !this.state.showMedicalCosts && this.rewards.breakdown?.casualties && this.rewards.breakdown.casualties > 0) {
      this.state.showMedicalCosts = true;
      // Emit warning particles
      const pos: GridPosition = { row: 4, col: 1 };
      this.particleManager.emitSparkles(pos, 5);
    }

    if (elapsed >= 2000 && !this.state.showFinalGold) {
      this.state.showFinalGold = true;
      // Animate final gold counter
      const pos: GridPosition = { row: 5, col: 2 };
      this.particleManager.emitConfetti(pos, 15);
    }

    // Animate final gold counter when it appears
    if (this.state.showFinalGold) {
      const finalGoldProgress = Math.min((elapsed - 2000) / 500, 1.0);
      const easeProgress = 1 - Math.pow(1 - finalGoldProgress, 3);
      this.state.currentGoldDisplay = Math.floor(this.rewards.goldEarned * easeProgress);
    }

    // Animate gems (parallel with breakdown)
    if (this.rewards.gemsEarned > 0 && elapsed > 500) {
      const gemProgress = Math.min((elapsed - 500) / 1500, 1.0);
      const gemEaseProgress = 1 - Math.pow(1 - gemProgress, 3);
      this.state.currentGemDisplay = Math.floor(this.rewards.gemsEarned * gemEaseProgress);

      // Emit gem particles once
      if (elapsed >= 500 && elapsed < 700) {
        const gemPos: GridPosition = { row: 2, col: 6 };
        this.particleManager.emitGemSpiral(gemPos, 5);
      }
    }

    if (elapsed >= duration) {
      this.state.currentGoldDisplay = this.rewards.goldEarned;
      this.state.currentGemDisplay = this.rewards.gemsEarned;
      this.advancePhase();
    }
  }

  private updateGachaPreparePhase(elapsed: number): void {
    const duration = this.PHASE_DURATIONS[RevealPhase.GachaPrepare];

    if (elapsed >= duration) {
      this.advancePhase();
    }
  }

  private updateGachaSpinPhase(elapsed: number): void {
    // If no items, advance immediately
    if (this.rewards.items.length === 0) {
      this.advancePhase();
      return;
    }

    // Calculate which item should be spinning/revealed
    const itemIndex = Math.floor(elapsed / (this.GACHA_SPIN_TIME + this.GACHA_REVEAL_DELAY));

    // Check if we're done with all items
    if (itemIndex >= this.rewards.items.length) {
      // All items revealed - advance to summary
      this.state.isSpinning = false;
      this.state.revealedItemIndex = this.rewards.items.length - 1;
      this.advancePhase();
      return;
    }

    const itemElapsed = elapsed - (itemIndex * (this.GACHA_SPIN_TIME + this.GACHA_REVEAL_DELAY));

    // Update spinning state
    if (itemElapsed < this.GACHA_SPIN_TIME) {
      // Currently spinning this item
      if (this.state.spinningItemIndex !== itemIndex) {
        this.state.spinningItemIndex = itemIndex;
        this.state.isSpinning = true;
      }
    } else {
      // Item has been revealed
      if (this.state.revealedItemIndex < itemIndex) {
        this.state.revealedItemIndex = itemIndex;
        this.state.isSpinning = false;

        // Emit particles when item is revealed
        const item = this.rewards.items[itemIndex];
        const itemCol = Math.min(itemIndex, 7);
        const itemPos: GridPosition = { row: 5, col: itemCol };

        switch (item.rarity) {
          case Rarity.Mythic:
            // Mythic items get the most impressive particle effect
            this.particleManager.emitRainbow(itemPos, 50);
            break;
          case Rarity.Legendary:
            this.particleManager.emitRainbow(itemPos, 30);
            break;
          case Rarity.Rare:
            this.particleManager.emitConfetti(itemPos, 15);
            break;
          case Rarity.Uncommon:
            this.particleManager.emitSparkles(itemPos, 10);
            break;
          default:
            this.particleManager.emitSparkles(itemPos, 5);
            break;
        }
      }
    }
  }
}
