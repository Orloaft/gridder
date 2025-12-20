// Procedurally generated campaign stages
// 8 locations × 64 stages each = 512 stages total
// Grid expands in later locations (8x8 → 10x10 → 12x12 → 14x14 → 16x16)

import { Stage } from '@/types/progression.types';
import { Difficulty } from '@/types/core.types';
import { getLocationByStageId } from './locations';

// Enemy pool by tier (unlock as campaign progresses)
const ENEMY_TIERS = {
  tutorial: ['small_rat', 'giant_spider', 'wild_bat'], // Tutorial stages - very weak critters
  tier1: ['plague_rat', 'wraith', 'slime'], // Stages 9-128
  tier2: ['bone_construct', 'cultist'], // Stages 65+
  tier3: ['shadow_beast', 'gargoyle'], // Stages 129+
  tier4: ['necromancer_boss'], // Stages 193+ (bosses and elite enemies)
};

// Get available enemies for a given stage and difficulty
function getAvailableEnemies(stageId: number, difficulty: Difficulty): string[] {
  // Tutorial difficulty always uses tutorial critters
  if (difficulty === Difficulty.Tutorial) {
    return [...ENEMY_TIERS.tutorial];
  }

  const enemies = [...ENEMY_TIERS.tier1];

  if (stageId >= 65) enemies.push(...ENEMY_TIERS.tier2);
  if (stageId >= 129) enemies.push(...ENEMY_TIERS.tier3);
  if (stageId >= 193) enemies.push(...ENEMY_TIERS.tier4);

  return enemies;
}

// Determine difficulty based on stage position within location
function getDifficulty(stageId: number, positionInLocation: number): Difficulty {
  // Every 8th stage (end of each row) is a boss
  if (positionInLocation % 8 === 0) return Difficulty.Boss;

  // First few stages of location are easier
  if (positionInLocation <= 8) {
    return stageId <= 8 ? Difficulty.Tutorial : Difficulty.Easy;
  }

  // Difficulty scales with progress
  if (positionInLocation <= 24) return Difficulty.Easy;
  if (positionInLocation <= 40) return Difficulty.Medium;
  return Difficulty.Hard;
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

  // Team size based on location's maxTeamSize and current row
  const maxTeamSize = location.maxTeamSize || 3;
  const playerSlots = Math.min(maxTeamSize, rowInLocation);

  // Determine difficulty
  const difficulty = getDifficulty(stageId, positionInLocation);

  // Calculate enemy count (scales with difficulty and stage progress)
  const baseEnemyCount = playerSlots + (difficulty === Difficulty.Boss ? 1 : 0);
  const difficultyMultiplier = difficulty === Difficulty.Boss ? 1.5 :
                               difficulty === Difficulty.Hard ? 1.3 :
                               difficulty === Difficulty.Medium ? 1.1 : 1.0;
  const stageMultiplier = 1 + (stageId / 512) * 0.5; // Up to 50% more enemies by end
  const enemySlots = Math.floor(baseEnemyCount * difficultyMultiplier * stageMultiplier);

  // Generate enemies
  const enemies = generateEnemies(stageId, difficulty, enemySlots);

  // Calculate rewards (scales with stage and difficulty)
  const baseGold = 20 + (stageId * 2);
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
  // Bosses give gems based on which location they're in (every 64 stages = 1 location)
  const isBoss = difficulty === Difficulty.Boss;
  const locationNumber = Math.floor((stageId - 1) / 64) + 1; // 1-8 for 8 locations
  const gemReward = isBoss ? 10 + (locationNumber * 5) : 0; // 15, 20, 25, 30, 35, 40, 45, 50 gems

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
    isBoss,
    unlockRequirement: stageId === 1 ? undefined : stageId - 1,
  };
}

// Generate all 512 stages
export const CAMPAIGN_STAGES: Stage[] = Array.from(
  { length: 512 },
  (_, index) => generateStage(index + 1)
);

// Helper functions
export function getStageById(stageId: number): Stage | undefined {
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
