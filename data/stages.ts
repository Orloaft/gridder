// Campaign stage definitions
import { Stage } from '@/types/progression.types';
import { Difficulty } from '@/types/core.types';

export const CAMPAIGN_STAGES: Stage[] = [
  // Tutorial stages (1-2)
  {
    id: 1,
    name: 'The First Steps',
    difficulty: Difficulty.Tutorial,
    enemies: ['plague_rat'],
    playerSlots: 1,
    enemySlots: 1,
    rewards: {
      gold: 25,
      experience: 20,
      recruitChance: 0.5,
    },
  },
  {
    id: 2,
    name: 'Rat Infestation',
    difficulty: Difficulty.Tutorial,
    enemies: ['plague_rat', 'plague_rat'],
    playerSlots: 1,
    enemySlots: 2,
    rewards: {
      gold: 40,
      experience: 30,
      recruitChance: 0.4,
    },
  },

  // Early stages (3-5)
  {
    id: 3,
    name: 'Ghostly Encounter',
    difficulty: Difficulty.Easy,
    enemies: ['wraith', 'plague_rat'],
    playerSlots: 2,
    enemySlots: 2,
    rewards: {
      gold: 60,
      experience: 40,
      recruitChance: 0.35,
    },
    unlockRequirement: 2,
  },
  {
    id: 4,
    name: 'Slime Cave',
    difficulty: Difficulty.Easy,
    enemies: ['slime', 'slime'],
    playerSlots: 2,
    enemySlots: 2,
    rewards: {
      gold: 75,
      experience: 50,
      recruitChance: 0.3,
    },
    unlockRequirement: 3,
  },
  {
    id: 5,
    name: 'Bone Guardian',
    difficulty: Difficulty.Medium,
    enemies: ['bone_construct', 'wraith', 'plague_rat'],
    playerSlots: 2,
    enemySlots: 3,
    rewards: {
      gold: 100,
      experience: 75,
      recruitChance: 0.4,
    },
    unlockRequirement: 4,
  },

  // Mid stages (6-10)
  {
    id: 6,
    name: 'Cultist Ritual',
    difficulty: Difficulty.Medium,
    enemies: ['cultist', 'cultist', 'wraith'],
    playerSlots: 3,
    enemySlots: 3,
    rewards: {
      gold: 125,
      experience: 90,
      recruitChance: 0.25,
    },
    unlockRequirement: 5,
  },
  {
    id: 7,
    name: 'Gargoyle Watch',
    difficulty: Difficulty.Medium,
    enemies: ['gargoyle', 'bone_construct', 'bone_construct'],
    playerSlots: 3,
    enemySlots: 3,
    rewards: {
      gold: 150,
      experience: 110,
      recruitChance: 0.3,
    },
    unlockRequirement: 6,
  },
  {
    id: 8,
    name: 'Shadow Ambush',
    difficulty: Difficulty.Hard,
    enemies: ['shadow_beast', 'wraith', 'wraith', 'cultist'],
    playerSlots: 3,
    enemySlots: 4,
    rewards: {
      gold: 180,
      experience: 130,
      recruitChance: 0.35,
    },
    unlockRequirement: 7,
  },
  {
    id: 9,
    name: 'Undead Horde',
    difficulty: Difficulty.Hard,
    enemies: ['bone_construct', 'bone_construct', 'wraith', 'wraith'],
    playerSlots: 3,
    enemySlots: 4,
    rewards: {
      gold: 200,
      experience: 150,
      recruitChance: 0.25,
    },
    unlockRequirement: 8,
  },
  {
    id: 10,
    name: 'Necromancer Lord',
    difficulty: Difficulty.Boss,
    enemies: ['necromancer_boss', 'bone_construct', 'wraith', 'wraith', 'wraith'],
    playerSlots: 3,
    enemySlots: 5,
    rewards: {
      gold: 300,
      experience: 250,
      recruitChance: 0.5,
    },
    unlockRequirement: 9,
  },

  // Advanced stages (11-15)
  {
    id: 11,
    name: 'Dark Forest',
    difficulty: Difficulty.Hard,
    enemies: ['shadow_beast', 'shadow_beast', 'gargoyle', 'cultist'],
    playerSlots: 4,
    enemySlots: 4,
    rewards: {
      gold: 250,
      experience: 200,
      recruitChance: 0.2,
    },
    unlockRequirement: 10,
  },
  {
    id: 12,
    name: 'Corrupted Temple',
    difficulty: Difficulty.Hard,
    enemies: ['cultist', 'cultist', 'shadow_beast', 'gargoyle', 'wraith'],
    playerSlots: 4,
    enemySlots: 5,
    rewards: {
      gold: 280,
      experience: 220,
      recruitChance: 0.25,
    },
    unlockRequirement: 11,
  },
  {
    id: 13,
    name: 'Bone Yard',
    difficulty: Difficulty.Hard,
    enemies: ['bone_construct', 'bone_construct', 'bone_construct', 'gargoyle', 'gargoyle'],
    playerSlots: 4,
    enemySlots: 5,
    rewards: {
      gold: 320,
      experience: 240,
      recruitChance: 0.2,
    },
    unlockRequirement: 12,
  },
  {
    id: 14,
    name: 'Shadow Realm',
    difficulty: Difficulty.Hard,
    enemies: ['shadow_beast', 'shadow_beast', 'shadow_beast', 'cultist', 'cultist'],
    playerSlots: 4,
    enemySlots: 5,
    rewards: {
      gold: 350,
      experience: 260,
      recruitChance: 0.3,
    },
    unlockRequirement: 13,
  },
  {
    id: 15,
    name: 'Final Stand',
    difficulty: Difficulty.Boss,
    enemies: [
      'necromancer_boss',
      'shadow_beast',
      'shadow_beast',
      'gargoyle',
      'bone_construct',
      'bone_construct',
    ],
    playerSlots: 4,
    enemySlots: 6,
    rewards: {
      gold: 500,
      experience: 400,
      recruitChance: 0.6,
    },
    unlockRequirement: 14,
  },
];

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
