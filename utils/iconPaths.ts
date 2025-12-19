// Icon path mappings for all game assets
// All icons are in /public/icons/ directory

export const ICON_PATHS = {
  // Items & Equipment
  sword: '/icons/sword.PNG',
  shield: '/icons/shield.PNG',
  bow: '/icons/bow.PNG',
  wand: '/icons/wand.PNG',
  blueWand: '/icons/bluewand.PNG',
  boot: '/icons/boot.PNG',
  wingHelmet: '/icons/winghelmet.PNG',

  // Consumables & Resources
  coin: '/icons/coin.PNG',
  orb: '/icons/orb.PNG',
  heart: '/icons/heart.PNG',
  blueBottle: '/icons/bluebottle.PNG',
  greenBottle: '/icons/greenbottle.PNG',
  sack: '/icons/sack.PNG',

  // UI Elements
  checkmark: '/icons/checkmark.PNG',
  cog: '/icons/cog.PNG',
  compass: '/icons/compass.PNG',
  crown: '/icons/crown.PNG',
  key: '/icons/key.PNG',
  lock: '/icons/lock.PNG',
  map: '/icons/map.PNG',
  openScroll: '/icons/openscroll.PNG',
  star: '/icons/star.PNG',
  skull: '/icons/skull.PNG',

  // Character
  quester: '/icons/quester.PNG',
} as const;

export type IconKey = keyof typeof ICON_PATHS;

// Helper to get icon path
export function getIconPath(key: IconKey): string {
  return ICON_PATHS[key];
}

// Icon categories for easier selection
export const ICON_CATEGORIES = {
  weapons: ['sword', 'bow', 'wand', 'blueWand'] as IconKey[],
  armor: ['shield', 'boot', 'wingHelmet'] as IconKey[],
  consumables: ['blueBottle', 'greenBottle', 'heart'] as IconKey[],
  resources: ['coin', 'orb', 'sack', 'star'] as IconKey[],
  ui: ['checkmark', 'cog', 'compass', 'crown', 'key', 'lock', 'map', 'openScroll', 'skull'] as IconKey[],
  characters: ['quester'] as IconKey[],
};
