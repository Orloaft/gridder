/**
 * useDeterministicBattle Hook
 *
 * React hook that manages deterministic battle simulation and animation playback.
 * Separates battle logic from animation for perfect synchronization.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Hero, Enemy } from '@/types/core.types';
import { DeterministicBattleSimulator, BattleAction } from '@/systems/DeterministicBattleSimulator';
import { BattleAnimationPlayer } from '@/systems/BattleAnimationPlayer';
import { useResponsiveDimensions } from '@/hooks/useResponsiveDimensions';

export interface BattleProgress {
  currentAction: number;
  totalActions: number;
  progress: number;
  currentWave: number;
  totalWaves: number;
}

export interface DeterministicBattleState {
  // Battle state
  isSimulating: boolean;
  isAnimating: boolean;
  isPaused: boolean;
  battleSpeed: number;

  // Progress tracking
  progress: BattleProgress;

  // Actions sequence
  actions: BattleAction[];

  // Current visual state (for UI updates)
  unitStates: Map<string, {
    hp: number;
    maxHp: number;
    position: { row: number; col: number };
    isAlive: boolean;
  }>;

  // Battle result
  result: {
    winner?: 'heroes' | 'enemies';
    wavesCompleted: number;
  } | null;
}

export function useDeterministicBattle() {
  const { mainGridCellSize } = useResponsiveDimensions();

  const simulatorRef = useRef(new DeterministicBattleSimulator());
  const animationPlayerRef = useRef<BattleAnimationPlayer | null>(null);

  const [state, setState] = useState<DeterministicBattleState>({
    isSimulating: false,
    isAnimating: false,
    isPaused: false,
    battleSpeed: 1,
    progress: {
      currentAction: 0,
      totalActions: 0,
      progress: 0,
      currentWave: 1,
      totalWaves: 1,
    },
    actions: [],
    unitStates: new Map(),
    result: null,
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
      onProgress: handleProgress,
    });

    return () => {
      animationPlayerRef.current?.stop();
    };
  }, [mainGridCellSize]);

  /**
   * Simulate a complete battle wave
   */
  const simulateWave = useCallback(async (
    heroes: Hero[],
    enemies: Enemy[],
    waveNumber: number = 1,
    totalWaves: number = 1
  ) => {
    setState(prev => ({
      ...prev,
      isSimulating: true,
      actions: [],
      progress: {
        ...prev.progress,
        currentWave: waveNumber,
        totalWaves: totalWaves,
      }
    }));

    // Run simulation
    const simulator = simulatorRef.current;
    const actions = simulator.simulateWave(heroes, enemies, waveNumber, totalWaves);

    // Initialize unit states from spawn actions
    const unitStates = new Map();
    for (const action of actions) {
      if (action.type === 'spawn') {
        const hero = heroes.find(h => h.instanceId === action.unitId);
        const enemy = enemies.find(e => e.instanceId === action.unitId);
        const unit = hero || enemy;

        if (unit) {
          unitStates.set(action.unitId, {
            hp: unit.currentStats.hp,
            maxHp: unit.currentStats.maxHp,
            position: action.position,
            isAlive: true,
          });
        }
      }
    }

    setState(prev => ({
      ...prev,
      isSimulating: false,
      actions,
      unitStates,
      progress: {
        ...prev.progress,
        totalActions: actions.length,
      }
    }));

    return actions;
  }, []);

  /**
   * Play the animation sequence
   */
  const playAnimations = useCallback(async () => {
    if (!animationPlayerRef.current || state.actions.length === 0) return;

    setState(prev => ({ ...prev, isAnimating: true, isPaused: false }));

    // Load actions into player
    animationPlayerRef.current.loadActions(state.actions);

    // Set speed
    animationPlayerRef.current.setSpeed(state.battleSpeed);

    // Start playing
    await animationPlayerRef.current.play();
  }, [state.actions, state.battleSpeed]);

  /**
   * Run complete battle (simulate then animate)
   */
  const runBattle = useCallback(async (
    heroes: Hero[],
    enemies: Enemy[],
    waveNumber: number = 1,
    totalWaves: number = 1
  ) => {
    // First simulate
    const actions = await simulateWave(heroes, enemies, waveNumber, totalWaves);

    // Then animate
    if (actions.length > 0) {
      // Small delay to let UI update
      await new Promise(resolve => setTimeout(resolve, 100));
      await playAnimations();
    }
  }, [simulateWave, playAnimations]);

  /**
   * Handle action completion during animation
   */
  const handleActionComplete = useCallback((action: BattleAction, index: number) => {
    setState(prev => {
      const newUnitStates = new Map(prev.unitStates);

      // Update unit states based on action
      switch (action.type) {
        case 'move':
          const moveUnit = newUnitStates.get(action.unitId);
          if (moveUnit) {
            moveUnit.position = action.to;
          }
          break;

        case 'damage':
          const damageUnit = newUnitStates.get(action.targetId);
          if (damageUnit) {
            damageUnit.hp = action.remainingHp;
          }
          break;

        case 'death':
          const deadUnit = newUnitStates.get(action.unitId);
          if (deadUnit) {
            deadUnit.isAlive = false;
          }
          break;

        case 'spawn':
          // Unit already in state from simulation
          break;

        case 'wave-complete':
          // Update result
          return {
            ...prev,
            unitStates: newUnitStates,
            progress: {
              ...prev.progress,
              currentAction: index + 1,
            },
            result: {
              winner: undefined,
              wavesCompleted: action.waveNumber,
            }
          };

        case 'battle-end':
          // Battle ended
          return {
            ...prev,
            unitStates: newUnitStates,
            progress: {
              ...prev.progress,
              currentAction: index + 1,
            },
            result: {
              winner: action.winner,
              wavesCompleted: action.finalWave,
            }
          };
      }

      return {
        ...prev,
        unitStates: newUnitStates,
        progress: {
          ...prev.progress,
          currentAction: index + 1,
        }
      };
    });
  }, []);

  /**
   * Handle animation progress
   */
  const handleProgress = useCallback((progress: number) => {
    setState(prev => ({
      ...prev,
      progress: {
        ...prev.progress,
        progress,
      }
    }));
  }, []);

  /**
   * Handle animation completion
   */
  const handleAnimationComplete = useCallback(() => {
    setState(prev => ({
      ...prev,
      isAnimating: false,
    }));
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
   * Stop animation
   */
  const stopAnimation = useCallback(() => {
    animationPlayerRef.current?.stop();
    setState(prev => ({
      ...prev,
      isAnimating: false,
      isPaused: false,
      progress: {
        ...prev.progress,
        currentAction: 0,
        progress: 0,
      }
    }));
  }, []);

  /**
   * Set battle speed
   */
  const setBattleSpeed = useCallback((speed: number) => {
    animationPlayerRef.current?.setSpeed(speed);
    setState(prev => ({ ...prev, battleSpeed: speed }));
  }, []);

  /**
   * Simulate wave transition between waves
   */
  const simulateWaveTransition = useCallback((
    remainingHeroes: Hero[],
    nextWaveEnemies: Enemy[],
    scrollDistance: number = 2
  ) => {
    const simulator = simulatorRef.current;
    const transitionActions = simulator.simulateWaveTransition(
      remainingHeroes,
      nextWaveEnemies,
      scrollDistance
    );

    setState(prev => ({
      ...prev,
      actions: [...prev.actions, ...transitionActions],
      progress: {
        ...prev.progress,
        totalActions: prev.actions.length + transitionActions.length,
      }
    }));

    return transitionActions;
  }, []);

  return {
    // State
    ...state,

    // Actions
    simulateWave,
    playAnimations,
    runBattle,
    pauseAnimation,
    resumeAnimation,
    stopAnimation,
    setBattleSpeed,
    simulateWaveTransition,
  };
}