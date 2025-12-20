import { Hero, Item, ItemInstance, Difficulty } from './core.types';

// Screen types for navigation
export enum ScreenType {
  MainMenu = 'mainMenu',
  CampaignMap = 'campaignMap',
  PreBattle = 'preBattle',
  Battle = 'battle',
  HeroRoster = 'heroRoster',
  Shop = 'shop',
  Settings = 'settings',
  Victory = 'victory',
  Defeat = 'defeat',
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
  };
}

// Campaign stage definition
export interface Stage {
  id: number;
  name: string;
  difficulty: Difficulty;
  enemies: string[]; // Enemy template IDs
  playerSlots: number;
  enemySlots: number;
  rewards: {
    gold: number;
    experience: number;
    recruitChance: number;
  };
  unlockRequirement?: number; // Stage ID that must be completed
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
