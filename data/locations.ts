import { Difficulty } from '@/types/core.types';

export enum LocationType {
  Combat = 'combat',
  Shop = 'shop',
  Recruitment = 'recruitment',
  Special = 'special',
}

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  description: string;
  spritePath: string;
  stageRange?: { start: number; end: number }; // For combat locations
  unlockRequirement?: string; // Location ID that must be completed first
  isUnlocked?: boolean; // Will be computed based on progress
  gridSize?: { rows: number; cols: number }; // Grid size for this location (default 8x8)
  maxTeamSize?: number; // Maximum team size for battles in this location
}

export const LOCATIONS: Location[] = [
  // === COMBAT LOCATIONS (8 locations × 64 stages each = 512 stages total) ===

  // Location 1: Darkwood Forest (Stages 1-64) - Tutorial/Early game
  {
    id: 'darkwood',
    name: 'Darkwood Forest',
    type: LocationType.Combat,
    description: 'A shadowy forest crawling with plague rats and restless spirits. Begin your journey here.',
    spritePath: '/icons/location/darkwood.PNG',
    stageRange: { start: 1, end: 64 },
    gridSize: { rows: 8, cols: 8 },
    maxTeamSize: 3,
  },

  // Shop 1: Small Village
  {
    id: 'small_village',
    name: 'Village Market',
    type: LocationType.Shop,
    description: 'A peaceful village where merchants sell basic equipment and supplies.',
    spritePath: '/icons/location/smallvillage.PNG',
    unlockRequirement: 'darkwood',
  },

  // Location 2: Grave Gate Cemetery (Stages 65-128)
  {
    id: 'gravegate',
    name: 'Grave Gate',
    type: LocationType.Combat,
    description: 'An ancient cemetery where the dead refuse to rest. Bone constructs and wraiths guard cursed tombs.',
    spritePath: '/icons/location/gravegate.PNG',
    stageRange: { start: 65, end: 128 },
    gridSize: { rows: 8, cols: 8 },
    maxTeamSize: 4,
    unlockRequirement: 'darkwood',
  },

  // Location 3: Ruined Fort (Stages 129-192)
  {
    id: 'ruinfort',
    name: 'Ruined Fort',
    type: LocationType.Combat,
    description: 'A crumbling fortress overrun by cultists and shadow beasts. Strategic positioning is key.',
    spritePath: '/icons/location/ruinfort.PNG',
    stageRange: { start: 129, end: 192 },
    gridSize: { rows: 8, cols: 8 },
    maxTeamSize: 5,
    unlockRequirement: 'gravegate',
  },

  // Recruitment 1: Campsite
  {
    id: 'campsite',
    name: 'Adventurer Camp',
    type: LocationType.Recruitment,
    description: 'Weary heroes gather here, seeking gold and glory. Recruit powerful allies.',
    spritePath: '/icons/location/campsite.PNG',
    unlockRequirement: 'ruinfort',
  },

  // Location 4: Black Shrine (Stages 193-256)
  {
    id: 'blackshrine',
    name: 'Black Shrine',
    type: LocationType.Combat,
    description: 'A corrupted temple where dark rituals empower unholy creatures. Expect fierce resistance.',
    spritePath: '/icons/location/blackshrine.PNG',
    stageRange: { start: 193, end: 256 },
    gridSize: { rows: 8, cols: 8 },
    maxTeamSize: 6,
    unlockRequirement: 'ruinfort',
  },

  // Location 5: Lava River Crossing (Stages 257-320) - Grid expands to 10x10
  {
    id: 'lavariver',
    name: 'Lava River',
    type: LocationType.Combat,
    description: 'Molten rivers of fire separate you from gargoyles and flame-scorched undead. The battlefield expands.',
    spritePath: '/icons/location/lavariver.PNG',
    stageRange: { start: 257, end: 320 },
    gridSize: { rows: 10, cols: 10 },
    maxTeamSize: 7,
    unlockRequirement: 'blackshrine',
  },

  // Shop 2: Spell Hut
  {
    id: 'spellhut',
    name: 'Arcane Hut',
    type: LocationType.Shop,
    description: 'A mysterious hermit sells powerful enchanted items and rare artifacts.',
    spritePath: '/icons/location/spellhut.PNG',
    unlockRequirement: 'lavariver',
  },

  // Location 6: Sand Temple (Stages 321-384) - Grid expands to 12x12
  {
    id: 'sandtemple',
    name: 'Sand Temple',
    type: LocationType.Combat,
    description: 'An ancient desert temple guarded by sand-cursed warriors and necromancers. Vast battle arenas await.',
    spritePath: '/icons/location/sandtemple.PNG',
    stageRange: { start: 321, end: 384 },
    gridSize: { rows: 12, cols: 12 },
    maxTeamSize: 8,
    unlockRequirement: 'lavariver',
  },

  // Location 7: Ruin Peak Spire (Stages 385-448) - Grid expands to 14x14
  {
    id: 'ruinpeakspire',
    name: 'Ruin Peak',
    type: LocationType.Combat,
    description: 'A towering spire lost in the clouds. Epic battles rage across massive floors.',
    spritePath: '/icons/location/ruinpeakspire.PNG',
    stageRange: { start: 385, end: 448 },
    gridSize: { rows: 14, cols: 14 },
    maxTeamSize: 10,
    unlockRequirement: 'sandtemple',
  },

  // Special: Tree on Water
  {
    id: 'treeonwater',
    name: 'Sacred Grove',
    type: LocationType.Special,
    description: 'A mystical tree grants blessings to those who have proven their worth.',
    spritePath: '/icons/location/treeonwater.PNG',
    unlockRequirement: 'ruinpeakspire',
  },

  // Location 8: Black Spire (Stages 449-512) - FINAL LOCATION - Grid expands to 16x16
  {
    id: 'blackspire',
    name: 'Black Spire',
    type: LocationType.Combat,
    description: 'The source of all darkness. Face the ultimate evil across colossal battlefields.',
    spritePath: '/icons/location/blackpire.PNG',
    stageRange: { start: 449, end: 512 },
    gridSize: { rows: 16, cols: 16 },
    maxTeamSize: 12,
    unlockRequirement: 'ruinpeakspire',
  },

  // Unused location assets (for future expansion):
  // - bridge.PNG
  // - fort.PNG
];

// Helper functions
export function getLocationById(locationId: string): Location | undefined {
  return LOCATIONS.find((loc) => loc.id === locationId);
}

export function getCombatLocations(): Location[] {
  return LOCATIONS.filter((loc) => loc.type === LocationType.Combat);
}

export function getShopLocations(): Location[] {
  return LOCATIONS.filter((loc) => loc.type === LocationType.Shop);
}

export function getLocationByStageId(stageId: number): Location | undefined {
  return LOCATIONS.find(
    (loc) =>
      loc.stageRange &&
      stageId >= loc.stageRange.start &&
      stageId <= loc.stageRange.end
  );
}

export function isLocationUnlocked(
  locationId: string,
  completedStages: Set<number>
): boolean {
  const location = getLocationById(locationId);
  if (!location) return false;

  // First location is always unlocked
  if (locationId === 'darkwood') return true;

  // Check if unlock requirement is met
  if (location.unlockRequirement) {
    const requiredLocation = getLocationById(location.unlockRequirement);
    if (!requiredLocation) return false;

    // For combat locations, check if all stages are completed
    if (requiredLocation.stageRange) {
      const allStagesCompleted = Array.from(
        { length: requiredLocation.stageRange.end - requiredLocation.stageRange.start + 1 },
        (_, i) => requiredLocation.stageRange!.start + i
      ).every((stageId) => completedStages.has(stageId));

      return allStagesCompleted;
    }

    // For non-combat locations, just need to have them unlocked (check their unlock requirement)
    return isLocationUnlocked(location.unlockRequirement, completedStages);
  }

  return false;
}

export function getUnlockedLocations(completedStages: Set<number>): Location[] {
  return LOCATIONS.filter((loc) => isLocationUnlocked(loc.id, completedStages));
}
