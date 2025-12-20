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

  // Heroes
  quester: '/icons/quester.PNG',
  paladin: '/icons/paladin.PNG',
  necromancer: '/icons/necromancer.PNG',
  weakWizard: '/icons/weakwizard.PNG',
  arcanerogue: '/icons/arcanerogue.PNG',
  arcaneHalberdman: '/icons/arcanehalberdman.PNG',
  armourSwordman: '/icons/armourswordman.PNG',
  axeHandHornman: '/icons/axehandhornman.PNG',
  bloodyAxeman: '/icons/bloodyaxeman.PNG',
  bloodyKnifeman: '/icons/bloodyknifeman.PNG',
  darkKnifeman: '/icons/darkknifeman.PNG',
  darkman: '/icons/darkman.PNG',
  halberdman: '/icons/halberdman.PNG',
  shieldman: '/icons/shieldman.PNG',
  staffCloakman: '/icons/staffcloakman.PNG',
  swordman: '/icons/swordman.PNG',
  torchman: '/icons/torchman.PNG',

  // Enemies
  bat: '/icons/bat.PNG',
  blackHulk: '/icons/blackhulk.PNG',
  bluebottle: '/icons/bluebottle.PNG',
  centipede: '/icons/centipede.PNG',
  chimera: '/icons/chimera.PNG',
  hobgob: '/icons/hobgob.PNG',
  hoodZombie: '/icons/hoodzombie.PNG',
  maggot: '/icons/maggot.PNG',
  mermaiden: '/icons/mermaiden.PNG',
  plagueRat: '/icons/plague_rat.PNG',
  skinnyZombie: '/icons/skinnyzombie.PNG',
  spider: '/icons/spider.PNG',
  spiderHatchling: '/icons/spider_hatchling.PNG',
  spiderRat: '/icons/spider_rat.PNG',
  strongZombie: '/icons/strongombie.PNG',
  succubus: '/icons/succubus.PNG',
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
  heroes: ['quester', 'paladin', 'necromancer', 'weakWizard', 'arcanerogue', 'arcaneHalberdman', 'armourSwordman', 'axeHandHornman', 'bloodyAxeman', 'bloodyKnifeman', 'darkKnifeman', 'darkman', 'halberdman', 'shieldman', 'staffCloakman', 'swordman', 'torchman'] as IconKey[],
  enemies: ['bat', 'blackHulk', 'bluebottle', 'centipede', 'chimera', 'hobgob', 'hoodZombie', 'maggot', 'mermaiden', 'plagueRat', 'skinnyZombie', 'spider', 'spiderHatchling', 'spiderRat', 'strongZombie', 'succubus'] as IconKey[],
};
