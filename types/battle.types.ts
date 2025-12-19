import { Hero, Enemy, StatusEffect } from './core.types';
import { GridPosition } from './grid.types';

// Battle event types
export enum BattleEventType {
  BattleStart = 'battleStart',
  TurnStart = 'turnStart',
  Move = 'move',
  Attack = 'attack',
  AbilityUse = 'abilityUse',
  Damage = 'damage',
  Heal = 'heal',
  StatusApplied = 'statusApplied',
  StatusExpired = 'statusExpired',
  Death = 'death',
  Victory = 'victory',
  Defeat = 'defeat',
}

// Base battle event
export interface BaseBattleEvent {
  timestamp: number;
  type: BattleEventType;
}

// Battle start event
export interface BattleStartEvent extends BaseBattleEvent {
  type: BattleEventType.BattleStart;
  heroes: Hero[];
  enemies: Enemy[];
}

// Turn start event
export interface TurnStartEvent extends BaseBattleEvent {
  type: BattleEventType.TurnStart;
  turnNumber: number;
  activeUnitId: string;
}

// Move event
export interface MoveEvent extends BaseBattleEvent {
  type: BattleEventType.Move;
  unitId: string;
  fromPosition: GridPosition;
  toPosition: GridPosition;
}

// Attack event
export interface AttackEvent extends BaseBattleEvent {
  type: BattleEventType.Attack;
  attackerId: string;
  targetId: string;
  damage: number;
  isCritical: boolean;
  isMiss: boolean;
}

// Ability use event
export interface AbilityUseEvent extends BaseBattleEvent {
  type: BattleEventType.AbilityUse;
  userId: string;
  abilityId: string;
  targetIds: string[];
}

// Damage event
export interface DamageEvent extends BaseBattleEvent {
  type: BattleEventType.Damage;
  targetId: string;
  damage: number;
  sourceId: string;
  damageType: 'physical' | 'magical' | 'true';
}

// Heal event
export interface HealEvent extends BaseBattleEvent {
  type: BattleEventType.Heal;
  targetId: string;
  amount: number;
  sourceId: string;
}

// Status applied event
export interface StatusAppliedEvent extends BaseBattleEvent {
  type: BattleEventType.StatusApplied;
  targetId: string;
  status: StatusEffect;
  sourceId: string;
}

// Status expired event
export interface StatusExpiredEvent extends BaseBattleEvent {
  type: BattleEventType.StatusExpired;
  targetId: string;
  statusId: string;
}

// Death event
export interface DeathEvent extends BaseBattleEvent {
  type: BattleEventType.Death;
  unitId: string;
  killerId?: string;
}

// Victory event
export interface VictoryEvent extends BaseBattleEvent {
  type: BattleEventType.Victory;
  winningTeam: 'heroes' | 'enemies';
}

// Defeat event
export interface DefeatEvent extends BaseBattleEvent {
  type: BattleEventType.Defeat;
  losingTeam: 'heroes' | 'enemies';
}

// Union type of all battle events
export type BattleEvent =
  | BattleStartEvent
  | TurnStartEvent
  | MoveEvent
  | AttackEvent
  | AbilityUseEvent
  | DamageEvent
  | HealEvent
  | StatusAppliedEvent
  | StatusExpiredEvent
  | DeathEvent
  | VictoryEvent
  | DefeatEvent;

// Battle recording (sequence of events)
export interface BattleRecording {
  id: string;
  stageId: number;
  heroes: Hero[];
  enemies: Enemy[];
  events: BattleEvent[];
  result: 'victory' | 'defeat';
  duration: number;
  rewardsEarned?: BattleRewards;
}

// Battle rewards
export interface BattleRewards {
  gold: number;
  experience: number;
  items?: string[]; // Item IDs
  heroRecruitChance?: number;
}

// Battle state (current snapshot during simulation)
export interface BattleState {
  turnNumber: number;
  activeUnits: (Hero | Enemy)[];
  deadUnits: string[];
  unitPositions: Map<string, GridPosition>;
  statusEffects: Map<string, StatusEffect[]>;
  isComplete: boolean;
  winner?: 'heroes' | 'enemies';
}
