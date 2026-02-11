import type { StoreSet, StoreGet } from '../storeTypes';
import { ScreenType } from '@/types/progression.types';
import { AnyGridOccupant } from '@/types/grid.types';
import { Hero } from '@/types/core.types';
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
import { getStageById } from '@/data/stages';
import { getLocationByStageId } from '@/data/locations';

export function createNavigationSlice(set: StoreSet, get: StoreGet) {
  return {
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
            validTeam = validTeam.slice(0, stage.playerSlots);
          }

          // Update team if it was modified
          if (validTeam.length !== state.preBattleTeam.filter(id => id && id !== '').length ||
              validTeam.length > stage.playerSlots) {
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

              state.navigate(ScreenType.PreBattle);
            },
            state.equipItem,
            state.startBattle,
            state.gridSize.rows,
            state.gridSize.cols
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
        if (hero) {
          const choices = generateLevelUpChoices(hero);
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
        } else {
        }
      } else if (screen === ScreenType.BattleInventory) {
        // Battle formation management screen (between waves)
        // Get heroes with their current battle HP if in battle
        let battleHeroes = state.preBattleTeam
          .map(heroId => state.roster.find(h => h.instanceId === heroId))
          .filter(h => h !== undefined) as Hero[];

        // Preserve user's formation if they have modified it, otherwise use current battle positions
        let currentFormation: Record<string, { row: number; col: number }> = {};

        // Check if we need to initialize formation for the current wave
        const currentWave = state.currentBattle?.currentWave || 1;
        const isCurrentWaveFormation = state.formationWaveNumber === currentWave;

        if (state.currentBattle && !isCurrentWaveFormation && !state.isFormationUserModified) {
          // Initialize formation from battle state — show where heroes currently are
          state.currentBattle.heroes.forEach(hero => {
            if (state.initialBattleTeam.includes(hero.instanceId!) && hero.isAlive) {
              currentFormation[hero.instanceId!] = {
                row: hero.position.row,
                col: hero.position.col
              };
            }
          });

          set({
            heroFormation: currentFormation,
            formationWaveNumber: currentWave,
            isFormationUserModified: true // Mark as initialized - prevent re-initialization
          });
        } else if (state.heroFormation && state.isFormationUserModified) {
          // User has custom formation — preserve it, update wave number
          currentFormation = { ...state.heroFormation };
          if (state.formationWaveNumber !== currentWave) {
            set({ formationWaveNumber: currentWave });
          }
        } else if (state.heroFormation) {
          currentFormation = { ...state.heroFormation };
        }

        // Sync HP from battle state
        if (state.currentBattle) {
          battleHeroes = battleHeroes.map(hero => {
            const battleHero = state.currentBattle!.heroes.find(h => h.instanceId === hero.instanceId);
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
            const battleHero = state.currentBattle!.heroes.find(h => h.instanceId === hero.instanceId);
            return battleHero && battleHero.isAlive;
          });
        }

        // Use the current formation data (either initialized or existing)
        const finalFormation = isCurrentWaveFormation ? state.heroFormation : currentFormation;

        // Define callback functions
        const onHeroPositionChange = (heroId: string, row: number, col: number) => {
            // Only allow repositioning heroes that were part of the initial team
            if (!state.initialBattleTeam.includes(heroId)) {
              return;
            }

            // The position we receive is the final display position where user wants hero
            // Store it directly since we're now tracking final positions
            const freshState = get();
            const newFormation = { ...freshState.heroFormation };
            newFormation[heroId] = { row, col };
            set({ heroFormation: newFormation });

            // Mark that user has modified the formation
            set({ isFormationUserModified: true });

            // Check if this hero is being re-added to battle
            const isReturning = !state.preBattleTeam.includes(heroId);
            if (isReturning) {
              // Re-add hero to battle team (but don't change position yet)
              const newTeam = [...state.preBattleTeam, heroId];
              set({ preBattleTeam: newTeam });
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
              state.gridSize.rows,
              state.gridSize.cols
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

            // Remove from current battle if in progress
            if (state.currentBattle) {
              const index = state.currentBattle.heroes.findIndex(h => h.instanceId === heroId);
              if (index !== -1) {
                const hero = state.currentBattle.heroes[index];
                state.currentBattle.heroes.splice(index, 1);
              }
            }

        };

        const onBackToLanding = () => {
            state.startNextWave();
        };

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
          state.gridSize.rows,
          state.gridSize.cols
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
  };
}
