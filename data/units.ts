// Hero and Enemy unit templates
import { HeroTemplate, EnemyTemplate, Rarity, UnitStats, Ability, AbilityType, StatusEffectType, AIPattern, StatGrowth } from '@/types/core.types';
import { ICON_PATHS } from '@/utils/iconPaths';

// Base stats template helper
function createStats(hp: number, damage: number, speed: number): UnitStats {
  return {
    hp,
    maxHp: hp,
    damage,
    speed,
    defense: 10,
    critChance: 0.1,
    critDamage: 1.5,
    evasion: 0.05,
    accuracy: 0.95,
  };
}

// Hero Templates
export const HERO_TEMPLATES: Record<string, HeroTemplate> = {
  blood_knight: {
    id: 'blood_knight',
    class: 'Blood Knight',
    name: 'Blood Knight',
    baseStats: createStats(70, 18, 90),
    statGrowth: {
      hp: 8,
      damage: 2.5,
      speed: 1.2,
      defense: 0.5,
      critChance: 0.002,
      critDamage: 0.01,
      evasion: 0.001,
      accuracy: 0.001,
    },
    abilities: [
      {
        id: 'blood_strike',
        name: 'Blood Strike',
        type: AbilityType.Offensive,
        description: 'Deals damage and heals for 30% of damage dealt',
        cooldown: 3,
        currentCooldown: 0,
        effects: [
          {
            type: 'damage',
            value: 75,
            targetType: 'enemy',
          },
          {
            type: 'lifesteal',
            value: 0.3,
            targetType: 'self',
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.bloodyAxeman,
    rarity: Rarity.Common,
    description: 'A warrior who sacrifices health to deal massive damage',
  },

  shadow_stalker: {
    id: 'shadow_stalker',
    class: 'Shadow Stalker',
    name: 'Shadow Stalker',
    baseStats: createStats(42, 25, 140),
    statGrowth: {
      hp: 5,
      damage: 3.5,
      speed: 1.8,
      defense: 0.3,
      critChance: 0.004,
      critDamage: 0.015,
      evasion: 0.002,
      accuracy: 0.001,
    },
    abilities: [
      {
        id: 'backstab',
        name: 'Backstab',
        type: AbilityType.Offensive,
        description: 'Critical strike with high damage',
        cooldown: 2,
        currentCooldown: 0,
        effects: [
          {
            type: 'damage',
            value: 120,
            targetType: 'enemy',
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.darkKnifeman,
    rarity: Rarity.Uncommon,
    description: 'Swift assassin who strikes from the shadows',
  },

  plague_doctor: {
    id: 'plague_doctor',
    class: 'Plague Doctor',
    name: 'Plague Doctor',
    baseStats: createStats(52, 12, 85),
    statGrowth: {
      hp: 6.5,
      damage: 1.8,
      speed: 1.0,
      defense: 0.4,
      critChance: 0.001,
      critDamage: 0.008,
      evasion: 0.001,
      accuracy: 0.001,
    },
    abilities: [
      {
        id: 'healing_mist',
        name: 'Healing Mist',
        type: AbilityType.Support,
        description: 'Heals all allies',
        cooldown: 4,
        currentCooldown: 0,
        effects: [
          {
            type: 'heal',
            value: 50,
            targetType: 'allAllies',
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.staffCloakman,
    rarity: Rarity.Rare,
    description: 'Healer who can restore health and cure ailments',
  },

  necromancer: {
    id: 'necromancer',
    class: 'Necromancer',
    name: 'Necromancer',
    baseStats: createStats(35, 28, 75),
    statGrowth: {
      hp: 4.5,
      damage: 4.0,
      speed: 1.0,
      defense: 0.3,
      critChance: 0.003,
      critDamage: 0.012,
      evasion: 0.001,
      accuracy: 0.002,
    },
    abilities: [
      {
        id: 'dark_bolt',
        name: 'Dark Bolt',
        type: AbilityType.Offensive,
        description: 'Fires a bolt of dark energy',
        cooldown: 2,
        currentCooldown: 0,
        effects: [
          {
            type: 'damage',
            value: 90,
            targetType: 'enemy',
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.necromancer,
    rarity: Rarity.Epic,
    description: 'Master of dark magic and necromancy',
  },

  witch_hunter: {
    id: 'witch_hunter',
    class: 'Witch Hunter',
    name: 'Witch Hunter',
    baseStats: createStats(50, 22, 110),
    statGrowth: {
      hp: 6.0,
      damage: 3.0,
      speed: 1.5,
      defense: 0.4,
      critChance: 0.003,
      critDamage: 0.012,
      evasion: 0.001,
      accuracy: 0.002,
    },
    abilities: [
      {
        id: 'precise_shot',
        name: 'Precise Shot',
        type: AbilityType.Offensive,
        description: 'High accuracy ranged attack',
        cooldown: 2,
        currentCooldown: 0,
        effects: [
          {
            type: 'damage',
            value: 80,
            targetType: 'enemy',
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.torchman,
    rarity: Rarity.Uncommon,
    description: 'Expert marksman who never misses',
  },

  flesh_golem: {
    id: 'flesh_golem',
    class: 'Flesh Golem',
    name: 'Flesh Golem',
    baseStats: createStats(105, 15, 55),
    statGrowth: {
      hp: 12,
      damage: 2.0,
      speed: 0.8,
      defense: 0.8,
      critChance: 0.001,
      critDamage: 0.005,
      evasion: 0.0005,
      accuracy: 0.001,
    },
    abilities: [
      {
        id: 'taunt',
        name: 'Taunt',
        type: AbilityType.Defensive,
        description: 'Forces enemies to attack this unit',
        cooldown: 5,
        currentCooldown: 0,
        effects: [
          {
            type: 'buff',
            value: 20,
            duration: 2,
            targetType: 'self',
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.shieldman,
    rarity: Rarity.Rare,
    description: 'Massive tank that absorbs damage',
  },

  quester: {
    id: 'quester',
    class: 'Quester',
    name: 'Adventurer',
    baseStats: createStats(55, 20, 100),
    statGrowth: {
      hp: 7.0,
      damage: 2.8,
      speed: 1.3,
      defense: 0.4,
      critChance: 0.002,
      critDamage: 0.01,
      evasion: 0.001,
      accuracy: 0.001,
    },
    abilities: [], // No starting abilities - will choose on level up
    spritePath: ICON_PATHS.quester,
    rarity: Rarity.Common,
    description: 'Versatile adventurer ready for any challenge',
  },

  // NEW HEROES - Advanced Combat System

  ironheart: {
    id: 'ironheart',
    class: 'Paladin',
    name: 'Ironheart',
    title: 'The Unyielding',
    baseStats: {
      hp: 88,
      maxHp: 88,
      damage: 15,
      speed: 80,
      defense: 30,
      critChance: 0.05,
      critDamage: 1.3,
      evasion: 0.02,
      accuracy: 0.95,
    },
    statGrowth: {
      hp: 10,
      damage: 2.2,
      speed: 1.0,
      defense: 1.0,
      critChance: 0.001,
      critDamage: 0.006,
      evasion: 0.0005,
      accuracy: 0.001,
    },
    abilities: [
      {
        id: 'shield_bash',
        name: 'Shield Bash',
        type: AbilityType.Offensive,
        description: 'Smash an enemy with your shield, dealing damage and stunning them for 1 turn',
        cooldown: 3,
        currentCooldown: 0,
        effects: [
          {
            type: 'damage',
            value: 60,
            targetType: 'enemy',
          },
          {
            type: 'status',
            statusType: StatusEffectType.Stun,
            duration: 1,
            targetType: 'enemy',
          },
        ],
      },
      {
        id: 'divine_light',
        name: 'Divine Light',
        type: AbilityType.Support,
        description: 'Heal all allies for 40 HP and cleanse one debuff',
        cooldown: 4,
        currentCooldown: 0,
        effects: [
          {
            type: 'heal',
            value: 40,
            targetType: 'allAllies',
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.paladin,
    rarity: Rarity.Epic,
    description: 'Stalwart defender who protects allies and disrupts enemies',
    tags: ['tank', 'support', 'melee', 'control'],
  },

  shadow: {
    id: 'shadow',
    class: 'Assassin',
    name: 'Shadow',
    title: 'The Phantom Blade',
    baseStats: {
      hp: 50,
      maxHp: 50,
      damage: 30,
      speed: 130,
      defense: 10,
      critChance: 0.35,
      critDamage: 2.2,
      evasion: 0.20,
      accuracy: 0.95,
    },
    statGrowth: {
      hp: 5.5,
      damage: 4.2,
      speed: 1.8,
      defense: 0.3,
      critChance: 0.005,
      critDamage: 0.018,
      evasion: 0.003,
      accuracy: 0.001,
    },
    abilities: [
      {
        id: 'piercing_strike',
        name: 'Piercing Strike',
        type: AbilityType.Offensive,
        description: 'Critical strike that ignores 40% of enemy armor. Bonus damage from behind.',
        cooldown: 2,
        currentCooldown: 0,
        effects: [
          {
            type: 'damage',
            value: 110,
            targetType: 'enemy',
          },
          {
            type: 'conditional',
            condition: 'attacking_from_behind',
            damageMultiplier: 1.5,
            targetType: 'enemy',
          },
        ],
      },
      {
        id: 'vanish',
        name: 'Vanish',
        type: AbilityType.Support,
        description: 'Become invisible for 2 turns, gaining 100% evasion and increased crit chance',
        cooldown: 5,
        currentCooldown: 0,
        effects: [
          {
            type: 'status',
            statusType: StatusEffectType.Invisibility,
            duration: 2,
            targetType: 'self',
            statModifier: {
              stat: 'evasion',
              value: 1.0,
              isPercent: false,
            },
          },
          {
            type: 'buff',
            duration: 2,
            targetType: 'self',
            statModifier: {
              stat: 'critChance',
              value: 0.25,
              isPercent: false,
            },
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.arcanerogue,
    rarity: Rarity.Legendary,
    description: 'Glass cannon assassin with extreme crit and evasion',
    tags: ['dps', 'assassin', 'melee', 'critical'],
  },
};

// Enemy Templates
export const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = {
  // TUTORIAL TIER - Very weak critters for first few stages
  giant_spider: {
    id: 'giant_spider',
    name: 'Giant Spider',
    type: 'Beast',
    baseStats: createStats(20, 8, 100),
    abilities: [],
    spritePath: ICON_PATHS.plagueRat, // Using rat icon as placeholder
    description: 'Common forest spider',
  },

  small_rat: {
    id: 'small_rat',
    name: 'Small Rat',
    type: 'Beast',
    baseStats: createStats(15, 6, 120),
    abilities: [],
    spritePath: ICON_PATHS.plagueRat,
    description: 'Tiny scavenging rodent',
  },

  wild_bat: {
    id: 'wild_bat',
    name: 'Wild Bat',
    type: 'Beast',
    baseStats: createStats(12, 10, 140),
    abilities: [],
    spritePath: ICON_PATHS.bat,
    description: 'Fast but fragile cave bat',
  },

  plague_rat: {
    id: 'plague_rat',
    name: 'Plague Rat',
    type: 'Beast',
    baseStats: createStats(40, 15, 130),
    abilities: [],
    spritePath: ICON_PATHS.plagueRat,
    description: 'Diseased rodent',
  },

  wraith: {
    id: 'wraith',
    name: 'Wraith',
    type: 'Undead',
    baseStats: createStats(60, 25, 110),
    abilities: [],
    spritePath: ICON_PATHS.hoodZombie,
    description: 'Ghostly spirit',
  },

  slime: {
    id: 'slime',
    name: 'Slime',
    type: 'Blob',
    baseStats: createStats(80, 20, 70),
    abilities: [],
    spritePath: ICON_PATHS.bluebottle,
    description: 'Gelatinous creature',
  },

  gargoyle: {
    id: 'gargoyle',
    name: 'Gargoyle',
    type: 'Construct',
    baseStats: createStats(120, 35, 90),
    abilities: [],
    spritePath: ICON_PATHS.bat,
    description: 'Stone guardian',
  },

  bone_construct: {
    id: 'bone_construct',
    name: 'Bone Construct',
    type: 'Undead',
    baseStats: createStats(100, 30, 85),
    abilities: [],
    spritePath: ICON_PATHS.skinnyZombie,
    description: 'Animated skeleton',
  },

  cultist: {
    id: 'cultist',
    name: 'Cultist',
    type: 'Humanoid',
    baseStats: createStats(70, 28, 100),
    abilities: [],
    spritePath: ICON_PATHS.darkman,
    description: 'Dark worshipper',
  },

  shadow_beast: {
    id: 'shadow_beast',
    name: 'Shadow Beast',
    type: 'Demon',
    baseStats: createStats(150, 45, 120),
    abilities: [],
    spritePath: ICON_PATHS.chimera,
    description: 'Creature of darkness',
  },

  necromancer_boss: {
    id: 'necromancer_boss',
    name: 'Necromancer Lord',
    type: 'Boss',
    baseStats: createStats(250, 60, 95),
    abilities: [
      {
        id: 'summon_undead',
        name: 'Summon Undead',
        type: AbilityType.Support,
        description: 'Summons skeleton allies',
        cooldown: 5,
        currentCooldown: 0,
        effects: [],
      },
    ],
    spritePath: ICON_PATHS.necromancer,
    description: 'Master of death magic',
  },

  // NEW ENEMIES - Advanced Combat System

  bonecrusher: {
    id: 'bonecrusher',
    name: 'Bonecrusher',
    title: 'The Savage',
    type: 'Brute',
    baseStats: {
      hp: 280,
      maxHp: 280,
      damage: 50,
      speed: 75,
      defense: 20,
      critChance: 0.10,
      critDamage: 1.5,
      evasion: 0.05,
      accuracy: 0.90,
    },
    abilities: [
      {
        id: 'devastating_slam',
        name: 'Devastating Slam',
        type: AbilityType.Offensive,
        description: 'Powerful AoE attack that damages and slows all nearby heroes',
        cooldown: 4,
        currentCooldown: 0,
        effects: [
          {
            type: 'damage',
            value: 65,
            targetType: 'aoe',
            radius: 2,
          },
          {
            type: 'status',
            statusType: StatusEffectType.Slow,
            duration: 2,
            targetType: 'aoe',
            radius: 2,
            statModifier: {
              stat: 'speed',
              value: -30,
              isPercent: true,
            },
          },
        ],
      },
      {
        id: 'berserk_rage',
        name: 'Berserk Rage',
        type: AbilityType.Support,
        description: 'Enter a rage, gaining bonus damage and attack speed but losing defense',
        cooldown: 5,
        currentCooldown: 0,
        effects: [
          {
            type: 'status',
            statusType: StatusEffectType.Enrage,
            duration: 3,
            targetType: 'self',
            statModifier: {
              stat: 'damage',
              value: 40,
              isPercent: true,
            },
          },
          {
            type: 'debuff',
            duration: 3,
            targetType: 'self',
            statModifier: {
              stat: 'defense',
              value: -30,
              isPercent: true,
            },
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.blackHulk,
    description: 'Massive brute who trades defense for overwhelming offense',
    aiPattern: AIPattern.Aggressive,
    tags: ['tank', 'aoe', 'melee', 'disruption'],
  },

  whisperwind: {
    id: 'whisperwind',
    name: 'Whisperwind',
    title: 'The Eternal Shadow',
    type: 'Wraith',
    baseStats: {
      hp: 110,
      maxHp: 110,
      damage: 65,
      speed: 130,
      defense: 5,
      critChance: 0.25,
      critDamage: 2.0,
      evasion: 0.35,
      accuracy: 0.90,
      flying: true,
    },
    abilities: [
      {
        id: 'soul_drain',
        name: 'Soul Drain',
        type: AbilityType.Offensive,
        description: 'Drains life from target, healing self for 50% of damage dealt',
        cooldown: 3,
        currentCooldown: 0,
        effects: [
          {
            type: 'damage',
            value: 70,
            targetType: 'enemy',
          },
          {
            type: 'lifesteal',
            value: 0.5,
            targetType: 'self',
          },
        ],
      },
      {
        id: 'phase_shift',
        name: 'Phase Shift',
        type: AbilityType.Support,
        description: 'Become incorporeal for 2 turns, gaining immunity to physical damage',
        cooldown: 5,
        currentCooldown: 0,
        effects: [
          {
            type: 'status',
            statusType: StatusEffectType.Incorporeal,
            duration: 2,
            targetType: 'self',
            statModifier: {
              stat: 'evasion',
              value: 0.50,
              isPercent: false,
            },
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.succubus,
    description: 'Elusive wraith with extreme evasion and lifesteal',
    aiPattern: AIPattern.Opportunistic,
    tags: ['assassin', 'evasion', 'lifesteal', 'flyer', 'undead'],
  },
};

// Learnable abilities for heroes
export const LEARNABLE_ABILITIES: Record<string, Ability> = {
  // QUESTER ABILITIES - Choose one on levelup
  blade_cleave: {
    id: 'blade_cleave',
    name: 'Blade Cleave',
    type: AbilityType.Offensive,
    description: 'Powerful sweeping attack that hits multiple enemies in an arc',
    cooldown: 4,
    currentCooldown: 0,
    effects: [
      {
        type: 'damage',
        value: 85,
        targetType: 'aoe',
        radius: 1, // Hits adjacent enemies
      },
    ],
    animationType: 'cleave', // For animation system
  },

  fireball: {
    id: 'fireball',
    name: 'Fireball',
    type: AbilityType.Offensive,
    description: 'Hurl a flaming projectile that explodes on impact, dealing damage and burning enemies',
    cooldown: 5,
    currentCooldown: 0,
    effects: [
      {
        type: 'damage',
        value: 100,
        targetType: 'enemy',
      },
      {
        type: 'status',
        statusType: StatusEffectType.Burn,
        duration: 3,
        targetType: 'enemy',
        damagePerTick: 10,
      },
    ],
    animationType: 'projectile', // For animation system
  },

  rallying_cry: {
    id: 'rallying_cry',
    name: 'Rallying Cry',
    type: AbilityType.Support,
    description: 'Inspire nearby allies, boosting their damage and speed',
    cooldown: 6,
    currentCooldown: 0,
    effects: [
      {
        type: 'buff',
        duration: 3,
        targetType: 'allAllies',
        statModifier: {
          stat: 'damage',
          value: 20,
          isPercent: true,
        },
      },
      {
        type: 'buff',
        duration: 3,
        targetType: 'allAllies',
        statModifier: {
          stat: 'speed',
          value: 15,
          isPercent: true,
        },
      },
    ],
    animationType: 'buff', // For animation system
  },
};

// Map of which abilities each hero can learn
export const HERO_LEARNABLE_ABILITIES: Record<string, string[]> = {
  quester: ['blade_cleave', 'fireball', 'rallying_cry'],
};

// Helper function to calculate XP needed for a level
function calculateMaxExperience(level: number): number {
  // Exponential curve: each level requires more XP
  // Level 1->2: 100 XP, Level 2->3: 150 XP, Level 3->4: 225 XP, etc.
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

// Helper function to get hero cost in gems based on rarity/tier
export function getHeroGemCost(rarity: Rarity): number {
  switch (rarity) {
    case Rarity.Common:
      return 10; // Common heroes cost 10 gems
    case Rarity.Uncommon:
      return 25; // Uncommon heroes cost 25 gems
    case Rarity.Rare:
      return 50; // Rare heroes cost 50 gems
    case Rarity.Epic:
      return 100; // Epic heroes cost 100 gems
    case Rarity.Legendary:
      return 200; // Legendary heroes cost 200 gems
    default:
      return 50; // Default to rare price
  }
}

// Helper function to create a hero instance
export function createHeroInstance(templateId: string, level: number = 1): any {
  const template = HERO_TEMPLATES[templateId];
  if (!template) {
    throw new Error(`Hero template not found: ${templateId}`);
  }

  return {
    ...template,
    instanceId: `${templateId}_${Date.now()}_${Math.random()}`,
    level,
    experience: 0,
    maxExperience: calculateMaxExperience(level),
    equippedItem: undefined,
    currentStats: { ...template.baseStats },
  };
}

// Helper function to create an enemy instance with progressive scaling
export function createEnemyInstance(templateId: string, stageId: number = 1): any {
  const template = ENEMY_TEMPLATES[templateId];
  if (!template) {
    throw new Error(`Enemy template not found: ${templateId}`);
  }

  // Calculate scaling factor based on stage number
  // Stage 1 = 1.0x (no scaling)
  // Stage 64 = 1.6x stats
  // Stage 128 = 2.2x stats
  // Stage 256 = 3.4x stats
  // Stage 512 = 6.0x stats (exponential growth)
  const scalingFactor = 1 + (stageId / 512) * 5.0; // Linear component
  const exponentialFactor = Math.pow(1.003, stageId - 1); // Exponential component for late game
  const totalScaling = scalingFactor * exponentialFactor;

  // Apply scaling to stats
  const scaledStats = { ...template.baseStats };
  scaledStats.hp = Math.floor(scaledStats.hp * totalScaling);
  scaledStats.maxHp = Math.floor(scaledStats.maxHp * totalScaling);
  scaledStats.damage = Math.floor(scaledStats.damage * totalScaling);
  scaledStats.defense = Math.floor(scaledStats.defense * (1 + (totalScaling - 1) * 0.5)); // Defense scales slower

  // Speed increases slightly but caps at reasonable values
  scaledStats.speed = Math.floor(scaledStats.speed * (1 + (totalScaling - 1) * 0.2));

  return {
    ...template,
    instanceId: `${templateId}_${Date.now()}_${Math.random()}`,
    currentStats: scaledStats,
  };
}
