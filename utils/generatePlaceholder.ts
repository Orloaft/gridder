// Sprite utilities for heroes, enemies, items, and UI elements
import { ICON_PATHS, IconKey } from './iconPaths';

// Hero sprite mappings (using available icons + emojis as fallback)
export function generateHeroSprite(heroClass: string): string {
  const heroSprites: Record<string, string> = {
    'Blood Knight': ICON_PATHS.sword, // Warrior with sword
    'Shadow Stalker': ICON_PATHS.skull, // Rogue/assassin
    'Plague Doctor': ICON_PATHS.greenBottle, // Healer
    'Necromancer': ICON_PATHS.wand, // Mage
    'Witch Hunter': ICON_PATHS.bow, // Ranged
    'Flesh Golem': ICON_PATHS.shield, // Tank
    'Quester': ICON_PATHS.quester, // Generic adventurer
  };

  return heroSprites[heroClass] || '🛡️';
}

// Enemy sprite mappings
export function generateEnemySprite(enemyType: string): string {
  const enemySprites: Record<string, string> = {
    'Wraith': '👻',
    'Slime': ICON_PATHS.greenBottle, // Temporary
    'Gargoyle': ICON_PATHS.skull,
    'Rat Swarm': '🐀',
    'Bone Construct': ICON_PATHS.skull,
    'Cultist': '👤',
    'Plague Rat': '🐀',
  };

  return enemySprites[enemyType] || '👹';
}

// Item icon mappings
export function generateItemIcon(itemType: string, itemId?: string): string {
  // First check for specific item ID
  if (itemId) {
    const specificIcons: Record<string, string> = {
      'rusty_sword': ICON_PATHS.sword,
      'iron_sword': ICON_PATHS.sword,
      'steel_sword': ICON_PATHS.sword,
      'wooden_shield': ICON_PATHS.shield,
      'iron_shield': ICON_PATHS.shield,
      'leather_boots': ICON_PATHS.boot,
      'speed_boots': ICON_PATHS.boot,
      'winged_boots': ICON_PATHS.wingHelmet,
      'magic_wand': ICON_PATHS.wand,
      'mystic_wand': ICON_PATHS.blueWand,
      'hunter_bow': ICON_PATHS.bow,
      'health_potion': ICON_PATHS.heart,
      'mana_potion': ICON_PATHS.blueBottle,
      'poison_vial': ICON_PATHS.greenBottle,
    };

    if (specificIcons[itemId]) {
      return specificIcons[itemId];
    }
  }

  // Fallback to item type
  const itemIcons: Record<string, string> = {
    'weapon': ICON_PATHS.sword,
    'armor': ICON_PATHS.shield,
    'accessory': ICON_PATHS.orb,
    'potion': ICON_PATHS.blueBottle,
    'consumable': ICON_PATHS.greenBottle,
  };

  return itemIcons[itemType] || '📦';
}

// Button icon mappings
export function generateButtonIcon(buttonType: string): string {
  const buttonIcons: Record<string, string> = {
    'campaign': ICON_PATHS.map,
    'heroes': ICON_PATHS.quester,
    'shop': ICON_PATHS.sack,
    'inventory': ICON_PATHS.openScroll,
    'settings': ICON_PATHS.cog,
    'quit': '🚪',
    'back': '◀️',
    'start': ICON_PATHS.compass,
    'ready': ICON_PATHS.checkmark,
    'refresh': '🔄',
    'locked': ICON_PATHS.lock,
    'unlocked': ICON_PATHS.key,
    'victory': ICON_PATHS.crown,
    'star': ICON_PATHS.star,
  };

  return buttonIcons[buttonType] || '📌';
}

// Resource icon mappings
export function generateResourceIcon(resourceType: 'gold' | 'gems' | 'experience'): string {
  const resourceIcons = {
    gold: ICON_PATHS.coin,
    gems: ICON_PATHS.orb,
    experience: ICON_PATHS.star,
  };

  return resourceIcons[resourceType];
}

// Get icon by key
export function getIcon(iconKey: IconKey): string {
  return ICON_PATHS[iconKey];
}
