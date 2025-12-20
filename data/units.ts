// Hero and Enemy unit templates
import { HeroTemplate, EnemyTemplate, Rarity, UnitStats, Ability, AbilityType, StatusEffectType, AIPattern } from '@/types/core.types';
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
    baseStats: createStats(200, 50, 100),
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
    baseStats: createStats(120, 70, 150),
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
    baseStats: createStats(150, 30, 90),
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
    baseStats: createStats(100, 80, 80),
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
    baseStats: createStats(140, 60, 120),
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
    baseStats: createStats(300, 40, 60),
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
    baseStats: createStats(160, 55, 110),
    abilities: [
      {
        id: 'heroic_strike',
        name: 'Heroic Strike',
        type: AbilityType.Offensive,
        description: 'Balanced attack',
        cooldown: 3,
        currentCooldown: 0,
        effects: [
          {
            type: 'damage',
            value: 70,
            targetType: 'enemy',
          },
        ],
      },
    ],
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
      hp: 250,
      maxHp: 250,
      damage: 40,
      speed: 85,
      defense: 30,
      critChance: 0.05,
      critDamage: 1.3,
      evasion: 0.02,
      accuracy: 0.95,
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
      hp: 140,
      maxHp: 140,
      damage: 85,
      speed: 140,
      defense: 10,
      critChance: 0.35,
      critDamage: 2.2,
      evasion: 0.20,
      accuracy: 0.95,
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
    equippedItem: undefined,
    currentStats: { ...template.baseStats },
  };
}

// Helper function to create an enemy instance
export function createEnemyInstance(templateId: string): any {
  const template = ENEMY_TEMPLATES[templateId];
  if (!template) {
    throw new Error(`Enemy template not found: ${templateId}`);
  }

  return {
    ...template,
    instanceId: `${templateId}_${Date.now()}_${Math.random()}`,
    currentStats: { ...template.baseStats },
  };
}
