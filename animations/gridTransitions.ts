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
  const tl = gsap.timeline();

  // Find all grid occupant cards
  const cards = gridElement.querySelectorAll('[data-grid-card]');

  console.log(`[animateGridEntrance] Starting entrance animation for ${cards.length} cards`);

  if (cards.length === 0) {
    console.log('[animateGridEntrance] No cards to animate, calling onComplete');
    onComplete?.();
    return tl;
  }

  // Set initial state (invisible, positioned below, rotated opposite of exit)
  // IMPORTANT: Override inline styles from card components and restore visibility
  console.log('[animateGridEntrance] Setting initial state for all cards');
  gsap.set(cards, {
    y: 100,           // Start from below (mirror of exit's y: 100)
    x: 0,             // Ensure no x offset
    opacity: 0,
    visibility: 'visible', // Restore visibility (was set to hidden during waiting)
    rotation: -5,     // Opposite rotation of exit (exit uses rotation: 5)
    scale: 1,         // Override inline scale: 0 from card components
    immediateRender: true,
  });

  // Animate entrance with stagger (floating up from below)
  console.log('[animateGridEntrance] Adding staggered animation to timeline');
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

  // Add onComplete callback AFTER animations so it fires when animation actually completes
  if (onComplete) {
    tl.call(onComplete);
  }

  console.log('[animateGridEntrance] Timeline created, returning');
  return tl;
}

/**
 * Performs a complete grid transition: exit old cells, swap content, enter new cells
 * @param gridElement The grid container element
 * @param onSwap Callback to swap grid content (called between exit and entrance), should return expected card count
 * @param onComplete Callback when entire transition is complete
 */
export function animateGridTransition(
  gridElement: HTMLElement,
  onSwap: () => number,
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
  let expectedCardCount = 0;
  masterTimeline.call(() => {
    expectedCardCount = onSwap(); // Get expected count from swap callback
    console.log(`[animateGridTransition] Expecting ${expectedCardCount} cards after swap`);
  });

  // Step 3: Wait for React to render ALL expected cards, then enter new content
  masterTimeline.call(
    () => {
      let previousCardCount = 0;
      let stableFrames = 0;
      const STABILITY_FRAMES_REQUIRED = 3; // Reduced since we know exact count now

      // Create and show loading bar
      const loadingBar = document.createElement('div');
      loadingBar.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 200px;
        height: 4px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        overflow: hidden;
        z-index: 1000;
      `;

      const loadingBarFill = document.createElement('div');
      loadingBarFill.style.cssText = `
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, #60a5fa, #3b82f6);
        transition: width 0.1s ease-out;
        border-radius: 2px;
      `;

      loadingBar.appendChild(loadingBarFill);
      gridElement.appendChild(loadingBar);

      // Wait until ALL expected cards are rendered, have dimensions, and count is stable
      const waitForCards = () => {
        const cards = gridElement.querySelectorAll('[data-grid-card]');
        const currentCount = cards.length;

        console.log(`[waitForCards] Found ${currentCount}/${expectedCardCount} cards, stableFrames: ${stableFrames}`);

        // Update loading bar based on card count progress
        const countProgress = expectedCardCount > 0 ? (currentCount / expectedCardCount) * 70 : 0;
        const stabilityProgress = (stableFrames / STABILITY_FRAMES_REQUIRED) * 20;
        const progress = Math.min(90, countProgress + stabilityProgress);
        loadingBarFill.style.width = `${progress}%`;

        if (currentCount === 0) {
          // No cards yet, keep waiting
          console.log('[waitForCards] No cards yet, waiting...');
          requestAnimationFrame(waitForCards);
          return;
        }

        // Check if we have all expected cards
        if (currentCount < expectedCardCount) {
          console.log(`[waitForCards] Still waiting for ${expectedCardCount - currentCount} more cards...`);
          previousCardCount = currentCount;
          stableFrames = 0;
          requestAnimationFrame(waitForCards);
          return;
        }

        // IMMEDIATELY force all cards to be invisible to prevent any flashing
        // This ensures they stay hidden even if React renders them with default styles
        gsap.set(cards, {
          opacity: 0,
          visibility: 'hidden',
          immediateRender: true,
        });

        // Check if all cards have been fully laid out (check offsetWidth/offsetHeight which ignores transforms)
        let allCardsLaidOut = true;
        for (let i = 0; i < cards.length; i++) {
          const element = cards[i] as HTMLElement;
          // Use offsetWidth/offsetHeight which gives dimensions ignoring transforms like scale(0)
          if (element.offsetWidth === 0 || element.offsetHeight === 0) {
            console.log(`[waitForCards] Card ${i} not laid out yet: ${element.offsetWidth}x${element.offsetHeight}`);
            allCardsLaidOut = false;
            break;
          }
        }

        if (!allCardsLaidOut) {
          // Cards exist in DOM but not fully laid out yet, reset and keep waiting
          console.log('[waitForCards] Not all cards laid out, resetting stability counter');
          previousCardCount = 0;
          stableFrames = 0;
          requestAnimationFrame(waitForCards);
          return;
        }

        if (currentCount === previousCardCount) {
          // Card count is stable AND all cards are laid out, increment stable frame counter
          stableFrames++;
          console.log(`[waitForCards] Stable frame ${stableFrames}/${STABILITY_FRAMES_REQUIRED}`);

          if (stableFrames >= STABILITY_FRAMES_REQUIRED) {
            // Count has been stable for 5 frames and all cards are fully laid out
            console.log('[waitForCards] Stability achieved! Completing loading bar...');

            // Complete loading bar to 100%
            loadingBarFill.style.width = '100%';

            // Wait for loading bar to finish, then fade it out and start animation
            setTimeout(() => {
              // Fade out loading bar
              loadingBar.style.transition = 'opacity 0.2s ease-out';
              loadingBar.style.opacity = '0';

              setTimeout(() => {
                // Remove loading bar
                loadingBar.remove();

                // Start entrance animation
                console.log('[waitForCards] Triggering animateGridEntrance NOW');

                // Wait a bit more to ensure ALL cards (especially heroes) are fully mounted
                setTimeout(() => {
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      // Double-check card count right before animating
                      const finalCards = gridElement.querySelectorAll('[data-grid-card]');
                      console.log(`[waitForCards] Final card count check: ${finalCards.length}/${expectedCardCount}`);

                      // Start the grid entrance animation
                      const entranceTl = animateGridEntrance(gridElement);

                      // Clear flag after entrance animation completes
                      entranceTl.call(() => {
                        console.log('[waitForCards] Entrance animation complete, clearing transition flag');
                        (window as any).__isGridTransition = false;
                      });
                    });
                  });
                }, 50); // Small delay to let hero cards finish mounting
              }, 200); // Wait for fade out
            }, 100); // Show 100% for a moment
          } else {
            // Not stable enough yet, check again
            requestAnimationFrame(waitForCards);
          }
        } else {
          // Card count changed, reset stability counter
          console.log(`[waitForCards] Card count changed from ${previousCardCount} to ${currentCount}, resetting`);
          previousCardCount = currentCount;
          stableFrames = 0;
          requestAnimationFrame(waitForCards);
        }
      };

      // Start waiting for cards
      requestAnimationFrame(waitForCards);
    },
    [],
    '+=0'
  );

  return masterTimeline;
}
