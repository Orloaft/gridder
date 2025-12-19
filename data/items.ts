// Item definitions
import { Item, Rarity } from '@/types/core.types';
import { ICON_PATHS } from '@/utils/iconPaths';

export const ITEM_TEMPLATES: Record<string, Item> = {
  // Weapons
  rusty_sword: {
    id: 'rusty_sword',
    name: 'Rusty Sword',
    description: 'An old sword, still sharp enough to hurt',
    rarity: Rarity.Common,
    effects: [{ stat: 'damage', type: 'multiply', value: 1.2 }],
    spritePath: ICON_PATHS.sword,
    cost: 50,
    slot: 'weapon',
  },

  iron_sword: {
    id: 'iron_sword',
    name: 'Iron Sword',
    description: 'A reliable weapon forged from iron',
    rarity: Rarity.Uncommon,
    effects: [{ stat: 'damage', type: 'multiply', value: 1.5 }],
    spritePath: ICON_PATHS.sword,
    cost: 150,
    slot: 'weapon',
  },

  hunter_bow: {
    id: 'hunter_bow',
    name: "Hunter's Bow",
    description: 'Precision weapon for ranged combat',
    rarity: Rarity.Uncommon,
    effects: [
      { stat: 'damage', type: 'multiply', value: 1.4 },
      { stat: 'critChance', type: 'add', value: 0.1 },
    ],
    spritePath: ICON_PATHS.bow,
    cost: 200,
    slot: 'weapon',
  },

  magic_wand: {
    id: 'magic_wand',
    name: 'Magic Wand',
    description: 'Channels magical energy',
    rarity: Rarity.Rare,
    effects: [
      { stat: 'damage', type: 'multiply', value: 1.6 },
      { stat: 'speed', type: 'multiply', value: 1.1 },
    ],
    spritePath: ICON_PATHS.wand,
    cost: 300,
    slot: 'weapon',
  },

  mystic_wand: {
    id: 'mystic_wand',
    name: 'Mystic Wand',
    description: 'Ancient wand of great power',
    rarity: Rarity.Epic,
    effects: [
      { stat: 'damage', type: 'multiply', value: 2.0 },
      { stat: 'critDamage', type: 'multiply', value: 1.3 },
    ],
    spritePath: ICON_PATHS.blueWand,
    cost: 500,
    slot: 'weapon',
  },

  // Armor
  wooden_shield: {
    id: 'wooden_shield',
    name: 'Wooden Shield',
    description: 'Basic protection',
    rarity: Rarity.Common,
    effects: [{ stat: 'defense', type: 'add', value: 10 }],
    spritePath: ICON_PATHS.shield,
    cost: 50,
    slot: 'armor',
  },

  iron_shield: {
    id: 'iron_shield',
    name: 'Iron Shield',
    description: 'Sturdy iron protection',
    rarity: Rarity.Uncommon,
    effects: [
      { stat: 'defense', type: 'add', value: 25 },
      { stat: 'maxHp', type: 'multiply', value: 1.1 },
    ],
    spritePath: ICON_PATHS.shield,
    cost: 180,
    slot: 'armor',
  },

  // Accessories
  leather_boots: {
    id: 'leather_boots',
    name: 'Leather Boots',
    description: 'Increases movement speed',
    rarity: Rarity.Common,
    effects: [{ stat: 'speed', type: 'multiply', value: 1.15 }],
    spritePath: ICON_PATHS.boot,
    cost: 75,
    slot: 'accessory',
  },

  winged_boots: {
    id: 'winged_boots',
    name: 'Winged Boots',
    description: 'Swift as the wind',
    rarity: Rarity.Rare,
    effects: [
      { stat: 'speed', type: 'multiply', value: 1.4 },
      { stat: 'evasion', type: 'add', value: 0.1 },
    ],
    spritePath: ICON_PATHS.wingHelmet,
    cost: 250,
    slot: 'accessory',
  },

  power_orb: {
    id: 'power_orb',
    name: 'Power Orb',
    description: 'Mystical orb that enhances abilities',
    rarity: Rarity.Epic,
    effects: [
      { stat: 'damage', type: 'multiply', value: 1.3 },
      { stat: 'maxHp', type: 'multiply', value: 1.2 },
    ],
    spritePath: ICON_PATHS.orb,
    cost: 400,
    slot: 'accessory',
  },

  lucky_crown: {
    id: 'lucky_crown',
    name: 'Lucky Crown',
    description: 'Increases critical strike chance',
    rarity: Rarity.Legendary,
    effects: [
      { stat: 'critChance', type: 'add', value: 0.2 },
      { stat: 'critDamage', type: 'multiply', value: 1.5 },
    ],
    spritePath: ICON_PATHS.crown,
    cost: 800,
    slot: 'accessory',
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

// Get random items for shop
export function getRandomItems(count: number, maxRarity: Rarity = Rarity.Epic): Item[] {
  const availableItems = Object.values(ITEM_TEMPLATES).filter(
    (item) => getRarityValue(item.rarity) <= getRarityValue(maxRarity)
  );

  const shuffled = [...availableItems].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function getRarityValue(rarity: Rarity): number {
  const values = {
    [Rarity.Common]: 1,
    [Rarity.Uncommon]: 2,
    [Rarity.Rare]: 3,
    [Rarity.Epic]: 4,
    [Rarity.Legendary]: 5,
  };
  return values[rarity];
}
