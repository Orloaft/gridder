import { Enemy, UnitStats, StatusEffect, Ability } from './core.types';
import { GridPosition } from './grid.types';

// Battle event types
export enum BattleEventType {
  BattleStart = 'battleStart',
  WaveComplete = 'waveComplete', // Wave completed - pause for player decision
  WaveTransition = 'waveTransition', // Smooth transition animation between waves
  WaveStart = 'waveStart', // New wave of enemies entering
  Tick = 'tick', // Replaces TurnStart - fires each tick with cooldown updates
  Move = 'move',
  Attack = 'attack',
  Damage = 'damage',
  Heal = 'heal',
  Death = 'death',
  Victory = 'victory',
  Defeat = 'defeat',
  StatusApplied = 'statusApplied',
  StatusExpired = 'statusExpired',
  CriticalHit = 'criticalHit',
  Evaded = 'evaded',
  AbilityUsed = 'abilityUsed', // When a unit uses an ability
}

// Typed event data for the most common event types
export interface MoveEventData {
  unitId: string;
  from: GridPosition;
  to: GridPosition;
}

export interface AttackEventData {
  attackerId: string;
  targetId: string;
  damage: number;
  isCrit?: boolean;
}

export interface DamageEventData {
  targetId: string;
  damage: number;
  remainingHp: number;
  sourceId?: string;
}

export interface DeathEventData {
  unitId: string;
  killedBy?: string;
}

export interface HealEventData {
  targetId: string;
  amount: number;
  healedHp: number;
  sourceId?: string;
}

// BattleEvent uses `data: any` for backward compatibility.
// Consumers can narrow using the typed data interfaces above:
//   if (event.type === BattleEventType.Move) { const data = event.data as MoveEventData; }
export interface BattleEvent {
  type: BattleEventType;
  tick: number;
  data: any;
}

export interface BattleUnit {
  id: string;
  name: string;
  class?: string;
  spritePath?: string;
  baseStats: UnitStats; // Original stats before buffs/debuffs
  stats: UnitStats; // Current stats (modified by status effects)
  statusEffects: StatusEffect[]; // Active buffs/debuffs
  isHero: boolean;
  isAlive: boolean;
  position: GridPosition;
  range: number; // Attack range (1 = melee, 2+ = ranged)
  cooldown: number; // Current cooldown (0-100, acts at 100)
  cooldownRate: number; // How much cooldown fills per tick (based on speed)
  abilities: Ability[]; // Available abilities
  abilityCooldowns: Map<string, number>; // Track cooldowns for each ability by ID
  wave?: number; // Which wave this enemy belongs to (1-indexed, undefined for heroes)
  instanceId?: string; // Hero instance ID for roster matching
}

export interface BattleState {
  tick: number; // Battle time in ticks (replaces turn-based system)
  heroes: BattleUnit[];
  enemies: BattleUnit[];
  events: BattleEvent[];
  winner: 'heroes' | 'enemies' | null;
  currentWave: number; // Current wave number (1-indexed)
  totalWaves: number; // Total number of waves in battle
  enemyWaves: Enemy[][]; // Remaining waves of enemies to spawn
}
