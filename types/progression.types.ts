import { Hero, Item, ItemInstance, Difficulty } from './core.types';
import { LootConfig } from '@/utils/lootGenerator';

// Screen types for navigation
export enum ScreenType {
  MainMenu = 'mainMenu',
  LocationMap = 'locationMap',
  CampaignMap = 'campaignMap',
  PreBattle = 'preBattle',
  Battle = 'battle',
  HeroRoster = 'heroRoster',
  HeroMenu = 'heroMenu',
  Shop = 'shop',
  Settings = 'settings',
  Victory = 'victory',
  Defeat = 'defeat',
  AbilitySelection = 'abilitySelection',
  RewardReveal = 'rewardReveal',
  LevelUpChoice = 'levelUpChoice',
  BattleInventory = 'battleInventory',
}

// Stage node for campaign map
export interface StageNode {
  stageId: number;
  name: string;
  position: { row: number; col: number };
  status: 'locked' | 'available' | 'completed';
  difficulty: Difficulty;
  enemyTypes: string[];
  rewards: {
    gold: number;
    experience: number;
    recruitChance: number;
    gems?: number;
  };
  isBoss?: boolean;
}

// Campaign stage definition
export interface Stage {
  id: number;
  name: string;
  difficulty: Difficulty;
  enemies: string[] | string[][]; // Enemy template IDs, or array of waves for multi-wave battles
  playerSlots: number;
  enemySlots: number;
  rewards: {
    gold: number;
    experience: number;
    recruitChance: number;
    gems?: number; // Gems awarded for boss stages
  };
  lootConfig?: LootConfig; // Item drop configuration
  unlockRequirement?: number; // Stage ID that must be completed
  isBoss?: boolean; // Mark boss stages for gem rewards
}

// Player progression data
export interface PlayerData {
  gold: number;
  gems: number;
  level: number;
  experience: number;
  maxExperience: number;
}

// Campaign progression
export interface CampaignProgress {
  currentStage: number;
  maxStageReached: number;
  stagesCompleted: Set<number>;
  locationsCompleted: Set<string>;
}

// Overall game state
export interface GameState {
  player: PlayerData;
  roster: Hero[];
  inventory: ItemInstance[];
  campaign: CampaignProgress;
  unlockedFeatures: Set<string>;
  currentScreen: ScreenType;
  selectedTeam: string[]; // Hero instance IDs
}

// Save data format
export interface SaveData {
  version: string;
  timestamp: number;
  gameState: Omit<GameState, 'campaign' | 'unlockedFeatures'> & {
    campaign: Omit<CampaignProgress, 'stagesCompleted'> & {
      stagesCompleted: number[];
    };
    unlockedFeatures: string[];
  };
}
