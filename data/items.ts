// Item definitions based on Item System Design Document
import { Item, Rarity, ItemCategory } from '@/types/core.types';
import { ICON_PATHS } from '@/utils/iconPaths';

export const ITEM_TEMPLATES: Record<string, Item> = {
  // ===========================================
  // WARRIOR WEAPONS
  // ===========================================

  iron_sword: {
    id: 'iron_sword',
    name: 'Iron Sword',
    description: 'Basic straight sword',
    rarity: Rarity.Common,
    category: ItemCategory.Weapon,
    effects: [{ stat: 'damage', type: 'add', value: 10 }],
    icon: ICON_PATHS.sword,
    spritePath: ICON_PATHS.sword,
    cost: 50,
    slot: 'weapon',
    maxDurability: 3,
  },

  steel_axe: {
    id: 'steel_axe',
    name: 'Steel Axe',
    description: 'Double-bladed axe with 10% chance to deal 2× damage',
    rarity: Rarity.Uncommon,
    category: ItemCategory.Weapon,
    effects: [
      { stat: 'damage', type: 'add', value: 15 },
      { stat: 'speed', type: 'multiply', value: 1.1 },
    ],
    icon: ICON_PATHS.sword,
    spritePath: ICON_PATHS.sword,
    cost: 200,
    slot: 'weapon',
    maxDurability: 5,
    specialEffect: '10% chance to deal 2× damage',
  },

  flaming_greatsword: {
    id: 'flaming_greatsword',
    name: 'Flaming Greatsword',
    description: 'Large sword wreathed in flames',
    rarity: Rarity.Rare,
    category: ItemCategory.Weapon,
    effects: [{ stat: 'damage', type: 'add', value: 25 }],
    icon: ICON_PATHS.sword,
    spritePath: ICON_PATHS.sword,
    cost: 800,
    slot: 'weapon',
    maxDurability: 7,
    specialEffect: 'Attacks apply Burning (5 damage/sec for 3 seconds)',
  },

  sword_of_kings: {
    id: 'sword_of_kings',
    name: 'Sword of Kings',
    description: 'Ornate golden blade with ancient runes',
    rarity: Rarity.Legendary,
    category: ItemCategory.Weapon,
    effects: [
      { stat: 'damage', type: 'add', value: 40 },
      { stat: 'speed', type: 'multiply', value: 1.2 },
    ],
    icon: ICON_PATHS.sword,
    spritePath: ICON_PATHS.sword,
    cost: 3000,
    slot: 'weapon',
    maxDurability: 10,
    specialEffect: 'Every 5th attack deals 5× damage and stuns target for 1 second',
  },

  excalibur: {
    id: 'excalibur',
    name: 'Excalibur',
    description: 'Legendary sword radiating holy light',
    rarity: Rarity.Mythic,
    category: ItemCategory.Weapon,
    effects: [
      { stat: 'damage', type: 'add', value: 80 },
      { stat: 'speed', type: 'multiply', value: 1.3 },
      { stat: 'critChance', type: 'add', value: 0.15 },
    ],
    icon: ICON_PATHS.sword,
    spritePath: ICON_PATHS.sword,
    cost: 0, // Cannot sell Mythic items
    slot: 'weapon',
    maxDurability: undefined, // Infinite durability
    specialEffect: 'Attacks heal wielder for 20% of damage dealt • Cleaves to hit all adjacent enemies • Cannot be destroyed',
  },

  // ===========================================
  // ROGUE WEAPONS
  // ===========================================

  wooden_bow: {
    id: 'wooden_bow',
    name: 'Wooden Bow',
    description: 'Simple hunting bow',
    rarity: Rarity.Common,
    category: ItemCategory.Weapon,
    effects: [{ stat: 'damage', type: 'add', value: 8 }],
    icon: ICON_PATHS.bow,
    spritePath: ICON_PATHS.bow,
    cost: 50,
    slot: 'weapon',
    maxDurability: 3,
  },

  longbow_of_precision: {
    id: 'longbow_of_precision',
    name: 'Longbow of Precision',
    description: 'Accurate longbow with extended range',
    rarity: Rarity.Uncommon,
    category: ItemCategory.Weapon,
    effects: [
      { stat: 'damage', type: 'add', value: 12 },
      { stat: 'accuracy', type: 'add', value: 0.1 },
    ],
    icon: ICON_PATHS.bow,
    spritePath: ICON_PATHS.bow,
    cost: 200,
    slot: 'weapon',
    maxDurability: 5,
    specialEffect: '+10% accuracy (ignores 10% of enemy evasion)',
  },

  dual_daggers_of_venom: {
    id: 'dual_daggers_of_venom',
    name: 'Dual Daggers of Venom',
    description: 'Twin poisoned blades',
    rarity: Rarity.Rare,
    category: ItemCategory.Weapon,
    effects: [
      { stat: 'damage', type: 'add', value: 20 },
      { stat: 'speed', type: 'multiply', value: 1.5 },
    ],
    icon: ICON_PATHS.sword,
    spritePath: ICON_PATHS.sword,
    cost: 800,
    slot: 'weapon',
    maxDurability: 7,
    specialEffect: 'Attacks twice per action • Applies Poison (8 damage/sec for 4 seconds)',
  },

  // ===========================================
  // MAGE WEAPONS
  // ===========================================

  apprentice_staff: {
    id: 'apprentice_staff',
    name: 'Apprentice Staff',
    description: 'Basic wooden staff',
    rarity: Rarity.Common,
    category: ItemCategory.Weapon,
    effects: [{ stat: 'damage', type: 'add', value: 15 }],
    icon: ICON_PATHS.wand,
    spritePath: ICON_PATHS.wand,
    cost: 50,
    slot: 'weapon',
    maxDurability: 3,
  },

  staff_of_ice: {
    id: 'staff_of_ice',
    name: 'Staff of Ice',
    description: 'Frost-imbued staff',
    rarity: Rarity.Uncommon,
    category: ItemCategory.Weapon,
    effects: [{ stat: 'damage', type: 'add', value: 20 }],
    icon: ICON_PATHS.blueWand,
    spritePath: ICON_PATHS.blueWand,
    cost: 200,
    slot: 'weapon',
    maxDurability: 5,
    specialEffect: 'Spells slow enemies by 30% for 2 seconds',
  },

  staff_of_flames: {
    id: 'staff_of_flames',
    name: 'Staff of Flames',
    description: 'Fire-enchanted staff with explosive power',
    rarity: Rarity.Rare,
    category: ItemCategory.Weapon,
    effects: [{ stat: 'damage', type: 'add', value: 35 }],
    icon: ICON_PATHS.wand,
    spritePath: ICON_PATHS.wand,
    cost: 800,
    slot: 'weapon',
    maxDurability: 7,
    specialEffect: 'Spells explode in 2-tile radius, dealing 50% damage to nearby enemies',
  },

  // ===========================================
  // LIGHT ARMOR (Rogues, Mages)
  // ===========================================

  cloth_robes: {
    id: 'cloth_robes',
    name: 'Cloth Robes',
    description: 'Simple cloth garment',
    rarity: Rarity.Common,
    category: ItemCategory.Armor,
    effects: [{ stat: 'defense', type: 'add', value: 5 }],
    icon: ICON_PATHS.shield,
    spritePath: ICON_PATHS.shield,
    cost: 50,
    slot: 'armor',
    maxDurability: 3,
  },

  leather_armor: {
    id: 'leather_armor',
    name: 'Leather Armor',
    description: 'Flexible leather protection',
    rarity: Rarity.Uncommon,
    category: ItemCategory.Armor,
    effects: [
      { stat: 'defense', type: 'add', value: 10 },
      { stat: 'evasion', type: 'add', value: 0.05 },
    ],
    icon: ICON_PATHS.shield,
    spritePath: ICON_PATHS.shield,
    cost: 200,
    slot: 'armor',
    maxDurability: 5,
  },

  shadowcloak: {
    id: 'shadowcloak',
    name: 'Shadowcloak',
    description: 'Dark cloak that bends light',
    rarity: Rarity.Rare,
    category: ItemCategory.Armor,
    effects: [
      { stat: 'defense', type: 'add', value: 15 },
      { stat: 'evasion', type: 'add', value: 0.15 },
    ],
    icon: ICON_PATHS.shield,
    spritePath: ICON_PATHS.shield,
    cost: 800,
    slot: 'armor',
    maxDurability: 7,
    specialEffect: 'When hit, 20% chance to become invisible for 2 seconds',
  },

  // ===========================================
  // HEAVY ARMOR (Warriors, Paladins)
  // ===========================================

  iron_breastplate: {
    id: 'iron_breastplate',
    name: 'Iron Breastplate',
    description: 'Sturdy iron chest armor',
    rarity: Rarity.Common,
    category: ItemCategory.Armor,
    effects: [{ stat: 'defense', type: 'add', value: 15 }],
    icon: ICON_PATHS.shield,
    spritePath: ICON_PATHS.shield,
    cost: 50,
    slot: 'armor',
    maxDurability: 3,
  },

  chainmail: {
    id: 'chainmail',
    name: 'Chainmail',
    description: 'Interlocking metal rings',
    rarity: Rarity.Uncommon,
    category: ItemCategory.Armor,
    effects: [
      { stat: 'defense', type: 'add', value: 25 },
      { stat: 'maxHp', type: 'add', value: 50 },
    ],
    icon: ICON_PATHS.shield,
    spritePath: ICON_PATHS.shield,
    cost: 200,
    slot: 'armor',
    maxDurability: 5,
    specialEffect: 'Reduces damage from critical hits by 30%',
  },

  plate_armor_of_thorns: {
    id: 'plate_armor_of_thorns',
    name: 'Plate Armor of Thorns',
    description: 'Spiked plate armor that punishes attackers',
    rarity: Rarity.Rare,
    category: ItemCategory.Armor,
    effects: [
      { stat: 'defense', type: 'add', value: 40 },
      { stat: 'maxHp', type: 'add', value: 100 },
    ],
    icon: ICON_PATHS.shield,
    spritePath: ICON_PATHS.shield,
    cost: 800,
    slot: 'armor',
    maxDurability: 7,
    specialEffect: 'Reflects 20% of melee damage back to attacker',
  },

  dragonscale_armor: {
    id: 'dragonscale_armor',
    name: 'Dragonscale Armor',
    description: 'Legendary armor forged from dragon scales',
    rarity: Rarity.Legendary,
    category: ItemCategory.Armor,
    effects: [
      { stat: 'defense', type: 'add', value: 70 },
      { stat: 'maxHp', type: 'add', value: 200 },
    ],
    icon: ICON_PATHS.shield,
    spritePath: ICON_PATHS.shield,
    cost: 3000,
    slot: 'armor',
    maxDurability: 10,
    specialEffect: 'Immune to fire damage • When HP drops below 30%, gain shield equal to 50% max HP (once per combat)',
  },

  // ===========================================
  // ACCESSORIES - RINGS
  // ===========================================

  ring_of_strength: {
    id: 'ring_of_strength',
    name: 'Ring of Strength',
    description: 'Simple band that enhances power',
    rarity: Rarity.Common,
    category: ItemCategory.Accessory,
    effects: [{ stat: 'damage', type: 'add', value: 10 }],
    icon: ICON_PATHS.orb,
    spritePath: ICON_PATHS.orb,
    cost: 50,
    slot: 'accessory',
    maxDurability: 3,
  },

  ring_of_regeneration: {
    id: 'ring_of_regeneration',
    name: 'Ring of Regeneration',
    description: 'Slowly restores health over time',
    rarity: Rarity.Uncommon,
    category: ItemCategory.Accessory,
    effects: [{ stat: 'maxHp', type: 'add', value: 50 }],
    icon: ICON_PATHS.orb,
    spritePath: ICON_PATHS.orb,
    cost: 200,
    slot: 'accessory',
    maxDurability: 5,
    specialEffect: '+5 HP per second',
  },

  vampire_ring: {
    id: 'vampire_ring',
    name: 'Vampire Ring',
    description: 'Drains life from enemies',
    rarity: Rarity.Rare,
    category: ItemCategory.Accessory,
    effects: [{ stat: 'lifesteal', type: 'add', value: 0.15 }],
    icon: ICON_PATHS.orb,
    spritePath: ICON_PATHS.orb,
    cost: 800,
    slot: 'accessory',
    maxDurability: 7,
    specialEffect: 'Lifesteal 15% of damage dealt',
  },

  ring_of_haste: {
    id: 'ring_of_haste',
    name: 'Ring of Haste',
    description: 'Greatly increases speed',
    rarity: Rarity.Legendary,
    category: ItemCategory.Accessory,
    effects: [
      { stat: 'speed', type: 'multiply', value: 1.3 },
    ],
    icon: ICON_PATHS.orb,
    spritePath: ICON_PATHS.orb,
    cost: 3000,
    slot: 'accessory',
    maxDurability: 10,
    specialEffect: '+30% attack speed • +30% movement speed • Cooldowns tick 50% faster',
  },

  // ===========================================
  // ACCESSORIES - AMULETS
  // ===========================================

  amulet_of_protection: {
    id: 'amulet_of_protection',
    name: 'Amulet of Protection',
    description: 'Simple protective charm',
    rarity: Rarity.Common,
    category: ItemCategory.Accessory,
    effects: [{ stat: 'defense', type: 'add', value: 10 }],
    icon: ICON_PATHS.crown,
    spritePath: ICON_PATHS.crown,
    cost: 50,
    slot: 'accessory',
    maxDurability: 3,
  },

  amulet_of_vitality: {
    id: 'amulet_of_vitality',
    name: 'Amulet of Vitality',
    description: 'Increases maximum health',
    rarity: Rarity.Uncommon,
    category: ItemCategory.Accessory,
    effects: [{ stat: 'maxHp', type: 'add', value: 100 }],
    icon: ICON_PATHS.crown,
    spritePath: ICON_PATHS.crown,
    cost: 200,
    slot: 'accessory',
    maxDurability: 5,
    specialEffect: 'Start combat with full HP',
  },

  phoenix_pendant: {
    id: 'phoenix_pendant',
    name: 'Phoenix Pendant',
    description: 'Grants the power of rebirth',
    rarity: Rarity.Rare,
    category: ItemCategory.Accessory,
    effects: [{ stat: 'maxHp', type: 'add', value: 50 }],
    icon: ICON_PATHS.crown,
    spritePath: ICON_PATHS.crown,
    cost: 800,
    slot: 'accessory',
    maxDurability: 7,
    specialEffect: 'Upon death, revive with 30% HP (once per combat)',
  },

  crown_of_the_ancients: {
    id: 'crown_of_the_ancients',
    name: 'Crown of the Ancients',
    description: 'Legendary crown of forgotten kings',
    rarity: Rarity.Legendary,
    category: ItemCategory.Accessory,
    effects: [
      { stat: 'damage', type: 'multiply', value: 1.15 },
      { stat: 'defense', type: 'multiply', value: 1.15 },
      { stat: 'speed', type: 'multiply', value: 1.15 },
    ],
    icon: ICON_PATHS.crown,
    spritePath: ICON_PATHS.crown,
    cost: 3000,
    slot: 'accessory',
    maxDurability: 10,
    specialEffect: '+15% all stats • Gain random buff every 10 seconds',
  },

  // ===========================================
  // ACCESSORIES - TRINKETS
  // ===========================================

  lucky_coin: {
    id: 'lucky_coin',
    name: 'Lucky Coin',
    description: 'Increases fortune',
    rarity: Rarity.Uncommon,
    category: ItemCategory.Accessory,
    effects: [{ stat: 'critChance', type: 'add', value: 0.05 }],
    icon: ICON_PATHS.orb,
    spritePath: ICON_PATHS.orb,
    cost: 200,
    slot: 'accessory',
    maxDurability: 5,
    specialEffect: '+10% gold from missions • +5% item drop rate',
  },

  berserker_totem: {
    id: 'berserker_totem',
    name: 'Berserker Totem',
    description: 'Power increases as health decreases',
    rarity: Rarity.Rare,
    category: ItemCategory.Accessory,
    effects: [],
    icon: ICON_PATHS.orb,
    spritePath: ICON_PATHS.orb,
    cost: 800,
    slot: 'accessory',
    maxDurability: 7,
    specialEffect: 'Gain +5% damage for every 10% HP missing (max +40% at 20% HP)',
  },

  heartstone: {
    id: 'heartstone',
    name: 'Heartstone',
    description: 'Protects from fatal blows',
    rarity: Rarity.Legendary,
    category: ItemCategory.Accessory,
    effects: [{ stat: 'maxHp', type: 'add', value: 200 }],
    icon: ICON_PATHS.orb,
    spritePath: ICON_PATHS.orb,
    cost: 3000,
    slot: 'accessory',
    maxDurability: 10,
    specialEffect: 'Cannot be reduced below 1 HP by a single hit (prevents one-shots)',
  },

  // Legacy items for backwards compatibility
  rusty_sword: {
    id: 'rusty_sword',
    name: 'Rusty Sword',
    description: 'An old sword, still sharp enough to hurt',
    rarity: Rarity.Common,
    category: ItemCategory.Weapon,
    effects: [{ stat: 'damage', type: 'multiply', value: 1.2 }],
    icon: ICON_PATHS.sword,
    spritePath: ICON_PATHS.sword,
    cost: 50,
    slot: 'weapon',
    maxDurability: 3,
  },

  wooden_shield: {
    id: 'wooden_shield',
    name: 'Wooden Shield',
    description: 'Basic protection',
    rarity: Rarity.Common,
    category: ItemCategory.Armor,
    effects: [{ stat: 'defense', type: 'add', value: 10 }],
    icon: ICON_PATHS.shield,
    spritePath: ICON_PATHS.shield,
    cost: 50,
    slot: 'armor',
    maxDurability: 3,
  },

  leather_boots: {
    id: 'leather_boots',
    name: 'Leather Boots',
    description: 'Increases movement speed',
    rarity: Rarity.Common,
    category: ItemCategory.Accessory,
    effects: [{ stat: 'speed', type: 'multiply', value: 1.15 }],
    icon: ICON_PATHS.boot,
    spritePath: ICON_PATHS.boot,
    cost: 75,
    slot: 'accessory',
    maxDurability: 3,
  },
};

// Get items by rarity
export function getItemsByRarity(rarity: Rarity): Item[] {
  return Object.values(ITEM_TEMPLATES).filter((item) => item.rarity === rarity);
}

// Get items by slot
export function getItemsBySlot(slot: 'weapon' | 'armor' | 'accessory'): Item[] {
  return Object.values(ITEM_TEMPLATES).filter((item) => item.slot === slot);
}

// Get items by category
export function getItemsByCategory(category: ItemCategory): Item[] {
  return Object.values(ITEM_TEMPLATES).filter((item) => item.category === category);
}

// Get random items for shop
export function getRandomItems(count: number, maxRarity: Rarity = Rarity.Legendary): Item[] {
  const availableItems = Object.values(ITEM_TEMPLATES).filter(
    (item) => getRarityValue(item.rarity) <= getRarityValue(maxRarity)
  );

  const shuffled = [...availableItems].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// Get durability by rarity (as per design doc)
export function getDurabilityByRarity(rarity: Rarity): number | undefined {
  const durabilityMap = {
    [Rarity.Common]: 3,
    [Rarity.Uncommon]: 5,
    [Rarity.Rare]: 7,
    [Rarity.Legendary]: 10,
    [Rarity.Mythic]: undefined, // Infinite durability
  };
  return durabilityMap[rarity];
}

function getRarityValue(rarity: Rarity): number {
  const values = {
    [Rarity.Common]: 1,
    [Rarity.Uncommon]: 2,
    [Rarity.Rare]: 3,
    [Rarity.Legendary]: 4,
    [Rarity.Mythic]: 5,
  };
  return values[rarity];
}
