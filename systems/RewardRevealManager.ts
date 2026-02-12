import { Rarity } from '@/types/core.types';

// ========================================
// Phase & State Types
// ========================================

export enum RevealPhase {
  VictorySplash = 'victory-splash',     // 1.5s - Dramatic victory text + effects
  CurrencyReveal = 'currency-reveal',   // 2.5s - Gold/gem counters roll up
  ItemReveal = 'item-reveal',           // Variable - Orb reveal per item
  Summary = 'summary',                  // User-controlled - Final display
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
  breakdown?: RewardBreakdown;
}

export interface RevealState {
  phase: RevealPhase;
  phaseStartTime: number;

  // Currency
  currentGoldDisplay: number;
  currentGemDisplay: number;

  // Breakdown stagger (0 = none shown, 1 = base, 2 = multiplier, 3 = medical, 4 = final)
  breakdownStep: number;

  // Item reveal
  currentItemIndex: number;       // -1 = none, 0+ = which item
  itemRevealStep: 'waiting' | 'anticipation' | 'reveal' | 'fly' | 'done';
  revealedItemCount: number;      // How many items have landed on grid

  // Control
  isSkipping: boolean;
}

// Pause duration between item reveals, by rarity
const RARITY_PAUSE: Record<string, number> = {
  [Rarity.Common]: 200,
  [Rarity.Uncommon]: 300,
  [Rarity.Rare]: 500,
  [Rarity.Legendary]: 800,
  [Rarity.Mythic]: 1200,
};

// ========================================
// Callbacks
// ========================================

export type StateCallback = (state: RevealState) => void;
export type ItemRevealCallback = (item: RewardItem, index: number) => void;
export type PhaseChangeCallback = (phase: RevealPhase, state: RevealState) => void;

// ========================================
// Manager
// ========================================

/**
 * RewardRevealManager: Orchestrates the reward reveal sequence.
 *
 * Phases:
 * 1. VictorySplash (1.5s) - Full overlay victory celebration
 * 2. CurrencyReveal (2.5s) - Gold/gem counters + breakdown
 * 3. ItemReveal (variable) - Orb anticipation → explosion → fly-to-grid per item
 * 4. Summary (user-controlled) - Final display with continue button
 *
 * The manager drives phase timing. The overlay component handles GSAP animations.
 * Grid occupants are only updated during ItemReveal (for items that have landed).
 */
export class RewardRevealManager {
  private rewards: BattleRewards;
  private state: RevealState;
  private animationFrameId: number | null = null;
  private lastUpdateTime: number = 0;
  private lastCallbackTime: number = 0;
  private readonly CALLBACK_THROTTLE_MS = 50;

  // Phase durations (ms)
  private readonly PHASE_DURATIONS: Partial<Record<RevealPhase, number>> = {
    [RevealPhase.VictorySplash]: 1500,
    [RevealPhase.CurrencyReveal]: 2500,
    // ItemReveal and Summary are variable/user-controlled
  };

  // Item reveal sub-phase durations (ms)
  private readonly ITEM_ANTICIPATION_MS = 400;
  private readonly ITEM_REVEAL_MS = 300;
  private readonly ITEM_FLY_MS = 500;

  // Track accumulated time within item reveal sub-phases
  private itemPhaseStartTime: number = 0;

  // Callbacks
  private onStateUpdate: StateCallback | null = null;
  private onItemReveal: ItemRevealCallback | null = null;
  private onPhaseChange: PhaseChangeCallback | null = null;

  constructor(rewards: BattleRewards) {
    this.rewards = rewards;
    this.state = {
      phase: RevealPhase.VictorySplash,
      phaseStartTime: 0,
      currentGoldDisplay: 0,
      currentGemDisplay: 0,
      breakdownStep: 0,
      currentItemIndex: -1,
      itemRevealStep: 'waiting',
      revealedItemCount: 0,
      isSkipping: false,
    };
  }

  // ========================================
  // Public API
  // ========================================

  public start(callbacks: {
    onStateUpdate: StateCallback;
    onItemReveal?: ItemRevealCallback;
    onPhaseChange?: PhaseChangeCallback;
  }): void {
    this.onStateUpdate = callbacks.onStateUpdate;
    this.onItemReveal = callbacks.onItemReveal || null;
    this.onPhaseChange = callbacks.onPhaseChange || null;

    this.state.phaseStartTime = Date.now();
    this.lastUpdateTime = Date.now();

    // Fire initial phase change
    this.onPhaseChange?.(RevealPhase.VictorySplash, this.state);

    this.animate();
  }

  public skip(): void {
    this.state.isSkipping = true;
    this.state.phase = RevealPhase.Summary;
    this.state.phaseStartTime = Date.now();

    // Set final values
    this.state.currentGoldDisplay = this.rewards.goldEarned;
    this.state.currentGemDisplay = this.rewards.gemsEarned;
    this.state.breakdownStep = 4;
    this.state.revealedItemCount = this.rewards.items.length;
    this.state.currentItemIndex = this.rewards.items.length - 1;
    this.state.itemRevealStep = 'done';

    this.onPhaseChange?.(RevealPhase.Summary, this.state);
    this.fireCallback();
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public getState(): RevealState {
    return { ...this.state };
  }

  public getRewards(): BattleRewards {
    return this.rewards;
  }

  // ========================================
  // Animation Loop
  // ========================================

  private animate = (): void => {
    const now = Date.now();
    this.lastUpdateTime = now;

    this.updatePhase();

    // Throttle React updates
    if (now - this.lastCallbackTime >= this.CALLBACK_THROTTLE_MS) {
      this.fireCallback();
    }

    if (this.state.phase !== RevealPhase.Complete && this.state.phase !== RevealPhase.Summary) {
      this.animationFrameId = requestAnimationFrame(this.animate);
    }
  };

  private fireCallback(): void {
    this.onStateUpdate?.(this.state);
    this.lastCallbackTime = Date.now();
  }

  // ========================================
  // Phase Management
  // ========================================

  private updatePhase(): void {
    const elapsed = Date.now() - this.state.phaseStartTime;

    switch (this.state.phase) {
      case RevealPhase.VictorySplash:
        if (elapsed >= this.PHASE_DURATIONS[RevealPhase.VictorySplash]!) {
          this.advancePhase();
        }
        break;

      case RevealPhase.CurrencyReveal:
        this.updateCurrencyReveal(elapsed);
        break;

      case RevealPhase.ItemReveal:
        this.updateItemReveal();
        break;

      case RevealPhase.Summary:
      case RevealPhase.Complete:
        break;
    }
  }

  private advancePhase(): void {
    const order = [
      RevealPhase.VictorySplash,
      RevealPhase.CurrencyReveal,
      RevealPhase.ItemReveal,
      RevealPhase.Summary,
      RevealPhase.Complete,
    ];

    const idx = order.indexOf(this.state.phase);
    let next = order[idx + 1];

    // Skip ItemReveal if no items
    if (next === RevealPhase.ItemReveal && this.rewards.items.length === 0) {
      next = RevealPhase.Summary;
    }

    if (next) {
      this.state.phase = next;
      this.state.phaseStartTime = Date.now();

      if (next === RevealPhase.ItemReveal) {
        this.state.currentItemIndex = -1;
        this.state.itemRevealStep = 'waiting';
        this.state.revealedItemCount = 0;
        this.itemPhaseStartTime = Date.now();
      }

      if (next === RevealPhase.Summary) {
        this.state.currentGoldDisplay = this.rewards.goldEarned;
        this.state.currentGemDisplay = this.rewards.gemsEarned;
        this.state.revealedItemCount = this.rewards.items.length;
      }

      this.onPhaseChange?.(next, this.state);
      this.fireCallback();
    }
  }

  // ========================================
  // Currency Reveal
  // ========================================

  private updateCurrencyReveal(elapsed: number): void {
    const duration = this.PHASE_DURATIONS[RevealPhase.CurrencyReveal]!;

    // Stagger breakdown steps
    if (elapsed >= 300 && this.state.breakdownStep < 1) {
      this.state.breakdownStep = 1;
    }
    if (elapsed >= 700 && this.state.breakdownStep < 2) {
      this.state.breakdownStep = 2;
    }
    if (elapsed >= 1100 && this.state.breakdownStep < 3) {
      this.state.breakdownStep = 3;
    }
    if (elapsed >= 1500 && this.state.breakdownStep < 4) {
      this.state.breakdownStep = 4;
    }

    // Gold counter easing
    const goldProgress = Math.min(elapsed / (duration - 300), 1.0);
    const goldEase = 1 - Math.pow(1 - goldProgress, 3);
    this.state.currentGoldDisplay = Math.floor(this.rewards.goldEarned * goldEase);

    // Gem counter (parallel)
    if (this.rewards.gemsEarned > 0) {
      const gemProgress = Math.min((elapsed - 200) / (duration - 500), 1.0);
      const gemEase = Math.max(0, 1 - Math.pow(1 - gemProgress, 3));
      this.state.currentGemDisplay = Math.floor(this.rewards.gemsEarned * gemEase);
    }

    if (elapsed >= duration) {
      this.state.currentGoldDisplay = this.rewards.goldEarned;
      this.state.currentGemDisplay = this.rewards.gemsEarned;
      this.advancePhase();
    }
  }

  // ========================================
  // Item Reveal
  // ========================================

  private updateItemReveal(): void {
    const items = this.rewards.items;
    if (items.length === 0) {
      this.advancePhase();
      return;
    }

    const now = Date.now();
    const subElapsed = now - this.itemPhaseStartTime;

    // Waiting state: either first item or pause between items
    if (this.state.itemRevealStep === 'waiting') {
      const pauseTime = this.state.currentItemIndex >= 0
        ? (RARITY_PAUSE[items[this.state.currentItemIndex].rarity] || 200)
        : 200; // Initial pause

      if (subElapsed >= pauseTime) {
        // Start next item
        this.state.currentItemIndex++;

        if (this.state.currentItemIndex >= items.length) {
          // All items revealed
          this.advancePhase();
          return;
        }

        this.state.itemRevealStep = 'anticipation';
        this.itemPhaseStartTime = now;
      }
      return;
    }

    // Anticipation
    if (this.state.itemRevealStep === 'anticipation') {
      if (subElapsed >= this.ITEM_ANTICIPATION_MS) {
        this.state.itemRevealStep = 'reveal';
        this.itemPhaseStartTime = now;

        // Fire item reveal callback for the overlay to trigger GSAP explosion
        const item = items[this.state.currentItemIndex];
        this.onItemReveal?.(item, this.state.currentItemIndex);
      }
      return;
    }

    // Reveal (explosion)
    if (this.state.itemRevealStep === 'reveal') {
      if (subElapsed >= this.ITEM_REVEAL_MS) {
        this.state.itemRevealStep = 'fly';
        this.itemPhaseStartTime = now;
      }
      return;
    }

    // Fly to grid
    if (this.state.itemRevealStep === 'fly') {
      if (subElapsed >= this.ITEM_FLY_MS) {
        this.state.itemRevealStep = 'done';
        this.state.revealedItemCount = this.state.currentItemIndex + 1;

        // Brief done state, then go to waiting for next item
        this.state.itemRevealStep = 'waiting';
        this.itemPhaseStartTime = now;
      }
      return;
    }
  }
}
