// Core game types for units, items, and abilities

// Rarity levels for items and heroes
export enum Rarity {
  Common = 'common',        // 70% drop rate, 3 durability
  Uncommon = 'uncommon',    // 20% drop rate, 5 durability
  Rare = 'rare',            // 8% drop rate, 7 durability
  Legendary = 'legendary',  // 2% drop rate, 10 durability
  Mythic = 'mythic',        // 0.1% drop rate, infinite durability
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
  penetration?: number; // Armor penetration percentage
  lifesteal?: number; // Lifesteal percentage
  flying?: boolean; // Can fly over units and ignore ground effects
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
  range?: number; // Optional range in tiles (default is melee range = 1)
  effects: AbilityEffect[];
  animationType?: 'cleave' | 'projectile' | 'buff' | 'melee'; // For animation system
}

// Status Effect Types (extended from design doc)
export enum StatusEffectType {
  // Control Effects
  Taunt = 'taunt',
  Stun = 'stun',
  Root = 'root',
  Silence = 'silence',
  Disarm = 'disarm',
  Fear = 'fear',
  Charm = 'charm',
  Sleep = 'sleep',

  // Damage Over Time
  Poison = 'poison',
  Burn = 'burn',
  Bleed = 'bleed',

  // Debuffs
  Slow = 'slow',
  ArmorBreak = 'armor_break',
  Weakened = 'weakened',
  Vulnerable = 'vulnerable',
  Disease = 'disease',
  Curse = 'curse',
  Terror = 'terror',
  Marked = 'marked',

  // Buffs
  Shield = 'shield',
  Regeneration = 'regeneration',
  Enrage = 'enrage',
  Frenzy = 'frenzy',
  Incorporeal = 'incorporeal',
  Fortify = 'fortify',
  Haste = 'haste',
  Invisibility = 'invisibility',

  // Special
  Thorns = 'thorns', // Reflects damage
  BurningGround = 'burning_ground', // Zone effect
  ScorchedEarth = 'scorched_earth', // Zone effect
  PlagueZone = 'plague_zone', // Zone effect
  Entangle = 'entangle', // Movement slow
}

// Effect of an ability
export interface AbilityEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'lifesteal' | 'shield' | 'status' | 'conditional' | 'zone' | 'summon' | 'teleport' | 'execute' | 'revive';
  value?: number;
  duration?: number;
  targetType: 'self' | 'ally' | 'enemy' | 'allAllies' | 'allEnemies' | 'aoe' | 'cone' | 'line' | 'splash';

  // For status effects
  statusType?: StatusEffectType;

  // For conditional effects
  condition?: 'target_has_debuff' | 'target_below_hp_percent' | 'self_below_hp_percent' | 'attacking_from_behind' | 'attacking_from_side';
  conditionValue?: number;

  // For area effects
  radius?: number;
  range?: number;

  // For special effects
  chance?: number; // Probability 0-100
  damageMultiplier?: number;
  statModifier?: {
    stat: keyof UnitStats;
    value: number;
    isPercent: boolean;
  };
}

// Stat growth per level
export interface StatGrowth {
  hp: number;
  damage: number;
  speed: number;
  defense: number;
  critChance: number;
  critDamage: number;
  evasion: number;
  accuracy: number;
  penetration?: number;
  lifesteal?: number;
}

// Hero template (base data)
export interface HeroTemplate {
  id: string;
  class: string;
  name: string;
  title?: string; // Optional title/descriptor (e.g., "The Unyielding")
  baseStats: UnitStats;
  statGrowth: StatGrowth; // Stats gained per level
  abilities: Ability[]; // Should always have 2 abilities: 1 offensive + 1 support/defensive
  spritePath: string;
  rarity: Rarity;
  description: string;
  tags?: string[]; // For categorization (e.g., "tank", "healer", "melee", "ranged")
}

// Hero instance (in player's roster)
export interface Hero extends HeroTemplate {
  instanceId: string;
  level: number;
  experience: number;
  maxExperience: number; // XP needed for next level
  equippedItem?: string; // Single item instance ID (only one item allowed)
  currentStats: UnitStats; // Modified by items and level
}

// AI behavior patterns for enemies
export enum AIPattern {
  Aggressive = 'aggressive', // Always targets lowest HP hero
  Defensive = 'defensive', // Targets closest threat
  Support = 'support', // Prioritizes buffing/healing allies
  Opportunistic = 'opportunistic', // Targets heroes with debuffs or low HP
  Berserker = 'berserker', // Attacks random targets, no strategy
  Tactical = 'tactical', // Focuses on positioning and ability combos
}

// Enemy template
export interface EnemyTemplate {
  id: string;
  name: string;
  type: string;
  title?: string; // Optional title/descriptor
  baseStats: UnitStats;
  abilities: Ability[];
  spritePath: string;
  description: string;
  aiPattern?: AIPattern; // AI behavior pattern
  tags?: string[]; // For categorization (e.g., "boss", "minion", "flyer", "undead")
}

// Enemy instance (in battle)
export interface Enemy extends EnemyTemplate {
  instanceId: string;
  currentStats: UnitStats;
  wave?: number; // Optional wave number for multi-wave battles
}

// Item categories
export enum ItemCategory {
  Weapon = 'weapon',
  Armor = 'armor',
  Accessory = 'accessory',
  Consumable = 'consumable',
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
  category: ItemCategory; // Weapon, Armor, Accessory, or Consumable
  type?: 'equipment' | 'consumable'; // Item type for filtering
  effects: ItemEffect[];
  icon?: string; // Icon path (e.g., '/icons/sword.png')
  spritePath: string; // Deprecated: use icon instead
  cost: number; // Vendor sell price
  slot: 'weapon' | 'armor' | 'accessory' | 'consumable'; // Equipment slot
  consumable?: boolean; // If true, item is consumed after one use
  permanent?: boolean; // If true, effects are permanent (default: only active when equipped)
  maxDurability?: number; // Max durability (3/5/7/10 by rarity), undefined for Mythic (infinite)
  specialEffect?: string; // Description of special effect (e.g., "Attacks apply Burning")
}

// Item instance (in player's inventory)
export interface ItemInstance extends Item {
  instanceId: string;
  equippedTo?: string; // Hero instanceId if equipped
  durability?: number; // Current durability (decreases on hero death), undefined for indestructible items
}

// Status effect (buff/debuff during battle)
export interface StatusEffect {
  id: string;
  name: string;
  type: 'buff' | 'debuff' | 'control' | 'dot' | 'special';
  statusType: StatusEffectType;

  // For stat modifiers
  stat?: keyof UnitStats;
  value?: number;
  isPercent?: boolean;

  // Duration
  duration: number;
  remainingDuration: number;

  // For DoT effects
  damagePerTick?: number;
  tickInterval?: number; // milliseconds between ticks

  // For shields
  shieldAmount?: number;

  // For special effects
  reflectPercent?: number; // For thorns
  source?: string; // Unit ID that applied this effect
  stackCount?: number; // How many times this effect has been applied
}
