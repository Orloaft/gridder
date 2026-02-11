import { useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { doomsdaySystem, DoomsdayEvent } from '@/systems/DoomsdaySystem';
import { ScreenType } from '@/types/progression.types';

/**
 * Hook to integrate the Doomsday system with game actions
 */
export function useDoomsdaySystem() {
  const {
    currentScreen,
    selectedStageId,
    currentBattle,
    campaign,
    navigate,
  } = useGameStore();

  // Track last animation time to prevent rapid triggers
  const lastAnimationTime = useRef(0);
  const ANIMATION_COOLDOWN = 2000; // 2 seconds between animations

  // Process time cost when starting a mission
  const processMissionStart = useCallback((missionType: 'forest' | 'caves' | 'ruins') => {
    const timeCostMap = {
      forest: 'forestMission' as const,
      caves: 'cavesMission' as const,
      ruins: 'ruinsMission' as const,
    };

    const action = timeCostMap[missionType];
    const timeCost = doomsdaySystem.getTimeCost(action);
    const previousDay = doomsdaySystem.getState().currentDay;

    // Advance time and get events
    const result = doomsdaySystem.advanceTime(timeCost, `Started ${missionType} mission`);

    // Check if enough time has passed since last animation
    const now = Date.now();
    if (now - lastAnimationTime.current > ANIMATION_COOLDOWN) {
      lastAnimationTime.current = now;

      // Trigger time passage animation using custom event
      window.dispatchEvent(new CustomEvent('timePassage', {
        detail: {
          daysElapsed: result.daysElapsed,
          previousDay: previousDay,
          newDay: doomsdaySystem.getState().currentDay,
          action: `Starting ${missionType.charAt(0).toUpperCase() + missionType.slice(1)} Mission`
        }
      }));
    }

    // Display warnings
    result.warnings.forEach(warning => {
      // Could trigger UI notifications here
    });

    // Handle new events
    result.newEvents.forEach(event => {
      handleDoomsdayEvent(event);
    });

    // Apply enemy buffs to battle
    if (currentBattle) {
      applyGlobalBuffsToBattle();
    }

    return result;
  }, [currentBattle]);

  // Process retreat time cost
  const processRetreat = useCallback(() => {
    const timeCost = doomsdaySystem.getTimeCost('retreat');
    const result = doomsdaySystem.advanceTime(timeCost, 'Retreated from battle');

    return result;
  }, []);

  // Process shop visit
  const processShopVisit = useCallback(() => {
    const timeCost = doomsdaySystem.getTimeCost('shopVisit');
    const result = doomsdaySystem.advanceTime(timeCost, 'Visited shop');

    return result;
  }, []);

  // Process rest action
  const processRest = useCallback(() => {
    const timeCost = doomsdaySystem.getTimeCost('rest');
    const result = doomsdaySystem.advanceTime(timeCost, 'Rested heroes');

    // Note: Hero healing would be handled by the game store
    // This is just tracking the time cost

    return result;
  }, []);

  // Handle doomsday events
  const handleDoomsdayEvent = useCallback((event: DoomsdayEvent) => {
    // Dispatch custom event for UI to handle
    window.dispatchEvent(new CustomEvent('doomsdayEvent', {
      detail: event
    }));

    // Handle specific events
    switch (event.id) {
      case 'first_seal_broken':
        // Apply first seal effects
        break;

      case 'legion_invasion':
        // Spawn rate increase
        break;

      case 'blood_moon':
        // Apply blood moon effects
        break;

      case 'apocalypse':
        // Game over
        handleGameOver();
        break;
    }
  }, []);

  // Apply global buffs to current battle
  const applyGlobalBuffsToBattle = useCallback(() => {
    if (!currentBattle) return;

    const multipliers = doomsdaySystem.getAntagonistMultiplier();
    const globalBuffs = doomsdaySystem.getGlobalEnemyBuffs();

    // Apply multipliers to all enemies
    currentBattle.enemies.forEach(enemy => {
      enemy.maxHp = Math.floor(enemy.maxHp * multipliers.healthMultiplier);
      enemy.currentHp = Math.floor(enemy.currentHp * multipliers.healthMultiplier);
      enemy.damage = Math.floor(enemy.damage * multipliers.damageMultiplier);
      enemy.speed = Math.floor(enemy.speed * multipliers.speedMultiplier);

      // Apply global buffs as status effects
      if (!enemy.statusEffects) enemy.statusEffects = [];

      globalBuffs.forEach(buff => {
        switch (buff) {
          case 'shadow_empowerment':
            enemy.statusEffects!.push({
              type: 'damage_boost',
              value: 1.1,
              duration: 999,
              source: 'Shadow Empowerment'
            });
            break;

          case 'legion_presence':
            enemy.statusEffects!.push({
              type: 'armor_boost',
              value: 1.2,
              duration: 999,
              source: 'Legion Presence'
            });
            break;

          case 'void_corruption':
            enemy.statusEffects!.push({
              type: 'lifesteal',
              value: 0.15,
              duration: 999,
              source: 'Void Corruption'
            });
            break;

          case 'blood_moon_madness':
            enemy.statusEffects!.push({
              type: 'crit_boost',
              value: 0.25,
              duration: 999,
              source: 'Blood Moon Madness'
            });
            break;

          case 'divine_wrath':
            enemy.statusEffects!.push({
              type: 'all_stats_boost',
              value: 1.5,
              duration: 999,
              source: 'Divine Wrath'
            });
            break;
        }
      });
    });

  }, [currentBattle]);

  // Handle game over
  const handleGameOver = useCallback(() => {
    // Navigate to game over screen
    navigate(ScreenType.MainMenu);

    // Show game over modal
    (window as any).__gameOver = {
      reason: 'doomsday',
      message: 'Malachar has completed the Void Ritual. The world has been consumed by darkness.',
      finalDay: doomsdaySystem.getState().currentDay,
      antagonistPower: doomsdaySystem.getState().antagonistPowerLevel
    };
  }, [navigate]);

  // Check for game over on each update
  useEffect(() => {
    if (doomsdaySystem.isGameOver()) {
      handleGameOver();
    }
  }, [handleGameOver]);

  // Track screen changes for time costs
  useEffect(() => {
    // Process time costs based on screen transitions
    switch (currentScreen) {
      case ScreenType.Shop:
        processShopVisit();
        break;

      case ScreenType.Battle:
        if (selectedStageId) {
          // Determine mission type from stage ID
          if (selectedStageId <= 10) {
            processMissionStart('forest');
          } else if (selectedStageId <= 20) {
            processMissionStart('caves');
          } else {
            processMissionStart('ruins');
          }
        }
        break;
    }
  }, [currentScreen, selectedStageId, processMissionStart, processShopVisit]);

  // Calculate mission efficiency for UI
  const getMissionEfficiency = useCallback((
    missionType: 'forest' | 'caves' | 'ruins'
  ) => {
    const expectedRewards = {
      forest: { gold: 100, items: 1, xp: 50 },
      caves: { gold: 250, items: 2, xp: 150 },
      ruins: { gold: 500, items: 3, xp: 300 }
    };

    const timeCostMap = {
      forest: 'forestMission' as const,
      caves: 'cavesMission' as const,
      ruins: 'ruinsMission' as const,
    };

    return doomsdaySystem.getMissionEfficiency(
      timeCostMap[missionType],
      expectedRewards[missionType]
    );
  }, []);

  return {
    doomsdayState: doomsdaySystem.getState(),
    urgencyLevel: doomsdaySystem.getUrgencyLevel(),
    daysUntilDoom: doomsdaySystem.getDaysUntilDoom(),
    antagonistMultipliers: doomsdaySystem.getAntagonistMultiplier(),
    globalEnemyBuffs: doomsdaySystem.getGlobalEnemyBuffs(),

    processMissionStart,
    processRetreat,
    processShopVisit,
    processRest,
    getMissionEfficiency,

    performSabotage: doomsdaySystem.performSabotage.bind(doomsdaySystem),
    getTimeCost: doomsdaySystem.getTimeCost.bind(doomsdaySystem),
  };
}