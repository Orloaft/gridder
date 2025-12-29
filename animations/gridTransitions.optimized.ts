import gsap from 'gsap';
import {
  applyWillChange,
  timelinePool,
  elementCache,
  createOptimizedTween,
  calculateStagger,
  ANIMATION_CONFIG,
  batchUpdater
} from '@/utils/animationOptimizer';

/**
 * Optimized grid exit animation with better performance
 */
export function animateGridExit(
  gridElement: HTMLElement,
  onComplete?: () => void
): gsap.core.Timeline {
  const tl = timelinePool.acquire();

  tl.eventCallback('onComplete', () => {
    timelinePool.release(tl);
    onComplete?.();
  });

  // Get cards once and cache NodeList as array
  const cards = Array.from(gridElement.querySelectorAll('[data-grid-card]'));

  if (cards.length === 0) {
    onComplete?.();
    timelinePool.release(tl);
    return tl;
  }

  // Apply will-change for all cards at once
  const cleanupFns = cards.map(card =>
    applyWillChange(card as HTMLElement, ['transform', 'opacity'])
  );

  // Pre-calculate stagger delays
  const staggers = calculateStagger(cards.length, 0.4, 'start');

  // Batch all animations in single timeline
  cards.forEach((card, index) => {
    tl.to(card, {
      y: 100,
      opacity: 0,
      rotation: 5,
      duration: 0.3,
      ease: 'power2.in',
      ...ANIMATION_CONFIG,
      delay: staggers[index],
    }, 0); // Start all at time 0 with calculated delays
  });

  // Cleanup will-change after animation
  tl.call(() => cleanupFns.forEach(fn => fn()));

  return tl;
}

/**
 * Optimized grid entrance animation
 */
export function animateGridEntrance(
  gridElement: HTMLElement,
  onComplete?: () => void
): gsap.core.Timeline {
  const tl = timelinePool.acquire();

  const cards = Array.from(gridElement.querySelectorAll('[data-grid-card]'));

  if (cards.length === 0) {
    onComplete?.();
    timelinePool.release(tl);
    return tl;
  }

  // Apply will-change
  const cleanupFns = cards.map(card =>
    applyWillChange(card as HTMLElement, ['transform', 'opacity', 'visibility'])
  );

  // Batch initial state setting
  batchUpdater.add(() => {
    gsap.set(cards, {
      y: 100,
      x: 0,
      opacity: 0,
      visibility: 'visible',
      rotation: -5,
      scale: 1,
      immediateRender: true,
      ...ANIMATION_CONFIG,
    });
  });

  // Pre-calculate stagger delays
  const staggers = calculateStagger(cards.length, 0.4, 'start');

  // Create optimized entrance animations
  cards.forEach((card, index) => {
    tl.to(card, {
      y: 0,
      x: 0,
      opacity: 1,
      rotation: 0,
      scale: 1,
      duration: 0.4,
      ease: 'power2.out',
      ...ANIMATION_CONFIG,
      delay: staggers[index],
    }, 0);
  });

  // Cleanup
  tl.call(() => {
    cleanupFns.forEach(fn => fn());
    timelinePool.release(tl);
    onComplete?.();
  });

  return tl;
}

/**
 * Optimized grid transition with reduced DOM queries and better performance
 */
export function animateGridTransition(
  gridElement: HTMLElement,
  onSwap: () => number,
  onComplete?: () => void
): gsap.core.Timeline {
  const masterTimeline = timelinePool.acquire();

  masterTimeline.eventCallback('onComplete', () => {
    timelinePool.release(masterTimeline);
    onComplete?.();
  });

  // Mark transition state
  (window as any).__isGridTransition = true;

  // Step 1: Exit animation
  const exitTl = animateGridExit(gridElement);
  masterTimeline.add(exitTl);

  // Step 2: Swap content
  let expectedCardCount = 0;
  masterTimeline.call(() => {
    elementCache.clear(); // Clear cache before swap
    expectedCardCount = onSwap();
  });

  // Step 3: Optimized wait for cards with single RAF loop
  masterTimeline.call(() => {
    const loadingBar = createLoadingBar();
    gridElement.appendChild(loadingBar.container);

    let checkCount = 0;
    const maxChecks = 60; // Max 1 second at 60fps

    const checkCards = () => {
      const cards = gridElement.querySelectorAll('[data-grid-card]');
      const progress = Math.min(90, (cards.length / expectedCardCount) * 100);
      loadingBar.setProgress(progress);

      checkCount++;

      if (cards.length >= expectedCardCount || checkCount >= maxChecks) {
        // Hide cards immediately
        gsap.set(cards, { opacity: 0, visibility: 'hidden' });

        // Complete loading bar
        loadingBar.setProgress(100);

        // Start entrance after brief delay
        setTimeout(() => {
          loadingBar.remove();

          const entranceTl = animateGridEntrance(gridElement);
          entranceTl.call(() => {
            (window as any).__isGridTransition = false;
          });
        }, 100);
      } else {
        requestAnimationFrame(checkCards);
      }
    };

    requestAnimationFrame(checkCards);
  }, [], '+=0');

  return masterTimeline;
}

// Optimized loading bar creation
function createLoadingBar() {
  const container = document.createElement('div');
  const fill = document.createElement('div');

  // Use CSS classes instead of inline styles for better performance
  container.className = 'grid-loading-bar';
  fill.className = 'grid-loading-bar-fill';

  // Apply inline styles only for positioning
  container.style.cssText = `
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
    contain: layout style paint;
  `;

  fill.style.cssText = `
    width: 0%;
    height: 100%;
    background: linear-gradient(90deg, #60a5fa, #3b82f6);
    border-radius: 2px;
    transition: width 0.1s ease-out;
    will-change: width;
  `;

  container.appendChild(fill);

  return {
    container,
    setProgress: (percent: number) => {
      fill.style.width = `${percent}%`;
    },
    remove: () => {
      container.style.transition = 'opacity 0.2s ease-out';
      container.style.opacity = '0';
      setTimeout(() => container.remove(), 200);
    }
  };
}