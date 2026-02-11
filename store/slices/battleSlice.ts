import type { StoreSet, StoreGet } from '../storeTypes';
import { BattleState, BattleEvent, BattleEventType } from '@/types/battle.types';
import { ScreenType } from '@/types/progression.types';
import { DeterministicBattleSimulatorV2 } from '@/systems/DeterministicBattleSimulatorV2';
import { createBattleLayout } from '@/screens/Battle/BattleLayout';
import { createEnemyInstance, createHeroInstance } from '@/data/units';
import { getStageById } from '@/data/stages';
import { getLocationByStageId } from '@/data/locations';
import { audioManager } from '@/utils/audioManager';
import { generateLoot } from '@/utils/lootGenerator';
import { Rarity } from '@/types/core.types';
import { getRandomItems, ITEM_TEMPLATES } from '@/data/items';
import { Hero, Enemy } from '@/types/core.types';

export const battleInitialState = {
  currentBattle: null as BattleState | null,
  initialBattleTeam: [] as string[],
  battleEventIndex: 0,
  battleSpeed: 1,
};

export function createBattleSlice(set: StoreSet, get: StoreGet) {
  const actions = {
    startBattle: () => {
      const state = get();

      // Get heroes from formation instead of preBattleTeam
      const formationHeroIds = Object.keys(state.heroFormation);
      if (!state.selectedStageId || formationHeroIds.length === 0) {
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
          hero.currentStats.hp = hero.currentStats.maxHp;
        }

        // Set hero position from formation or use default
        const formation = state.heroFormation[hero.instanceId];
        if (formation) {
          // Use the formation position
          (hero as any).formationPosition = formation;
        } else {
          // Default position if not in formation
          const row = Math.min(2 + Math.floor(index / 2), 5);
          const col = index % 2;
          (hero as any).formationPosition = { row, col };
        }
      });

      // Warn if team was trimmed
      if (state.preBattleTeam.length > stage.playerSlots) {
      }

      // Create enemies from stage with scaling based on stage number
      // Handle both single wave (string[]) and multi-wave (string[][]) formats
      const enemies = Array.isArray(stage.enemies[0])
        ? // Multi-wave format: array of arrays
          (stage.enemies as string[][]).map(wave =>
            wave.map(enemyType => createEnemyInstance(enemyType, state.selectedStageId!))
          )
        : // Single wave format: flat array
          (stage.enemies as string[]).map(enemyType =>
            createEnemyInstance(enemyType, state.selectedStageId!)
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
      const simulator = new DeterministicBattleSimulatorV2(heroesWithPositions as any, enemies);
      const battleState: BattleState = simulator.simulate();

      // Force cleanup any invalid positions that somehow got through
      const gridRows = state.gridSize?.rows || 8;
      const gridCols = state.gridSize?.cols || 8;

      battleState.heroes = battleState.heroes.map(hero => {
        if (hero.position.row >= gridRows || hero.position.col >= gridCols ||
            hero.position.row < 0 || hero.position.col < 0) {
          return { ...hero, position: { row: 0, col: 0 } };
        }
        return hero;
      });

      battleState.enemies = battleState.enemies.map(enemy => {
        if (enemy.position.row >= gridRows || enemy.position.col >= gridCols ||
            enemy.position.row < 0 || enemy.position.col < 0) {
          return { ...enemy, position: { row: 0, col: 6 } };
        }
        return enemy;
      });

      // IMPORTANT: Use formation positions if available
      battleState.heroes.forEach((hero, index) => {
        // Check if we have a formation position for this hero
        const originalHero = heroes.find(h => h.instanceId === hero.instanceId);
        const formationPos = originalHero ? (originalHero as any).formationPosition : null;

        if (formationPos) {
          // Use the formation position
          hero.position = { row: formationPos.row, col: formationPos.col };
        } else {
          // Default positioning
          const row = Math.min(2 + Math.floor(index / 2), 7);
          const col = index % 2;
          hero.position = { row, col };
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
          const heroKeys = Object.keys(formation);
          const hasCustomFormation = heroKeys.length > 0 && state.isFormationUserModified;

          if (hasCustomFormation) {
            // Apply custom formation - user has manually positioned heroes
            state.currentBattle.heroes.forEach(hero => {
              if (hero.isAlive) {
                const desiredPos = formation[hero.instanceId!];
                if (desiredPos) {
                  // Use the exact position the user specified
                  const oldPos = { ...hero.position };
                  hero.position = { row: desiredPos.row, col: desiredPos.col };
                }
              }
            });

            // Mark that custom formation was applied (for animation system)
            event.data.customFormationApplied = true;

            // Keep formation data for this wave - user might want to modify it again
            // Formation will be cleared when we advance to next wave

            // TODO: Implement proper battle re-simulation with custom formation
            // For now, just apply the custom positions - movement will be fixed in next iteration
          } else {
            // No custom formation - let the simulator's transitions apply normally
            if (event.data.heroTransitions) {
              event.data.heroTransitions.forEach((transition: any) => {
                const hero = state.currentBattle!.heroes.find(h => h.id === transition.unitId);
                if (hero) {
                  hero.position = transition.to;
                }
              });
            }

            // Clear formation data since no custom formation was applied
            // This allows fresh initialization for next formation UI
            set({ heroFormation: {}, isFormationUserModified: false });
          }
        } else if (event.type === 'waveStart') {
          // Update current wave number when new wave spawns - trust the simulator as source of truth
          state.currentBattle.currentWave = event.data.waveNumber;

          // Update enemy positions from wave start event (slide-in animation)
          if (event.data.enemies) {
            event.data.enemies.forEach((enemyData: any) => {
              const enemy = state.currentBattle!.enemies.find(e => e.id === enemyData.unitId);
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
        } else if (event.type === 'defeat') {
          // Set winner when defeat event is processed
          state.currentBattle.winner = 'enemies';
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
        const battle = state.currentBattle;
        const hasMoreWaves = battle.currentWave < battle.totalWaves;

        if (hasMoreWaves && !battle.winner) {
          // More waves remaining but no events - this means wave completed and we need formation management

          // A short delay to allow the last visuals to settle.
          setTimeout(() => {
            state.navigate(ScreenType.BattleInventory);
          }, 1000); // 1s delay

          return; // Explicitly stop, preventing fall-through to victory/defeat logic.
        }

        // Battle truly finished - handle victory/defeat
        if (state.currentBattle.winner === 'heroes' && state.selectedStageId) {
          // Award rewards and mark stage as completed
          const stage = getStageById(state.selectedStageId);
          if (stage) {
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

            // Apply gold multiplier based on max wave reached
            const maxWaveReached = state.currentBattle!.currentWave;
            const goldMultiplier = maxWaveReached <= 3 ? 1.0 :
                                    maxWaveReached <= 6 ? 1.5 :
                                    maxWaveReached <= 9 ? 2.0 :
                                    4.0; // Wave 10+

            // Calculate gold with multiplier, minus medical costs
            const baseGold = Math.floor(stage.rewards.gold * goldMultiplier);
            const netGold = Math.max(0, baseGold - medicalCosts);

            // Calculate gems for boss stages
            const gemsEarned = (stage.rewards.gems && stage.rewards.gems > 0) ? stage.rewards.gems : 0;

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
                    }
                  });
                }
              }
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

                    if (newDurability === 0) {
                      // Item broke - remove it
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

            // Navigate to reward reveal screen
            if ((window as any).__gridNavigate) {
              (window as any).__gridNavigate(ScreenType.RewardReveal);
            } else {
              state.navigate(ScreenType.RewardReveal);
            }
          }
        } else {
          // Defeat - return to location map

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

    retreatFromBattle: () => {
      const state = get();

      if (!state.currentBattle || !state.selectedStageId) {
        return;
      }

      const stage = getStageById(state.selectedStageId);
      if (!stage) return;

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

      // Apply gold multiplier based on wave reached
      const goldMultiplier = maxWaveReached <= 3 ? 1.0 :
                              maxWaveReached <= 6 ? 1.5 :
                              maxWaveReached <= 9 ? 2.0 :
                              4.0; // Wave 10+

      // Calculate partial gold (50% of stage rewards) with multiplier, minus medical costs
      const baseGold = Math.floor((stage.rewards.gold * 0.5) * goldMultiplier);
      const netGold = Math.max(0, baseGold - medicalCosts);

      // Award partial XP based on progress in battle
      // Give credit for partially completed waves based on enemies defeated
      const currentWaveEnemiesDefeated = state.currentBattle.enemies.filter(e => e.wave === maxWaveReached && !e.isAlive).length;
      const currentWaveTotalEnemies = state.currentBattle.enemies.filter(e => e.wave === maxWaveReached).length;
      const currentWaveProgress = currentWaveTotalEnemies > 0 ? currentWaveEnemiesDefeated / currentWaveTotalEnemies : 0;

      // Calculate effective waves completed (including partial progress in current wave)
      const wavesFullyCompleted = Math.max(0, maxWaveReached - 1);
      const effectiveWavesCompleted = wavesFullyCompleted + currentWaveProgress;

      if (effectiveWavesCompleted > 0 && state.currentBattle.totalWaves > 0) {
        const baseXpPerWave = Math.floor(stage.rewards.experience / state.currentBattle.totalWaves);
        const totalXp = Math.floor(baseXpPerWave * effectiveWavesCompleted * 0.5); // 50% XP penalty for retreat

        // Award XP to surviving heroes only
        const survivingHeroes = state.preBattleTeam.filter(heroId => {
          const battleHero = state.currentBattle!.heroes.find(h => h.instanceId === heroId);
          return battleHero && battleHero.isAlive;
        });

        if (survivingHeroes.length > 0 && totalXp > 0) {
          const xpPerHero = Math.floor(totalXp / survivingHeroes.length);
          survivingHeroes.forEach(heroId => {
            state.awardHeroExperience(heroId, xpPerHero);
          });
        } else {
        }
      } else {
      }

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

              if (newDurability === 0) {
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
              }
            });
          }
        }
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

      // Navigate to reward reveal screen
      if ((window as any).__gridNavigate) {
        (window as any).__gridNavigate(ScreenType.RewardReveal);
      } else {
        state.navigate(ScreenType.RewardReveal);
      }
    },

    startNextWave: () => {
      const state = get();
      if (!state.currentBattle || !state.selectedStageId) {
        return;
      }

      const { currentBattle, selectedStageId, roster, heroFormation } = state;
      const nextWaveNumber = currentBattle.currentWave + 1;

      if (nextWaveNumber > currentBattle.totalWaves) {
        return;
      }

      // 1. Get hero state from the formation screen, applying any changes
      const heroesFromFormation = currentBattle.heroes.map(battleHero => {
        const rosterHero = roster.find(r => r.instanceId === battleHero.instanceId);
        if (!rosterHero) return null;

        // Use the latest stats from the battle, but take new positions from the formation
        const finalPosition = heroFormation[battleHero.instanceId!] || battleHero.position;

        return {
          ...rosterHero,
          currentStats: { ...battleHero.stats }, // Preserve HP, etc.
          abilities: [...battleHero.abilities],
          position: finalPosition, // Use updated position
          isAlive: battleHero.isAlive,
        };
      }).filter(h => h !== null && h.isAlive) as Hero[];

      // 2. Get original enemy configuration for the stage
      const stage = getStageById(selectedStageId);
      if (!stage) return;

      const allEnemiesForStage = (Array.isArray(stage.enemies[0])
        ? (stage.enemies as string[][]).map(wave => wave.map(enemyType => createEnemyInstance(enemyType, selectedStageId)))
        : (stage.enemies as string[]).map(enemyType => createEnemyInstance(enemyType, selectedStageId))
      ) as Enemy[][] | Enemy[];

      // 3. Re-initialize the simulator with the current state
      const simulator = new DeterministicBattleSimulatorV2(heroesFromFormation, allEnemiesForStage);

      // 4. Simulate ONLY the next wave, passing in existing events
      const newBattleState = simulator.simulateWave(nextWaveNumber, currentBattle.events);

      // 5. Reset hero positions to formation (like startBattle does for wave 1).
      //    The simulation leaves heroes at post-combat/post-transition positions,
      //    but we need the initial render to show formation positions.
      //    Events will animate them from here during combat playback.
      newBattleState.heroes.forEach(hero => {
        const formationPos = heroFormation[hero.instanceId!];
        if (formationPos) {
          hero.position = { row: formationPos.row, col: formationPos.col };
        }
        // Reset to pre-combat HP (what they had at end of previous wave)
        const sourceHero = heroesFromFormation.find(h => h.instanceId === hero.instanceId);
        if (sourceHero) {
          hero.stats.hp = sourceHero.currentStats.hp;
          hero.stats.maxHp = sourceHero.currentStats.maxHp;
          hero.isAlive = (sourceHero as any).isAlive !== false;
          hero.cooldown = 0;
        }
      });

      // 6. Reset wave enemies to spawn positions for initial render.
      //    The WaveStart event will set them to toPosition when it plays.
      const waveStartEvent = newBattleState.events.find(
        (e: BattleEvent) => e.type === BattleEventType.WaveStart && e.data.waveNumber === nextWaveNumber
      );
      newBattleState.enemies.forEach(enemy => {
        if (enemy.wave === nextWaveNumber) {
          // Find this enemy's spawn data from the WaveStart event
          const spawnData = waveStartEvent?.data.enemies?.find(
            (ed: any) => ed.unitId === enemy.id
          );
          if (spawnData) {
            enemy.position = spawnData.toPosition;
          }
          // Reset to full HP (fresh enemies)
          enemy.stats.hp = enemy.stats.maxHp;
          enemy.isAlive = true;
          enemy.cooldown = 0;
        }
      });

      // 7. Clear the winner so battle can play out with auto-advance
      newBattleState.winner = null;

      // 8. Update the store's battle state
      set({
        currentBattle: {
          ...currentBattle, // keep old state
          ...newBattleState, // overwrite with new events, units, etc.
          currentWave: nextWaveNumber, // Ensure wave number is updated
        },
        isFormationUserModified: false, // Reset formation modification flag for the new wave
      });

      // 9. Navigate back to the battle screen
      state.navigate(ScreenType.Battle);
    },
  };

  return {
    ...battleInitialState,
    ...actions,
  };
}
