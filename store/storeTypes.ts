import { GameState, ScreenType, PlayerData, CampaignProgress } from '@/types/progression.types';
import { Hero, Item, ItemInstance, Rarity } from '@/types/core.types';
import { AnyGridOccupant } from '@/types/grid.types';
import { BattleState } from '@/types/battle.types';

export interface RewardObject {
  goldEarned: number;
  gemsEarned: number;
  items: Array<{ id: string; name: string; rarity: Rarity; icon: string; value: number }>;
  breakdown?: {
    baseGold: number;
    waveMultiplier: number;
    wavesCompleted: number;
    medicalCosts: number;
    casualties: number;
    finalGold: number;
  };
}

export interface GameStore extends GameState {
  // Grid management
  gridOccupants: AnyGridOccupant[];
  updateGridOccupants: (occupants: AnyGridOccupant[]) => void;
  gridSize: { rows: number; cols: number };
  setGridSize: (rows: number, cols: number) => void;
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;

  // Navigation
  navigate: (screen: ScreenType) => number;

  // Campaign state
  selectedLocationId: string | null;
  setSelectedLocationId: (locationId: string | null) => void;
  selectedStageId: number | null;
  setSelectedStageId: (stageId: number | null) => void;

  // Pre-Battle state
  preBattleTeam: string[];
  heroFormation: { [heroId: string]: { row: number; col: number } };
  isFormationUserModified: boolean;
  formationWaveNumber: number;
  setPreBattleTeam: (heroIds: string[]) => void;
  addHeroToPreBattle: (heroId: string) => void;
  removeHeroFromPreBattle: (heroId: string) => void;
  setHeroFormation: (heroId: string, row: number, col: number) => void;
  clearHeroFormation: () => void;

  // Battle state
  currentBattle: BattleState | null;
  initialBattleTeam: string[];
  battleEventIndex: number;
  battleSpeed: number;
  setBattleSpeed: (speed: number) => void;
  startBattle: () => void;
  advanceBattleEvent: () => void;
  retreatFromBattle: () => void;
  startNextWave: () => void;

  // Reward Reveal state
  pendingRewards: RewardObject | null;
  setPendingRewards: (rewards: any) => void;

  // Player actions
  addGold: (amount: number) => void;
  spendGold: (amount: number) => boolean;
  addGems: (amount: number) => void;
  spendGems: (amount: number) => boolean;
  addExperience: (amount: number) => void;

  // Roster management
  addHero: (hero: Hero) => void;
  removeHero: (heroInstanceId: string) => void;
  updateHero: (heroInstanceId: string, updates: Partial<Hero>) => void;
  awardHeroExperience: (heroInstanceId: string, amount: number) => void;
  recalculateHeroStatsWithLevel: (heroInstanceId: string) => void;

  // Ability selection
  abilitySelectionHeroId: string | null;
  setAbilitySelectionHero: (heroId: string | null) => void;
  learnAbility: (heroInstanceId: string, abilityId: string) => void;

  // Level up choice system
  levelUpHeroId: string | null;
  levelUpQueue: string[];
  setLevelUpHero: (heroId: string | null) => void;
  addToLevelUpQueue: (heroId: string) => void;
  processNextLevelUp: () => void;
  applyLevelUpChoice: (heroId: string, choiceType: 'stat' | 'ability', data: any) => void;

  // Inventory management
  addItem: (item: Item) => void;
  removeItem: (itemId: string) => void;
  equipItem: (itemInstanceId: string, heroInstanceId: string) => boolean;
  unequipItem: (itemInstanceId: string) => void;
  recalculateHeroStats: (heroInstanceId: string) => void;
  sellItem: (itemInstanceId: string) => boolean;
  useConsumable: (itemInstanceId: string, heroInstanceId: string) => boolean;

  // Team selection
  setSelectedTeam: (heroInstanceIds: string[]) => void;
  addToTeam: (heroInstanceId: string) => void;
  removeFromTeam: (heroInstanceId: string) => void;

  // Campaign progression
  completeStage: (stageId: number) => void;
  completeLocation: (locationId: string) => void;
  unlockFeature: (featureName: string) => void;

  // Shop management
  shopItems: Item[];
  shopHeroes: Hero[];
  refreshShop: () => void;
  purchaseItem: (itemId: string) => boolean;
  purchaseHero: (heroId: string) => boolean;

  // Hero unlock system
  unlockedHeroIds: Set<string>;
  unlockHero: (heroId: string) => boolean;

  // Reset game
  resetGame: () => void;
}

export type StoreSet = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;
export type StoreGet = () => GameStore;
