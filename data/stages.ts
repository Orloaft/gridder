// Procedurally generated campaign stages
// 8 locations × 64 stages each = 512 stages total
// Grid expands in later locations (8x8 → 10x10 → 12x12 → 14x14 → 16x16)

import { Stage } from '@/types/progression.types';
import { Difficulty } from '@/types/core.types';
import { getLocationByStageId, getLocationById } from './locations';
import { getDefaultLootConfig } from '@/utils/lootGenerator';

// Enemy pool by tier (unlock as campaign progresses)
const ENEMY_TIERS = {
  tutorial: ['small_rat', 'giant_spider', 'wild_bat'], // Tutorial stages - very weak critters

  // Early game enemies (stages 1-32)
  tier1: ['plague_rat', 'bone_construct', 'wraith'],

  // Mid game enemies (stages 33-64)
  tier2: ['slime', 'cultist', 'dark_archer', 'frost_elemental'],

  // Late game enemies (stages 65-96)
  tier3: ['shadow_beast', 'gargoyle', 'void_mage', 'blood_shaman'],

  // End game enemies (stages 97-128)
  tier4: ['necromancer_boss', 'corrupted_priest'],

  // Support/summoner enemies that appear in mid-late game
  summoners: ['cultist', 'necromancer_boss'],

  // Ranged enemies for variety
  ranged: ['wraith', 'bone_construct', 'dark_archer', 'void_mage', 'cultist'],

  // Tank enemies
  tanks: ['gargoyle', 'slime', 'frost_elemental'],
};

// Get available enemies for a given stage and difficulty
function getAvailableEnemies(stageId: number, difficulty: Difficulty): string[] {
  // Tutorial difficulty always uses tutorial critters
  if (difficulty === Difficulty.Tutorial) {
    return [...ENEMY_TIERS.tutorial];
  }

  let enemies: string[] = [];

  // Progressive enemy unlocks based on stage
  if (stageId <= 32) {
    // Early game: basic enemies
    enemies = [...ENEMY_TIERS.tier1];
  } else if (stageId <= 64) {
    // Mid game: tier 1 + tier 2, with some ranged
    enemies = [...ENEMY_TIERS.tier1, ...ENEMY_TIERS.tier2];
    // Add some ranged variety
    if (difficulty === Difficulty.Hard || difficulty === Difficulty.Boss) {
      enemies.push('dark_archer');
    }
  } else if (stageId <= 96) {
    // Late game: tier 2 + tier 3, more variety
    enemies = [...ENEMY_TIERS.tier2, ...ENEMY_TIERS.tier3];
    // Bosses get summoners
    if (difficulty === Difficulty.Boss) {
      enemies.push('cultist', 'blood_shaman');
    }
  } else {
    // End game: tier 3 + tier 4, all enemy types
    enemies = [...ENEMY_TIERS.tier3, ...ENEMY_TIERS.tier4];
    if (difficulty === Difficulty.Boss) {
      enemies.push('necromancer_boss', 'corrupted_priest');
    }
  }

  // Ensure we have at least some enemies
  if (enemies.length === 0) {
    enemies = [...ENEMY_TIERS.tier1];
  }

  return enemies;
}

// Determine difficulty based on stage position within location
function getDifficulty(stageId: number, positionInLocation: number): Difficulty {
  // Every 8th stage (end of each row) is a boss
  if (positionInLocation % 8 === 0) return Difficulty.Boss;

  // Only the very first stages should be tutorial
  if (stageId <= 3) {
    return Difficulty.Tutorial;
  }

  // Difficulty scales with position in location and overall progress
  if (positionInLocation <= 4) {
    return Difficulty.Easy;
  } else if (positionInLocation <= 12) {
    return stageId <= 32 ? Difficulty.Easy : Difficulty.Medium;
  } else {
    return stageId <= 64 ? Difficulty.Medium : Difficulty.Hard;
  }
}

// Generate enemy composition for a stage
function generateEnemies(stageId: number, difficulty: Difficulty, enemyCount: number): string[] {
  const availableEnemies = getAvailableEnemies(stageId, difficulty);
  const enemies: string[] = [];

  // Tutorial stages use only tutorial critters - no special logic needed
  if (difficulty === Difficulty.Tutorial) {
    for (let i = 0; i < enemyCount; i++) {
      enemies.push(availableEnemies[Math.floor(Math.random() * availableEnemies.length)]);
    }
    return enemies;
  }

  // Bosses always include necromancer_boss if available
  if (difficulty === Difficulty.Boss && availableEnemies.includes('necromancer_boss')) {
    const bossCount = Math.min(2, Math.floor(stageId / 128) + 1);
    for (let i = 0; i < bossCount; i++) {
      enemies.push('necromancer_boss');
    }
    enemyCount -= bossCount;
  }

  // Fill remaining slots with random enemies (weighted toward stronger enemies in later stages)
  const tierWeights = stageId < 129 ? [0.5, 0.3, 0.2, 0] :
                      stageId < 257 ? [0.2, 0.3, 0.4, 0.1] :
                      [0.1, 0.2, 0.4, 0.3];

  for (let i = 0; i < enemyCount; i++) {
    const rand = Math.random();
    let enemyPool: string[];

    if (rand < tierWeights[0]) {
      enemyPool = ENEMY_TIERS.tier1.filter(e => availableEnemies.includes(e));
    } else if (rand < tierWeights[0] + tierWeights[1]) {
      enemyPool = ENEMY_TIERS.tier2.filter(e => availableEnemies.includes(e));
    } else if (rand < tierWeights[0] + tierWeights[1] + tierWeights[2]) {
      enemyPool = ENEMY_TIERS.tier3.filter(e => availableEnemies.includes(e));
    } else {
      enemyPool = ENEMY_TIERS.tier4.filter(e => availableEnemies.includes(e));
    }

    if (enemyPool.length > 0) {
      enemies.push(enemyPool[Math.floor(Math.random() * enemyPool.length)]);
    } else {
      // Fallback to any available enemy
      enemies.push(availableEnemies[Math.floor(Math.random() * availableEnemies.length)]);
    }
  }

  return enemies;
}

// Generate a single stage
function generateStage(stageId: number): Stage {
  const location = getLocationByStageId(stageId);
  if (!location || !location.stageRange) {
    throw new Error(`No location found for stage ${stageId}`);
  }

  const positionInLocation = stageId - location.stageRange.start + 1;
  const rowInLocation = Math.ceil(positionInLocation / 8);
  const colInLocation = ((positionInLocation - 1) % 8) + 1;

  // Team size based on location's maxTeamSize
  // All stages in a location use the same team size
  const playerSlots = location.maxTeamSize || 3;

  // Determine difficulty
  const difficulty = getDifficulty(stageId, positionInLocation);

  // Calculate enemy count (scales with difficulty and stage progress)
  const baseEnemyCount = playerSlots + (difficulty === Difficulty.Boss ? 1 : 0);
  const difficultyMultiplier = difficulty === Difficulty.Boss ? 1.5 :
                               difficulty === Difficulty.Hard ? 1.3 :
                               difficulty === Difficulty.Medium ? 1.1 : 1.0;
  const stageMultiplier = 1 + (stageId / 128) * 0.5; // Up to 50% more enemies by end
  const enemySlots = Math.floor(baseEnemyCount * difficultyMultiplier * stageMultiplier);

  // Generate enemies - ALL LOCATIONS now have multi-wave encounters (since each location = 1 mission)
  let enemies: string[] | string[][];

  // Determine wave count based on difficulty and location
  let waveCount: number;
  if (difficulty === Difficulty.Tutorial) {
    waveCount = 2; // Tutorial has 2 waves (gentle introduction)
  } else if (difficulty === Difficulty.Boss) {
    waveCount = Math.min(5, 3 + Math.floor(stageId / 64)); // Bosses have 3-5 waves
  } else if (difficulty === Difficulty.Easy) {
    waveCount = Math.min(3, 2 + Math.floor(stageId / 64)); // Easy stages have 2-3 waves
  } else if (difficulty === Difficulty.Medium) {
    waveCount = Math.min(4, 3 + Math.floor(stageId / 64)); // Medium stages have 3-4 waves
  } else {
    waveCount = Math.min(5, 3 + Math.floor(stageId / 32)); // Hard stages have 3-5 waves
  }

  // Only add boss wave for actual boss stages
  const totalWaves = difficulty === Difficulty.Boss ? waveCount + 1 : waveCount;
  const baseEnemiesPerWave = Math.max(1, Math.floor(enemySlots / waveCount));

  enemies = Array.from({ length: totalWaves }, (_, waveIndex) => {
    const isFirstWave = waveIndex === 0;
    const isBossWave = difficulty === Difficulty.Boss && waveIndex === totalWaves - 1; // Only for actual boss stages
    const isRegularWave = !isFirstWave && !isBossWave;

    let waveEnemyCount;

    if (isBossWave) {
      // BOSS WAVE: Spawn location-specific boss for actual boss stages only
      const locationNumber = Math.floor((stageId - 1) / 16) + 1; // 1-8 for 8 locations
      const bossPool = getAvailableEnemies(stageId, difficulty);

      // Map location number to specific boss
      const locationBosses: Record<number, string> = {
        1: 'plague_mother',      // Darkwood Forest
        2: 'bone_colossus',      // Grave Gate Cemetery
        3: 'shadow_commander',   // Ruined Fort
        4: 'void_priest',        // Black Shrine
        5: 'magma_titan',        // Lava River
        6: 'mummy_pharaoh',      // Sand Temple
        7: 'storm_wyrm',         // Ruin Peak Spire
        8: 'void_emperor',       // Black Spire (Final Boss)
      };

      const locationBoss = locationBosses[locationNumber] || 'necromancer_boss';

      // Boss wave composition: Location boss + supporting enemies
      const bossEnemies: string[] = [];

      // Add the location-specific boss
      bossEnemies.push(locationBoss);

      // Add supporting enemies based on location
      const regularCount = Math.max(2, Math.floor(baseEnemiesPerWave * 0.6));

      // For later locations, add more dangerous support
      if (locationNumber >= 6) {
        // Late game: Add corrupted priests and necromancers as support
        if (Math.random() > 0.5) bossEnemies.push('corrupted_priest');
      }

      // Fill with appropriate tier enemies
      for (let i = 0; i < regularCount; i++) {
        bossEnemies.push(bossPool[Math.floor(Math.random() * bossPool.length)]);
      }

      return bossEnemies;
    } else if (isFirstWave) {
      waveEnemyCount = Math.max(1, Math.floor(baseEnemiesPerWave * 0.7)); // Start easier
    } else {
      waveEnemyCount = Math.max(1, Math.ceil(baseEnemiesPerWave * 1.2)); // Middle waves slightly harder
    }

    return generateEnemies(stageId, difficulty, waveEnemyCount);
  });

  // Calculate rewards - IMPROVED SCALING FOR PROGRESSION
  // Early game (1-32): 50-150g base
  // Mid game (33-64): 150-300g base
  // Late game (65-96): 300-500g base
  // End game (97-128): 500-800g base
  const stageProgress = Math.min(stageId / 128, 1);
  const baseGold = Math.floor(50 + (stageProgress * 750)); // 50-800g scaling

  // Difficulty multipliers remain the same
  const difficultyBonus = difficulty === Difficulty.Boss ? 3 :
                         difficulty === Difficulty.Hard ? 2 :
                         difficulty === Difficulty.Medium ? 1.5 : 1;
  const goldReward = Math.floor(baseGold * difficultyBonus);

  // Generate name
  const stageNames = {
    [Difficulty.Tutorial]: ['First Steps', 'Learning Path', 'Practice Run', 'Training Day'],
    [Difficulty.Easy]: ['Minor Skirmish', 'Patrol Route', 'Scouting Mission', 'Clearing Path'],
    [Difficulty.Medium]: ['Battle Zone', 'Enemy Stronghold', 'Contested Ground', 'War Path'],
    [Difficulty.Hard]: ['Death March', 'Elite Force', 'Gauntlet Run', 'Brutal Assault'],
    [Difficulty.Boss]: [`${location.name} Guardian`, `${location.name} Overlord`, `Floor ${rowInLocation} Boss`],
  };

  const namePool = stageNames[difficulty] || ['Battle'];
  const baseName = difficulty === Difficulty.Boss
    ? `Row ${rowInLocation} Boss`
    : namePool[Math.floor(Math.random() * namePool.length)];
  const name = `${baseName} (${stageId})`;

  // Calculate gem rewards for boss stages
  // Each location has 16 stages, with bosses at positions 8 and 16
  const isBoss = difficulty === Difficulty.Boss;
  const locationNumber = Math.floor((stageId - 1) / 16) + 1; // 1-8 for 8 locations
  const isMiniBoss = positionInLocation === 8; // Mid-location boss (row 1 boss)
  const isMajorBoss = positionInLocation === 16; // End-location boss (row 2 boss)

  // Progressive gem rewards based on location and boss type
  // ALL bosses should give gems, not just specific ones
  let gemReward = 0;
  if (isBoss) {
    if (isMiniBoss) {
      // Mini-bosses (mid-location) give fewer gems
      gemReward = 5 + (locationNumber * 3); // 8, 11, 14, 17, 20, 23, 26, 29 gems
    } else if (isMajorBoss) {
      // Major bosses (end-location) give more gems
      gemReward = 10 + (locationNumber * 5); // 15, 20, 25, 30, 35, 40, 45, 50 gems
    } else {
      // Fallback for any other boss stage (shouldn't happen but just in case)
      gemReward = 5 + (locationNumber * 2); // At least some gems
    }
  }

  // Get loot configuration based on difficulty
  const difficultyString = difficulty === Difficulty.Tutorial ? 'tutorial' :
                           difficulty === Difficulty.Easy ? 'easy' :
                           difficulty === Difficulty.Medium ? 'medium' :
                           difficulty === Difficulty.Hard ? 'hard' :
                           difficulty === Difficulty.Boss ? 'boss' : 'easy';
  const lootConfig = getDefaultLootConfig(difficultyString);

  return {
    id: stageId,
    name,
    difficulty,
    enemies,
    playerSlots,
    enemySlots,
    rewards: {
      gold: goldReward,
      experience: Math.floor(goldReward * 0.8),
      recruitChance: difficulty === Difficulty.Boss ? 0.6 : 0.3,
      gems: gemReward > 0 ? gemReward : undefined, // Only add gems property if boss
    },
    lootConfig, // Add loot configuration for item drops
    isBoss,
    unlockRequirement: stageId === 1 ? undefined : stageId - 1,
  };
}

// Generate location-based mega stages (8 locations, each as a single multi-wave encounter)
function generateLocationStage(locationId: string): Stage {
  const location = getLocationById(locationId);
  if (!location || !location.stageRange) {
    throw new Error(`Invalid location: ${locationId}`);
  }

  const locationNumber = Math.floor((location.stageRange.start - 1) / 16) + 1; // 1-8
  const playerSlots = location.maxTeamSize || 3;

  // Generate waves for the entire location
  // Each location has ~10-20 waves total, with bosses at specific points
  const waves: string[][] = [];

  // Location 1 (Darkwood): 10 waves
  // Location 2-4: 12 waves
  // Location 5-6: 15 waves
  // Location 7-8: 20 waves
  const baseWaveCount = locationNumber <= 1 ? 10 :
                        locationNumber <= 4 ? 12 :
                        locationNumber <= 6 ? 15 : 20;

  // Generate regular waves
  for (let waveNum = 1; waveNum <= baseWaveCount; waveNum++) {
    const isMiniBoss = waveNum === Math.floor(baseWaveCount / 2); // Mid-point mini-boss
    const isFinalBoss = waveNum === baseWaveCount; // Final wave is boss

    let wave: string[] = [];

    if (isFinalBoss) {
      // Final boss wave - location specific boss
      const locationBosses: Record<number, string> = {
        1: 'plague_mother',      // Darkwood Forest
        2: 'bone_colossus',      // Grave Gate Cemetery
        3: 'shadow_commander',   // Ruined Fort
        4: 'void_priest',        // Black Shrine
        5: 'magma_titan',        // Lava River
        6: 'mummy_pharaoh',      // Sand Temple
        7: 'storm_wyrm',         // Ruin Peak Spire
        8: 'void_emperor',       // Black Spire (Final Boss)
      };

      const boss = locationBosses[locationNumber] || 'necromancer_boss';
      wave.push(boss);

      // Add support enemies
      const supportCount = 2 + Math.floor(locationNumber / 3);
      const difficulty = Difficulty.Boss;
      const supportEnemies = getAvailableEnemies(location.stageRange.start + 15, difficulty);
      for (let i = 0; i < supportCount; i++) {
        wave.push(supportEnemies[Math.floor(Math.random() * supportEnemies.length)]);
      }
    } else if (isMiniBoss) {
      // Mini-boss wave
      wave.push('necromancer_boss');
      const supportCount = 2 + Math.floor(locationNumber / 4);
      const difficulty = Difficulty.Hard;
      const supportEnemies = getAvailableEnemies(location.stageRange.start + 8, difficulty);
      for (let i = 0; i < supportCount; i++) {
        wave.push(supportEnemies[Math.floor(Math.random() * supportEnemies.length)]);
      }
    } else {
      // Regular wave - scale difficulty with wave progression
      const waveProgress = waveNum / baseWaveCount;
      const difficulty = waveProgress < 0.3 ? Difficulty.Easy :
                        waveProgress < 0.7 ? Difficulty.Medium : Difficulty.Hard;

      // Calculate stage ID for enemy tier selection
      const virtualStageId = location.stageRange.start + Math.floor(waveProgress * 15);
      const enemyCount = 2 + Math.floor(locationNumber / 2) + Math.floor(waveProgress * 2);

      wave = generateEnemies(virtualStageId, difficulty, enemyCount);
    }

    waves.push(wave);
  }

  // Calculate total rewards for completing the entire location
  const baseGold = 500 + (locationNumber * 500); // 1000-4500g per location
  const totalXP = Math.floor(baseGold * 0.8);

  // Gems for completing the location (mini-boss + final boss rewards combined)
  const gemReward = (5 + (locationNumber * 3)) + (10 + (locationNumber * 5)); // Both boss gem rewards

  return {
    id: location.stageRange.start, // Use first stage ID as the location's stage ID
    name: `${location.name} Campaign`,
    difficulty: Difficulty.Boss, // Locations are always "boss" difficulty overall
    enemies: waves,
    playerSlots,
    enemySlots: playerSlots + 2, // Not really used for multi-wave
    rewards: {
      gold: baseGold,
      experience: totalXP,
      recruitChance: 0.8, // High chance after completing a full location
      gems: gemReward,
    },
    lootConfig: getDefaultLootConfig('boss'),
    isBoss: true, // Locations count as boss stages
    unlockRequirement: locationNumber === 1 ? undefined : (location.stageRange.start - 16),
  };
}

// Generate all 128 stages (8 locations × 16 stages each)
// Keep for backwards compatibility but we'll use location stages instead
export const CAMPAIGN_STAGES: Stage[] = Array.from(
  { length: 128 },
  (_, index) => generateStage(index + 1)
);

// Create location stages for each combat location
export const LOCATION_STAGES: Map<string, Stage> = new Map([
  ['darkwood', generateLocationStage('darkwood')],
  ['gravegate', generateLocationStage('gravegate')],
  ['ruinfort', generateLocationStage('ruinfort')],
  ['blackshrine', generateLocationStage('blackshrine')],
  ['lavariver', generateLocationStage('lavariver')],
  ['sandtemple', generateLocationStage('sandtemple')],
  ['ruinpeakspire', generateLocationStage('ruinpeakspire')],
  ['blackspire', generateLocationStage('blackspire')],
]);

// Get stage for a location
export function getLocationStage(locationId: string): Stage | undefined {
  return LOCATION_STAGES.get(locationId);
}

// Helper functions
export function getStageById(stageId: number): Stage | undefined {
  // First check if this is a location stage ID
  for (const [locationId, stage] of LOCATION_STAGES.entries()) {
    if (stage.id === stageId) {
      return stage;
    }
  }
  // Fallback to old system for compatibility
  return CAMPAIGN_STAGES.find((stage) => stage.id === stageId);
}

export function getStagesByDifficulty(difficulty: Difficulty): Stage[] {
  return CAMPAIGN_STAGES.filter((stage) => stage.difficulty === difficulty);
}

export function isStageUnlocked(stageId: number, completedStages: Set<number>): boolean {
  const stage = getStageById(stageId);
  if (!stage) return false;

  // First stage is always unlocked
  if (stage.id === 1) return true;

  // Check if unlock requirement is met
  if (stage.unlockRequirement) {
    return completedStages.has(stage.unlockRequirement);
  }

  return false;
}

export function getNextUnlockedStage(completedStages: Set<number>): number {
  for (const stage of CAMPAIGN_STAGES) {
    if (!completedStages.has(stage.id) && isStageUnlocked(stage.id, completedStages)) {
      return stage.id;
    }
  }
  return CAMPAIGN_STAGES.length; // All stages completed
}
