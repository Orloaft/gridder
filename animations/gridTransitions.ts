import gsap from 'gsap';

/**
 * Animates grid cells falling down and fading out in a staggered sequence
 * @param gridElement The grid container element
 * @param onComplete Callback when all cells have exited
 */
export function animateGridExit(
  gridElement: HTMLElement,
  onComplete?: () => void
): gsap.core.Timeline {
  const tl = gsap.timeline({
    onComplete,
  });

  // Find all grid occupant cards
  const cards = gridElement.querySelectorAll('[data-grid-card]');

  if (cards.length === 0) {
    onComplete?.();
    return tl;
  }

  // Animate all cards falling down and fading out in staggered sequence
  tl.to(cards, {
    y: 100,
    opacity: 0,
    rotation: 5,
    duration: 0.3,
    ease: 'power2.in',
    stagger: {
      amount: 0.4, // Total stagger time
      from: 'start', // Stagger from first to last
    },
  });

  return tl;
}

/**
 * Animates new grid cells entering with staggered sequence
 * @param gridElement The grid container element
 * @param onComplete Callback when all cells have entered
 */
export function animateGridEntrance(
  gridElement: HTMLElement,
  onComplete?: () => void
): gsap.core.Timeline {
  const tl = gsap.timeline({
    onComplete,
  });

  // Find all grid occupant cards
  const cards = gridElement.querySelectorAll('[data-grid-card]');

  if (cards.length === 0) {
    onComplete?.();
    return tl;
  }

  // Set initial state (invisible, scaled down, positioned above)
  gsap.set(cards, {
    scale: 0,
    opacity: 0,
    y: -50,
    rotation: -10,
    immediateRender: true,
  });

  // Animate entrance with stagger
  tl.to(cards, {
    scale: 1,
    opacity: 1,
    y: 0,
    rotation: 0,
    duration: 0.4,
    ease: 'back.out(1.7)',
    stagger: {
      amount: 0.6, // Total stagger time
      from: 'start',
    },
  });

  return tl;
}

/**
 * Performs a complete grid transition: exit old cells, swap content, enter new cells
 * @param gridElement The grid container element
 * @param onSwap Callback to swap grid content (called between exit and entrance)
 * @param onComplete Callback when entire transition is complete
 */
export function animateGridTransition(
  gridElement: HTMLElement,
  onSwap: () => void,
  onComplete?: () => void
): gsap.core.Timeline {
  const masterTimeline = gsap.timeline({
    onComplete,
  });

  // Disable individual card animations during transition
  (window as any).__disableCardAnimations = true;

  // Step 1: Exit animation
  const exitTl = animateGridExit(gridElement);
  masterTimeline.add(exitTl);

  // Step 2: Swap content when exit completes
  masterTimeline.call(() => {
    onSwap();
  });

  // Step 3: Wait for React to render, then enter new content
  masterTimeline.call(
    () => {
      // Give React time to render new occupants with requestAnimationFrame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const entranceTl = animateGridEntrance(gridElement, () => {
            // Re-enable individual card animations after transition
            (window as any).__disableCardAnimations = false;
          });
          // Don't need to add to master timeline since it runs independently
        });
      });
    },
    [],
    '+=0.05'
  );

  return masterTimeline;
}
