import gsap from 'gsap';
import { GridPosition } from '@/types/grid.types';
import {
  applyWillChange,
  timelinePool,
  createOptimizedTween,
  ANIMATION_CONFIG,
  batchUpdater,
  prefersReducedMotion
} from '@/utils/animationOptimizer';

// Cache for position calculations
const positionCache = new Map<string, { x: number; y: number }>();

function getCacheKey(pos: GridPosition): string {
  return `${pos.row},${pos.col}`;
}

function clampGridPosition(position: GridPosition): GridPosition {
  return {
    row: Math.max(0, Math.min(7, position.row)),
    col: Math.max(0, Math.min(7, position.col)),
  };
}

/**
 * Optimized tile slide animation with caching and better performance
 */
export function animateTileSlide(
  element: HTMLElement,
  fromPosition: GridPosition,
  toPosition: GridPosition,
  cellSize: number,
  duration: number = 0.5,
  onComplete?: () => void
): gsap.core.Tween {
  const clampedFrom = clampGridPosition(fromPosition);
  const clampedTo = clampGridPosition(toPosition);

  // Check position cache
  const fromKey = getCacheKey(clampedFrom);
  const toKey = getCacheKey(clampedTo);

  if (!positionCache.has(fromKey)) {
    positionCache.set(fromKey, {
      x: clampedFrom.col * cellSize,
      y: clampedFrom.row * cellSize
    });
  }

  if (!positionCache.has(toKey)) {
    positionCache.set(toKey, {
      x: clampedTo.col * cellSize,
      y: clampedTo.row * cellSize
    });
  }

  const fromPos = positionCache.get(fromKey)!;
  const toPos = positionCache.get(toKey)!;
  const deltaX = toPos.x - fromPos.x;
  const deltaY = toPos.y - fromPos.y;

  // Set animation flag
  window.__tileAnimationPlaying = true;

  // Apply will-change
  const cleanupWillChange = applyWillChange(element, ['transform']);

  // Reduce duration if user prefers reduced motion
  const finalDuration = prefersReducedMotion() ? Math.min(duration, 0.2) : duration;

  // Batch initial positioning
  batchUpdater.add(() => {
    gsap.set(element, {
      left: fromPos.x,
      top: fromPos.y,
      x: 0,
      y: 0,
      ...ANIMATION_CONFIG,
    });
  });

  // Create optimized tween
  const tween = createOptimizedTween(element, {
    x: deltaX,
    y: deltaY,
    duration: finalDuration,
    ease: 'power2.inOut',
    onComplete: () => {
      // Batch final positioning
      batchUpdater.add(() => {
        gsap.set(element, {
          left: toPos.x,
          top: toPos.y,
          x: 0,
          y: 0,
        });
      });

      cleanupWillChange();
      window.__tileAnimationPlaying = false;
      onComplete?.();
    },
    onInterrupt: () => {
      cleanupWillChange();
      window.__tileAnimationPlaying = false;
    },
  });

  // Optimized safety timeout
  const timeoutDuration = (finalDuration * 1000) + 200; // Reduced buffer
  const timeoutId = setTimeout(() => {
    if (window.__tileAnimationPlaying && !tween.isActive()) {
      window.__tileAnimationPlaying = false;
      cleanupWillChange();
    }
  }, timeoutDuration);

  // Clear timeout if animation completes normally
  tween.eventCallback('onComplete', () => clearTimeout(timeoutId));

  return tween;
}

/**
 * Optimized attack animation with timeline pooling
 */
export function animateAttack(
  element: HTMLElement,
  direction: 'left' | 'right',
  onComplete?: () => void
): gsap.core.Timeline {
  const distance = direction === 'left' ? -30 : 30;
  const tl = timelinePool.acquire();

  window.__tileAnimationPlaying = true;

  // Apply will-change
  const cleanupWillChange = applyWillChange(element, ['transform']);

  // Reduce duration for reduced motion
  const attackDuration = prefersReducedMotion() ? 0.1 : 0.15;
  const returnDuration = prefersReducedMotion() ? 0.1 : 0.2;

  tl.to(element, {
    x: distance,
    duration: attackDuration,
    ease: 'power2.out',
    ...ANIMATION_CONFIG,
  })
  .to(element, {
    x: 0,
    duration: returnDuration,
    ease: 'power2.in',
    ...ANIMATION_CONFIG,
  });

  tl.eventCallback('onComplete', () => {
    cleanupWillChange();
    window.__tileAnimationPlaying = false;
    timelinePool.release(tl);
    onComplete?.();
  });

  tl.eventCallback('onInterrupt', () => {
    cleanupWillChange();
    window.__tileAnimationPlaying = false;
    timelinePool.release(tl);
  });

  return tl;
}

/**
 * Optimized damage animation using CSS animations for better performance
 */
export function animateDamage(
  element: HTMLElement,
  onComplete?: () => void
): void {
  window.__tileAnimationPlaying = true;

  // Use CSS animation for shake effect (more performant)
  element.style.animation = 'damage-shake 0.3s ease-in-out';

  const handleAnimationEnd = () => {
    element.style.animation = '';
    window.__tileAnimationPlaying = false;
    element.removeEventListener('animationend', handleAnimationEnd);
    onComplete?.();
  };

  element.addEventListener('animationend', handleAnimationEnd);

  // Fallback timeout
  setTimeout(() => {
    if (window.__tileAnimationPlaying) {
      handleAnimationEnd();
    }
  }, 400);
}

/**
 * Optimized death animation with timeline pooling
 */
export function animateDeath(
  element: HTMLElement,
  onComplete?: () => void
): gsap.core.Timeline {
  const tl = timelinePool.acquire();

  window.__tileAnimationPlaying = true;

  // Apply will-change
  const cleanupWillChange = applyWillChange(element, ['transform', 'opacity']);

  // Reduce duration for reduced motion
  const floatDuration = prefersReducedMotion() ? 0.1 : 0.2;
  const fallDuration = prefersReducedMotion() ? 0.15 : 0.3;

  tl.to(element, {
    y: -30,
    opacity: 0.7,
    scale: 1.1,
    duration: floatDuration,
    ease: 'power2.out',
    ...ANIMATION_CONFIG,
  })
  .to(element, {
    y: 100,
    opacity: 0,
    rotation: 5,
    scale: 0.8,
    duration: fallDuration,
    ease: 'power2.in',
    ...ANIMATION_CONFIG,
  });

  tl.eventCallback('onComplete', () => {
    cleanupWillChange();
    window.__tileAnimationPlaying = false;
    timelinePool.release(tl);
    onComplete?.();
  });

  tl.eventCallback('onInterrupt', () => {
    cleanupWillChange();
    window.__tileAnimationPlaying = false;
    timelinePool.release(tl);
  });

  return tl;
}

// Clear position cache when window resizes
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    positionCache.clear();
  });
}