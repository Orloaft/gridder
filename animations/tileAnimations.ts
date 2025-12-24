import gsap from 'gsap';
import { GridPosition } from '@/types/grid.types';

/**
 * Clamp grid position to valid bounds (0-7)
 */
function clampGridPosition(position: GridPosition): GridPosition {
  return {
    row: Math.max(0, Math.min(7, position.row)),
    col: Math.max(0, Math.min(7, position.col)),
  };
}

/**
 * Animates a tile sliding from one grid position to another
 * Uses CSS transforms for smooth, hardware-accelerated diagonal movement
 * @param element - The DOM element to animate
 * @param fromPosition - Starting grid position
 * @param toPosition - Ending grid position
 * @param cellSize - Size of each grid cell in pixels
 * @param duration - Animation duration in seconds
 * @param onComplete - Callback when animation finishes
 */
export function animateTileSlide(
  element: HTMLElement,
  fromPosition: GridPosition,
  toPosition: GridPosition,
  cellSize: number,
  duration: number = 0.5,
  onComplete?: () => void
): void {
  // Clamp positions to ensure they're within grid bounds (0-7)
  const clampedFrom = clampGridPosition(fromPosition);
  const clampedTo = clampGridPosition(toPosition);

  const fromX = clampedFrom.col * cellSize;
  const fromY = clampedFrom.row * cellSize;
  const toX = clampedTo.col * cellSize;
  const toY = clampedTo.row * cellSize;

  // Calculate the delta for transform-based animation
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;

  // Set tile animation flag to block battle auto-advance
  window.__tileAnimationPlaying = true;
  console.log('[animateTileSlide] Starting slide animation', { fromPosition, toPosition });

  // First, ensure the element is at the starting position
  gsap.set(element, {
    left: fromX,
    top: fromY,
    x: 0,
    y: 0,
  });

  // Then animate using transforms for smooth diagonal movement
  // Transforms are hardware-accelerated and guarantee simultaneous X/Y movement
  const tween = gsap.to(element, {
    x: deltaX,
    y: deltaY,
    duration,
    ease: 'power2.inOut',
    onComplete: () => {
      // After animation completes, update position and reset transform
      // This prevents transform accumulation on subsequent moves
      gsap.set(element, {
        left: toX,
        top: toY,
        x: 0,
        y: 0,
      });
      // Clear tile animation flag
      window.__tileAnimationPlaying = false;
      console.log('[animateTileSlide] Animation complete, flag cleared');
      onComplete?.();
    },
    onInterrupt: () => {
      // If animation is killed/interrupted, still clear the flag
      window.__tileAnimationPlaying = false;
      console.log('[animateTileSlide] Animation interrupted, flag cleared');
    },
  });

  // Safety timeout: if animation doesn't complete in expected time + buffer, force clear flag
  setTimeout(() => {
    if (window.__tileAnimationPlaying && !tween.isActive()) {
      console.warn('[animateTileSlide] Animation stuck, force clearing flag');
      window.__tileAnimationPlaying = false;
    }
  }, (duration * 1000) + 500);
}

/**
 * Animates a quick attack motion (dash forward and back)
 * @param element - The attacking unit's DOM element
 * @param direction - 'left' or 'right' for attack direction
 * @param onComplete - Callback when animation finishes
 */
export function animateAttack(
  element: HTMLElement,
  direction: 'left' | 'right',
  onComplete?: () => void
): void {
  const distance = direction === 'left' ? -30 : 30;

  // Set tile animation flag to block battle auto-advance
  window.__tileAnimationPlaying = true;
  console.log('[animateAttack] Starting attack animation');

  const tl = gsap.timeline({
    onComplete: () => {
      // Clear tile animation flag
      window.__tileAnimationPlaying = false;
      console.log('[animateAttack] Animation complete, flag cleared');
      onComplete?.();
    },
    onInterrupt: () => {
      window.__tileAnimationPlaying = false;
      console.log('[animateAttack] Animation interrupted, flag cleared');
    },
  });

  // Quick dash forward
  tl.to(element, {
    x: distance,
    duration: 0.15,
    ease: 'power2.out',
  });

  // Return to original position
  tl.to(element, {
    x: 0,
    duration: 0.2,
    ease: 'power2.in',
  });

  // Safety timeout
  setTimeout(() => {
    if (window.__tileAnimationPlaying && !tl.isActive()) {
      console.warn('[animateAttack] Animation stuck, force clearing flag');
      window.__tileAnimationPlaying = false;
    }
  }, 850); // 0.15 + 0.2 + 500ms buffer
}

/**
 * Animates damage taken (shake effect)
 * @param element - The unit taking damage
 * @param onComplete - Callback when animation finishes
 */
export function animateDamage(
  element: HTMLElement,
  onComplete?: () => void
): void {
  // Set tile animation flag to block battle auto-advance
  window.__tileAnimationPlaying = true;
  console.log('[animateDamage] Starting damage animation');

  const tween = gsap.fromTo(
    element,
    { x: -5 },
    {
      x: 5,
      duration: 0.05,
      repeat: 5,
      yoyo: true,
      ease: 'power1.inOut',
      onComplete: () => {
        gsap.set(element, { x: 0 });
        // Clear tile animation flag
        window.__tileAnimationPlaying = false;
        console.log('[animateDamage] Animation complete, flag cleared');
        onComplete?.();
      },
      onInterrupt: () => {
        window.__tileAnimationPlaying = false;
        console.log('[animateDamage] Animation interrupted, flag cleared');
      },
    }
  );

  // Safety timeout
  setTimeout(() => {
    if (window.__tileAnimationPlaying && !tween.isActive()) {
      console.warn('[animateDamage] Animation stuck, force clearing flag');
      window.__tileAnimationPlaying = false;
    }
  }, 800); // 0.05 * 6 repeats + 500ms buffer
}

/**
 * Animates unit death (float up then fall down off screen)
 * Matches the grid transition exit animation pattern
 * @param element - The dying unit's DOM element
 * @param onComplete - Callback when animation finishes
 */
export function animateDeath(
  element: HTMLElement,
  onComplete?: () => void
): void {
  // Set tile animation flag to block battle auto-advance
  window.__tileAnimationPlaying = true;
  console.log('[animateDeath] Starting death animation');

  const tl = gsap.timeline({
    onComplete: () => {
      // Clear tile animation flag
      window.__tileAnimationPlaying = false;
      console.log('[animateDeath] Animation complete, flag cleared');
      onComplete?.();
    },
    onInterrupt: () => {
      window.__tileAnimationPlaying = false;
      console.log('[animateDeath] Animation interrupted, flag cleared');
    },
  });

  // Float up slightly with fade
  tl.to(element, {
    y: -30,
    opacity: 0.7,
    scale: 1.1,
    duration: 0.2,
    ease: 'power2.out',
  });

  // Fall down off screen (matching grid exit animation)
  tl.to(element, {
    y: 100,
    opacity: 0,
    rotation: 5,
    scale: 0.8,
    duration: 0.3,
    ease: 'power2.in',
  });

  // Safety timeout
  setTimeout(() => {
    if (window.__tileAnimationPlaying && !tl.isActive()) {
      console.warn('[animateDeath] Animation stuck, force clearing flag');
      window.__tileAnimationPlaying = false;
    }
  }, 1000); // 200ms + 300ms + 500ms buffer
}
