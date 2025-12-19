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
 * Animates new grid cells entering with staggered sequence (reverse of exit)
 * Cards float up from below and fade in
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

  // Set initial state (invisible, positioned below, rotated opposite of exit)
  // IMPORTANT: Override inline styles from card components
  gsap.set(cards, {
    y: 100,           // Start from below (mirror of exit's y: 100)
    x: 0,             // Ensure no x offset
    opacity: 0,
    rotation: -5,     // Opposite rotation of exit (exit uses rotation: 5)
    scale: 1,         // Override inline scale: 0 from card components
    immediateRender: true,
  });

  // Animate entrance with stagger (floating up from below)
  tl.to(cards, {
    y: 0,
    x: 0,
    opacity: 1,
    rotation: 0,
    scale: 1,           // Ensure scale is 1
    duration: 0.4,      // Slightly longer than exit for smoother feel
    ease: 'power2.out', // Mirror of exit's power2.in
    stagger: {
      amount: 0.4,      // Same stagger duration as exit
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

  // Mark that we're in a grid transition (cards should stay hidden until animateGridEntrance runs)
  (window as any).__isGridTransition = true;

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
            // Clear grid transition flag after entrance completes
            (window as any).__isGridTransition = false;
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
