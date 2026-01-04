import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameState, ScreenType, PlayerData, CampaignProgress } from '@/types/progression.types';
import { Hero, Item, ItemInstance } from '@/types/core.types';
import { AnyGridOccupant } from '@/types/grid.types';
import { createMainMenuLayout } from '@/screens/MainMenu/MainMenuLayout';
import { createLocationMapLayout } from '@/screens/LocationMap/LocationMapLayout';
import { createCampaignMapLayout } from '@/screens/CampaignMap/CampaignMapLayout';
import { createPreBattleLayout } from '@/screens/PreBattle/PreBattleLayout';
import { createFormationPreBattleLayout } from '@/screens/PreBattle/FormationPreBattleLayout';
import { createBattleLayout } from '@/screens/Battle/BattleLayout';
import { createHeroRosterLayout } from '@/screens/HeroRoster/HeroRosterLayout';
import { createHeroMenuLayout } from '@/screens/HeroMenu/HeroMenuLayout';
import { createShopLayout } from '@/screens/Shop/ShopLayout';
import { createAbilitySelectionLayout } from '@/screens/AbilitySelection/AbilitySelectionLayout';
import { createRewardRevealLayout } from '@/screens/RewardReveal/RewardRevealLayout';
import { createLevelUpChoiceLayout, generateLevelUpChoices } from '@/screens/LevelUpChoice/LevelUpChoiceLayout';
import { createBattleFormationLayout } from '@/screens/BattleInventory/BattleFormationLayout';
import { createHeroInstance, createEnemyInstance, getHeroGemCost, LEARNABLE_ABILITIES, HERO_LEARNABLE_ABILITIES } from '@/data/units';
import { getStageById, getNextUnlockedStage } from '@/data/stages';
import { getLocationByStageId } from '@/data/locations';
import { BattleSimulator, BattleState } from '@/systems/BattleSimulator';
import { DeterministicBattleSimulator, BattleAction } from '@/systems/DeterministicBattleSimulator';
import { DeterministicBattleSimulatorV2 } from '@/systems/DeterministicBattleSimulatorV2';
import { BattleAnimationPlayer } from '@/systems/BattleAnimationPlayer';
import { audioManager } from '@/utils/audioManager';
import { getRandomItems, ITEM_TEMPLATES } from '@/data/items';
import { HERO_TEMPLATES } from '@/data/units';
import { Rarity } from '@/types/core.types';
import { generateLoot } from '@/utils/lootGenerator';

interface GameStore extends GameState {
  // Grid management
  gridOccupants: AnyGridOccupant[];
  updateGridOccupants: (occupants: AnyGridOccupant[]) => void;
  gridSize: { rows: number; cols: number };
  setGridSize: (rows: number, cols: number) => void;
  zoomLevel: number; // 1.0 = normal, 0.75 = 75%, 0.5 = 50%
  setZoomLevel: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;

  // Navigation (now updates grid instead of changing screens, returns new occupant count)
  navigate: (screen: ScreenType) => number;

  // Campaign state
  selectedLocationId: string | null;
  setSelectedLocationId: (locationId: string | null) => void;
  selectedStageId: number | null;
  setSelectedStageId: (stageId: number | null) => void;

  // Pre-Battle state
  preBattleTeam: string[]; // Hero instance IDs for current battle
  heroFormation: { [heroId: string]: { row: number; col: number } }; // Hero positions on grid
  isFormationUserModified: boolean; // Whether user has manually modified the formation
  setPreBattleTeam: (heroIds: string[]) => void;
  addHeroToPreBattle: (heroId: string) => void;
  removeHeroFromPreBattle: (heroId: string) => void;
  setHeroFormation: (heroId: string, row: number, col: number) => void;
  clearHeroFormation: () => void;

  // Battle state
  currentBattle: BattleState | null;
  initialBattleTeam: string[]; // Heroes that started the battle (cannot add new ones mid-battle)
  battleEventIndex: number;
  battleSpeed: number; // Speed multiplier (1 = normal, 4 = 4x speed, 8 = 8x speed)
  setBattleSpeed: (speed: number) => void;
  startBattle: () => void;
  advanceBattleEvent: () => void;
  retreatFromBattle: () => void;

  // Deterministic Battle System
  useDeterministicBattle: boolean; // Flag to enable deterministic battle system V2

  // Reward Reveal state
  pendingRewards: {
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
  } | null;
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
  levelUpQueue: string[]; // Queue of heroes that need to make level up choices
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

const initialPlayerData: PlayerData = {
  gold: 500,
  gems: 50, // Starting gem allowance for 1-2 hero unlocks
  level: 1,
  experience: 0,
  maxExperience: 100,
};

const initialCampaignProgress: CampaignProgress = {
  currentStage: 1,
  maxStageReached: 1,
  stagesCompleted: new Set<number>(),
  locationsCompleted: new Set<string>(),
};

// Create starter heroes - IMPROVED EARLY GAME WITH 3 HEROES
// Provides basic team composition: Tank, DPS, Support
const starterHeroes = [
  createHeroInstance('quester', 1),      // Versatile fighter with learnable abilities
  createHeroInstance('blood_knight', 1), // Tank with lifesteal
  createHeroInstance('witch_hunter', 1), // Ranged DPS
];

const initialState = {
  player: initialPlayerData,
  roster: starterHeroes as Hero[],
  inventory: [] as ItemInstance[],
  campaign: initialCampaignProgress,
  unlockedFeatures: new Set<string>(['mainMenu', 'locationMap']),
  unlockedHeroIds: new Set<string>(['quester', 'blood_knight', 'witch_hunter']), // Starter heroes unlocked
  currentScreen: ScreenType.MainMenu,
  selectedTeam: [] as string[],
  gridOccupants: [] as AnyGridOccupant[],
  gridSize: { rows: 8, cols: 8 },
  zoomLevel: 1.0,
  selectedLocationId: null as string | null,
  selectedStageId: null as number | null,
  preBattleTeam: [] as string[],
  heroFormation: {} as { [heroId: string]: { row: number; col: number } },
  isFormationUserModified: false,
  currentBattle: null as BattleState | null,
  initialBattleTeam: [] as string[],
  battleEventIndex: 0,
  battleSpeed: 1,
  useDeterministicBattle: true, // Set to true to enable deterministic battle system V2
  pendingRewards: null,
  shopItems: [] as Item[],
  shopHeroes: [] as Hero[],
  abilitySelectionHeroId: null as string | null,
  levelUpHeroId: null as string | null,
  levelUpQueue: [] as string[], // Queue of heroes that need to make level up choices
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Grid management
      updateGridOccupants: (occupants: AnyGridOccupant[]) =>
        set({ gridOccupants: occupants }),

      setGridSize: (rows: number, cols: number) => {
        set({ gridSize: { rows, cols } });
      },

      setZoomLevel: (zoom: number) => {
        // Clamp zoom between 0.5 and 1.5
        const clampedZoom = Math.max(0.5, Math.min(1.5, zoom));
        set({ zoomLevel: clampedZoom });
      },

      zoomIn: () => {
        const state = get();
        const newZoom = Math.min(1.5, state.zoomLevel + 0.25);
        set({ zoomLevel: newZoom });
      },

      zoomOut: () => {
        const state = get();
        const newZoom = Math.max(0.5, state.zoomLevel - 0.25);
        set({ zoomLevel: newZoom });
      },

      resetZoom: () => {
        set({ zoomLevel: 1.0 });
      },

      // Navigation (updates grid occupants based on screen, returns new occupant count)
      navigate: (screen: ScreenType) => {
        const state = get();
        set({ currentScreen: screen });

        // Generate new grid occupants based on screen
        let newOccupants: AnyGridOccupant[] = [];

        if (screen === ScreenType.MainMenu) {
          newOccupants = createMainMenuLayout(
            state.player.gold,
            state.player.gems,
            state.player.level,
            state.navigate
          );
        } else if (screen === ScreenType.HeroRoster) {
          newOccupants = createHeroRosterLayout(
            state.roster,
            state.player.gold,
            state.player.gems,
            state.navigate
          );
        } else if (screen === ScreenType.HeroMenu) {
          // Create a recursive unlock callback that properly regenerates the layout
          const unlockCallback = (heroId: string, cost: number) => {
            if (state.unlockHero(heroId)) {
              // Get fresh state after unlock
              const freshState = get();

              // Refresh HeroMenu layout after unlock with proper callback
              const updatedOccupants = createHeroMenuLayout(
                freshState.player.gems,
                Array.from(freshState.unlockedHeroIds),
                unlockCallback, // Pass the same callback recursively
                freshState.navigate
              );
              set({ gridOccupants: updatedOccupants });
            }
          };

          newOccupants = createHeroMenuLayout(
            state.player.gems,
            Array.from(state.unlockedHeroIds),
            unlockCallback,
            state.navigate
          );
        } else if (screen === ScreenType.LocationMap) {
          newOccupants = createLocationMapLayout(
            state.campaign.stagesCompleted,
            state.navigate,
            state.setSelectedLocationId,
            state.selectedLocationId
          );
        } else if (screen === ScreenType.CampaignMap) {
          newOccupants = createCampaignMapLayout(
            state.campaign.stagesCompleted,
            state.navigate,
            state.setSelectedStageId,
            state.selectedStageId,
            state.selectedLocationId
          );
        } else if (screen === ScreenType.PreBattle && state.selectedStageId) {
          const stage = getStageById(state.selectedStageId);
          if (stage) {
            // Clean up orphaned hero IDs (heroes that are in preBattleTeam but not in roster)
            let validTeam = state.preBattleTeam.filter(heroId => {
              if (!heroId || heroId === '') return false;
              return state.roster.some(h => h.instanceId === heroId);
            });

            // Trim team to stage's player slot limit
            if (validTeam.length > stage.playerSlots) {
              console.warn(`[PreBattle] Team has ${validTeam.length} heroes but stage allows only ${stage.playerSlots}. Trimming team.`);
              validTeam = validTeam.slice(0, stage.playerSlots);
            }

            // Update team if it was modified
            if (validTeam.length !== state.preBattleTeam.filter(id => id && id !== '').length ||
                validTeam.length > stage.playerSlots) {
              console.warn('[PreBattle] Adjusted team size for stage requirements');
              set({ preBattleTeam: validTeam });
            }

            // Use formation-based pre-battle layout
            newOccupants = createFormationPreBattleLayout(
              stage,
              state.player.gems,
              validTeam,
              state.roster,
              state.heroFormation,
              state.navigate,
              (heroId: string, row: number, col: number) => {
                // Add to formation and team if not already in team
                const newFormation = { ...state.heroFormation };
                newFormation[heroId] = { row, col };
                set({ heroFormation: newFormation });

                // Add to preBattleTeam if not already in it
                if (!state.preBattleTeam.includes(heroId)) {
                  const newTeam = [...state.preBattleTeam, heroId];
                  set({ preBattleTeam: newTeam });
                  console.log(`[PreBattle] Added ${heroId} to team`);
                }

                state.navigate(ScreenType.PreBattle);
              },
              (heroId: string) => {
                // Remove from formation and team when clicked
                const newFormation = { ...state.heroFormation };
                delete newFormation[heroId];
                set({ heroFormation: newFormation });

                // Remove from preBattleTeam
                const newTeam = state.preBattleTeam.filter(id => id !== heroId);
                set({ preBattleTeam: newTeam });
                console.log(`[PreBattle] Removed ${heroId} from team`);

                state.navigate(ScreenType.PreBattle);
              },
              state.equipItem,
              state.startBattle,
              state.gridRows,
              state.gridCols
            );
          }
        } else if (screen === ScreenType.Battle && state.currentBattle) {
          newOccupants = createBattleLayout(
            state.currentBattle,
            state.battleEventIndex,
            state.advanceBattleEvent,
            state.battleSpeed,
            () => {
              // Cycle through 1x, 4x, and 8x speed
              const newSpeed = state.battleSpeed === 1 ? 4 : state.battleSpeed === 4 ? 8 : 1;
              state.setBattleSpeed(newSpeed);
            }
          );
        } else if (screen === ScreenType.Shop) {
          // Refresh shop items if empty
          if (state.shopItems.length === 0) {
            state.refreshShop();
          }

          newOccupants = createShopLayout(
            state.player.gold,
            state.player.gems,
            state.shopItems,
            state.shopHeroes,
            state.navigate,
            state.purchaseItem,
            state.purchaseHero,
            state.refreshShop
          );
        } else if (screen === ScreenType.AbilitySelection && state.abilitySelectionHeroId) {
          // Find the hero that needs to select an ability
          const hero = state.roster.find(h => h.instanceId === state.abilitySelectionHeroId);
          if (hero) {
            newOccupants = createAbilitySelectionLayout(
              hero,
              state.learnAbility
            );
          }
        } else if (screen === ScreenType.LevelUpChoice && state.levelUpHeroId) {
          // Find the hero that needs to make a level up choice
          const hero = state.roster.find(h => h.instanceId === state.levelUpHeroId);
          console.log('[Navigate LevelUpChoice] levelUpHeroId:', state.levelUpHeroId, 'hero found:', !!hero);
          if (hero) {
            const choices = generateLevelUpChoices(hero);
            console.log('[Navigate LevelUpChoice] Generated choices:', choices);
            newOccupants = createLevelUpChoiceLayout(
              hero,
              choices,
              (choice) => {
                // Apply the chosen upgrade
                if (choice.type === 'stat') {
                  state.applyLevelUpChoice(hero.instanceId, 'stat', choice.statBonus);
                } else if (choice.type === 'ability') {
                  state.applyLevelUpChoice(hero.instanceId, 'ability', { abilityId: choice.abilityId });
                }
                // After applying, process the next hero in queue
                state.processNextLevelUp();
              }
            );
            console.log('[Navigate LevelUpChoice] Created occupants:', newOccupants.length, 'items:', newOccupants.map(o => o.id));
          } else {
            console.error('[Navigate LevelUpChoice] Hero not found for ID:', state.levelUpHeroId);
          }
        } else if (screen === ScreenType.BattleInventory) {
          // Battle formation management screen (between waves)
          // Get heroes with their current battle HP if in battle
          let battleHeroes = state.preBattleTeam
            .map(heroId => state.roster.find(h => h.instanceId === heroId))
            .filter(h => h !== undefined) as Hero[];

          // Preserve user's formation if they have modified it, otherwise use current battle positions
          let currentFormation = {};

          // Debug: Check formation initialization conditions
          console.log('[BattleInventory] Formation initialization check:', {
            hasBattle: !!state.currentBattle,
            isUserModified: state.isFormationUserModified,
            hasExistingFormation: !!state.heroFormation && Object.keys(state.heroFormation).length > 0,
            formationKeys: Object.keys(state.heroFormation || {})
          });

          // Check if we need to initialize formation for the current wave
          // Formation UI manages the formation for the CURRENT wave (the one that just started)
          const currentWave = state.currentBattle?.currentWave || 1;
          const formationWaveKey = `wave_${currentWave}`;
          const isCurrentWaveFormation = state.heroFormation && state.heroFormation._waveKey === formationWaveKey;

          if (state.currentBattle && !isCurrentWaveFormation && !state.isFormationUserModified) {
            // Only initialize formation from battle state if user hasn't made custom changes
            // Simple approach: Just show where heroes currently are
            // The wave transition has already been applied when we enter the formation UI

            // Log all hero positions from the battle state for debugging
            console.log('[BattleInventory] === Hero Positions from Battle State ===');
            state.currentBattle.heroes.forEach(hero => {
              // Include heroes that are alive AND were part of the initial battle team
              // Dead heroes should not appear in formation for next wave
              if (state.initialBattleTeam.includes(hero.instanceId) && hero.isAlive) {
                const positionToSet = {
                  row: hero.position.row,
                  col: hero.position.col
                };
                currentFormation[hero.instanceId] = positionToSet;
                console.log(`[BattleInventory] Setting ${hero.name}: (${hero.position.row},${hero.position.col}) - ID: ${hero.instanceId} - Alive: ${hero.isAlive}`);
                console.log(`[BattleInventory] Verification - currentFormation[${hero.instanceId}]:`, currentFormation[hero.instanceId]);
              }
            });
            console.log('[BattleInventory] === End Battle State Positions ===');

            console.log('[BattleInventory] Formation initialized from current positions');

            // Set the formation state so future renders use the updated positions
            const formationWithWaveKey = { ...currentFormation, _waveKey: formationWaveKey };
            console.log('[BattleInventory] About to set heroFormation state:', formationWithWaveKey);
            set({
              heroFormation: formationWithWaveKey,
              isFormationUserModified: true // Mark as initialized - prevent re-initialization on subsequent renders
            });

            console.log('[BattleInventory] Set formation state to match battle positions');
            // Verify what was actually set
            const newState = get();
            console.log('[BattleInventory] Verification - state.heroFormation after set:', newState.heroFormation);
          } else if (state.heroFormation && state.isFormationUserModified) {
            // User has custom formation but wrong wave key - preserve the formation data with new key
            console.log('[BattleInventory] Preserving user custom formation with updated wave key');
            const existingFormation = { ...state.heroFormation };
            delete existingFormation._waveKey; // Remove old wave key
            currentFormation = existingFormation;

            // Update the wave key
            const formationWithWaveKey = { ...currentFormation, _waveKey: formationWaveKey };
            set({ heroFormation: formationWithWaveKey });
            console.log('[BattleInventory] Updated formation wave key from', state.heroFormation._waveKey, 'to', formationWaveKey);
          } else if (state.heroFormation) {
            console.log('[BattleInventory] Using existing formation from state');
            currentFormation = { ...state.heroFormation };
          } else {
            console.log('[BattleInventory] No formation available - this should not happen');
          }

          // Sync HP from battle state
          if (state.currentBattle) {
            battleHeroes = battleHeroes.map(hero => {
              const battleHero = state.currentBattle.heroes.find(h => h.instanceId === hero.instanceId);
              if (battleHero) {

                return {
                  ...hero,
                  currentStats: {
                    ...hero.currentStats,
                    hp: battleHero.stats.hp,
                    maxHp: battleHero.stats.maxHp
                  }
                };
              }
              return hero;
            });

            // Filter out dead heroes - only show heroes that are still alive for formation
            battleHeroes = battleHeroes.filter(hero => {
              const battleHero = state.currentBattle.heroes.find(h => h.instanceId === hero.instanceId);
              return battleHero && battleHero.isAlive;
            });
          }

          // Use the current formation data (either initialized or existing)
          const finalFormation = isCurrentWaveFormation ? state.heroFormation : currentFormation;
          console.log('[BattleInventory] Final formation source - isCurrentWaveFormation:', isCurrentWaveFormation, 'waveKey:', formationWaveKey);
          console.log('[BattleInventory] currentFormation:', currentFormation);
          console.log('[BattleInventory] state.heroFormation:', state.heroFormation);
          console.log('[BattleInventory] finalFormation (used for layout):', finalFormation);
          console.log('[BattleInventory] === Detailed Final Formation ===');
          Object.entries(finalFormation).forEach(([heroId, pos]) => {
            const heroName = state.roster.find(h => h.instanceId === heroId)?.name || 'Unknown';
            console.log(`[BattleInventory] ${heroName}: (${pos.row},${pos.col})`);
          });
          console.log('[BattleInventory] === End Detailed Final Formation ===');

          // Define callback functions
          const onHeroPositionChange = (heroId: string, row: number, col: number) => {
              // Only allow repositioning heroes that were part of the initial team
              if (!state.initialBattleTeam.includes(heroId)) {
                console.log(`[BattleInventory] Cannot add ${heroId} - not part of initial battle team`);
                return;
              }

              // The position we receive is the final display position where user wants hero
              // Store it directly since we're now tracking final positions
              const freshState = get();
              const newFormation = { ...freshState.heroFormation };
              newFormation[heroId] = { row, col };
              set({ heroFormation: newFormation });

              console.log(`[BattleInventory] Updated formation for ${heroId}: final position (${row}, ${col})`);

              // Mark that user has modified the formation
              set({ isFormationUserModified: true });

              // Check if this hero is being re-added to battle
              const isReturning = !state.preBattleTeam.includes(heroId);
              if (isReturning) {
                // Re-add hero to battle team (but don't change position yet)
                const newTeam = [...state.preBattleTeam, heroId];
                set({ preBattleTeam: newTeam });
                console.log(`[BattleInventory] Re-added ${heroId} to team - will join at wave transition`);
              }

              // Update the local formation reference and regenerate layout
              currentFormation = newFormation;

              // Regenerate the layout with the updated formation
              const updatedOccupants = createBattleFormationLayout(
                battleHeroes,
                state.roster,
                state.inventory,
                newFormation,
                state.initialBattleTeam,
                onHeroPositionChange, // Use the same callback
                onHeroRemove, // Use the same callback
                state.equipItem,
                state.unequipItem,
                state.useConsumable,
                onBackToLanding, // Use the same callback
                state.gridRows,
                state.gridCols
              );

              set({ gridOccupants: updatedOccupants });
          };

          const onHeroRemove = (heroId: string) => {
              // Remove from formation when clicked
              const newFormation = { ...currentFormation };
              delete newFormation[heroId];
              // Update both the current formation and the stored formation
              currentFormation = newFormation;
              set({ heroFormation: newFormation });

              // Remove from battle team
              const newTeam = state.preBattleTeam.filter(id => id !== heroId);
              set({ preBattleTeam: newTeam });
              console.log(`[BattleInventory] Removed ${heroId} from battle team`);

              // Remove from current battle if in progress
              if (state.currentBattle) {
                const index = state.currentBattle.heroes.findIndex(h => h.instanceId === heroId);
                if (index !== -1) {
                  const hero = state.currentBattle.heroes[index];
                  state.currentBattle.heroes.splice(index, 1);
                  console.log(`[BattleInventory] Removed ${hero.name} from current battle`);
                }
              }

              // The state update should trigger re-render automatically
              console.log('[BattleInventory] *** DRAG UPDATE - Formation updated ***');
              console.log(`[BattleInventory] Hero ${heroId} moved to (${row},${col})`);
          };

          const onBackToLanding = () => {
              console.log('[onBackToLanding] Called - checking formation data');

              // Get fresh state to ensure we're not working with stale data
              const freshState = get();
              console.log('[onBackToLanding] Fresh heroFormation state:', freshState.heroFormation);
              console.log('[onBackToLanding] Fresh isFormationUserModified:', freshState.isFormationUserModified);
              console.log('[onBackToLanding] State comparison:', {
                staleState: state.heroFormation,
                freshState: freshState.heroFormation,
                areEqual: JSON.stringify(state.heroFormation) === JSON.stringify(freshState.heroFormation)
              });

              // Recalculate hero stats after item changes
              battleHeroes.forEach(hero => {
                state.recalculateHeroStats(hero.instanceId);
              });

              // Update battle state with new hero stats if battle is ongoing
              if (state.currentBattle) {
                // Update hero stats in battle state
                state.currentBattle.heroes.forEach(battleHero => {
                  const updatedHero = state.roster.find(h => h.instanceId === battleHero.instanceId);
                  if (updatedHero) {
                    // Update stats while preserving current HP ratio
                    const hpRatio = battleHero.stats.hp / battleHero.stats.maxHp;
                    battleHero.stats = { ...updatedHero.currentStats };
                    battleHero.stats.hp = Math.floor(battleHero.stats.maxHp * hpRatio);

                    // Also update position if it changed - use fresh state
                    const newPosition = freshState.heroFormation[battleHero.instanceId];
                    console.log(`[onBackToLanding] ${battleHero.name}: checking position update`);
                    console.log(`[onBackToLanding]   - Current position: (${battleHero.position.row},${battleHero.position.col})`);
                    console.log(`[onBackToLanding]   - Formation position:`, newPosition);
                    if (newPosition) {
                      const oldPosition = { ...battleHero.position };
                      (battleHero as any).position = newPosition;
                      console.log(`[onBackToLanding] ✅ Updated ${battleHero.name} position from (${oldPosition.row},${oldPosition.col}) to (${newPosition.row},${newPosition.col})`);
                    } else {
                      console.log(`[onBackToLanding] ❌ No formation position found for ${battleHero.name}`);
                    }
                  }
                });
              }

              // Apply formation changes to current battle state
              if (freshState.isFormationUserModified && freshState.currentBattle) {
                console.log('[onBackToLanding] Applying formation changes to battle state');

                // Apply formation changes directly to current battle heroes
                freshState.currentBattle.heroes.forEach(battleHero => {
                  const formationPos = freshState.heroFormation[battleHero.instanceId];
                  if (formationPos) {
                    const oldPos = { ...battleHero.position };
                    battleHero.position = { ...formationPos };
                    console.log(`[onBackToLanding] Applied formation: ${battleHero.name} moved from (${oldPos.row},${oldPos.col}) to (${formationPos.row},${formationPos.col})`);
                  }
                });

                // Mark formation as applied in upcoming wave transition events
                // This ensures the animation system uses the custom positions
                const currentEventIndex = freshState.battleEventIndex;
                const upcomingEvents = freshState.currentBattle.events.slice(currentEventIndex);
                const nextWaveTransition = upcomingEvents.find(e => e.type === 'waveTransition');
                if (nextWaveTransition && nextWaveTransition.data) {
                  nextWaveTransition.data.customFormationApplied = true;
                  console.log('[onBackToLanding] Marked next wave transition with custom formation applied');
                }

                // Clear formation modification flag
                set({ isFormationUserModified: false });

                console.log('[onBackToLanding] Formation changes applied successfully');
              }

              // Go back to battle with updated formation
              state.navigate(ScreenType.Battle);
          };

          // Final check - log the exact formation data being passed to layout
          console.log('[BattleInventory] *** FINAL CHECK - Formation passed to layout ***');
          Object.entries(finalFormation).forEach(([heroId, pos]) => {
            const heroName = state.roster.find(h => h.instanceId === heroId)?.name || 'Unknown';
            console.log(`[BattleInventory] FINAL: ${heroName} at (${pos.row},${pos.col})`);
          });

          newOccupants = createBattleFormationLayout(
            battleHeroes,
            state.roster,
            state.inventory,
            finalFormation,
            state.initialBattleTeam,
            onHeroPositionChange,
            onHeroRemove,
            state.equipItem,
            state.unequipItem,
            state.useConsumable,
            onBackToLanding,
            state.gridRows,
            state.gridCols
          );
        } else if (screen === ScreenType.RewardReveal && state.pendingRewards) {
          // Reward reveal screen - This will be managed by useRewardReveal hook
          // Just return empty occupants for now - the hook will populate them
          newOccupants = [];
        }

        set({ gridOccupants: newOccupants });

        // Return the count of new occupants
        return newOccupants.length;
      },

      // Campaign state
      setSelectedLocationId: (locationId: string | null) => {
        set({ selectedLocationId: locationId });
      },

      setSelectedStageId: (stageId: number | null) => {
        const state = get();
        console.log('setSelectedStageId called with:', stageId);
        set({ selectedStageId: stageId });

        // Regenerate campaign map with new selected stage
        const newOccupants = createCampaignMapLayout(
          state.campaign.stagesCompleted,
          state.navigate,
          state.setSelectedStageId,
          stageId,
          state.selectedLocationId
        );

        set({ gridOccupants: newOccupants });
      },

      // Player actions
      addGold: (amount: number) =>
        set((state) => ({
          player: { ...state.player, gold: state.player.gold + amount },
        })),

      spendGold: (amount: number) => {
        const state = get();
        if (state.player.gold >= amount) {
          set({
            player: { ...state.player, gold: state.player.gold - amount },
          });
          return true;
        }
        return false;
      },

      addGems: (amount: number) =>
        set((state) => ({
          player: { ...state.player, gems: state.player.gems + amount },
        })),

      spendGems: (amount: number) => {
        const state = get();
        if (state.player.gems >= amount) {
          set({
            player: { ...state.player, gems: state.player.gems - amount },
          });
          return true;
        }
        return false;
      },

      addExperience: (amount: number) =>
        set((state) => {
          let newExp = state.player.experience + amount;
          let newLevel = state.player.level;
          let maxExp = state.player.maxExperience;

          // Level up logic
          while (newExp >= maxExp) {
            newExp -= maxExp;
            newLevel++;
            maxExp = Math.floor(maxExp * 1.5); // Exponential scaling
          }

          return {
            player: {
              ...state.player,
              experience: newExp,
              level: newLevel,
              maxExperience: maxExp,
            },
          };
        }),

      // Roster management
      addHero: (hero: Hero) => {
        set((state) => ({
          roster: [...state.roster, hero],
        }));
        // Recalculate stats for the new hero to ensure level bonuses are applied
        const state = get();
        state.recalculateHeroStatsWithLevel(hero.instanceId);
      },

      removeHero: (heroInstanceId: string) =>
        set((state) => ({
          roster: state.roster.filter((h) => h.instanceId !== heroInstanceId),
          selectedTeam: state.selectedTeam.filter((id) => id !== heroInstanceId),
        })),

      updateHero: (heroInstanceId: string, updates: Partial<Hero>) =>
        set((state) => ({
          roster: state.roster.map((h) =>
            h.instanceId === heroInstanceId ? { ...h, ...updates } : h
          ),
        })),

      awardHeroExperience: (heroInstanceId: string, amount: number) => {
        const state = get();
        const hero = state.roster.find(h => h.instanceId === heroInstanceId);
        if (!hero) return;

        const originalLevel = hero.level;
        const hadNoAbilities = hero.abilities.length === 0;
        let newExp = hero.experience + amount;
        let newLevel = hero.level;
        let maxExp = hero.maxExperience;
        let didLevelUp = false;

        // Level up logic - loop in case hero levels up multiple times
        while (newExp >= maxExp) {
          newExp -= maxExp;
          newLevel++;
          maxExp = Math.floor(100 * Math.pow(1.5, newLevel - 1));
          console.log(`${hero.name} leveled up to level ${newLevel}!`);
          didLevelUp = true;
        }

        // Update hero with new level and experience
        state.updateHero(heroInstanceId, {
          experience: newExp,
          level: newLevel,
          maxExperience: maxExp,
        });

        // Recalculate stats if level changed
        if (newLevel !== originalLevel) {
          state.recalculateHeroStatsWithLevel(heroInstanceId);
        }

        // Check if hero leveled up and needs to make a choice
        if (didLevelUp) {
          console.log(`${hero.name} leveled up to level ${newLevel}! Adding to level up queue...`);
          // Add the hero to level up queue
          state.addToLevelUpQueue(heroInstanceId);
        }
      },

      recalculateHeroStatsWithLevel: (heroInstanceId: string) => {
        const state = get();
        const hero = state.roster.find(h => h.instanceId === heroInstanceId);
        if (!hero) return;

        // Start with base stats and apply level-based growth
        let newStats = { ...hero.baseStats };

        // Apply stat growth for each level above 1
        const levelsGained = hero.level - 1;
        if (levelsGained > 0 && hero.statGrowth) {
          newStats.hp += hero.statGrowth.hp * levelsGained;
          newStats.maxHp += hero.statGrowth.hp * levelsGained;
          newStats.damage += hero.statGrowth.damage * levelsGained;
          newStats.speed += hero.statGrowth.speed * levelsGained;
          newStats.defense += hero.statGrowth.defense * levelsGained;
          newStats.critChance += hero.statGrowth.critChance * levelsGained;
          newStats.critDamage += hero.statGrowth.critDamage * levelsGained;
          newStats.evasion += hero.statGrowth.evasion * levelsGained;
          newStats.accuracy += hero.statGrowth.accuracy * levelsGained;

          if (hero.statGrowth.penetration) {
            newStats.penetration = (newStats.penetration || 0) + hero.statGrowth.penetration * levelsGained;
          }
          if (hero.statGrowth.lifesteal) {
            newStats.lifesteal = (newStats.lifesteal || 0) + hero.statGrowth.lifesteal * levelsGained;
          }
        }

        // Apply equipped item effects on top of level-based stats
        if (hero.equippedItem) {
          const item = state.inventory.find(i => i.instanceId === hero.equippedItem);
          if (item) {
            item.effects.forEach(effect => {
              const currentValue = newStats[effect.stat] as number;
              if (effect.type === 'add') {
                newStats[effect.stat] = (currentValue + effect.value) as any;
              } else if (effect.type === 'multiply') {
                newStats[effect.stat] = (currentValue * effect.value) as any;
              }
            });
          }
        }

        // Update hero with new stats
        state.updateHero(heroInstanceId, { currentStats: newStats });
      },

      // Inventory management
      addItem: (item: Item) => {
        const itemInstance: ItemInstance = {
          ...item,
          instanceId: `${item.id}_${Date.now()}_${Math.random()}`,
          equippedTo: undefined,
          durability: item.maxDurability, // Initialize durability to max if item has durability
        };
        set((state) => ({
          inventory: [...state.inventory, itemInstance],
        }));
      },

      removeItem: (itemInstanceId: string) =>
        set((state) => ({
          inventory: state.inventory.filter((i) => i.instanceId !== itemInstanceId),
        })),

      equipItem: (itemInstanceId: string, heroInstanceId: string) => {
        const state = get();
        const item = state.inventory.find(i => i.instanceId === itemInstanceId);
        const hero = state.roster.find(h => h.instanceId === heroInstanceId);

        console.log('[equipItem] Called with:', { itemInstanceId, heroInstanceId });
        console.log('[equipItem] Found item:', item);
        console.log('[equipItem] Found hero:', hero);

        if (!item || !hero) {
          console.error('[equipItem] Item or hero not found');
          return false;
        }

        // Check if item is already equipped to someone else
        if (item.equippedTo && item.equippedTo !== heroInstanceId) {
          console.log('[equipItem] Item is equipped to another hero, unequipping first');
          state.unequipItem(itemInstanceId);
        }

        // Check if hero already has an item equipped
        if (hero.equippedItem && hero.equippedItem !== itemInstanceId) {
          console.log('[equipItem] Hero has another item equipped, unequipping first');
          // Unequip current item first
          state.unequipItem(hero.equippedItem);
        }

        // Equip new item
        set((state) => ({
          inventory: state.inventory.map(i =>
            i.instanceId === itemInstanceId
              ? { ...i, equippedTo: heroInstanceId }
              : i
          ),
          roster: state.roster.map(h =>
            h.instanceId === heroInstanceId
              ? { ...h, equippedItem: itemInstanceId }
              : h
          ),
        }));

        // Recalculate hero stats with new item
        state.recalculateHeroStats(heroInstanceId);

        console.log('[equipItem] Successfully equipped', item.name, 'to', hero.name);

        // Refresh the screen to show updated equipment
        const currentState = get();
        if (currentState.currentScreen === ScreenType.BattleInventory) {
          currentState.navigate(currentState.currentScreen);
        }

        // If item is consumable, remove it from inventory after equipping
        if (item.consumable) {
          setTimeout(() => {
            state.removeItem(itemInstanceId);
          }, 100);
        }

        return true;
      },

      sellItem: (itemInstanceId: string) => {
        const state = get();
        const item = state.inventory.find(i => i.instanceId === itemInstanceId);

        if (!item || item.equippedTo) {
          // Can't sell equipped items
          return false;
        }

        // Calculate sell price based on rarity
        const sellPrices: Record<string, number> = {
          common: 25,
          uncommon: 50,
          rare: 100,
          epic: 200,
          legendary: 400,
          mythic: 800,
        };

        const sellPrice = sellPrices[item.rarity] || 25;

        // Add gold and remove item
        set((state) => ({
          player: {
            ...state.player,
            gold: state.player.gold + sellPrice,
          },
          inventory: state.inventory.filter(i => i.instanceId !== itemInstanceId),
        }));

        return true;
      },

      useConsumable: (itemInstanceId: string, heroInstanceId: string) => {
        const state = get();
        const item = state.inventory.find(i => i.instanceId === itemInstanceId);
        const hero = state.roster.find(h => h.instanceId === heroInstanceId);

        console.log('[useConsumable] Starting:', { itemInstanceId, heroInstanceId });
        console.log('[useConsumable] Found item:', item);
        console.log('[useConsumable] Found hero:', hero);

        if (!item || !hero) {
          console.error('[useConsumable] Item or hero not found');
          return false;
        }

        // Check if item is consumable - items already have all the data, don't need to look up in ITEM_TEMPLATES
        if (item.type !== 'consumable' && item.category !== 4) {
          console.error('[useConsumable] Item is not consumable:', item);
          return false;
        }

        // Apply consumable effect based on item id
        let effectApplied = false;
        const itemId = item.id;
        console.log('[useConsumable] Applying effect for item ID:', itemId);

        switch (itemId) {
          case 'health_potion_small':
            hero.currentStats.hp = Math.min(hero.currentStats.hp + 50, hero.currentStats.maxHp);
            effectApplied = true;
            break;

          case 'health_potion_medium':
            hero.currentStats.hp = Math.min(hero.currentStats.hp + 100, hero.currentStats.maxHp);
            effectApplied = true;
            break;

          case 'health_potion_large':
            hero.currentStats.hp = Math.min(hero.currentStats.hp + 200, hero.currentStats.maxHp);
            effectApplied = true;
            break;

          case 'mana_potion_small':
            // Reduce ability cooldowns by 50%
            if (hero.abilities) {
              hero.abilities.forEach(ability => {
                if (ability.currentCooldown) {
                  ability.currentCooldown = Math.floor(ability.currentCooldown * 0.5);
                }
              });
            }
            effectApplied = true;
            break;

          case 'antidote':
            // Remove poison/debuff effects
            if (hero.statusEffects) {
              hero.statusEffects = hero.statusEffects.filter(
                effect => effect.type !== 'poison' && effect.type !== 'debuff'
              );
            }
            effectApplied = true;
            break;

          case 'strength_potion':
            // Temporary 50% attack boost for next battle
            hero.tempBuffs = hero.tempBuffs || [];
            hero.tempBuffs.push({ stat: 'attack', value: 0.50, duration: 1 });
            effectApplied = true;
            break;

          case 'speed_potion':
            // Temporary 30% speed boost for next battle
            hero.tempBuffs = hero.tempBuffs || [];
            hero.tempBuffs.push({ stat: 'speed', value: 0.30, duration: 1 });
            effectApplied = true;
            break;

          case 'defense_potion':
            // Temporary +20 defense for next battle
            hero.tempBuffs = hero.tempBuffs || [];
            hero.tempBuffs.push({ stat: 'defense', value: 20, duration: 1, absolute: true });
            effectApplied = true;
            break;

          case 'regeneration_potion':
            // Heal 20 HP per second during next wave
            hero.regenEffect = { healPerSecond: 20, duration: 'nextWave' };
            effectApplied = true;
            break;

          case 'berserker_elixir':
            // Double damage but halve defense for next battle
            hero.tempBuffs = hero.tempBuffs || [];
            hero.tempBuffs.push({ stat: 'damage', value: 1.0, duration: 1 });
            hero.tempBuffs.push({ stat: 'defense', value: -0.50, duration: 1 });
            effectApplied = true;
            break;

          case 'invisibility_potion':
            // Cannot be targeted for first 5 seconds
            hero.invisibilityDuration = 5;
            effectApplied = true;
            break;

          case 'cleansing_elixir':
            // Remove all debuffs and grant immunity
            if (hero.statusEffects) {
              hero.statusEffects = hero.statusEffects.filter(effect => effect.type === 'buff');
            }
            hero.debuffImmunity = { duration: 3 };
            effectApplied = true;
            break;

          case 'full_restore':
            // Full HP
            hero.currentStats.hp = hero.currentStats.maxHp;
            effectApplied = true;
            break;

          case 'group_heal_elixir':
            // Heal all heroes for 150 HP
            state.roster.forEach(h => {
              if (h.currentStats.hp > 0) {
                h.currentStats.hp = Math.min(h.currentStats.hp + 150, h.currentStats.maxHp);
              }
            });
            effectApplied = true;
            break;

          case 'titan_brew':
            // +25% all stats for next battle
            hero.tempBuffs = hero.tempBuffs || [];
            hero.tempBuffs.push({ stat: 'damage', value: 0.25, duration: 1 });
            hero.tempBuffs.push({ stat: 'defense', value: 0.25, duration: 1 });
            hero.tempBuffs.push({ stat: 'speed', value: 0.25, duration: 1 });
            hero.tempBuffs.push({ stat: 'hp', value: 0.25, duration: 1 });
            effectApplied = true;
            break;

          case 'chrono_elixir':
            // Reset all ability cooldowns
            if (hero.abilities) {
              hero.abilities.forEach(ability => {
                ability.currentCooldown = 0;
              });
            }
            effectApplied = true;
            break;

          case 'phoenix_tears':
            // Resurrect if dead or heal to full if alive
            if (hero.currentStats.hp <= 0 || hero.isDefeated) {
              hero.currentStats.hp = hero.currentStats.maxHp;
              hero.isDefeated = false;
            } else {
              hero.currentStats.hp = hero.currentStats.maxHp;
            }
            effectApplied = true;
            break;

          case 'divine_protection':
            // Invulnerable for next wave
            hero.invulnerableForWave = true;
            effectApplied = true;
            break;

          case 'miracle_elixir':
            // Fully heal all heroes and reset all cooldowns
            state.roster.forEach(h => {
              h.currentStats.hp = h.currentStats.maxHp;
              if (h.abilities) {
                h.abilities.forEach(ability => {
                  ability.currentCooldown = 0;
                });
              }
            });
            effectApplied = true;
            break;

          default:
            console.warn(`[useConsumable] Unknown consumable item ID: ${itemId}`);
            // Try to apply basic healing if it has HP effect
            if (item.effects && item.effects.length > 0) {
              const hpEffect = item.effects.find(e => e.stat === 'hp');
              if (hpEffect && hpEffect.type === 'add') {
                hero.currentStats.hp = Math.min(hero.currentStats.hp + hpEffect.value, hero.currentStats.maxHp);
                effectApplied = true;
                console.log(`[useConsumable] Applied generic HP effect: +${hpEffect.value}`);
              }
            }
            break;
        }

        if (effectApplied) {
          // Remove consumable from inventory and update roster
          set((state) => {
            const updatedState: any = {
              inventory: state.inventory.filter(i => i.instanceId !== itemInstanceId),
              roster: state.roster // Update roster with modified heroes
            };

            // If in battle, also update the battle state
            if (state.currentBattle) {
              const battleHero = state.currentBattle.heroes.find(h => h.instanceId === heroInstanceId);
              if (battleHero) {
                // Update the battle hero's HP to match what we just set
                battleHero.stats.hp = hero.currentStats.hp;
                battleHero.stats.maxHp = hero.currentStats.maxHp;
                console.log(`[useConsumable] Updated battle hero ${battleHero.name} HP to ${battleHero.stats.hp}/${battleHero.stats.maxHp}`);
              }
              updatedState.currentBattle = state.currentBattle;
            }

            return updatedState;
          });

          console.log(`Used ${item.name} on ${hero.name}`);

          // Refresh the screen to show updated HP
          const currentState = get();
          currentState.navigate(currentState.currentScreen);

          return true;
        }

        return false;
      },

      unequipItem: (itemInstanceId: string) => {
        const state = get();
        const item = state.inventory.find(i => i.instanceId === itemInstanceId);
        if (!item || !item.equippedTo) return;

        const heroId = item.equippedTo;

        set((state) => ({
          inventory: state.inventory.map(i =>
            i.instanceId === itemInstanceId
              ? { ...i, equippedTo: undefined }
              : i
          ),
          roster: state.roster.map(h =>
            h.instanceId === heroId
              ? { ...h, equippedItem: undefined }
              : h
          ),
        }));

        // Recalculate hero stats without item
        state.recalculateHeroStats(heroId);
      },

      recalculateHeroStats: (heroInstanceId: string) => {
        const state = get();
        // Use the level-aware recalculation function
        state.recalculateHeroStatsWithLevel(heroInstanceId);
      },

      // Ability selection
      setAbilitySelectionHero: (heroId: string | null) => {
        set({ abilitySelectionHeroId: heroId });

        // Navigate to ability selection screen if heroId is provided
        if (heroId) {
          // IMPORTANT: Clear battle state and reset speed immediately
          // This prevents any auto-advance logic from interfering
          set({
            currentBattle: null,
            battleEventIndex: 0,
            battleSpeed: 1, // Reset speed to 1x for ability selection
          });

          const state = get();
          state.navigate(ScreenType.AbilitySelection);
        }
      },

      learnAbility: (heroInstanceId: string, abilityId: string) => {
        const state = get();
        const hero = state.roster.find(h => h.instanceId === heroInstanceId);

        if (!hero) {
          console.error('Hero not found:', heroInstanceId);
          return;
        }

        // Check if ability exists in learnable abilities
        const ability = LEARNABLE_ABILITIES[abilityId];
        if (!ability) {
          console.error('Ability not found:', abilityId);
          return;
        }

        // Check if hero can learn this ability
        const learnableAbilities = HERO_LEARNABLE_ABILITIES[hero.id];
        if (!learnableAbilities || !learnableAbilities.includes(abilityId)) {
          console.error(`${hero.name} cannot learn ${abilityId}`);
          return;
        }

        // Add ability to hero's abilities array
        // Deep copy the ability to ensure all properties (including range) are copied
        const copiedAbility = {
          id: ability.id,
          name: ability.name,
          type: ability.type,
          description: ability.description,
          cooldown: ability.cooldown,
          currentCooldown: ability.currentCooldown,
          range: ability.range, // Explicitly copy range
          effects: ability.effects.map(e => ({ ...e })), // Deep copy effects
          animationType: ability.animationType,
        };
        const updatedAbilities = [...hero.abilities, copiedAbility];
        state.updateHero(heroInstanceId, { abilities: updatedAbilities });

        console.log(`${hero.name} learned ${ability.name}!`);

        // Clear ability selection state
        set({ abilitySelectionHeroId: null });

        // Get fresh state after updates to ensure we use the updated roster
        const freshState = get();

        // Navigate back to PreBattle screen if we have a selectedStageId, otherwise go to LocationMap
        if (freshState.selectedStageId) {
          freshState.navigate(ScreenType.PreBattle);
        } else {
          freshState.navigate(ScreenType.LocationMap);
        }
      },

      // Level up choice system
      setLevelUpHero: (heroId: string | null) => {
        set({ levelUpHeroId: heroId });

        // Navigate to level up choice screen if heroId is provided
        if (heroId) {
          const state = get();
          console.log(`[Level Up] Hero ${heroId} needs to choose an upgrade`);
          state.navigate(ScreenType.LevelUpChoice);
        }
      },

      addToLevelUpQueue: (heroId: string) => {
        set((state) => {
          // Only add if not already in queue
          if (!state.levelUpQueue.includes(heroId)) {
            console.log(`[Level Up Queue] Adding hero ${heroId} to level up queue`);
            return { levelUpQueue: [...state.levelUpQueue, heroId] };
          }
          return state;
        });
      },

      processNextLevelUp: () => {
        const state = get();
        if (state.levelUpQueue.length > 0) {
          const nextHeroId = state.levelUpQueue[0];
          console.log(`[Level Up Queue] Processing level up for hero ${nextHeroId}`);

          // Remove from queue and set as current level up hero
          set((s) => ({
            levelUpQueue: s.levelUpQueue.slice(1),
            levelUpHeroId: nextHeroId
          }));

          // Use fresh state after the set operation
          setTimeout(() => {
            const freshState = get();
            console.log('[Level Up Queue] Navigating to LevelUpChoice, levelUpHeroId:', freshState.levelUpHeroId);
            freshState.navigate(ScreenType.LevelUpChoice);
          }, 0);
        } else {
          console.log('[Level Up Queue] No more heroes to level up, returning to location map');
          // No more heroes to level up, return to location map
          state.navigate(ScreenType.LocationMap);
        }
      },

      applyLevelUpChoice: (heroId: string, choiceType: 'stat' | 'ability', data: any) => {
        const state = get();
        const hero = state.roster.find(h => h.instanceId === heroId);

        if (!hero) {
          console.error('[applyLevelUpChoice] Hero not found:', heroId);
          return;
        }

        if (choiceType === 'stat') {
          // Apply stat bonuses
          const statBonus = data as {
            hp?: number;
            damage?: number;
            defense?: number;
            speed?: number;
            critChance?: number;
            critDamage?: number;
          };

          const updatedStats = { ...hero.currentStats };
          const updatedBaseStats = { ...hero.baseStats };

          if (statBonus.hp) {
            updatedStats.hp += statBonus.hp;
            updatedStats.maxHp += statBonus.hp;
            updatedBaseStats.hp += statBonus.hp;
            updatedBaseStats.maxHp += statBonus.hp;
          }
          if (statBonus.damage) {
            updatedStats.damage += statBonus.damage;
            updatedBaseStats.damage += statBonus.damage;
          }
          if (statBonus.defense) {
            updatedStats.defense += statBonus.defense;
            updatedBaseStats.defense += statBonus.defense;
          }
          if (statBonus.speed) {
            updatedStats.speed += statBonus.speed;
            updatedBaseStats.speed += statBonus.speed;
          }
          if (statBonus.critChance) {
            updatedStats.critChance = Math.min(1, updatedStats.critChance + statBonus.critChance);
            updatedBaseStats.critChance = Math.min(1, updatedBaseStats.critChance + statBonus.critChance);
          }
          if (statBonus.critDamage) {
            updatedStats.critDamage += statBonus.critDamage;
            updatedBaseStats.critDamage += statBonus.critDamage;
          }

          state.updateHero(heroId, {
            currentStats: updatedStats,
            baseStats: updatedBaseStats
          });

          console.log(`[Level Up] ${hero.name} chose stat upgrade:`, statBonus);
        } else if (choiceType === 'ability') {
          // Learn the chosen ability
          const abilityId = data.abilityId;
          if (abilityId) {
            state.learnAbility(heroId, abilityId);
            console.log(`[Level Up] ${hero.name} learned ability: ${abilityId}`);
          }
        }

        // Clear level up state
        set({ levelUpHeroId: null });
      },

      // Team selection
      setSelectedTeam: (heroInstanceIds: string[]) =>
        set({ selectedTeam: heroInstanceIds }),

      addToTeam: (heroInstanceId: string) =>
        set((state) => {
          if (state.selectedTeam.includes(heroInstanceId)) {
            return state;
          }
          return {
            selectedTeam: [...state.selectedTeam, heroInstanceId],
          };
        }),

      removeFromTeam: (heroInstanceId: string) =>
        set((state) => ({
          selectedTeam: state.selectedTeam.filter((id) => id !== heroInstanceId),
        })),

      // Campaign progression
      completeStage: (stageId: number) =>
        set((state) => {
          const newStagesCompleted = new Set(state.campaign.stagesCompleted);
          newStagesCompleted.add(stageId);

          return {
            campaign: {
              ...state.campaign,
              stagesCompleted: newStagesCompleted,
              maxStageReached: Math.max(state.campaign.maxStageReached, stageId + 1),
              currentStage: stageId + 1,
            },
          };
        }),

      completeLocation: (locationId: string) =>
        set((state) => {
          const newLocationsCompleted = new Set(state.campaign.locationsCompleted);
          newLocationsCompleted.add(locationId);

          return {
            campaign: {
              ...state.campaign,
              locationsCompleted: newLocationsCompleted,
            },
          };
        }),

      unlockFeature: (featureName: string) =>
        set((state) => {
          const newUnlockedFeatures = new Set(state.unlockedFeatures);
          newUnlockedFeatures.add(featureName);
          return { unlockedFeatures: newUnlockedFeatures };
        }),

      // Battle speed control
      setBattleSpeed: (speed: number) => set({ battleSpeed: speed }),

      // Reward Reveal management
      setPendingRewards: (rewards: any) => set({ pendingRewards: rewards }),

      // Pre-Battle team management
      setPreBattleTeam: (heroIds: string[]) => {
        const state = get();

        // Validate team size against stage limit if we have a selected stage
        let validatedTeam = heroIds;
        if (state.selectedStageId) {
          const stage = getStageById(state.selectedStageId);
          if (stage && heroIds.length > stage.playerSlots) {
            console.warn(`[setPreBattleTeam] Team size ${heroIds.length} exceeds stage limit ${stage.playerSlots}. Trimming.`);
            validatedTeam = heroIds.slice(0, stage.playerSlots);
          }
        }

        set({ preBattleTeam: validatedTeam });

        // Regenerate Pre-Battle layout with new team
        if (state.currentScreen === ScreenType.PreBattle && state.selectedStageId) {
          const stage = getStageById(state.selectedStageId);
          if (stage) {
            // Temporarily disable card animations for smooth update
            (window as any).__disableCardAnimations = true;

            const newOccupants = createPreBattleLayout(
              stage,
              state.player.gold,
              state.player.gems,
              heroIds,
              state.roster,
              state.navigate,
              state.addHeroToPreBattle,
              state.removeHeroFromPreBattle,
              state.startBattle,
              state.setPreBattleTeam,
              state.equipItem
            );
            set({ gridOccupants: newOccupants });

            // Re-enable animations after a brief delay
            setTimeout(() => {
              (window as any).__disableCardAnimations = false;
            }, 50);
          }
        }
      },

      addHeroToPreBattle: (heroId: string) => {
        const state = get();
        // Check if hero is already in team (ignoring empty slots)
        const filledSlots = state.preBattleTeam.filter(id => id && id !== '');
        if (filledSlots.includes(heroId)) {
          return;
        }

        const newTeam = [...state.preBattleTeam, heroId];
        set({ preBattleTeam: newTeam });

        // Regenerate Pre-Battle layout with new team
        if (state.currentScreen === ScreenType.PreBattle && state.selectedStageId) {
          const stage = getStageById(state.selectedStageId);
          if (stage) {
            // Temporarily disable card animations for smooth update
            (window as any).__disableCardAnimations = true;

            const newOccupants = createPreBattleLayout(
              stage,
              state.player.gold,
              state.player.gems,
              newTeam,
              state.roster,
              state.navigate,
              state.addHeroToPreBattle,
              state.removeHeroFromPreBattle,
              state.startBattle,
              state.setPreBattleTeam,
              state.equipItem
            );
            set({ gridOccupants: newOccupants });

            // Re-enable animations after a brief delay
            setTimeout(() => {
              (window as any).__disableCardAnimations = false;
            }, 50);
          }
        }
      },

      removeHeroFromPreBattle: (heroId: string) => {
        const state = get();
        const newTeam = state.preBattleTeam.filter((id) => id !== heroId);
        set({ preBattleTeam: newTeam });

        // Regenerate Pre-Battle layout with new team
        if (state.currentScreen === ScreenType.PreBattle && state.selectedStageId) {
          const stage = getStageById(state.selectedStageId);
          if (stage) {
            // Temporarily disable card animations for smooth update
            (window as any).__disableCardAnimations = true;

            const newOccupants = createPreBattleLayout(
              stage,
              state.player.gold,
              state.player.gems,
              newTeam,
              state.roster,
              state.navigate,
              state.addHeroToPreBattle,
              state.removeHeroFromPreBattle,
              state.startBattle,
              state.setPreBattleTeam,
              state.equipItem
            );
            set({ gridOccupants: newOccupants });

            // Re-enable animations after a brief delay
            setTimeout(() => {
              (window as any).__disableCardAnimations = false;
            }, 50);
          }
        }
      },

      setHeroFormation: (heroId: string, row: number, col: number) => {
        const state = get();

        // Add hero to team if not already there
        if (!state.preBattleTeam.includes(heroId)) {
          const newTeam = [...state.preBattleTeam, heroId];
          set({ preBattleTeam: newTeam });
        }

        // Update formation position
        const newFormation = {
          ...state.heroFormation,
          [heroId]: { row, col }
        };

        // Check if another hero is at this position and swap if needed
        Object.entries(state.heroFormation).forEach(([otherId, pos]) => {
          if (otherId !== heroId && pos.row === row && pos.col === col) {
            // Remove other hero from this position
            delete newFormation[otherId];
          }
        });

        set({ heroFormation: newFormation });
        console.log(`[Formation] Set hero ${heroId} to position (${row}, ${col})`);

        // Refresh the screen
        state.navigate(state.currentScreen);
      },

      clearHeroFormation: () => {
        set({ heroFormation: {} });
        console.log('[Formation] Cleared all hero formations');
      },

      // Battle system
      startBattle: () => {
        const state = get();

        // Get heroes from formation instead of preBattleTeam
        const formationHeroIds = Object.keys(state.heroFormation);
        if (!state.selectedStageId || formationHeroIds.length === 0) {
          console.error('Cannot start battle: no stage or heroes in formation');
          return;
        }

        const stage = getStageById(state.selectedStageId);
        if (!stage) return;

        // Get location to determine grid size
        const location = getLocationByStageId(state.selectedStageId);
        if (location && location.gridSize) {
          // Set grid size based on location
          state.setGridSize(location.gridSize.rows, location.gridSize.cols);
        } else {
          // Default to 8x8 if no grid size specified
          state.setGridSize(8, 8);
        }

        // Get selected heroes from formation - limit to stage's playerSlots
        const selectedHeroIds = formationHeroIds.slice(0, stage.playerSlots);
        const heroes = selectedHeroIds
          .map((heroId) => state.roster.find((h) => h.instanceId === heroId))
          .filter((h) => h !== undefined) as Hero[];

        if (heroes.length === 0) return;

        // Sync preBattleTeam with formation heroes and save initial team
        set({
          preBattleTeam: selectedHeroIds,
          initialBattleTeam: selectedHeroIds // Save the initial team to prevent mid-battle additions
        });

        // Heal heroes to full before battle (remove this if you want persistent damage between battles)
        heroes.forEach((hero, index) => {
          if (hero.currentStats.hp <= 0 || hero.currentStats.hp < hero.currentStats.maxHp) {
            console.log(`[startBattle] Healing ${hero.name} from ${hero.currentStats.hp} to ${hero.currentStats.maxHp} HP`);
            hero.currentStats.hp = hero.currentStats.maxHp;
          }

          // Set hero position from formation or use default
          const formation = state.heroFormation[hero.instanceId];
          if (formation) {
            // Use the formation position
            (hero as any).formationPosition = formation;
            console.log(`[startBattle] Hero ${hero.name} will use formation position (${formation.row}, ${formation.col})`);
          } else {
            // Default position if not in formation
            const row = Math.min(2 + Math.floor(index / 2), 5);
            const col = index % 2;
            (hero as any).formationPosition = { row, col };
            console.log(`[startBattle] Hero ${hero.name} will use default position (${row}, ${col})`);
          }
        });

        // Warn if team was trimmed
        if (state.preBattleTeam.length > stage.playerSlots) {
          console.warn(`[startBattle] Team trimmed from ${state.preBattleTeam.length} to ${stage.playerSlots} heroes for this stage`);
        }

        // Create enemies from stage with scaling based on stage number
        // Handle both single wave (string[]) and multi-wave (string[][]) formats
        const enemies = Array.isArray(stage.enemies[0])
          ? // Multi-wave format: array of arrays
            (stage.enemies as string[][]).map(wave =>
              wave.map(enemyType => createEnemyInstance(enemyType, state.selectedStageId))
            )
          : // Single wave format: flat array
            (stage.enemies as string[]).map(enemyType =>
              createEnemyInstance(enemyType, state.selectedStageId)
            );

        // Add formation positions to heroes
        const heroesWithPositions = heroes.map(hero => {
          const formationPos = (hero as any).formationPosition;
          return {
            ...hero,
            position: formationPos || { row: 0, col: 0 } // Add position property
          };
        });

        // Run battle simulation to get all events
        // Use deterministic V2 simulator if enabled, otherwise use original
        let battleState: BattleState;
        if (state.useDeterministicBattle) {
          console.log('[startBattle] Using Deterministic Battle Simulator V2');
          const simulator = new DeterministicBattleSimulatorV2(heroesWithPositions as any, enemies);
          battleState = simulator.simulate();

          // CRITICAL: Force cleanup any invalid positions that somehow got through
          const gridRows = state.gridRows || 8;
          const gridCols = state.gridCols || 8;

          // Clean heroes
          battleState.heroes = battleState.heroes.map(hero => {
            if (hero.position.row >= gridRows || hero.position.col >= gridCols ||
                hero.position.row < 0 || hero.position.col < 0) {
              console.warn(`[startBattle] Forcing hero ${hero.name} from invalid position (${hero.position.row},${hero.position.col}) to (0,0)`);
              return { ...hero, position: { row: 0, col: 0 } };
            }
            return hero;
          });

          // Clean enemies
          battleState.enemies = battleState.enemies.map(enemy => {
            if (enemy.position.row >= gridRows || enemy.position.col >= gridCols ||
                enemy.position.row < 0 || enemy.position.col < 0) {
              console.warn(`[startBattle] Forcing enemy ${enemy.name} from invalid position (${enemy.position.row},${enemy.position.col}) to (0,6)`);
              return { ...enemy, position: { row: 0, col: 6 } };
            }
            return enemy;
          });
        } else {
          console.log('[startBattle] Using Original Battle Simulator');
          const simulator = new BattleSimulator(heroes, enemies);
          battleState = simulator.simulate();

          // Also clean up invalid positions from the original simulator
          const gridRows = state.gridRows || 8;
          const gridCols = state.gridCols || 8;

          // Clean heroes
          battleState.heroes = battleState.heroes.map(hero => {
            if (hero.position.row >= gridRows || hero.position.col >= gridCols ||
                hero.position.row < 0 || hero.position.col < 0) {
              console.warn(`[startBattle Original] Forcing hero ${hero.name} from invalid position (${hero.position.row},${hero.position.col}) to (0,0)`);
              return { ...hero, position: { row: 0, col: 0 } };
            }
            return hero;
          });

          // Clean enemies
          battleState.enemies = battleState.enemies.map(enemy => {
            if (enemy.position.row >= gridRows || enemy.position.col >= gridCols ||
                enemy.position.row < 0 || enemy.position.col < 0) {
              console.warn(`[startBattle Original] Forcing enemy ${enemy.name} from invalid position (${enemy.position.row},${enemy.position.col}) to (0,6)`);
              return { ...enemy, position: { row: 0, col: 6 } };
            }
            return enemy;
          });
        }

        console.log('Battle started with events:', battleState.events.length);
        console.log('Initial hero positions:', battleState.heroes.map(h => h.position));
        console.log('Initial enemy positions:', battleState.enemies.map(e => ({ name: e.name, wave: e.wave, pos: e.position })));
        console.log('Current wave:', battleState.currentWave);
        console.log('Total waves:', battleState.totalWaves);

        // IMPORTANT: Use formation positions if available
        battleState.heroes.forEach((hero, index) => {
          // Check if we have a formation position for this hero
          const originalHero = heroes.find(h => h.instanceId === hero.instanceId);
          const formationPos = originalHero ? (originalHero as any).formationPosition : null;

          if (formationPos) {
            // Use the formation position
            hero.position = { row: formationPos.row, col: formationPos.col };
            console.log(`[Battle] Positioned ${hero.name} at formation position (${formationPos.row}, ${formationPos.col})`);
          } else {
            // Default positioning
            const row = Math.min(2 + Math.floor(index / 2), 7);
            const col = index % 2;
            hero.position = { row, col };
            console.log(`[Battle] Positioned ${hero.name} at default position (${row}, ${col})`);
          }

          hero.isAlive = true;
          hero.stats.hp = hero.stats.maxHp;
          hero.cooldown = 0; // Reset cooldown to 0
        });

        // Reset wave 1 enemies and wave 2+ enemies
        battleState.enemies.forEach((enemy, index) => {
          if (enemy.wave === 1) {
            // Wave 1 enemies start at rows 2-7, columns 6-7
            const wave1Enemies = battleState.enemies.filter(e => e.wave === 1);
            const wave1Index = wave1Enemies.indexOf(enemy);
            const row = Math.min(2 + Math.floor(wave1Index / 2), 7);
            const col = 7 - (wave1Index % 2);
            enemy.position = { row, col };
          } else {
            // Later wave enemies start off-screen
            const waveEnemies = battleState.enemies.filter(e => e.wave === enemy.wave);
            const waveIndex = waveEnemies.indexOf(enemy);
            const row = Math.min(2 + Math.floor(waveIndex / 2), 7);
            const col = 8; // Off-screen to the right
            enemy.position = { row, col };
          }
          enemy.isAlive = true;
          enemy.stats.hp = enemy.stats.maxHp;
          enemy.cooldown = 0; // Reset cooldown to 0
        });

        // CRITICAL: Clear the winner so battle can play out with auto-advance
        // The simulator sets the winner during simulate(), but we need to clear it
        // so the auto-advance hook doesn't think the battle is already over
        battleState.winner = null;

        // Switch to battle music
        audioManager.playMusic('/Goblins_Dance_(Battle).wav', true, 0.5);

        // IMPORTANT: Set currentScreen FIRST before setting battle state
        // This ensures the auto-advance hook sees the battle screen immediately
        set({ currentScreen: ScreenType.Battle });

        // Set battle state and navigate to battle screen
        set({
          currentBattle: battleState,
          battleEventIndex: 0,
        });

        // Navigate to battle screen with transition (will update grid occupants)
        if ((window as any).__gridNavigate) {
          (window as any).__gridNavigate(ScreenType.Battle);
        } else {
          state.navigate(ScreenType.Battle);
        }
      },

      advanceBattleEvent: () => {
        const state = get();
        if (!state.currentBattle) return;

        const nextIndex = state.battleEventIndex + 1;

        if (nextIndex < state.currentBattle.events.length) {
          // Apply the event to update battle state
          const event = state.currentBattle.events[nextIndex];

          // Update positions, HP, cooldowns, and alive status based on event
          if (event.type === 'tick') {
            // Update all unit cooldowns from tick event
            if (event.data.cooldowns) {
              event.data.cooldowns.forEach((update: any) => {
                const unit = [...state.currentBattle!.heroes, ...state.currentBattle!.enemies]
                  .find(u => u.id === update.unitId);
                if (unit) {
                  unit.cooldown = update.cooldown;
                }
              });
            }
          } else if (event.type === 'waveTransition') {
            // Check if we have a custom formation to apply (user modified)
            const formation = state.heroFormation;
            const heroKeys = Object.keys(formation).filter(key => key !== '_waveKey');
            const hasCustomFormation = heroKeys.length > 0 && state.isFormationUserModified;

            console.log('[WaveTransition] Formation check:', {
              formation,
              heroKeys,
              heroKeysLength: heroKeys.length,
              isFormationUserModified: state.isFormationUserModified,
              hasCustomFormation
            });

            if (hasCustomFormation) {
              // Apply custom formation - user has manually positioned heroes
              console.log('[WaveTransition] User has custom formation, applying exact positions...');

              state.currentBattle.heroes.forEach(hero => {
                if (hero.isAlive) {
                  const desiredPos = formation[hero.instanceId];
                  if (desiredPos) {
                    // Use the exact position the user specified
                    const oldPos = { ...hero.position };
                    hero.position = { row: desiredPos.row, col: desiredPos.col };
                    console.log(`[WaveTransition] ${hero.name}: custom position (${desiredPos.row},${desiredPos.col}) [was at (${oldPos.row},${oldPos.col})]`);
                  }
                }
              });

              // Mark that custom formation was applied (for animation system)
              event.data.customFormationApplied = true;

              // Keep formation data for this wave - user might want to modify it again
              // Formation will be cleared when we advance to next wave
              console.log('[WaveTransition] Applied custom formation, keeping formation data for potential re-use');

              // TODO: Implement proper battle re-simulation with custom formation
              // For now, just apply the custom positions - movement will be fixed in next iteration

              // Debug: Log actual hero positions after formation applied
              console.log('[WaveTransition] === Hero positions after custom formation applied ===');
              state.currentBattle.heroes.forEach(hero => {
                console.log(`[WaveTransition] ${hero.name}: actual position (${hero.position.row},${hero.position.col})`);
              });
              console.log('[WaveTransition] === End hero positions ===');
            } else {
              // No custom formation - let the simulator's transitions apply normally
              console.log('[WaveTransition] No custom formation, using simulator transitions...');
              if (event.data.heroTransitions) {
                event.data.heroTransitions.forEach((transition: any) => {
                  const hero = state.currentBattle.heroes.find(h => h.id === transition.unitId);
                  if (hero) {
                    console.log(`[WaveTransition] Auto-scroll ${hero.name}: (${transition.from.row},${transition.from.col}) → (${transition.to.row},${transition.to.col})`);
                    hero.position = transition.to;
                  }
                });
              }

              // Clear formation data since no custom formation was applied
              // This allows fresh initialization for next formation UI
              set({ heroFormation: {}, isFormationUserModified: false });
              console.log('[WaveTransition] Applied simulator transitions and cleared formation');
            }
          } else if (event.type === 'waveStart') {
            // Update current wave number when new wave spawns - trust the simulator as source of truth
            console.log(`[WaveStart] Wave start event - simulator wave: ${event.data.waveNumber}, old battle state wave: ${state.currentBattle.currentWave}`);

            state.currentBattle.currentWave = event.data.waveNumber;
            console.log(`[WaveStart] Updated battle state to wave ${event.data.waveNumber}`);
            console.log('[WaveStart] Enemy data:', event.data.enemies);

            // Update enemy positions from wave start event (slide-in animation)
            if (event.data.enemies) {
              event.data.enemies.forEach((enemyData: any) => {
                const enemy = state.currentBattle!.enemies.find(e => e.id === enemyData.unitId);
                console.log(`[WaveStart] Found enemy ${enemyData.unitId}:`, enemy ? { name: enemy.name, wave: enemy.wave, oldPos: enemy.position, newPos: enemyData.toPosition } : 'NOT FOUND');
                if (enemy) {
                  // Update to final position (animation will handle the slide-in)
                  enemy.position = enemyData.toPosition;
                }
              });
            }
          } else if (event.type === 'move') {
            const unit = [...state.currentBattle.heroes, ...state.currentBattle.enemies]
              .find(u => u.id === event.data.unitId);
            if (unit) {
              // Update the logical position immediately
              // The animation system will handle keeping the visual position correct
              unit.position = event.data.to;
              console.log(`[advanceBattleEvent] Updated position for ${event.data.unitId} from (${event.data.from.row},${event.data.from.col}) to (${event.data.to.row},${event.data.to.col})`);
            }
          } else if (event.type === 'damage') {
            const unit = [...state.currentBattle.heroes, ...state.currentBattle.enemies]
              .find(u => u.id === event.data.targetId);
            if (unit) {
              unit.stats.hp = event.data.remainingHp;
            }
          } else if (event.type === 'heal') {
            // Handle heal events to update HP
            const unit = [...state.currentBattle.heroes, ...state.currentBattle.enemies]
              .find(u => u.id === event.data.unitId);
            if (unit) {
              // Add the heal amount to current HP, capped at maxHp
              unit.stats.hp = Math.min(unit.stats.hp + event.data.amount, unit.stats.maxHp);
              console.log(`[Heal Event] ${unit.name} healed for ${event.data.amount}, HP now: ${unit.stats.hp}/${unit.stats.maxHp}`);
            }
          } else if (event.type === 'death') {
            const unit = [...state.currentBattle.heroes, ...state.currentBattle.enemies]
              .find(u => u.id === event.data.unitId);
            if (unit) {
              unit.isAlive = false;
            }
          } else if (event.type === 'victory') {
            // Set winner when victory event is processed
            state.currentBattle.winner = 'heroes';
            console.log('[advanceBattleEvent] Victory event - heroes win!');
          } else if (event.type === 'defeat') {
            // Set winner when defeat event is processed
            state.currentBattle.winner = 'enemies';
            console.log('[advanceBattleEvent] Defeat event - enemies win!');
          }

          set({ battleEventIndex: nextIndex });

          // Regenerate battle layout with updated state
          const newOccupants = createBattleLayout(
            state.currentBattle,
            nextIndex,
            state.advanceBattleEvent,
            state.battleSpeed,
            () => {
              // Cycle through 1x, 4x, and 8x speed
              const newSpeed = state.battleSpeed === 1 ? 4 : state.battleSpeed === 4 ? 8 : 1;
              state.setBattleSpeed(newSpeed);
            }
          );
          set({ gridOccupants: newOccupants });
        } else {
          // No more events in current simulation - update index to reflect completion
          set({ battleEventIndex: nextIndex });

          // Check if there are more waves
          const hasMoreWaves = state.currentBattle.currentWave < state.currentBattle.totalWaves;

          if (hasMoreWaves && !state.currentBattle.winner) {
            // More waves remaining but no events - this means wave completed and we need formation management
            console.log(`[advanceBattleEvent] Wave ${state.currentBattle.currentWave} events complete, ${state.currentBattle.totalWaves - state.currentBattle.currentWave} waves remaining`);

            // Update battle layout to show pause state
            const newOccupants = createBattleLayout(
              state.currentBattle,
              nextIndex, // Use nextIndex to show we're past all events
              state.advanceBattleEvent,
              state.battleSpeed,
              () => {
                const newSpeed = state.battleSpeed === 1 ? 4 : state.battleSpeed === 4 ? 8 : 1;
                state.setBattleSpeed(newSpeed);
              }
            );
            set({ gridOccupants: newOccupants });

            // The auto-advance will detect wave completion and pause for formation management
            // Don't declare battle finished yet
            return;
          }

          // Battle truly finished - handle victory/defeat
          console.log('Battle finished! Winner:', state.currentBattle.winner);

          if (state.currentBattle.winner === 'heroes' && state.selectedStageId) {
            // Award rewards and mark stage as completed
            const stage = getStageById(state.selectedStageId);
            if (stage) {
              console.log('Completing stage:', state.selectedStageId);

              // Calculate medical costs for fainted heroes - REDUCED FOR BALANCE
              // Early stages: 15-25g per hero
              // Mid stages: 20-35g per hero
              // Late stages: 30-50g per hero
              let medicalCosts = 0;
              let faintedCount = 0;

              // Scale medical costs based on stage progression
              const stageProgress = Math.min(state.selectedStageId / 128, 1);
              const minCost = Math.floor(15 + stageProgress * 15); // 15-30g
              const maxCost = Math.floor(25 + stageProgress * 25); // 25-50g

              state.preBattleTeam.forEach(heroId => {
                const battleHero = state.currentBattle!.heroes.find(h => h.instanceId === heroId);
                if (battleHero && !battleHero.isAlive) {
                  faintedCount++;
                  // Random cost within scaled range
                  const costPerHero = Math.floor(Math.random() * (maxCost - minCost + 1)) + minCost;
                  medicalCosts += costPerHero;
                }
              });

              if (faintedCount > 0) {
                console.log(`${faintedCount} hero(es) fainted. Medical costs: ${medicalCosts}g`);
              }

              // Apply gold multiplier based on max wave reached
              const maxWaveReached = state.currentBattle!.currentWave;
              const goldMultiplier = maxWaveReached <= 3 ? 1.0 :
                                      maxWaveReached <= 6 ? 1.5 :
                                      maxWaveReached <= 9 ? 2.0 :
                                      4.0; // Wave 10+

              // Calculate gold with multiplier, minus medical costs
              const baseGold = Math.floor(stage.rewards.gold * goldMultiplier);
              const netGold = Math.max(0, baseGold - medicalCosts);
              console.log(`Gold reward: ${stage.rewards.gold}g × ${goldMultiplier}x = ${baseGold}g - Medical costs: ${medicalCosts}g = ${netGold}g`);

              // Calculate gems for boss stages
              console.log(`[Victory] Stage rewards:`, stage.rewards);
              const gemsEarned = (stage.rewards.gems && stage.rewards.gems > 0) ? stage.rewards.gems : 0;
              console.log(`[Victory] Gems to award: ${gemsEarned} (from stage.rewards.gems: ${stage.rewards.gems})`);
              if (gemsEarned > 0) {
                console.log(`Boss defeated! Will award ${gemsEarned} gems!`);
              }

              // Generate item drops for EACH wave completed (not just once!)
              const droppedItems: Array<{ id: string; name: string; rarity: string; icon: string; value: number }> = [];
              if (stage.lootConfig) {
                // Roll for items for each wave completed
                for (let wave = 1; wave <= maxWaveReached; wave++) {
                  const lootConfigWithWave = {
                    ...stage.lootConfig,
                    waveNumber: wave,
                  };
                  const droppedItemIds = generateLoot(lootConfigWithWave);
                  if (droppedItemIds.length > 0) {
                    droppedItemIds.forEach(itemId => {
                      const itemTemplate = ITEM_TEMPLATES[itemId];
                      if (itemTemplate) {
                        // Add item to inventory immediately (so it's available for reward reveal)
                        state.addItem(itemTemplate);

                        // Also add to pending rewards display
                        droppedItems.push({
                          id: itemTemplate.id,
                          name: itemTemplate.name,
                          rarity: itemTemplate.rarity,
                          icon: itemTemplate.icon || '📦',
                          value: itemTemplate.cost || 0,
                        });
                        console.log(`Item dropped for wave ${wave}: ${itemTemplate.name} (${itemTemplate.rarity})`);
                      }
                    });
                  }
                }
                console.log(`[Victory] Total items dropped: ${droppedItems.length} for ${maxWaveReached} waves completed`);
              }

              // Award XP to all participating heroes who survived
              // Count surviving heroes for XP distribution
              const survivingHeroes = state.preBattleTeam.filter(heroId => {
                const battleHero = state.currentBattle!.heroes.find(h => h.instanceId === heroId);
                return battleHero && battleHero.isAlive;
              });

              // Award XP only to surviving heroes
              const xpPerHero = survivingHeroes.length > 0
                ? Math.floor(stage.rewards.experience / survivingHeroes.length)
                : 0;

              survivingHeroes.forEach(heroId => {
                state.awardHeroExperience(heroId, xpPerHero);
                console.log(`Hero ${heroId} gained ${xpPerHero} XP for surviving the battle`);
              });

              // Update hero HP after battle and apply durability loss to equipped items of heroes who died (fainted)
              state.preBattleTeam.forEach(heroId => {
                const battleHero = state.currentBattle!.heroes.find(h => h.instanceId === heroId);
                const hero = state.roster.find(h => h.instanceId === heroId);

                if (battleHero && hero) {
                  // Update hero's current HP to match battle result
                  const updatedStats = {
                    ...hero.currentStats,
                    hp: battleHero.isAlive ? battleHero.stats.hp : 0
                  };
                  state.updateHero(heroId, { currentStats: updatedStats });
                }

                if (battleHero && !battleHero.isAlive) {
                  // Hero died during battle - reduce item durability
                  if (hero && hero.equippedItem) {
                    const item = state.inventory.find(i => i.instanceId === hero.equippedItem);
                    if (item && item.durability !== undefined) {
                      const newDurability = Math.max(0, item.durability - 1);
                      console.log(`${hero.name} fainted! ${item.name} durability: ${item.durability} → ${newDurability}`);

                      if (newDurability === 0) {
                        // Item broke - remove it
                        console.log(`${item.name} broke!`);
                        state.removeItem(item.instanceId);
                      } else {
                        // Update item durability
                        set((s) => ({
                          inventory: s.inventory.map(i =>
                            i.instanceId === item.instanceId
                              ? { ...i, durability: newDurability }
                              : i
                          ),
                        }));
                      }
                    }
                  }
                }
              });

              // Complete the stage and potentially the location
              state.completeStage(state.selectedStageId);

              // Check if this was a location stage and mark location as complete
              const location = getLocationByStageId(state.selectedStageId);
              if (location && location.id) {
                state.completeLocation(location.id);
              }

              // Check if any hero needs to select an ability
              const freshState = get();
              if (freshState.abilitySelectionHeroId) {
                console.log('Hero needs to select ability - navigating to ability selection');
                // Ability selection will handle its own navigation
                return;
              }

              // Create pending rewards object with breakdown
              const pendingRewards = {
                goldEarned: netGold,
                gemsEarned: gemsEarned,
                items: droppedItems,
                breakdown: {
                  baseGold: stage.rewards.gold,
                  waveMultiplier: goldMultiplier,
                  wavesCompleted: maxWaveReached,
                  medicalCosts: medicalCosts,
                  casualties: faintedCount,
                  finalGold: netGold,
                },
              };

              console.log('🎰 NEW GACHA REWARD CREATED:', { gold: netGold, gems: gemsEarned, items: droppedItems.length, hasBreakdown: true });

              // Set pending rewards
              state.setPendingRewards(pendingRewards);

              // Clear battle state
              set({
                currentBattle: null,
                initialBattleTeam: [], // Clear initial team after victory
                battleEventIndex: 0,
                battleSpeed: 1,
              });

              // Reset grid size to default (8x8) for reward reveal screen
              state.setGridSize(8, 8);

              // Switch back to main menu music
              audioManager.playMusic('/Goblins_Den_(Regular).wav', true, 0.5);

              console.log('Victory! Navigating to reward reveal screen with rewards:', pendingRewards);

              // Navigate to reward reveal screen
              if ((window as any).__gridNavigate) {
                (window as any).__gridNavigate(ScreenType.RewardReveal);
              } else {
                state.navigate(ScreenType.RewardReveal);
              }
            }
          } else {
            // Defeat - return to location map
            console.log('Defeat! Returning to location map.');

            // Clear battle state
            set({
              currentBattle: null,
              battleEventIndex: 0,
            });

            // Switch back to main menu music
            audioManager.playMusic('/Goblins_Den_(Regular).wav', true, 0.5);

            // Clear selected stage and location
            set({
              selectedStageId: null,
              selectedLocationId: null,
            });

            // Navigate to location map
            if ((window as any).__gridNavigate) {
              (window as any).__gridNavigate(ScreenType.LocationMap);
            } else {
              state.navigate(ScreenType.LocationMap);
            }
          }
        }
      },

      // Retreat from battle
      retreatFromBattle: () => {
        const state = get();

        if (!state.currentBattle || !state.selectedStageId) {
          console.error('Cannot retreat: no active battle');
          return;
        }

        const stage = getStageById(state.selectedStageId);
        if (!stage) return;

        console.log('Retreating from battle...');

        // Clear initial battle team
        set({ initialBattleTeam: [] });

        // Calculate partial rewards based on wave reached
        const maxWaveReached = state.currentBattle.currentWave;

        // Calculate medical costs for fainted heroes
        let medicalCosts = 0;
        let faintedCount = 0;
        state.preBattleTeam.forEach(heroId => {
          const battleHero = state.currentBattle!.heroes.find(h => h.instanceId === heroId);
          if (battleHero && !battleHero.isAlive) {
            faintedCount++;
            const costPerHero = Math.floor(Math.random() * 51) + 100; // 100-150
            medicalCosts += costPerHero;
          }
        });

        if (faintedCount > 0) {
          console.log(`${faintedCount} hero(es) fainted. Medical costs: ${medicalCosts}g`);
        }

        // Apply gold multiplier based on wave reached
        const goldMultiplier = maxWaveReached <= 3 ? 1.0 :
                                maxWaveReached <= 6 ? 1.5 :
                                maxWaveReached <= 9 ? 2.0 :
                                4.0; // Wave 10+

        // Calculate partial gold (50% of stage rewards) with multiplier, minus medical costs
        const baseGold = Math.floor((stage.rewards.gold * 0.5) * goldMultiplier);
        const netGold = Math.max(0, baseGold - medicalCosts);
        console.log(`Retreat gold reward: ${stage.rewards.gold * 0.5}g × ${goldMultiplier}x = ${baseGold}g - Medical costs: ${medicalCosts}g = ${netGold}g`);

        // Award partial XP based on progress in battle
        // Give credit for partially completed waves based on enemies defeated
        const currentWaveEnemiesDefeated = state.currentBattle.enemies.filter(e => e.wave === maxWaveReached && !e.isAlive).length;
        const currentWaveTotalEnemies = state.currentBattle.enemies.filter(e => e.wave === maxWaveReached).length;
        const currentWaveProgress = currentWaveTotalEnemies > 0 ? currentWaveEnemiesDefeated / currentWaveTotalEnemies : 0;

        // Calculate effective waves completed (including partial progress in current wave)
        const wavesFullyCompleted = Math.max(0, maxWaveReached - 1);
        const effectiveWavesCompleted = wavesFullyCompleted + currentWaveProgress;

        console.log(`[Retreat XP Debug] maxWaveReached: ${maxWaveReached}, wavesFullyCompleted: ${wavesFullyCompleted}`);
        console.log(`[Retreat XP Debug] currentWave enemies: ${currentWaveEnemiesDefeated}/${currentWaveTotalEnemies} = ${(currentWaveProgress * 100).toFixed(1)}% progress`);
        console.log(`[Retreat XP Debug] effectiveWavesCompleted: ${effectiveWavesCompleted.toFixed(2)}`);
        console.log(`[Retreat XP Debug] totalWaves: ${state.currentBattle.totalWaves}`);
        console.log(`[Retreat XP Debug] stage.rewards.experience: ${stage.rewards.experience}`);

        if (effectiveWavesCompleted > 0 && state.currentBattle.totalWaves > 0) {
          const baseXpPerWave = Math.floor(stage.rewards.experience / state.currentBattle.totalWaves);
          const totalXp = Math.floor(baseXpPerWave * effectiveWavesCompleted * 0.5); // 50% XP penalty for retreat

          console.log(`[Retreat XP Debug] baseXpPerWave: ${baseXpPerWave}, totalXp: ${totalXp}`);

          // Award XP to surviving heroes only
          const survivingHeroes = state.preBattleTeam.filter(heroId => {
            const battleHero = state.currentBattle!.heroes.find(h => h.instanceId === heroId);
            return battleHero && battleHero.isAlive;
          });

          console.log(`[Retreat XP Debug] survivingHeroes: ${survivingHeroes.length} of ${state.preBattleTeam.length}`);

          if (survivingHeroes.length > 0 && totalXp > 0) {
            const xpPerHero = Math.floor(totalXp / survivingHeroes.length);
            survivingHeroes.forEach(heroId => {
              const hero = state.roster.find(h => h.instanceId === heroId);
              console.log(`[Retreat XP Debug] Awarding ${xpPerHero} XP to ${hero?.name} (${heroId})`);
              state.awardHeroExperience(heroId, xpPerHero);
            });
            console.log(`Retreat XP awarded: ${totalXp} total (${xpPerHero} per surviving hero) for ${effectiveWavesCompleted.toFixed(2)} effective waves completed`);
          } else {
            console.log(`[Retreat XP Debug] No XP awarded - survivingHeroes: ${survivingHeroes.length}, totalXp: ${totalXp}`);
          }
        } else {
          console.log(`No XP awarded - no progress made (effectiveWavesCompleted: ${effectiveWavesCompleted.toFixed(2)}, totalWaves: ${state.currentBattle.totalWaves})`);
        }

        // No item rewards on retreat (penalty for retreating)
        console.log('No item rewards awarded (retreat penalty)');

        // Update hero HP after battle and apply durability loss to equipped items of heroes who died
        state.preBattleTeam.forEach(heroId => {
          const battleHero = state.currentBattle!.heroes.find(h => h.instanceId === heroId);
          const hero = state.roster.find(h => h.instanceId === heroId);

          if (battleHero && hero) {
            // Update hero's current HP to match battle result
            const updatedStats = {
              ...hero.currentStats,
              hp: battleHero.isAlive ? battleHero.stats.hp : 0
            };
            state.updateHero(heroId, { currentStats: updatedStats });
          }

          if (battleHero && !battleHero.isAlive) {
            if (hero && hero.equippedItem) {
              const item = state.inventory.find(i => i.instanceId === hero.equippedItem);
              if (item && item.durability !== undefined) {
                const newDurability = Math.max(0, item.durability - 1);
                console.log(`${hero.name} fainted! ${item.name} durability: ${item.durability} → ${newDurability}`);

                if (newDurability === 0) {
                  console.log(`${item.name} broke!`);
                  state.removeItem(item.instanceId);
                } else {
                  set((s) => ({
                    inventory: s.inventory.map(i =>
                      i.instanceId === item.instanceId
                        ? { ...i, durability: newDurability }
                        : i
                    ),
                  }));
                }
              }
            }
          }
        });

        // Generate item drops based on waves completed (with retreat penalty)
        const droppedItems: Array<{ id: string; name: string; rarity: string; icon: string; value: number }> = [];
        if (stage.lootConfig && wavesFullyCompleted > 0) {
          // Award items for each fully completed wave (not the current incomplete wave)
          for (let wave = 1; wave <= wavesFullyCompleted; wave++) {
            // Use a reduced drop chance for retreat (70% of normal chance)
            const retreatLootConfig = {
              ...stage.lootConfig,
              itemDropChance: stage.lootConfig.itemDropChance * 0.7,
              waveNumber: wave,
            };

            const droppedItemIds = generateLoot(retreatLootConfig);
            if (droppedItemIds.length > 0) {
              droppedItemIds.forEach(itemId => {
                const itemTemplate = ITEM_TEMPLATES[itemId];
                if (itemTemplate) {
                  // Add item to inventory
                  state.addItem(itemTemplate);

                  // Add to pending rewards display
                  droppedItems.push({
                    id: itemTemplate.id,
                    name: itemTemplate.name,
                    rarity: itemTemplate.rarity,
                    icon: itemTemplate.icon || '📦',
                    value: itemTemplate.cost || 0,
                  });
                  console.log(`[Retreat] Item dropped for wave ${wave}: ${itemTemplate.name} (${itemTemplate.rarity})`);
                }
              });
            }
          }
          console.log(`[Retreat] Total items dropped: ${droppedItems.length} for ${wavesFullyCompleted} waves completed`);
        }

        // Create pending rewards object for reward reveal screen with breakdown
        const pendingRewards = {
          goldEarned: netGold,
          gemsEarned: 0, // No gems on retreat
          items: droppedItems, // Items based on waves completed
          breakdown: {
            baseGold: Math.floor(stage.rewards.gold * 0.5), // 50% for retreat
            waveMultiplier: goldMultiplier,
            wavesCompleted: maxWaveReached,
            medicalCosts: medicalCosts,
            casualties: faintedCount,
            finalGold: netGold,
          },
        };

        console.log('🎰 NEW GACHA REWARD CREATED (RETREAT):', { gold: netGold, gems: 0, items: droppedItems.length, hasBreakdown: true });

        // Set pending rewards
        state.setPendingRewards(pendingRewards);

        // Clear battle state
        set({
          currentBattle: null,
          battleEventIndex: 0,
          battleSpeed: 1,
        });

        // Reset grid size to default (8x8) for reward reveal screen
        state.setGridSize(8, 8);

        // Switch back to main menu music
        audioManager.playMusic('/Goblins_Den_(Regular).wav', true, 0.5);

        console.log('Retreat! Navigating to reward reveal screen with rewards:', pendingRewards);

        // Navigate to reward reveal screen
        if ((window as any).__gridNavigate) {
          (window as any).__gridNavigate(ScreenType.RewardReveal);
        } else {
          state.navigate(ScreenType.RewardReveal);
        }
      },

      // Shop management
      refreshShop: () => {
        // Get random items (6-10 items)
        const itemCount = Math.floor(Math.random() * 5) + 6;
        const newItems = getRandomItems(itemCount, Rarity.Mythic);

        // Get random heroes (2-4 heroes)
        const heroCount = Math.floor(Math.random() * 3) + 2;
        const availableHeroIds = Object.keys(HERO_TEMPLATES);
        const selectedHeroIds = availableHeroIds
          .sort(() => Math.random() - 0.5)
          .slice(0, heroCount);
        const newHeroes = selectedHeroIds.map(id => createHeroInstance(id, 1) as Hero);

        set({
          shopItems: newItems,
          shopHeroes: newHeroes,
        });

        // Regenerate shop layout if currently on shop screen
        const state = get();
        if (state.currentScreen === ScreenType.Shop) {
          const newOccupants = createShopLayout(
            state.player.gold,
            state.player.gems,
            newItems,
            newHeroes,
            state.navigate,
            state.purchaseItem,
            state.purchaseHero,
            state.refreshShop
          );
          set({ gridOccupants: newOccupants });
        }
      },

      purchaseItem: (itemId: string) => {
        const state = get();
        const item = state.shopItems.find(i => i.id === itemId);

        if (!item) {
          console.error('Item not found in shop:', itemId);
          return false;
        }

        // Check if player has enough gold
        if (state.player.gold < item.cost) {
          console.log('Not enough gold to purchase item');
          return false;
        }

        // Deduct gold and add item to inventory
        if (state.spendGold(item.cost)) {
          state.addItem(item);

          // Regenerate shop layout with updated gold
          if (state.currentScreen === ScreenType.Shop) {
            const newOccupants = createShopLayout(
              state.player.gold,
              state.player.gems,
              state.shopItems,
              state.shopHeroes,
              state.navigate,
              state.purchaseItem,
              state.purchaseHero,
              state.refreshShop
            );
            set({ gridOccupants: newOccupants });
          }

          console.log(`Purchased ${item.name} for ${item.cost} gold`);
          return true;
        }

        return false;
      },

      purchaseHero: (heroId: string) => {
        const state = get();
        const hero = state.shopHeroes.find(h => h.id === heroId);

        if (!hero) {
          console.error('Hero not found in shop:', heroId);
          return false;
        }

        // Calculate hero cost based on rarity/tier
        const heroCost = getHeroGemCost(hero.rarity);

        // Check if player has enough gems (not gold!)
        if (state.player.gems < heroCost) {
          console.log(`Not enough gems to purchase hero. Need ${heroCost}, have ${state.player.gems}`);
          return false;
        }

        // Deduct gems and add hero to roster
        if (state.spendGems(heroCost)) {
          // Create a new instance to avoid conflicts
          const newHero = createHeroInstance(hero.id, 1) as Hero;
          state.addHero(newHero);

          // Remove hero from shop
          const newShopHeroes = state.shopHeroes.filter(h => h !== hero);
          set({ shopHeroes: newShopHeroes });

          // Regenerate shop layout with updated gems and heroes
          if (state.currentScreen === ScreenType.Shop) {
            const newOccupants = createShopLayout(
              state.player.gold,
              state.player.gems,
              state.shopItems,
              newShopHeroes,
              state.navigate,
              state.purchaseItem,
              state.purchaseHero,
              state.refreshShop
            );
            set({ gridOccupants: newOccupants });
          }

          console.log(`Purchased ${hero.name} for ${heroCost} gems`);
          return true;
        }

        return false;
      },

      // Hero unlock system
      unlockHero: (heroId: string) => {
        const state = get();
        const template = HERO_TEMPLATES[heroId];

        if (!template) {
          console.error('Hero template not found:', heroId);
          return false;
        }

        const cost = getHeroGemCost(template.rarity);

        // Check if player has enough gems
        if (!state.spendGems(cost)) {
          console.log(`Not enough gems to unlock ${template.name}`);
          return false;
        }

        // Add to unlocked heroes
        const newUnlocked = new Set(state.unlockedHeroIds);
        newUnlocked.add(heroId);
        set({ unlockedHeroIds: newUnlocked });

        // Create hero instance and add to roster
        const newHero = createHeroInstance(heroId, 1) as Hero;
        state.addHero(newHero);

        console.log(`Unlocked ${template.name} for ${cost} gems! Added to roster.`);
        return true;
      },

      // Reset game
      resetGame: () => set(initialState),
    }),
    {
      name: 'gridder-game-storage',
      partialize: (state) => ({
        player: state.player,
        roster: state.roster,
        inventory: state.inventory,
        campaign: {
          ...state.campaign,
          stagesCompleted: Array.from(state.campaign.stagesCompleted),
        },
        unlockedFeatures: Array.from(state.unlockedFeatures),
        unlockedHeroIds: Array.from(state.unlockedHeroIds),
        selectedTeam: state.selectedTeam,
        preBattleTeam: state.preBattleTeam, // Persist team composition
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert arrays back to Sets
          state.campaign.stagesCompleted = new Set(
            state.campaign.stagesCompleted as unknown as number[]
          );
          state.unlockedFeatures = new Set(
            state.unlockedFeatures as unknown as string[]
          );
          state.unlockedHeroIds = new Set(
            state.unlockedHeroIds as unknown as string[]
          );

          // Ensure roster has starter heroes if empty
          if (!state.roster || state.roster.length === 0) {
            state.roster = starterHeroes as Hero[];
          }
        }
      },
    }
  )
);
