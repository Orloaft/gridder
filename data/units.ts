// Hero and Enemy unit templates
import { HeroTemplate, EnemyTemplate, Rarity, UnitStats, Ability, AbilityType } from '@/types/core.types';
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
    spritePath: ICON_PATHS.sword,
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
    spritePath: ICON_PATHS.skull,
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
    spritePath: ICON_PATHS.greenBottle,
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
    spritePath: ICON_PATHS.wand,
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
    spritePath: ICON_PATHS.bow,
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
    spritePath: ICON_PATHS.shield,
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
};

// Enemy Templates
export const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = {
  plague_rat: {
    id: 'plague_rat',
    name: 'Plague Rat',
    type: 'Beast',
    baseStats: createStats(40, 15, 130),
    abilities: [],
    spritePath: '🐀',
    description: 'Diseased rodent',
  },

  wraith: {
    id: 'wraith',
    name: 'Wraith',
    type: 'Undead',
    baseStats: createStats(60, 25, 110),
    abilities: [],
    spritePath: '👻',
    description: 'Ghostly spirit',
  },

  slime: {
    id: 'slime',
    name: 'Slime',
    type: 'Blob',
    baseStats: createStats(80, 20, 70),
    abilities: [],
    spritePath: ICON_PATHS.greenBottle,
    description: 'Gelatinous creature',
  },

  gargoyle: {
    id: 'gargoyle',
    name: 'Gargoyle',
    type: 'Construct',
    baseStats: createStats(120, 35, 90),
    abilities: [],
    spritePath: ICON_PATHS.skull,
    description: 'Stone guardian',
  },

  bone_construct: {
    id: 'bone_construct',
    name: 'Bone Construct',
    type: 'Undead',
    baseStats: createStats(100, 30, 85),
    abilities: [],
    spritePath: ICON_PATHS.skull,
    description: 'Animated skeleton',
  },

  cultist: {
    id: 'cultist',
    name: 'Cultist',
    type: 'Humanoid',
    baseStats: createStats(70, 28, 100),
    abilities: [],
    spritePath: '👤',
    description: 'Dark worshipper',
  },

  shadow_beast: {
    id: 'shadow_beast',
    name: 'Shadow Beast',
    type: 'Demon',
    baseStats: createStats(150, 45, 120),
    abilities: [],
    spritePath: ICON_PATHS.skull,
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
    spritePath: ICON_PATHS.skull,
    description: 'Master of death magic',
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
    equippedItems: [],
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
