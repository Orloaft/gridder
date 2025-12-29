import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ScreenType } from '@/types/progression.types';
import { BattleEventType } from '@/systems/BattleSimulator';
import { animateTileSlide, animateAttack, animateDamage, animateDeath } from '@/animations/tileAnimations.optimized';
import { animateCleave, animateFireball, animateArrow, animateBuff, animateBloodStrike, createTileFlash } from '@/animations/skillAnimations';
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';
import { elementCache, batchUpdater, createDebouncedAnimation } from '@/utils/animationOptimizer';

declare global {
  interface Window {
    __abilityAnimationPlaying?: boolean;
    __tileAnimationPlaying?: boolean;
  }
}

/**
 * Optimized battle animations hook with caching and batching
 */
export function useBattleAnimations() {
  const { currentScreen, currentBattle, battleEventIndex } = useGameStore();
  const previousEventIndex = useRef(-1);
  const responsiveDimensions = useResponsiveGrid();
  const animationQueue = useRef<Array<() => void>>([]);
  const isProcessing = useRef(false);

  // Debounced animation processor
  const processAnimationQueue = useRef(
    createDebouncedAnimation(() => {
      if (isProcessing.current || animationQueue.current.length === 0) return;

      isProcessing.current = true;
      const animation = animationQueue.current.shift();
      if (animation) {
        animation();
        // Process next animation after current one
        requestAnimationFrame(() => {
          isProcessing.current = false;
          if (animationQueue.current.length > 0) {
            processAnimationQueue.current();
          }
        });
      }
    }, 16) // 60fps timing
  );

  // Helper to get element with caching
  const getUnitElement = (unitId: string): { card: HTMLElement | null; wrapper: HTMLElement | null } => {
    const card = elementCache.getByUnitId(unitId);
    const wrapper = card?.parentElement as HTMLElement | null;
    return { card, wrapper };
  };

  // Helper to get grid container
  const getGridContainer = (wrapper: HTMLElement | null): HTMLElement | null => {
    return wrapper?.parentElement as HTMLElement | null;
  };

  useEffect(() => {
    if (currentScreen !== ScreenType.Battle || !currentBattle) {
      elementCache.clear(); // Clear cache when leaving battle
      return;
    }

    if (battleEventIndex === previousEventIndex.current) {
      return;
    }

    previousEventIndex.current = battleEventIndex;

    const event = currentBattle.events[battleEventIndex];
    if (!event) return;

    // Queue animation instead of executing immediately
    const queueAnimation = (animationFn: () => void) => {
      animationQueue.current.push(animationFn);
      processAnimationQueue.current();
    };

    switch (event.type) {
      case BattleEventType.WaveStart: {
        const enemies = event.data.enemies;
        const cellSize = responsiveDimensions.mainGridCellSize;

        // Batch all enemy entrance animations
        batchUpdater.add(() => {
          enemies.forEach((enemyData: any, index: number) => {
            queueAnimation(() => {
              const { wrapper } = getUnitElement(enemyData.unitId);
              if (wrapper) {
                setTimeout(() => {
                  animateTileSlide(
                    wrapper,
                    enemyData.fromPosition,
                    enemyData.toPosition,
                    cellSize,
                    0.5
                  );
                }, index * 50); // Reduced stagger for better performance
              }
            });
          });
        });
        break;
      }

      case BattleEventType.Move: {
        queueAnimation(() => {
          const { wrapper } = getUnitElement(event.data.unitId);
          if (wrapper) {
            const cellSize = responsiveDimensions.mainGridCellSize;
            animateTileSlide(
              wrapper,
              event.data.from,
              event.data.to,
              cellSize,
              0.3
            );
          }
        });
        break;
      }

      case BattleEventType.Attack: {
        queueAnimation(() => {
          const { card } = getUnitElement(event.data.attackerId);
          if (card) {
            const isHero = card.getAttribute('data-unit-type') === 'hero';
            animateAttack(card, isHero ? 'right' : 'left');
          }
        });
        break;
      }

      case BattleEventType.Damage: {
        queueAnimation(() => {
          const { card } = getUnitElement(event.data.targetId);
          if (card) {
            animateDamage(card);
          }
        });
        break;
      }

      case BattleEventType.Death: {
        queueAnimation(() => {
          const { card } = getUnitElement(event.data.unitId);
          if (card) {
            animateDeath(card);
          }
        });
        break;
      }

      case BattleEventType.AbilityUsed: {
        const cellSize = responsiveDimensions.mainGridCellSize;
        const caster = [...currentBattle.heroes, ...currentBattle.enemies].find(
          u => u.id === event.data.attackerId
        );

        if (!caster) break;

        queueAnimation(() => {
          const { card: casterCard, wrapper: casterWrapper } = getUnitElement(event.data.attackerId);
          if (!casterWrapper) return;

          const gridContainer = getGridContainer(casterWrapper);
          if (!gridContainer) return;

          const abilityId = event.data.abilityId;

          // Batch all ability animations
          batchUpdater.add(() => {
            switch (abilityId) {
              case 'blade_cleave': {
                const enemyPositions = currentBattle.enemies
                  .filter(e => e.isAlive)
                  .map(e => e.position);

                enemyPositions.forEach((pos, index) => {
                  createTileFlash(
                    pos,
                    cellSize,
                    gridContainer,
                    '#FFD700',
                    0.25 + (index * 0.02) // Reduced stagger
                  );
                });

                animateCleave(
                  casterWrapper,
                  enemyPositions,
                  caster.position,
                  cellSize,
                  gridContainer
                );
                break;
              }

              case 'fireball':
              case 'precise_shot':
              case 'blood_strike': {
                const targets = caster.isHero ? currentBattle.enemies : currentBattle.heroes;
                const aliveTargets = targets.filter(t => t.isAlive);

                if (aliveTargets.length > 0) {
                  const target = aliveTargets.reduce((closest, current) => {
                    const closestDist = Math.max(
                      Math.abs(caster.position.col - closest.position.col),
                      Math.abs(caster.position.row - closest.position.row)
                    );
                    const currentDist = Math.max(
                      Math.abs(caster.position.col - current.position.col),
                      Math.abs(caster.position.row - current.position.row)
                    );
                    return currentDist < closestDist ? current : closest;
                  });

                  const { wrapper: targetWrapper } = getUnitElement(target.id);
                  if (targetWrapper) {
                    window.__abilityAnimationPlaying = true;

                    let timeline;
                    if (abilityId === 'fireball') {
                      // Create AOE flash effects
                      const affectedTiles = [
                        target.position,
                        { row: target.position.row + 1, col: target.position.col },
                        { row: target.position.row, col: target.position.col + 1 },
                        { row: target.position.row + 1, col: target.position.col + 1 },
                      ].filter(pos => pos.row >= 0 && pos.row <= 7 && pos.col >= 0 && pos.col <= 7);

                      affectedTiles.forEach((tilePos, index) => {
                        const isTargetTile = tilePos.row === target.position.row && tilePos.col === target.position.col;
                        createTileFlash(
                          tilePos,
                          cellSize,
                          gridContainer,
                          isTargetTile ? '#FFFFFF' : '#FF4500',
                          0.6 + (index * 0.01)
                        );
                      });

                      timeline = animateFireball(
                        casterWrapper,
                        targetWrapper,
                        caster.position,
                        target.position,
                        cellSize,
                        gridContainer
                      );
                    } else if (abilityId === 'precise_shot') {
                      createTileFlash(
                        target.position,
                        cellSize,
                        gridContainer,
                        '#FFD700',
                        0.4
                      );

                      timeline = animateArrow(
                        casterWrapper,
                        targetWrapper,
                        caster.position,
                        target.position,
                        cellSize,
                        gridContainer
                      );
                    } else {
                      timeline = animateBloodStrike(
                        casterWrapper,
                        targetWrapper,
                        caster.position,
                        target.position,
                        cellSize,
                        gridContainer
                      );
                    }

                    timeline.eventCallback('onComplete', () => {
                      window.__abilityAnimationPlaying = false;
                    });
                  }
                }
                break;
              }

              case 'mass_heal':
              case 'rallying_cry': {
                const allies = caster.isHero ? currentBattle.heroes : currentBattle.enemies;
                const allyWrappers = allies
                  .filter(a => a.isAlive)
                  .map(a => getUnitElement(a.id).wrapper)
                  .filter(Boolean) as HTMLElement[];

                const color = abilityId === 'mass_heal' ? '#00FF00' : '#4CAF50';
                animateBuff(
                  casterWrapper,
                  allyWrappers,
                  caster.position,
                  cellSize,
                  gridContainer,
                  color
                );
                break;
              }
            }
          });
        });
        break;
      }
    }
  }, [currentScreen, currentBattle, battleEventIndex, responsiveDimensions.mainGridCellSize]);

  // Clear cache on unmount
  useEffect(() => {
    return () => {
      elementCache.clear();
      animationQueue.current = [];
    };
  }, []);
}