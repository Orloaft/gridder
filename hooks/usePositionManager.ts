import { useRef, useEffect } from 'react';
import { PositionManager } from '@/systems/PositionManager';
import { AnimationCoordinator } from '@/systems/AnimationCoordinator';
import { useGameStore } from '@/store/gameStore';
import { ScreenType } from '@/types/progression.types';
import { BattleEventType } from '@/systems/BattleSimulator';
import gsap from 'gsap';

/**
 * Hook to integrate PositionManager and AnimationCoordinator with the UI
 * This ensures visual and logical positions stay synchronized
 */
export function usePositionManager() {
  const positionManagerRef = useRef<PositionManager | null>(null);
  const animationCoordinatorRef = useRef<AnimationCoordinator | null>(null);
  const { currentScreen, currentBattle, useDeterministicBattle } = useGameStore();

  // Initialize managers when battle starts
  useEffect(() => {
    // V2 deterministic system can work WITH position manager if enabled
    // The V2 system's pre-computed positions provide the source of truth

    if (currentScreen === ScreenType.Battle && currentBattle) {
      // Create new instances
      positionManagerRef.current = new PositionManager(8, 8);
      animationCoordinatorRef.current = new AnimationCoordinator(positionManagerRef.current);

      // Initialize with current battle units
      const allUnits = [...currentBattle.heroes, ...currentBattle.enemies];

      // Debug: Check for invalid positions before initializing
      // Note: col:8 is valid for off-screen enemies that will slide in
      const invalidUnits = allUnits.filter(u => u.position.col > 8 || u.position.row >= 8 || u.position.col < 0 || u.position.row < 0);
      if (invalidUnits.length > 0) {
        console.error('[usePositionManager] Found units with invalid positions:');
        invalidUnits.forEach(u => {
          console.error(`  - ${u.name} (${u.isHero ? 'Hero' : 'Enemy'}): position (${u.position.row}, ${u.position.col}), alive: ${u.isAlive}`);
        });
      }

      allUnits.forEach(unit => {
        if (unit.isAlive) {
          // Skip units with truly invalid positions (col:8 is valid for off-screen)
          if (unit.position.col > 8 || unit.position.row >= 8 || unit.position.col < 0 || unit.position.row < 0) {
            console.warn(`[usePositionManager] Skipping unit ${unit.name} with invalid position (${unit.position.row},${unit.position.col})`);
            return;
          }
          // Note: We still track off-screen units at col:8 in position manager
          positionManagerRef.current?.initializeUnit(unit.id, unit.position);
        }
      });

      console.log('[usePositionManager] Initialized with', allUnits.filter(u => u.isAlive).length, 'units');

      // IMPORTANT: Force sync visual positions immediately after initialization
      // This prevents the initial movement animation offset bug
      // We need multiple sync attempts because React might update positions after initial render
      const syncPositions = () => {
        // Get the actual cell size from the grid
        const gridElement = document.querySelector('[data-unit-id]')?.parentElement?.parentElement;
        let cellSize = 100; // Default
        if (gridElement instanceof HTMLElement) {
          const gridWidth = gridElement.offsetWidth;
          const gridCols = 8; // Standard grid width
          cellSize = gridWidth / gridCols;
          console.log('[usePositionManager] Detected cell size:', cellSize);
        }

        // Update the animation coordinator's cell size
        animationCoordinatorRef.current?.setCellSize(cellSize);

        const units = allUnits
          .filter(u => u.isAlive)
          .map(unit => {
            const element = document.querySelector(`[data-unit-id="${unit.id}"]`)?.parentElement as HTMLElement;
            if (element) {
              // Get expected position
              const pos = unit.position;
              const expectedLeft = pos.col * cellSize;
              const expectedTop = pos.row * cellSize;

              // Check current position
              const currentLeft = parseFloat(element.style.left) || 0;
              const currentTop = parseFloat(element.style.top) || 0;

              // Log mismatches for debugging
              if (Math.abs(currentLeft - expectedLeft) > 1 || Math.abs(currentTop - expectedTop) > 1) {
                console.warn(`[usePositionManager] Position mismatch for ${unit.name}: current (${currentLeft}, ${currentTop}) vs expected (${expectedLeft}, ${expectedTop})`);

                // Force correct position
                element.style.left = `${expectedLeft}px`;
                element.style.top = `${expectedTop}px`;
                element.style.transform = 'none';
              }

              return { unitId: unit.id, element };
            }
            return null;
          })
          .filter(Boolean) as Array<{unitId: string, element: HTMLElement}>;

        console.log('[usePositionManager] Force syncing initial positions for', units.length, 'units');
        animationCoordinatorRef.current?.syncAllVisualPositions(units);
      };

      // Sync multiple times to catch any React re-renders
      setTimeout(syncPositions, 50);   // First sync
      setTimeout(syncPositions, 150);  // Second sync after React might have updated
      setTimeout(syncPositions, 300);  // Final sync to be sure
    }

    return () => {
      // Cleanup on unmount
      if (animationCoordinatorRef.current) {
        animationCoordinatorRef.current.stopAllAnimations();
      }
      positionManagerRef.current = null;
      animationCoordinatorRef.current = null;
    };
  }, [currentScreen, currentBattle]);

  // Handle movement events from BattleSimulator
  useEffect(() => {
    const handleMoveEvent = async (event: CustomEvent) => {
      const { unitId, from, to, transactionId } = event.detail;

      if (!animationCoordinatorRef.current || !positionManagerRef.current) return;

      const unitElement = document.querySelector(`[data-unit-id="${unitId}"]`)?.parentElement as HTMLElement;
      if (!unitElement) return;

      // If we have a transaction ID, use the transactional animation
      if (transactionId) {
        await animationCoordinatorRef.current.animateMove(
          unitId,
          unitElement,
          from,
          to,
          transactionId,
          0.3
        );
      } else {
        // Fallback: direct position update
        const cellSize = 100; // Get from responsive dimensions
        gsap.set(unitElement, {
          left: to.col * cellSize,
          top: to.row * cellSize
        });
      }
    };

    window.addEventListener('battleMove', handleMoveEvent as any);
    return () => {
      window.removeEventListener('battleMove', handleMoveEvent as any);
    };
  }, []);

  // Handle wave transitions
  useEffect(() => {
    const handleWaveTransition = async (event: CustomEvent) => {
      const { scrollDistance } = event.detail;

      if (!animationCoordinatorRef.current || !currentBattle) return;

      // Collect all alive units with their elements
      const units = [...currentBattle.heroes, ...currentBattle.enemies]
        .filter(u => u.isAlive)
        .map(unit => {
          const element = document.querySelector(`[data-unit-id="${unit.id}"]`)?.parentElement as HTMLElement;
          return element ? { unitId: unit.id, element } : null;
        })
        .filter(Boolean) as Array<{unitId: string, element: HTMLElement}>;

      // Perform coordinated wave scroll
      await animationCoordinatorRef.current.animateWaveScroll(units, scrollDistance, 1);
    };

    window.addEventListener('waveScroll', handleWaveTransition as any);
    return () => {
      window.removeEventListener('waveScroll', handleWaveTransition as any);
    };
  }, [currentBattle]);

  // Sync visual positions on battle updates
  useEffect(() => {
    if (!positionManagerRef.current || !animationCoordinatorRef.current || !currentBattle) {
      return;
    }

    // Sync all unit positions
    const units = [...currentBattle.heroes, ...currentBattle.enemies]
      .filter(u => u.isAlive)
      .map(unit => {
        const element = document.querySelector(`[data-unit-id="${unit.id}"]`)?.parentElement as HTMLElement;
        return element ? { unitId: unit.id, element } : null;
      })
      .filter(Boolean) as Array<{unitId: string, element: HTMLElement}>;

    animationCoordinatorRef.current.syncAllVisualPositions(units);
  }, [currentBattle?.tick]);

  return {
    positionManager: positionManagerRef.current,
    animationCoordinator: animationCoordinatorRef.current,
    isAnyUnitAnimating: () => animationCoordinatorRef.current?.isAnyUnitAnimating() || false,
    isUnitAnimating: (unitId: string) => animationCoordinatorRef.current?.isUnitAnimating(unitId) || false,
  };
}