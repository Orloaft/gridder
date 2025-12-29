// Doomsday Clock System - Creates urgency through time pressure
import { Rarity } from '@/types/core.types';

export interface DoomsdayState {
  currentDay: number;
  maxDays: number;
  antagonistName: string;
  antagonistTitle: string;
  antagonistPowerLevel: number; // 1-100 scale
  ritualProgress: number; // 0-100%, when reaches 100% = game over

  // Time costs per action
  timeCosts: {
    forestMission: number;    // Easy farming = 1 day
    cavesMission: number;     // Medium risk = 2 days
    ruinsMission: number;     // High risk = 3 days
    shopVisit: number;        // Shopping = 0.5 days
    rest: number;             // Healing heroes = 1 day
    retreat: number;          // Retreating early = 0.5 days
    bossFight: number;        // Boss battles = 2 days
  };

  // Milestones where antagonist gets power spikes
  powerSpikes: PowerSpike[];

  // Events that have occurred
  triggeredEvents: string[];

  // Modifiers affecting time
  timeModifiers: TimeModifier[];
}

export interface PowerSpike {
  day: number;
  description: string;
  effects: {
    powerIncrease: number;
    ritualProgressIncrease: number;
    globalEnemyBuffs?: string[];
    specialEvent?: string;
  };
}

export interface TimeModifier {
  name: string;
  description: string;
  multiplier: number; // 0.5 = half time cost, 2.0 = double time cost
  duration: number; // Days remaining
  source: string;
}

export interface DoomsdayEvent {
  id: string;
  day: number;
  title: string;
  description: string;
  choices?: {
    text: string;
    outcome: () => void;
    timeCost: number;
  }[];
}

export class DoomsdaySystem {
  private state: DoomsdayState;

  constructor() {
    this.state = this.initializeState();
  }

  private initializeState(): DoomsdayState {
    return {
      currentDay: 1,
      maxDays: 60, // 60 days until ritual completes (doubled from 30)
      antagonistName: "Malachar",
      antagonistTitle: "The Void Summoner",
      antagonistPowerLevel: 5, // Starts at 5% power (reduced from 10%)
      ritualProgress: 0,

      timeCosts: {
        forestMission: 0.5,    // Reduced from 1 day
        cavesMission: 1,       // Reduced from 2 days
        ruinsMission: 1.5,     // Reduced from 3 days
        shopVisit: 0.25,       // Reduced from 0.5 days
        rest: 0.5,             // Reduced from 1 day
        retreat: 0.25,         // Reduced from 0.5 days
        bossFight: 1,          // Reduced from 2 days
      },

      powerSpikes: [
        {
          day: 10,
          description: "Malachar completes the First Seal",
          effects: {
            powerIncrease: 10,
            ritualProgressIncrease: 15,
            globalEnemyBuffs: ["shadow_empowerment"],
            specialEvent: "first_seal_broken"
          }
        },
        {
          day: 20,
          description: "The Shadow Legion arrives",
          effects: {
            powerIncrease: 15,
            ritualProgressIncrease: 20,
            globalEnemyBuffs: ["legion_presence"],
            specialEvent: "legion_invasion"
          }
        },
        {
          day: 30,
          description: "Malachar breaks the Second Seal",
          effects: {
            powerIncrease: 20,
            ritualProgressIncrease: 25,
            globalEnemyBuffs: ["void_corruption"],
            specialEvent: "second_seal_broken"
          }
        },
        {
          day: 40,
          description: "The Blood Moon rises",
          effects: {
            powerIncrease: 25,
            ritualProgressIncrease: 30,
            globalEnemyBuffs: ["blood_moon_madness"],
            specialEvent: "blood_moon"
          }
        },
        {
          day: 50,
          description: "Malachar achieves near-godhood",
          effects: {
            powerIncrease: 30,
            ritualProgressIncrease: 40,
            globalEnemyBuffs: ["divine_wrath"],
            specialEvent: "ascension_begins"
          }
        },
        {
          day: 60,
          description: "The Void Ritual completes - GAME OVER",
          effects: {
            powerIncrease: 100,
            ritualProgressIncrease: 100,
            specialEvent: "apocalypse"
          }
        }
      ],

      triggeredEvents: [],
      timeModifiers: []
    };
  }

  /**
   * Advance time and process consequences
   */
  advanceTime(days: number, action: string): {
    daysElapsed: number;
    newEvents: DoomsdayEvent[];
    powerGained: number;
    warnings: string[];
  } {
    // Apply time modifiers
    let modifiedDays = days;
    this.state.timeModifiers.forEach(mod => {
      modifiedDays *= mod.multiplier;
    });

    const previousDay = this.state.currentDay;
    this.state.currentDay += modifiedDays;

    // Calculate ritual progress (1.67% per day base rate for 60-day timeline)
    const baseRitualProgress = modifiedDays * 1.67;
    this.state.ritualProgress = Math.min(100, this.state.ritualProgress + baseRitualProgress);

    // Check for power spikes
    const newEvents: DoomsdayEvent[] = [];
    let powerGained = 0;
    const warnings: string[] = [];

    this.state.powerSpikes.forEach(spike => {
      if (spike.day > previousDay && spike.day <= this.state.currentDay) {
        // Trigger power spike
        this.state.antagonistPowerLevel = Math.min(100,
          this.state.antagonistPowerLevel + spike.effects.powerIncrease
        );
        powerGained += spike.effects.powerIncrease;

        this.state.ritualProgress = Math.min(100,
          this.state.ritualProgress + spike.effects.ritualProgressIncrease
        );

        // Add event
        newEvents.push({
          id: spike.effects.specialEvent || `spike_${spike.day}`,
          day: spike.day,
          title: spike.description,
          description: this.getEventDescription(spike.effects.specialEvent || '')
        });

        this.state.triggeredEvents.push(spike.effects.specialEvent || '');
      }
    });

    // Generate warnings based on proximity to doom
    const daysRemaining = this.getDaysUntilDoom();
    if (daysRemaining <= 10) {
      warnings.push("⚠️ CRITICAL: The Void Ritual is nearly complete!");
    } else if (daysRemaining <= 20) {
      warnings.push("⚠️ WARNING: Time is running out to stop Malachar!");
    } else if (daysRemaining <= 30) {
      warnings.push("The ritual grows stronger. Make every day count.");
    }

    // Update time modifiers
    this.state.timeModifiers = this.state.timeModifiers
      .map(mod => ({ ...mod, duration: mod.duration - modifiedDays }))
      .filter(mod => mod.duration > 0);

    return {
      daysElapsed: modifiedDays,
      newEvents,
      powerGained,
      warnings
    };
  }

  /**
   * Get time cost for an action
   */
  getTimeCost(action: keyof DoomsdayState['timeCosts']): number {
    let cost = this.state.timeCosts[action];

    // Apply modifiers
    this.state.timeModifiers.forEach(mod => {
      cost *= mod.multiplier;
    });

    return cost;
  }

  /**
   * Calculate antagonist's current stats multiplier
   */
  getAntagonistMultiplier(): {
    healthMultiplier: number;
    damageMultiplier: number;
    speedMultiplier: number;
    spawnRateMultiplier: number;
  } {
    const power = this.state.antagonistPowerLevel / 100;

    return {
      healthMultiplier: 1 + (power * 2),      // Up to 3x health at max power
      damageMultiplier: 1 + (power * 1.5),    // Up to 2.5x damage
      speedMultiplier: 1 + (power * 0.5),     // Up to 1.5x speed
      spawnRateMultiplier: 1 + (power * 1),   // Up to 2x spawn rate
    };
  }

  /**
   * Apply global enemy buffs based on triggered events
   */
  getGlobalEnemyBuffs(): string[] {
    const buffs: string[] = [];

    this.state.powerSpikes.forEach(spike => {
      if (this.state.currentDay >= spike.day && spike.effects.globalEnemyBuffs) {
        buffs.push(...spike.effects.globalEnemyBuffs);
      }
    });

    return buffs;
  }

  /**
   * Calculate days until doom
   */
  getDaysUntilDoom(): number {
    // Either ritual completion or max days
    const daysUntilMaxDays = this.state.maxDays - this.state.currentDay;
    const daysUntilRitualComplete = ((100 - this.state.ritualProgress) / 1.67);

    return Math.min(daysUntilMaxDays, daysUntilRitualComplete);
  }

  /**
   * Check if game is over
   */
  isGameOver(): boolean {
    return this.state.ritualProgress >= 100 || this.state.currentDay >= this.state.maxDays;
  }

  /**
   * Get urgency level for UI
   */
  getUrgencyLevel(): 'low' | 'medium' | 'high' | 'critical' {
    const daysRemaining = this.getDaysUntilDoom();

    if (daysRemaining <= 10) return 'critical';
    if (daysRemaining <= 20) return 'high';
    if (daysRemaining <= 40) return 'medium';
    return 'low';
  }

  /**
   * Add time modifier (buff/debuff)
   */
  addTimeModifier(modifier: TimeModifier) {
    // Check if modifier already exists
    const existingIndex = this.state.timeModifiers.findIndex(m => m.name === modifier.name);

    if (existingIndex >= 0) {
      // Refresh duration
      this.state.timeModifiers[existingIndex].duration = modifier.duration;
    } else {
      this.state.timeModifiers.push(modifier);
    }
  }

  /**
   * Special actions to slow down the antagonist
   */
  performSabotage(type: 'ritual_disruption' | 'seal_reinforcement' | 'timeline_manipulation'): {
    success: boolean;
    effect: string;
    timeCost: number;
  } {
    switch (type) {
      case 'ritual_disruption':
        // Costs 3 days but reduces ritual progress
        this.state.ritualProgress = Math.max(0, this.state.ritualProgress - 10);
        return {
          success: true,
          effect: "Ritual progress reduced by 10%",
          timeCost: 3
        };

      case 'seal_reinforcement':
        // Costs 2 days but delays next power spike
        const nextSpike = this.state.powerSpikes.find(s => s.day > this.state.currentDay);
        if (nextSpike) {
          nextSpike.day += 2;
        }
        return {
          success: true,
          effect: "Next power spike delayed by 2 days",
          timeCost: 2
        };

      case 'timeline_manipulation':
        // Costs 1 day but adds time efficiency buff
        this.addTimeModifier({
          name: "Temporal Haste",
          description: "Actions take half the normal time",
          multiplier: 0.5,
          duration: 5,
          source: "timeline_manipulation"
        });
        return {
          success: true,
          effect: "Time moves slower for you (5 days)",
          timeCost: 1
        };
    }
  }

  /**
   * Get detailed event descriptions
   */
  private getEventDescription(eventId: string): string {
    const descriptions: Record<string, string> = {
      first_seal_broken: "The First Seal has shattered! Dark energy flows into the world. All enemies gain +10% health and damage.",

      legion_invasion: "Malachar's Shadow Legion has arrived! Enemy spawn rates increased by 50%. New enemy types have appeared.",

      second_seal_broken: "The Second Seal crumbles! The veil between worlds weakens. Enemies can now resurrect once per battle.",

      blood_moon: "The Blood Moon rises! All enemies gain lifesteal and increased critical chance. Heroes suffer -10% healing.",

      ascension_begins: "Malachar begins his final transformation! All enemies gain massive stat boosts. This is your last chance!",

      apocalypse: "The Void Ritual is complete. Malachar has become a god of destruction. The world is lost..."
    };

    return descriptions[eventId] || "A significant event has occurred.";
  }

  /**
   * Calculate mission efficiency score
   */
  getMissionEfficiency(
    missionType: keyof DoomsdayState['timeCosts'],
    expectedRewards: { gold: number; items: number; xp: number }
  ): {
    score: number;
    recommendation: string;
  } {
    const timeCost = this.getTimeCost(missionType);
    const daysRemaining = this.getDaysUntilDoom();

    // Calculate value per day
    const valuePerDay = (
      expectedRewards.gold * 0.01 +
      expectedRewards.items * 100 +
      expectedRewards.xp * 0.1
    ) / timeCost;

    // Adjust based on urgency
    const urgencyMultiplier = daysRemaining < 10 ? 0.5 : 1.0;
    const score = valuePerDay * urgencyMultiplier;

    let recommendation = "";
    if (daysRemaining < 5) {
      recommendation = "⚠️ Time is critical! Only do essential missions!";
    } else if (score < 50) {
      recommendation = "Low efficiency. Consider a different mission.";
    } else if (score < 100) {
      recommendation = "Moderate efficiency. Acceptable if you need the rewards.";
    } else {
      recommendation = "High efficiency! Good use of time.";
    }

    return { score, recommendation };
  }

  /**
   * Get current state for save/load
   */
  getState(): DoomsdayState {
    return { ...this.state };
  }

  /**
   * Load saved state
   */
  loadState(state: DoomsdayState) {
    this.state = { ...state };
  }
}

// Global instance
export const doomsdaySystem = new DoomsdaySystem();