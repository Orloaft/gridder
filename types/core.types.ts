// Core game types for units, items, and abilities

// Rarity levels for items and heroes
export enum Rarity {
  Common = 'common',
  Uncommon = 'uncommon',
  Rare = 'rare',
  Epic = 'epic',
  Legendary = 'legendary',
}

// Difficulty levels
export enum Difficulty {
  Tutorial = 'tutorial',
  Easy = 'easy',
  Medium = 'medium',
  Hard = 'hard',
  Boss = 'boss',
}

// Stats for units
export interface UnitStats {
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  defense: number;
  critChance: number;
  critDamage: number;
  evasion: number;
  accuracy: number;
}

// Ability types
export enum AbilityType {
  Offensive = 'offensive',
  Defensive = 'defensive',
  Support = 'support',
  Ultimate = 'ultimate',
}

// Ability definition
export interface Ability {
  id: string;
  name: string;
  type: AbilityType;
  description: string;
  cooldown: number;
  currentCooldown: number;
  effects: AbilityEffect[];
}

// Effect of an ability
export interface AbilityEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'lifesteal' | 'shield';
  value: number;
  duration?: number;
  targetType: 'self' | 'ally' | 'enemy' | 'allAllies' | 'allEnemies';
}

// Hero template (base data)
export interface HeroTemplate {
  id: string;
  class: string;
  name: string;
  baseStats: UnitStats;
  abilities: Ability[];
  spritePath: string;
  rarity: Rarity;
  description: string;
}

// Hero instance (in player's roster)
export interface Hero extends HeroTemplate {
  instanceId: string;
  level: number;
  experience: number;
  equippedItems: string[]; // Item IDs
  currentStats: UnitStats; // Modified by items and level
}

// Enemy template
export interface EnemyTemplate {
  id: string;
  name: string;
  type: string;
  baseStats: UnitStats;
  abilities: Ability[];
  spritePath: string;
  description: string;
}

// Enemy instance (in battle)
export interface Enemy extends EnemyTemplate {
  instanceId: string;
  currentStats: UnitStats;
}

// Item effect
export interface ItemEffect {
  stat: keyof UnitStats;
  type: 'add' | 'multiply';
  value: number;
}

// Item definition
export interface Item {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  effects: ItemEffect[];
  spritePath: string;
  cost: number;
  slot: 'weapon' | 'armor' | 'accessory';
}

// Status effect (buff/debuff during battle)
export interface StatusEffect {
  id: string;
  name: string;
  type: 'buff' | 'debuff';
  stat: keyof UnitStats;
  value: number;
  duration: number;
  remainingDuration: number;
}
