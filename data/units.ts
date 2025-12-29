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
        range: 1, // Melee range
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
        animationType: 'melee', // Melee attack with lifesteal
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
    rarity: Rarity.Mythic,
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
        description: 'High accuracy ranged attack with 4 tile range',
        cooldown: 2,
        currentCooldown: 0,
        range: 4, // Can shoot from 4 tiles away
        effects: [
          {
            type: 'damage',
            value: 80,
            targetType: 'enemy',
          },
        ],
        animationType: 'projectile', // Arrow animation
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
    rarity: Rarity.Mythic,
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

  war_cleric: {
    id: 'war_cleric',
    class: 'War Cleric',
    name: 'War Cleric',
    title: 'The Divine Healer',
    baseStats: {
      hp: 65,
      maxHp: 65,
      damage: 18,
      speed: 95,
      defense: 15,
      critChance: 0.08,
      critDamage: 1.4,
      evasion: 0.05,
      accuracy: 0.95,
    },
    statGrowth: {
      hp: 7.5,
      damage: 2.0,
      speed: 1.2,
      defense: 0.6,
      critChance: 0.001,
      critDamage: 0.008,
      evasion: 0.001,
      accuracy: 0.001,
    },
    abilities: [
      {
        id: 'mass_heal',
        name: 'Mass Heal',
        type: AbilityType.Support,
        description: 'Channel divine energy to restore health to all allied heroes',
        cooldown: 1,
        currentCooldown: 0,
        effects: [
          {
            type: 'heal',
            value: 45,
            targetType: 'allAllies',
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.warCleric,
    rarity: Rarity.Rare,
    description: 'Holy warrior who brings divine healing to the battlefield',
    tags: ['support', 'healer', 'melee', 'divine'],
  },

  // RANGED HERO EXPANSION

  frost_mage: {
    id: 'frost_mage',
    class: 'Frost Mage',
    name: 'Frost Mage',
    title: 'The Winterborn',
    baseStats: {
      hp: 45,
      maxHp: 45,
      damage: 24,
      speed: 85,
      defense: 8,
      critChance: 0.15,
      critDamage: 1.8,
      evasion: 0.08,
      accuracy: 0.98,
      range: 5, // Long range caster
    },
    statGrowth: {
      hp: 5.0,
      damage: 3.5,
      speed: 1.1,
      defense: 0.3,
      critChance: 0.002,
      critDamage: 0.01,
      evasion: 0.001,
      accuracy: 0.001,
    },
    abilities: [
      {
        id: 'frost_bolt',
        name: 'Frost Bolt',
        type: AbilityType.Offensive,
        description: 'Launches an icy projectile that slows enemy by 30% for 2 turns',
        cooldown: 2,
        currentCooldown: 0,
        range: 5,
        effects: [
          {
            type: 'damage',
            value: 75,
            targetType: 'enemy',
          },
          {
            type: 'status',
            statusType: StatusEffectType.Slow,
            value: 0.3,
            duration: 2,
            targetType: 'enemy',
          },
        ],
        animationType: 'projectile',
      },
      {
        id: 'blizzard',
        name: 'Blizzard',
        type: AbilityType.Offensive,
        description: 'AoE spell hitting all enemies for moderate damage',
        cooldown: 4,
        currentCooldown: 0,
        range: 6,
        effects: [
          {
            type: 'damage',
            value: 50,
            targetType: 'allEnemies',
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.necromancer, // Placeholder
    icon: '🧊',
    rarity: Rarity.Rare,
    description: 'Master of ice magic who controls the battlefield from afar',
    tags: ['ranged', 'mage', 'control', 'aoe'],
  },

  ranger: {
    id: 'ranger',
    class: 'Ranger',
    name: 'Ranger',
    title: 'The Eagle Eye',
    baseStats: {
      hp: 58,
      maxHp: 58,
      damage: 20,
      speed: 115,
      defense: 12,
      critChance: 0.25,
      critDamage: 2.0,
      evasion: 0.12,
      accuracy: 1.0, // Never misses
      range: 6, // Excellent range
    },
    statGrowth: {
      hp: 6.5,
      damage: 2.8,
      speed: 1.4,
      defense: 0.4,
      critChance: 0.003,
      critDamage: 0.012,
      evasion: 0.002,
      accuracy: 0,
    },
    abilities: [
      {
        id: 'aimed_shot',
        name: 'Aimed Shot',
        type: AbilityType.Offensive,
        description: 'Guaranteed critical hit with bonus damage',
        cooldown: 3,
        currentCooldown: 0,
        range: 6,
        effects: [
          {
            type: 'damage',
            value: 100,
            guaranteedCrit: true,
            targetType: 'enemy',
          },
        ],
        animationType: 'projectile',
      },
      {
        id: 'hunters_mark',
        name: "Hunter's Mark",
        type: AbilityType.Support,
        description: 'Mark enemy, increasing damage taken by 25% for 3 turns',
        cooldown: 4,
        currentCooldown: 0,
        range: 8,
        effects: [
          {
            type: 'debuff',
            value: 0.25,
            duration: 3,
            targetType: 'enemy',
            statModifier: {
              stat: 'damageTaken',
              value: 1.25,
              isPercent: true,
            },
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.torchman,
    icon: '🏹',
    rarity: Rarity.Uncommon,
    description: 'Elite marksman with unparalleled accuracy and range',
    tags: ['ranged', 'physical', 'marksman', 'consistent'],
  },

  gunslinger: {
    id: 'gunslinger',
    class: 'Gunslinger',
    name: 'Gunslinger',
    title: 'The Quick Draw',
    baseStats: {
      hp: 52,
      maxHp: 52,
      damage: 26,
      speed: 125,
      defense: 10,
      critChance: 0.20,
      critDamage: 1.75,
      evasion: 0.15,
      accuracy: 0.92,
      range: 4, // Medium range
    },
    statGrowth: {
      hp: 5.5,
      damage: 3.8,
      speed: 1.6,
      defense: 0.35,
      critChance: 0.003,
      critDamage: 0.01,
      evasion: 0.002,
      accuracy: 0.001,
    },
    abilities: [
      {
        id: 'rapid_fire',
        name: 'Rapid Fire',
        type: AbilityType.Offensive,
        description: 'Unleash 3 shots at random enemies',
        cooldown: 3,
        currentCooldown: 0,
        range: 4,
        effects: [
          {
            type: 'multiHit',
            value: 40,
            hits: 3,
            targetType: 'randomEnemy',
          },
        ],
        animationType: 'projectile',
      },
      {
        id: 'smoke_bomb',
        name: 'Smoke Bomb',
        type: AbilityType.Defensive,
        description: 'Grant 50% evasion to all allies for 2 turns',
        cooldown: 5,
        currentCooldown: 0,
        effects: [
          {
            type: 'buff',
            duration: 2,
            targetType: 'allAllies',
            statModifier: {
              stat: 'evasion',
              value: 0.5,
              isPercent: false,
            },
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.darkKnifeman,
    icon: '🔫',
    rarity: Rarity.Rare,
    description: 'Fast-shooting outlaw with devastating burst potential',
    tags: ['ranged', 'physical', 'burst', 'utility'],
  },

  fire_mage: {
    id: 'fire_mage',
    class: 'Fire Mage',
    name: 'Fire Mage',
    title: 'The Pyromaniac',
    baseStats: {
      hp: 40,
      maxHp: 40,
      damage: 32,
      speed: 80,
      defense: 6,
      critChance: 0.10,
      critDamage: 2.5,
      evasion: 0.05,
      accuracy: 0.95,
      range: 5,
    },
    statGrowth: {
      hp: 4.5,
      damage: 4.5, // Highest damage growth
      speed: 1.0,
      defense: 0.25,
      critChance: 0.002,
      critDamage: 0.015,
      evasion: 0.001,
      accuracy: 0.001,
    },
    abilities: [
      {
        id: 'incinerate',
        name: 'Incinerate',
        type: AbilityType.Offensive,
        description: 'Devastating fire spell with burn damage over time',
        cooldown: 3,
        currentCooldown: 0,
        range: 5,
        effects: [
          {
            type: 'damage',
            value: 90,
            targetType: 'enemy',
          },
          {
            type: 'status',
            statusType: StatusEffectType.Burn,
            value: 15,
            duration: 3,
            targetType: 'enemy',
          },
        ],
        animationType: 'explosion',
      },
      {
        id: 'meteor',
        name: 'Meteor',
        type: AbilityType.Offensive,
        description: 'Call down a meteor dealing massive AoE damage',
        cooldown: 6,
        currentCooldown: 0,
        range: 7,
        effects: [
          {
            type: 'damage',
            value: 140,
            targetType: 'aoe',
            radius: 2,
          },
        ],
        animationType: 'explosion',
      },
    ],
    spritePath: ICON_PATHS.necromancer,
    icon: '🔥',
    rarity: Rarity.Epic,
    description: 'Glass cannon mage with extreme damage potential',
    tags: ['ranged', 'mage', 'burst', 'aoe'],
  },

  crossbowman: {
    id: 'crossbowman',
    class: 'Crossbowman',
    name: 'Crossbowman',
    title: 'The Siege Breaker',
    baseStats: {
      hp: 65,
      maxHp: 65,
      damage: 22,
      speed: 70, // Slower but tanky
      defense: 18,
      critChance: 0.12,
      critDamage: 1.6,
      evasion: 0.03,
      accuracy: 0.97,
      range: 5,
    },
    statGrowth: {
      hp: 7.5,
      damage: 3.0,
      speed: 0.9,
      defense: 0.7,
      critChance: 0.002,
      critDamage: 0.008,
      evasion: 0.0005,
      accuracy: 0.001,
    },
    abilities: [
      {
        id: 'armor_piercing_bolt',
        name: 'Armor Piercing Bolt',
        type: AbilityType.Offensive,
        description: 'Ignores 75% of enemy defense',
        cooldown: 3,
        currentCooldown: 0,
        range: 5,
        effects: [
          {
            type: 'damage',
            value: 85,
            ignoreDefense: 0.75,
            targetType: 'enemy',
          },
        ],
        animationType: 'projectile',
      },
    ],
    spritePath: ICON_PATHS.torchman,
    icon: '🎯',
    rarity: Rarity.Common,
    description: 'Durable ranged fighter with armor penetration',
    tags: ['ranged', 'physical', 'tank', 'anti-armor'],
  },

  lightning_mage: {
    id: 'lightning_mage',
    class: 'Lightning Mage',
    name: 'Lightning Mage',
    title: 'The Storm Caller',
    baseStats: {
      hp: 48,
      maxHp: 48,
      damage: 28,
      speed: 110,
      defense: 9,
      critChance: 0.18,
      critDamage: 2.0,
      evasion: 0.10,
      accuracy: 0.96,
      range: 6,
    },
    statGrowth: {
      hp: 5.5,
      damage: 4.0,
      speed: 1.5,
      defense: 0.35,
      critChance: 0.003,
      critDamage: 0.01,
      evasion: 0.001,
      accuracy: 0.001,
    },
    abilities: [
      {
        id: 'chain_lightning',
        name: 'Chain Lightning',
        type: AbilityType.Offensive,
        description: 'Lightning bounces between 3 enemies',
        cooldown: 3,
        currentCooldown: 0,
        range: 6,
        effects: [
          {
            type: 'chain',
            value: 70,
            bounces: 3,
            targetType: 'enemy',
          },
        ],
        animationType: 'lightning',
      },
      {
        id: 'thunderstorm',
        name: 'Thunderstorm',
        type: AbilityType.Offensive,
        description: 'Strikes random enemies 5 times',
        cooldown: 5,
        currentCooldown: 0,
        effects: [
          {
            type: 'multiHit',
            value: 45,
            hits: 5,
            targetType: 'randomEnemy',
          },
        ],
        animationType: 'lightning',
      },
    ],
    spritePath: ICON_PATHS.necromancer,
    icon: '⚡',
    rarity: Rarity.Epic,
    description: 'Master of chain damage and random destruction',
    tags: ['ranged', 'mage', 'chain', 'random'],
  },

  nature_druid: {
    id: 'nature_druid',
    class: 'Nature Druid',
    name: 'Nature Druid',
    title: 'The Grove Keeper',
    baseStats: {
      hp: 60,
      maxHp: 60,
      damage: 16,
      speed: 90,
      defense: 14,
      critChance: 0.08,
      critDamage: 1.4,
      evasion: 0.07,
      accuracy: 0.94,
      range: 4,
    },
    statGrowth: {
      hp: 7.0,
      damage: 2.2,
      speed: 1.2,
      defense: 0.5,
      critChance: 0.001,
      critDamage: 0.007,
      evasion: 0.001,
      accuracy: 0.001,
    },
    abilities: [
      {
        id: 'entangling_roots',
        name: 'Entangling Roots',
        type: AbilityType.Support,
        description: 'Root enemy in place for 2 turns',
        cooldown: 3,
        currentCooldown: 0,
        range: 4,
        effects: [
          {
            type: 'status',
            statusType: StatusEffectType.Root,
            duration: 2,
            targetType: 'enemy',
          },
          {
            type: 'damage',
            value: 40,
            targetType: 'enemy',
          },
        ],
      },
      {
        id: 'rejuvenation',
        name: 'Rejuvenation',
        type: AbilityType.Support,
        description: 'Heal over time for 3 turns',
        cooldown: 4,
        currentCooldown: 0,
        range: 5,
        effects: [
          {
            type: 'status',
            statusType: StatusEffectType.Regeneration,
            value: 25,
            duration: 3,
            targetType: 'ally',
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.staffCloakman,
    icon: '🌿',
    rarity: Rarity.Uncommon,
    description: 'Versatile caster with control and healing',
    tags: ['ranged', 'support', 'control', 'hybrid'],
  },

  void_archer: {
    id: 'void_archer',
    class: 'Void Archer',
    name: 'Void Archer',
    title: 'The Shadow Shot',
    baseStats: {
      hp: 55,
      maxHp: 55,
      damage: 24,
      speed: 105,
      defense: 11,
      critChance: 0.22,
      critDamage: 1.9,
      evasion: 0.14,
      accuracy: 0.93,
      range: 7, // Longest range
    },
    statGrowth: {
      hp: 6.0,
      damage: 3.3,
      speed: 1.3,
      defense: 0.4,
      critChance: 0.003,
      critDamage: 0.011,
      evasion: 0.002,
      accuracy: 0.001,
    },
    abilities: [
      {
        id: 'void_arrow',
        name: 'Void Arrow',
        type: AbilityType.Offensive,
        description: 'Pierces through enemies in a line',
        cooldown: 3,
        currentCooldown: 0,
        range: 7,
        effects: [
          {
            type: 'pierce',
            value: 80,
            targetType: 'line',
          },
        ],
        animationType: 'projectile',
      },
      {
        id: 'shadow_step',
        name: 'Shadow Step',
        type: AbilityType.Support,
        description: 'Teleport to a new position and gain evasion',
        cooldown: 4,
        currentCooldown: 0,
        effects: [
          {
            type: 'teleport',
            targetType: 'self',
          },
          {
            type: 'buff',
            duration: 2,
            targetType: 'self',
            statModifier: {
              stat: 'evasion',
              value: 0.3,
              isPercent: false,
            },
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.darkKnifeman,
    icon: '🌑',
    rarity: Rarity.Legendary,
    description: 'Elite sniper with unmatched range and mobility',
    tags: ['ranged', 'physical', 'sniper', 'mobile'],
  },

  alchemist: {
    id: 'alchemist',
    class: 'Alchemist',
    name: 'Alchemist',
    title: 'The Mad Bomber',
    baseStats: {
      hp: 50,
      maxHp: 50,
      damage: 18,
      speed: 95,
      defense: 10,
      critChance: 0.15,
      critDamage: 1.7,
      evasion: 0.08,
      accuracy: 0.90,
      range: 3, // Throws potions
    },
    statGrowth: {
      hp: 6.0,
      damage: 2.5,
      speed: 1.2,
      defense: 0.4,
      critChance: 0.002,
      critDamage: 0.009,
      evasion: 0.001,
      accuracy: 0.001,
    },
    abilities: [
      {
        id: 'acid_flask',
        name: 'Acid Flask',
        type: AbilityType.Offensive,
        description: 'Throw acid reducing enemy defense by 50%',
        cooldown: 3,
        currentCooldown: 0,
        range: 3,
        effects: [
          {
            type: 'damage',
            value: 50,
            targetType: 'aoe',
            radius: 1,
          },
          {
            type: 'debuff',
            duration: 3,
            targetType: 'aoe',
            radius: 1,
            statModifier: {
              stat: 'defense',
              value: 0.5,
              isPercent: true,
            },
          },
        ],
        animationType: 'projectile',
      },
      {
        id: 'healing_potion',
        name: 'Healing Potion',
        type: AbilityType.Support,
        description: 'Throw a healing potion to an ally',
        cooldown: 2,
        currentCooldown: 0,
        range: 3,
        effects: [
          {
            type: 'heal',
            value: 60,
            targetType: 'ally',
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.staffCloakman,
    icon: '⚗️',
    rarity: Rarity.Rare,
    description: 'Support bomber with debuffs and utility',
    tags: ['ranged', 'support', 'debuffer', 'utility'],
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
    abilities: [
      {
        id: 'disease_bite',
        name: 'Disease Bite',
        type: AbilityType.Offensive,
        description: 'Infects target with disease, reducing healing by 50%',
        cooldown: 3,
        currentCooldown: 0,
        range: 1,
        effects: [
          {
            type: 'damage',
            value: 20,
            targetType: 'enemy',
          },
          {
            type: 'status',
            statusType: StatusEffectType.Disease,
            duration: 3,
            targetType: 'enemy',
            value: 0.5, // 50% healing reduction
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.plagueRat,
    description: 'Diseased rodent that spreads infection',
  },

  wraith: {
    id: 'wraith',
    name: 'Wraith',
    type: 'Undead',
    baseStats: {
      hp: 60,
      maxHp: 60,
      damage: 25,
      speed: 110,
      defense: 5,
      critChance: 0.15,
      critDamage: 1.5,
      evasion: 0.25, // High evasion
      accuracy: 0.95,
      range: 3, // Ranged attacker
    },
    abilities: [
      {
        id: 'life_drain',
        name: 'Life Drain',
        type: AbilityType.Offensive,
        description: 'Drains life from target',
        cooldown: 3,
        currentCooldown: 0,
        range: 3,
        effects: [
          {
            type: 'damage',
            value: 35,
            targetType: 'enemy',
          },
          {
            type: 'lifesteal',
            value: 0.5,
            targetType: 'self',
          },
        ],
        animationType: 'projectile',
      },
    ],
    spritePath: ICON_PATHS.hoodZombie,
    description: 'Ghostly spirit that drains life force',
  },

  slime: {
    id: 'slime',
    name: 'Slime',
    type: 'Blob',
    baseStats: createStats(80, 20, 70),
    abilities: [
      {
        id: 'split',
        name: 'Split',
        type: AbilityType.Support,
        description: 'Splits into two smaller slimes on death',
        cooldown: 999, // Passive - triggers on death
        currentCooldown: 0,
        effects: [
          {
            type: 'summon',
            summonId: 'mini_slime',
            count: 2,
            targetType: 'self',
          },
        ],
      },
      {
        id: 'acid_splash',
        name: 'Acid Splash',
        type: AbilityType.Offensive,
        description: 'Splashes acid reducing armor',
        cooldown: 2,
        currentCooldown: 0,
        range: 2,
        effects: [
          {
            type: 'damage',
            value: 25,
            targetType: 'enemy',
          },
          {
            type: 'debuff',
            duration: 2,
            targetType: 'enemy',
            statModifier: {
              stat: 'defense',
              value: 0.7,
              isPercent: true,
            },
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.slime,
    description: 'Gelatinous creature that splits when killed',
  },

  gargoyle: {
    id: 'gargoyle',
    name: 'Gargoyle',
    type: 'Construct',
    baseStats: {
      hp: 120,
      maxHp: 120,
      damage: 35,
      speed: 90,
      defense: 25, // High defense
      critChance: 0.05,
      critDamage: 1.3,
      evasion: 0.05,
      accuracy: 0.95,
      range: 1,
    },
    abilities: [
      {
        id: 'stone_form',
        name: 'Stone Form',
        type: AbilityType.Defensive,
        description: 'Turns to stone, gaining 50% damage reduction',
        cooldown: 4,
        currentCooldown: 0,
        effects: [
          {
            type: 'buff',
            duration: 2,
            targetType: 'self',
            statModifier: {
              stat: 'defense',
              value: 2.0,
              isPercent: true,
            },
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.bat,
    description: 'Stone guardian with defensive abilities',
  },

  bone_construct: {
    id: 'bone_construct',
    name: 'Bone Construct',
    type: 'Undead',
    baseStats: createStats(100, 30, 85),
    abilities: [
      {
        id: 'bone_throw',
        name: 'Bone Throw',
        type: AbilityType.Offensive,
        description: 'Throws bones at enemies',
        cooldown: 2,
        currentCooldown: 0,
        range: 4, // Ranged attack
        effects: [
          {
            type: 'damage',
            value: 40,
            targetType: 'enemy',
          },
        ],
        animationType: 'projectile',
      },
    ],
    spritePath: ICON_PATHS.skinnyZombie,
    description: 'Animated skeleton archer',
  },

  cultist: {
    id: 'cultist',
    name: 'Cultist',
    type: 'Humanoid',
    baseStats: {
      hp: 70,
      maxHp: 70,
      damage: 28,
      speed: 100,
      defense: 12,
      critChance: 0.10,
      critDamage: 1.5,
      evasion: 0.08,
      accuracy: 0.92,
      range: 5, // Caster
    },
    abilities: [
      {
        id: 'dark_curse',
        name: 'Dark Curse',
        type: AbilityType.Support,
        description: 'Curses enemy reducing all stats by 20%',
        cooldown: 3,
        currentCooldown: 0,
        range: 5,
        effects: [
          {
            type: 'debuff',
            duration: 3,
            targetType: 'enemy',
            statModifier: {
              stat: 'allStats',
              value: 0.8,
              isPercent: true,
            },
          },
        ],
        animationType: 'projectile',
      },
      {
        id: 'summon_imp',
        name: 'Summon Imp',
        type: AbilityType.Support,
        description: 'Summons an imp to fight',
        cooldown: 5,
        currentCooldown: 0,
        effects: [
          {
            type: 'summon',
            summonId: 'imp',
            count: 1,
            targetType: 'self',
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.darkman,
    description: 'Dark caster that summons and curses',
  },

  shadow_beast: {
    id: 'shadow_beast',
    name: 'Shadow Beast',
    type: 'Demon',
    baseStats: {
      hp: 150,
      maxHp: 150,
      damage: 45,
      speed: 120,
      defense: 15,
      critChance: 0.25,
      critDamage: 2.0,
      evasion: 0.15,
      accuracy: 0.95,
      range: 1,
    },
    abilities: [
      {
        id: 'shadow_strike',
        name: 'Shadow Strike',
        type: AbilityType.Offensive,
        description: 'Teleports behind target for critical strike',
        cooldown: 3,
        currentCooldown: 0,
        effects: [
          {
            type: 'teleport',
            targetType: 'behind_enemy',
          },
          {
            type: 'damage',
            value: 80,
            guaranteedCrit: true,
            targetType: 'enemy',
          },
        ],
      },
      {
        id: 'terrify',
        name: 'Terrify',
        type: AbilityType.Support,
        description: 'Fears nearby enemies',
        cooldown: 4,
        currentCooldown: 0,
        effects: [
          {
            type: 'status',
            statusType: StatusEffectType.Fear,
            duration: 2,
            targetType: 'aoe',
            radius: 2,
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.chimera,
    description: 'Assassin demon with fear abilities',
  },

  necromancer_boss: {
    id: 'necromancer_boss',
    name: 'Necromancer Lord',
    type: 'Boss',
    baseStats: {
      hp: 250,
      maxHp: 250,
      damage: 60,
      speed: 95,
      defense: 20,
      critChance: 0.15,
      critDamage: 1.8,
      evasion: 0.10,
      accuracy: 0.98,
      range: 6, // Long range caster
    },
    abilities: [
      {
        id: 'death_bolt',
        name: 'Death Bolt',
        type: AbilityType.Offensive,
        description: 'Powerful necromantic projectile',
        cooldown: 2,
        currentCooldown: 0,
        range: 6,
        effects: [
          {
            type: 'damage',
            value: 75,
            targetType: 'enemy',
          },
        ],
        animationType: 'projectile',
      },
      {
        id: 'summon_undead',
        name: 'Summon Undead',
        type: AbilityType.Support,
        description: 'Summons skeleton warriors',
        cooldown: 4,
        currentCooldown: 0,
        effects: [
          {
            type: 'summon',
            summonId: 'skeleton_warrior',
            count: 2,
            targetType: 'self',
          },
        ],
      },
      {
        id: 'mass_weakness',
        name: 'Mass Weakness',
        type: AbilityType.Support,
        description: 'Weakens all enemies',
        cooldown: 5,
        currentCooldown: 0,
        effects: [
          {
            type: 'debuff',
            duration: 3,
            targetType: 'allEnemies',
            statModifier: {
              stat: 'damage',
              value: 0.7,
              isPercent: true,
            },
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.necromancer,
    description: 'Master of death magic with summoning powers',
  },

  // LOCATION BOSSES - Unique boss for each of the 8 locations

  // Location 1 Boss: Darkwood Forest
  plague_mother: {
    id: 'plague_mother',
    name: 'Plague Mother',
    type: 'Boss',
    baseStats: {
      hp: 180,
      maxHp: 180,
      damage: 35,
      speed: 85,
      defense: 15,
      critChance: 0.10,
      critDamage: 1.5,
      evasion: 0.05,
      accuracy: 0.95,
      range: 1,
    },
    abilities: [
      {
        id: 'toxic_burst',
        name: 'Toxic Burst',
        type: AbilityType.Offensive,
        description: 'Releases poisonous spores in an area',
        cooldown: 3,
        currentCooldown: 0,
        effects: [
          {
            type: 'damage',
            value: 30,
            targetType: 'aoe',
            radius: 2,
          },
          {
            type: 'status',
            statusType: StatusEffectType.Poison,
            duration: 3,
            targetType: 'aoe',
            radius: 2,
          },
        ],
      },
      {
        id: 'spawn_plague_rats',
        name: 'Spawn Plague Rats',
        type: AbilityType.Support,
        description: 'Spawns infected rat minions',
        cooldown: 4,
        currentCooldown: 0,
        effects: [
          {
            type: 'summon',
            summonId: 'plague_rat',
            count: 3,
            targetType: 'self',
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.greenFatZombie,
    icon: '🦠',
    description: 'Mother of plague and pestilence',
  },

  // Location 2 Boss: Grave Gate Cemetery
  bone_colossus: {
    id: 'bone_colossus',
    name: 'Bone Colossus',
    type: 'Boss',
    baseStats: {
      hp: 300,
      maxHp: 300,
      damage: 45,
      speed: 70,
      defense: 30,
      critChance: 0.05,
      critDamage: 1.3,
      evasion: 0.02,
      accuracy: 0.90,
      range: 1,
    },
    abilities: [
      {
        id: 'bone_prison',
        name: 'Bone Prison',
        type: AbilityType.Control,
        description: 'Traps multiple enemies in bone cages',
        cooldown: 4,
        currentCooldown: 0,
        range: 5,
        effects: [
          {
            type: 'status',
            statusType: StatusEffectType.Root,
            duration: 2,
            targetType: 'aoe',
            radius: 1,
          },
        ],
      },
      {
        id: 'graveyard_uprising',
        name: 'Graveyard Uprising',
        type: AbilityType.Support,
        description: 'Raises skeletal warriors from the ground',
        cooldown: 5,
        currentCooldown: 0,
        effects: [
          {
            type: 'summon',
            summonId: 'skeleton_warrior',
            count: 4,
            targetType: 'self',
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.greenCloakman,
    icon: '💀',
    description: 'Giant amalgamation of bones and souls',
  },

  // Location 3 Boss: Ruined Fort
  shadow_commander: {
    id: 'shadow_commander',
    name: 'Shadow Commander',
    type: 'Boss',
    baseStats: {
      hp: 220,
      maxHp: 220,
      damage: 55,
      speed: 100,
      defense: 25,
      critChance: 0.20,
      critDamage: 2.0,
      evasion: 0.15,
      accuracy: 0.95,
      range: 1,
    },
    abilities: [
      {
        id: 'shadow_strike',
        name: 'Shadow Strike',
        type: AbilityType.Offensive,
        description: 'Teleports behind enemy for critical strike',
        cooldown: 2,
        currentCooldown: 0,
        range: 8,
        effects: [
          {
            type: 'damage',
            value: 80,
            targetType: 'enemy',
          },
        ],
      },
      {
        id: 'rally_cultists',
        name: 'Rally Cultists',
        type: AbilityType.Support,
        description: 'Summons cultist reinforcements',
        cooldown: 4,
        currentCooldown: 0,
        effects: [
          {
            type: 'summon',
            summonId: 'cultist',
            count: 2,
            targetType: 'self',
          },
          {
            type: 'buff',
            duration: 3,
            targetType: 'allAllies',
            statModifier: {
              stat: 'speed',
              value: 1.3,
              isPercent: true,
            },
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.staffCloakman,
    icon: '⚔️',
    description: 'Master tactician of the shadow army',
  },

  // Location 4 Boss: Black Shrine
  void_priest: {
    id: 'void_priest',
    name: 'Void High Priest',
    type: 'Boss',
    baseStats: {
      hp: 200,
      maxHp: 200,
      damage: 50,
      speed: 90,
      defense: 20,
      critChance: 0.15,
      critDamage: 1.8,
      evasion: 0.10,
      accuracy: 0.98,
      range: 6,
    },
    abilities: [
      {
        id: 'void_beam',
        name: 'Void Beam',
        type: AbilityType.Offensive,
        description: 'Channeled beam of void energy',
        cooldown: 3,
        currentCooldown: 0,
        range: 8,
        effects: [
          {
            type: 'damage',
            value: 90,
            targetType: 'enemy',
          },
          {
            type: 'status',
            statusType: StatusEffectType.Silence,
            duration: 2,
            targetType: 'enemy',
          },
        ],
        animationType: 'projectile',
      },
      {
        id: 'dark_ritual',
        name: 'Dark Ritual',
        type: AbilityType.Support,
        description: 'Sacrifices health to empower allies',
        cooldown: 5,
        currentCooldown: 0,
        effects: [
          {
            type: 'buff',
            duration: 4,
            targetType: 'allAllies',
            statModifier: {
              stat: 'damage',
              value: 1.5,
              isPercent: true,
            },
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.necromancer,
    icon: '🌀',
    description: 'Herald of the void',
  },

  // Location 5 Boss: Lava River
  magma_titan: {
    id: 'magma_titan',
    name: 'Magma Titan',
    type: 'Boss',
    baseStats: {
      hp: 350,
      maxHp: 350,
      damage: 65,
      speed: 75,
      defense: 35,
      critChance: 0.10,
      critDamage: 1.5,
      evasion: 0.02,
      accuracy: 0.95,
      range: 1,
    },
    abilities: [
      {
        id: 'lava_eruption',
        name: 'Lava Eruption',
        type: AbilityType.Offensive,
        description: 'Creates lava pools that burn enemies',
        cooldown: 3,
        currentCooldown: 0,
        effects: [
          {
            type: 'damage',
            value: 60,
            targetType: 'aoe',
            radius: 2,
          },
          {
            type: 'status',
            statusType: StatusEffectType.Burn,
            duration: 4,
            targetType: 'aoe',
            radius: 2,
          },
        ],
      },
      {
        id: 'molten_armor',
        name: 'Molten Armor',
        type: AbilityType.Defensive,
        description: 'Gains damage reflection',
        cooldown: 4,
        currentCooldown: 0,
        effects: [
          {
            type: 'buff',
            duration: 3,
            targetType: 'self',
            statModifier: {
              stat: 'defense',
              value: 2.0,
              isPercent: true,
            },
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.fireElemental,
    icon: '🔥',
    description: 'Ancient titan of molten rock',
  },

  // Location 6 Boss: Sand Temple
  mummy_pharaoh: {
    id: 'mummy_pharaoh',
    name: 'Mummy Pharaoh',
    type: 'Boss',
    baseStats: {
      hp: 280,
      maxHp: 280,
      damage: 60,
      speed: 85,
      defense: 28,
      critChance: 0.12,
      critDamage: 1.6,
      evasion: 0.08,
      accuracy: 0.96,
      range: 4,
    },
    abilities: [
      {
        id: 'sandstorm',
        name: 'Sandstorm',
        type: AbilityType.Control,
        description: 'Blinds all enemies reducing accuracy',
        cooldown: 4,
        currentCooldown: 0,
        effects: [
          {
            type: 'debuff',
            duration: 3,
            targetType: 'allEnemies',
            statModifier: {
              stat: 'accuracy',
              value: 0.5,
              isPercent: true,
            },
          },
        ],
      },
      {
        id: 'curse_of_ages',
        name: 'Curse of Ages',
        type: AbilityType.Support,
        description: 'Ancient curse that weakens and slows',
        cooldown: 3,
        currentCooldown: 0,
        range: 6,
        effects: [
          {
            type: 'status',
            statusType: StatusEffectType.Curse,
            duration: 4,
            targetType: 'enemy',
          },
          {
            type: 'status',
            statusType: StatusEffectType.Slow,
            duration: 3,
            targetType: 'enemy',
          },
        ],
        animationType: 'projectile',
      },
      {
        id: 'ancient_guards',
        name: 'Ancient Guards',
        type: AbilityType.Support,
        description: 'Summons mummified guardians',
        cooldown: 5,
        currentCooldown: 0,
        effects: [
          {
            type: 'summon',
            summonId: 'skeleton_warrior',
            count: 3,
            targetType: 'self',
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.skeletonLord,
    icon: '👑',
    description: 'Undead ruler of the desert',
  },

  // Location 7 Boss: Ruin Peak Spire
  storm_wyrm: {
    id: 'storm_wyrm',
    name: 'Storm Wyrm',
    type: 'Boss',
    baseStats: {
      hp: 400,
      maxHp: 400,
      damage: 75,
      speed: 95,
      defense: 30,
      critChance: 0.15,
      critDamage: 1.8,
      evasion: 0.12,
      accuracy: 0.97,
      range: 8,
    },
    abilities: [
      {
        id: 'lightning_breath',
        name: 'Lightning Breath',
        type: AbilityType.Offensive,
        description: 'Devastating lightning attack',
        cooldown: 2,
        currentCooldown: 0,
        range: 10,
        effects: [
          {
            type: 'damage',
            value: 100,
            targetType: 'aoe',
            radius: 1,
          },
          {
            type: 'status',
            statusType: StatusEffectType.Stun,
            duration: 1,
            targetType: 'aoe',
            radius: 1,
          },
        ],
        animationType: 'projectile',
      },
      {
        id: 'wind_barrier',
        name: 'Wind Barrier',
        type: AbilityType.Defensive,
        description: 'Creates protective winds',
        cooldown: 4,
        currentCooldown: 0,
        effects: [
          {
            type: 'buff',
            duration: 3,
            targetType: 'self',
            statModifier: {
              stat: 'evasion',
              value: 0.3,
              isPercent: false,
            },
          },
        ],
      },
      {
        id: 'sky_dive',
        name: 'Sky Dive',
        type: AbilityType.Offensive,
        description: 'Crashes down from above',
        cooldown: 5,
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
    spritePath: ICON_PATHS.chimera,
    icon: '🐉',
    description: 'Ancient dragon of the storms',
  },

  // Location 8 Boss: Black Spire (FINAL BOSS)
  void_emperor: {
    id: 'void_emperor',
    name: 'Void Emperor Malachar',
    type: 'Boss',
    baseStats: {
      hp: 500,
      maxHp: 500,
      damage: 85,
      speed: 100,
      defense: 40,
      critChance: 0.20,
      critDamage: 2.0,
      evasion: 0.15,
      accuracy: 0.99,
      range: 10,
    },
    abilities: [
      {
        id: 'apocalypse',
        name: 'Apocalypse',
        type: AbilityType.Offensive,
        description: 'Ultimate void magic attack',
        cooldown: 5,
        currentCooldown: 0,
        range: 99,
        effects: [
          {
            type: 'damage',
            value: 150,
            targetType: 'allEnemies',
          },
        ],
        animationType: 'projectile',
      },
      {
        id: 'void_portal',
        name: 'Void Portal',
        type: AbilityType.Support,
        description: 'Opens portal to summon void creatures',
        cooldown: 3,
        currentCooldown: 0,
        effects: [
          {
            type: 'summon',
            summonId: 'void_mage',
            count: 2,
            targetType: 'self',
          },
          {
            type: 'summon',
            summonId: 'shadow_beast',
            count: 1,
            targetType: 'self',
          },
        ],
      },
      {
        id: 'reality_tear',
        name: 'Reality Tear',
        type: AbilityType.Control,
        description: 'Tears reality, disabling enemies',
        cooldown: 4,
        currentCooldown: 0,
        effects: [
          {
            type: 'status',
            statusType: StatusEffectType.Silence,
            duration: 2,
            targetType: 'allEnemies',
          },
          {
            type: 'debuff',
            duration: 3,
            targetType: 'allEnemies',
            statModifier: {
              stat: 'speed',
              value: 0.5,
              isPercent: true,
            },
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.necromancer,
    icon: '👿',
    description: 'The ultimate evil, master of the void',
  },

  // SUMMONED UNITS (weaker versions)
  mini_slime: {
    id: 'mini_slime',
    name: 'Mini Slime',
    type: 'Summon',
    baseStats: createStats(20, 10, 60),
    abilities: [],
    spritePath: ICON_PATHS.slime,
    description: 'Small slime split',
  },

  imp: {
    id: 'imp',
    name: 'Imp',
    type: 'Summon',
    baseStats: {
      hp: 25,
      maxHp: 25,
      damage: 15,
      speed: 110,
      defense: 5,
      critChance: 0.10,
      critDamage: 1.5,
      evasion: 0.15,
      accuracy: 0.90,
      range: 3, // Small ranged attacker
    },
    abilities: [
      {
        id: 'firebolt',
        name: 'Firebolt',
        type: AbilityType.Offensive,
        description: 'Small fire projectile',
        cooldown: 2,
        currentCooldown: 0,
        range: 3,
        effects: [
          {
            type: 'damage',
            value: 20,
            targetType: 'enemy',
          },
        ],
        animationType: 'projectile',
      },
    ],
    spritePath: ICON_PATHS.darkman,
    description: 'Summoned demon minion',
  },

  skeleton_warrior: {
    id: 'skeleton_warrior',
    name: 'Skeleton Warrior',
    type: 'Summon',
    baseStats: createStats(40, 20, 90),
    abilities: [],
    spritePath: ICON_PATHS.skinnyZombie,
    description: 'Summoned skeleton fighter',
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

  // NEW ADVANCED ENEMY TYPES WITH ABILITIES

  dark_archer: {
    id: 'dark_archer',
    name: 'Dark Archer',
    type: 'Humanoid',
    baseStats: {
      hp: 55,
      maxHp: 55,
      damage: 30,
      speed: 105,
      defense: 8,
      critChance: 0.20,
      critDamage: 1.8,
      evasion: 0.12,
      accuracy: 0.95,
      range: 5, // Long range
    },
    abilities: [
      {
        id: 'poison_arrow',
        name: 'Poison Arrow',
        type: AbilityType.Offensive,
        description: 'Arrow that poisons target',
        cooldown: 3,
        currentCooldown: 0,
        range: 5,
        effects: [
          {
            type: 'damage',
            value: 35,
            targetType: 'enemy',
          },
          {
            type: 'status',
            statusType: StatusEffectType.Poison,
            value: 10,
            duration: 3,
            targetType: 'enemy',
          },
        ],
        animationType: 'projectile',
      },
    ],
    spritePath: ICON_PATHS.torchman,
    icon: '🏹',
    description: 'Enemy marksman with poison arrows',
  },

  void_mage: {
    id: 'void_mage',
    name: 'Void Mage',
    type: 'Caster',
    baseStats: {
      hp: 65,
      maxHp: 65,
      damage: 35,
      speed: 85,
      defense: 10,
      critChance: 0.15,
      critDamage: 2.0,
      evasion: 0.08,
      accuracy: 0.94,
      range: 6, // Very long range
    },
    abilities: [
      {
        id: 'void_blast',
        name: 'Void Blast',
        type: AbilityType.Offensive,
        description: 'AoE void explosion',
        cooldown: 4,
        currentCooldown: 0,
        range: 6,
        effects: [
          {
            type: 'damage',
            value: 45,
            targetType: 'aoe',
            radius: 2,
          },
        ],
        animationType: 'explosion',
      },
      {
        id: 'silence',
        name: 'Silence',
        type: AbilityType.Support,
        description: 'Prevents ability use',
        cooldown: 3,
        currentCooldown: 0,
        range: 6,
        effects: [
          {
            type: 'status',
            statusType: StatusEffectType.Silence,
            duration: 2,
            targetType: 'enemy',
          },
        ],
      },
    ],
    spritePath: ICON_PATHS.necromancer,
    icon: '🌑',
    description: 'Void caster that silences and damages',
  },

  blood_shaman: {
    id: 'blood_shaman',
    name: 'Blood Shaman',
    type: 'Support',
    baseStats: {
      hp: 75,
      maxHp: 75,
      damage: 22,
      speed: 95,
      defense: 12,
      critChance: 0.08,
      critDamage: 1.4,
      evasion: 0.06,
      accuracy: 0.92,
      range: 4,
    },
    abilities: [
      {
        id: 'blood_ritual',
        name: 'Blood Ritual',
        type: AbilityType.Support,
        description: 'Heals all allies by sacrificing own HP',
        cooldown: 3,
        currentCooldown: 0,
        effects: [
          {
            type: 'damage',
            value: 20,
            targetType: 'self', // Damages self
          },
          {
            type: 'heal',
            value: 30,
            targetType: 'allAllies',
          },
        ],
      },
      {
        id: 'blood_curse',
        name: 'Blood Curse',
        type: AbilityType.Offensive,
        description: 'Curse that deals damage over time',
        cooldown: 3,
        currentCooldown: 0,
        range: 4,
        effects: [
          {
            type: 'status',
            statusType: StatusEffectType.Bleed,
            value: 15,
            duration: 4,
            targetType: 'enemy',
          },
        ],
        animationType: 'projectile',
      },
    ],
    spritePath: ICON_PATHS.staffCloakman,
    icon: '🩸',
    description: 'Support enemy that heals allies and curses foes',
  },

  frost_elemental: {
    id: 'frost_elemental',
    name: 'Frost Elemental',
    type: 'Elemental',
    baseStats: {
      hp: 90,
      maxHp: 90,
      damage: 28,
      speed: 70,
      defense: 18,
      critChance: 0.10,
      critDamage: 1.6,
      evasion: 0.05,
      accuracy: 0.95,
      range: 4,
    },
    abilities: [
      {
        id: 'freezing_aura',
        name: 'Freezing Aura',
        type: AbilityType.Support,
        description: 'Slows all nearby enemies',
        cooldown: 4,
        currentCooldown: 0,
        effects: [
          {
            type: 'status',
            statusType: StatusEffectType.Slow,
            value: 0.5,
            duration: 2,
            targetType: 'aoe',
            radius: 3,
          },
        ],
      },
      {
        id: 'ice_shard',
        name: 'Ice Shard',
        type: AbilityType.Offensive,
        description: 'Launches ice projectile',
        cooldown: 2,
        currentCooldown: 0,
        range: 4,
        effects: [
          {
            type: 'damage',
            value: 35,
            targetType: 'enemy',
          },
        ],
        animationType: 'projectile',
      },
    ],
    spritePath: ICON_PATHS.slime,
    icon: '❄️',
    description: 'Elemental that slows and freezes',
  },

  corrupted_priest: {
    id: 'corrupted_priest',
    name: 'Corrupted Priest',
    type: 'Humanoid',
    baseStats: {
      hp: 80,
      maxHp: 80,
      damage: 25,
      speed: 88,
      defense: 14,
      critChance: 0.12,
      critDamage: 1.5,
      evasion: 0.07,
      accuracy: 0.93,
      range: 5,
    },
    abilities: [
      {
        id: 'unholy_heal',
        name: 'Unholy Heal',
        type: AbilityType.Support,
        description: 'Heals most wounded ally',
        cooldown: 3,
        currentCooldown: 0,
        range: 5,
        effects: [
          {
            type: 'heal',
            value: 50,
            targetType: 'ally',
          },
        ],
      },
      {
        id: 'weakness_curse',
        name: 'Weakness Curse',
        type: AbilityType.Support,
        description: 'Reduces enemy damage output',
        cooldown: 3,
        currentCooldown: 0,
        range: 5,
        effects: [
          {
            type: 'debuff',
            duration: 3,
            targetType: 'enemy',
            statModifier: {
              stat: 'damage',
              value: 0.6,
              isPercent: true,
            },
          },
        ],
        animationType: 'projectile',
      },
    ],
    spritePath: ICON_PATHS.staffCloakman,
    icon: '☠️',
    description: 'Enemy healer that weakens heroes',
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
    description: 'Hurl a flaming projectile that explodes on impact, dealing damage and burning enemies in a 2x2 area',
    cooldown: 5,
    currentCooldown: 0,
    range: 3, // Can target enemies up to 3 tiles away
    effects: [
      {
        type: 'damage',
        value: 80,
        targetType: 'aoe',
        radius: 0, // 2x2 explosion area (special handling in BattleSimulator)
      },
      {
        type: 'status',
        statusType: StatusEffectType.Burn,
        duration: 3,
        targetType: 'aoe',
        radius: 0, // 2x2 explosion area (special handling in BattleSimulator)
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
// Balanced against gem income:
// - Mini-boss rewards: 8-29 gems (avg ~18)
// - Major boss rewards: 15-50 gems (avg ~32)
// - Total per location: ~50 gems (mini + major boss)
export function getHeroGemCost(hero: { rarity: Rarity } | Rarity): number {
  const rarity = typeof hero === 'object' ? hero.rarity : hero;

  switch (rarity) {
    case Rarity.Common:
      return 15; // Common heroes - affordable after 1 boss
    case Rarity.Uncommon:
      return 30; // Uncommon heroes - affordable after 1-2 bosses
    case Rarity.Rare:
      return 60; // Rare heroes - requires 2-3 bosses
    case Rarity.Epic:
      return 120; // Epic heroes - requires 4-5 bosses
    case Rarity.Legendary:
      return 200; // Legendary heroes - requires 6-8 bosses
    case Rarity.Mythic:
      return 400; // Mythic heroes - end-game goal
    default:
      return 60; // Default to rare price
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

  // Calculate scaling factor based on stage number - BALANCED CURVE
  // Early game (1-32): Gentle scaling to allow learning
  // Mid game (33-64): Moderate scaling to match hero growth
  // Late game (65-128): Challenging but fair scaling
  //
  // Target scaling:
  // Stage 1 = 1.0x (no scaling)
  // Stage 32 = 1.3x (early game cap)
  // Stage 64 = 1.8x (mid game cap)
  // Stage 96 = 2.3x (late game)
  // Stage 128 = 2.8x (endgame)

  // Use a logarithmic curve for smoother progression
  const progressPercent = Math.min(stageId / 128, 1); // Cap at stage 128
  const logScaling = Math.log10(1 + progressPercent * 9) / Math.log10(10); // Log curve 0-1
  const linearScaling = 1 + progressPercent * 1.8; // Linear 1.0-2.8x

  // Blend logarithmic and linear for best curve
  const totalScaling = (logScaling * 0.3 + linearScaling * 0.7);

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
