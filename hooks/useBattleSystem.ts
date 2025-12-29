/**
 * useBattleSystem Hook
 *
 * Integrates the deterministic battle simulator with the existing game UI.
 * Provides compatibility layer between the new deterministic system and existing components.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Hero, Enemy } from '@/types/core.types';
import { DeterministicBattleSimulator, BattleAction } from '@/systems/DeterministicBattleSimulator';
import { BattleAnimationPlayer } from '@/systems/BattleAnimationPlayer';
import { BattleState, BattleEvent, BattleEventType, BattleUnit } from '@/systems/BattleSimulator';
import { useResponsiveDimensions } from '@/hooks/useResponsiveDimensions';

interface BattleSystemState {
  // Simulation state
  isSimulating: boolean;
  isAnimating: boolean;
  isPaused: boolean;
  battleSpeed: number;

  // Current battle state (for UI)
  battleState: BattleState | null;
  currentActionIndex: number;

  // Actions from deterministic simulator
  actions: BattleAction[];
}

/**
 * Converts deterministic actions to BattleState format for UI compatibility
 */
function createBattleStateFromActions(
  heroes: Hero[],
  enemies: Enemy[],
  actions: BattleAction[],
  currentActionIndex: number
): BattleState {
  // Initialize units from heroes and enemies
  const battleUnits: { heroes: BattleUnit[], enemies: BattleUnit[] } = {
    heroes: heroes.map(h => ({
      id: h.instanceId,
      instanceId: h.instanceId,
      name: h.name,
      class: h.class,
      spritePath: h.spritePath,
      position: { row: 3, col: 0 }, // Will be updated from spawn actions
      stats: { ...h.currentStats },
      cooldown: 0,
      cooldownRate: h.currentStats.speed / 10,
      isAlive: true,
      wave: undefined
    })),
    enemies: enemies.map(e => ({
      id: e.instanceId,
      instanceId: e.instanceId,
      name: e.name,
      spritePath: e.spritePath,
      position: { row: 3, col: 7 }, // Will be updated from spawn actions
      stats: { ...e.currentStats },
      cooldown: 0,
      cooldownRate: e.currentStats.speed / 10,
      isAlive: true,
      wave: e.wave
    }))
  };

  // Apply actions up to currentActionIndex to get current state
  for (let i = 0; i <= currentActionIndex && i < actions.length; i++) {
    const action = actions[i];

    switch (action.type) {
      case 'spawn':
        // Update initial position
        const spawnUnit = action.isHero
          ? battleUnits.heroes.find(u => u.id === action.unitId)
          : battleUnits.enemies.find(u => u.id === action.unitId);
        if (spawnUnit) {
          spawnUnit.position = action.position;
        }
        break;

      case 'move':
        // Update position
        const moveUnit = [...battleUnits.heroes, ...battleUnits.enemies]
          .find(u => u.id === action.unitId);
        if (moveUnit) {
          moveUnit.position = action.to;
        }
        break;

      case 'damage':
        // Update HP
        const damageUnit = [...battleUnits.heroes, ...battleUnits.enemies]
          .find(u => u.id === action.targetId);
        if (damageUnit) {
          damageUnit.stats.hp = action.remainingHp;
        }
        break;

      case 'death':
        // Mark as dead
        const deadUnit = [...battleUnits.heroes, ...battleUnits.enemies]
          .find(u => u.id === action.unitId);
        if (deadUnit) {
          deadUnit.isAlive = false;
        }
        break;
    }
  }

  // Convert actions to events for compatibility
  const events: BattleEvent[] = actions.map(action => {
    switch (action.type) {
      case 'spawn':
        return {
          type: BattleEventType.WaveStart,
          tick: action.tick,
          data: {
            waveNumber: 1,
            totalWaves: 1,
            enemies: action.isHero ? [] : [{
              unitId: action.unitId,
              fromPosition: { row: action.position.row, col: 8 },
              toPosition: action.position
            }]
          }
        };

      case 'move':
        return {
          type: BattleEventType.Move,
          tick: action.tick,
          data: {
            unit: action.unitName,
            unitId: action.unitId,
            from: action.from,
            to: action.to
          }
        };

      case 'attack':
        return {
          type: BattleEventType.Attack,
          tick: action.tick,
          data: {
            attacker: action.attackerName,
            attackerId: action.attackerId,
            target: action.targetName,
            targetId: action.targetId,
            damage: action.damage
          }
        };

      case 'damage':
        return {
          type: BattleEventType.Damage,
          tick: action.tick,
          data: {
            target: action.targetName,
            targetId: action.targetId,
            damage: action.amount,
            remainingHp: action.remainingHp
          }
        };

      case 'death':
        return {
          type: BattleEventType.Death,
          tick: action.tick,
          data: {
            unit: action.unitName,
            unitId: action.unitId
          }
        };

      case 'wave-complete':
        return {
          type: BattleEventType.WaveComplete,
          tick: action.tick,
          data: {
            waveNumber: action.waveNumber,
            enemiesDefeated: action.enemiesDefeated,
            nextWaveNumber: action.waveNumber + 1,
            totalWaves: 10 // Will be set properly
          }
        };

      case 'battle-end':
        return {
          type: action.winner === 'heroes' ? BattleEventType.Victory : BattleEventType.Defeat,
          tick: action.tick,
          data: {}
        };

      default:
        return {
          type: BattleEventType.Tick,
          tick: action.tick,
          data: {}
        };
    }
  });

  // Determine winner
  let winner: 'heroes' | 'enemies' | null = null;
  const lastAction = actions[currentActionIndex];
  if (lastAction && lastAction.type === 'battle-end') {
    winner = lastAction.winner;
  }

  // Get current wave
  let currentWave = 1;
  for (let i = 0; i <= currentActionIndex && i < actions.length; i++) {
    if (actions[i].type === 'wave-complete') {
      currentWave = (actions[i] as any).waveNumber + 1;
    }
  }

  return {
    tick: actions[currentActionIndex]?.tick || 0,
    heroes: battleUnits.heroes,
    enemies: battleUnits.enemies,
    events,
    winner,
    currentWave,
    totalWaves: 10, // Will be set from actual battle
    enemyWaves: []
  };
}

export function useBattleSystem() {
  const { mainGridCellSize } = useResponsiveDimensions();

  const simulatorRef = useRef(new DeterministicBattleSimulator());
  const animationPlayerRef = useRef<BattleAnimationPlayer | null>(null);

  const [state, setState] = useState<BattleSystemState>({
    isSimulating: false,
    isAnimating: false,
    isPaused: false,
    battleSpeed: 1,
    battleState: null,
    currentActionIndex: 0,
    actions: []
  });

  /**
   * Initialize animation player
   */
  useEffect(() => {
    animationPlayerRef.current = new BattleAnimationPlayer({
      cellSize: mainGridCellSize,
      speed: state.battleSpeed,
      onActionComplete: handleActionComplete,
      onComplete: handleAnimationComplete,
      onProgress: handleProgress
    });

    return () => {
      animationPlayerRef.current?.stop();
    };
  }, [mainGridCellSize]);

  /**
   * Start a battle - simulates it then begins animation
   */
  const startBattle = useCallback(async (
    heroes: Hero[],
    enemies: Enemy[],
    waveNumber: number = 1,
    totalWaves: number = 1
  ) => {
    setState(prev => ({ ...prev, isSimulating: true }));

    // Run simulation
    const simulator = simulatorRef.current;
    const actions = simulator.simulateWave(heroes, enemies, waveNumber, totalWaves);

    // Create initial battle state
    const battleState = createBattleStateFromActions(heroes, enemies, actions, 0);

    setState(prev => ({
      ...prev,
      isSimulating: false,
      actions,
      battleState,
      currentActionIndex: 0
    }));

    // Start animation playback
    if (animationPlayerRef.current && actions.length > 0) {
      animationPlayerRef.current.loadActions(actions);
      animationPlayerRef.current.setSpeed(state.battleSpeed);

      setState(prev => ({ ...prev, isAnimating: true }));
      await animationPlayerRef.current.play();
    }

    return battleState;
  }, [state.battleSpeed]);

  /**
   * Handle action completion during animation
   */
  const handleActionComplete = useCallback((action: BattleAction, index: number) => {
    setState(prev => {
      // Update battle state based on completed action
      const newBattleState = createBattleStateFromActions(
        prev.battleState?.heroes.map(h => ({
          instanceId: h.instanceId,
          name: h.name,
          class: h.class || '',
          spritePath: h.spritePath,
          currentStats: h.stats,
          abilities: [],
          equipment: {},
          experience: 0,
          level: 1
        })) as Hero[] || [],
        prev.battleState?.enemies.map(e => ({
          instanceId: e.instanceId,
          name: e.name,
          spritePath: e.spritePath,
          currentStats: e.stats,
          baseStats: e.stats,
          tier: 1,
          wave: e.wave
        })) as Enemy[] || [],
        prev.actions,
        index
      );

      return {
        ...prev,
        battleState: newBattleState,
        currentActionIndex: index
      };
    });
  }, []);

  /**
   * Handle animation progress
   */
  const handleProgress = useCallback((progress: number) => {
    // Could update a progress bar here
  }, []);

  /**
   * Handle animation completion
   */
  const handleAnimationComplete = useCallback(() => {
    setState(prev => ({ ...prev, isAnimating: false }));
  }, []);

  /**
   * Pause animation
   */
  const pauseAnimation = useCallback(() => {
    animationPlayerRef.current?.pause();
    setState(prev => ({ ...prev, isPaused: true }));
  }, []);

  /**
   * Resume animation
   */
  const resumeAnimation = useCallback(() => {
    animationPlayerRef.current?.resume();
    setState(prev => ({ ...prev, isPaused: false }));
  }, []);

  /**
   * Set battle speed
   */
  const setBattleSpeed = useCallback((speed: number) => {
    animationPlayerRef.current?.setSpeed(speed);
    setState(prev => ({ ...prev, battleSpeed: speed }));
  }, []);

  /**
   * Advance to next event (for compatibility with existing system)
   */
  const advanceEvent = useCallback(() => {
    setState(prev => {
      const nextIndex = Math.min(prev.currentActionIndex + 1, prev.actions.length - 1);

      // Update battle state
      const newBattleState = createBattleStateFromActions(
        prev.battleState?.heroes.map(h => ({
          instanceId: h.instanceId,
          name: h.name,
          class: h.class || '',
          spritePath: h.spritePath,
          currentStats: h.stats,
          abilities: [],
          equipment: {},
          experience: 0,
          level: 1
        })) as Hero[] || [],
        prev.battleState?.enemies.map(e => ({
          instanceId: e.instanceId,
          name: e.name,
          spritePath: e.spritePath,
          currentStats: e.stats,
          baseStats: e.stats,
          tier: 1,
          wave: e.wave
        })) as Enemy[] || [],
        prev.actions,
        nextIndex
      );

      return {
        ...prev,
        battleState: newBattleState,
        currentActionIndex: nextIndex
      };
    });
  }, []);

  return {
    // State
    battleState: state.battleState,
    isSimulating: state.isSimulating,
    isAnimating: state.isAnimating,
    isPaused: state.isPaused,
    battleSpeed: state.battleSpeed,
    currentActionIndex: state.currentActionIndex,
    totalActions: state.actions.length,

    // Actions
    startBattle,
    pauseAnimation,
    resumeAnimation,
    setBattleSpeed,
    advanceEvent
  };
}