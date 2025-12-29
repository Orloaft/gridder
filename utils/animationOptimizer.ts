import gsap from 'gsap';

// Performance monitoring
export class AnimationPerformanceMonitor {
  private frameCount = 0;
  private lastFrameTime = 0;
  private fps = 60;
  private enabled = false;

  start() {
    this.enabled = true;
    this.lastFrameTime = performance.now();
    this.measureFrame();
  }

  stop() {
    this.enabled = false;
  }

  private measureFrame = () => {
    if (!this.enabled) return;

    const currentTime = performance.now();
    const delta = currentTime - this.lastFrameTime;
    this.fps = Math.round(1000 / delta);
    this.lastFrameTime = currentTime;
    this.frameCount++;

    // Log performance warnings
    if (this.fps < 30) {
      console.warn(`[AnimationPerf] Low FPS detected: ${this.fps}`);
    }

    requestAnimationFrame(this.measureFrame);
  };

  getFPS() {
    return this.fps;
  }

  getFrameCount() {
    return this.frameCount;
  }
}

// Element cache for fast lookups
export class ElementCache {
  private cache = new Map<string, HTMLElement | null>();
  private queryCount = 0;

  get(selector: string): HTMLElement | null {
    if (!this.cache.has(selector)) {
      this.queryCount++;
      const element = document.querySelector(selector) as HTMLElement | null;
      this.cache.set(selector, element);
    }
    return this.cache.get(selector) || null;
  }

  getByUnitId(unitId: string): HTMLElement | null {
    return this.get(`[data-unit-id="${unitId}"]`);
  }

  clear() {
    this.cache.clear();
  }

  getQueryCount() {
    return this.queryCount;
  }
}

// Timeline pool for reusing GSAP timelines
export class TimelinePool {
  private pool: gsap.core.Timeline[] = [];
  private activeTimelines = new Set<gsap.core.Timeline>();

  acquire(): gsap.core.Timeline {
    let timeline = this.pool.pop();
    if (!timeline) {
      timeline = gsap.timeline();
    } else {
      timeline.clear();
    }
    this.activeTimelines.add(timeline);
    return timeline;
  }

  release(timeline: gsap.core.Timeline) {
    if (this.activeTimelines.has(timeline)) {
      this.activeTimelines.delete(timeline);
      timeline.clear();
      timeline.kill();
      this.pool.push(timeline);
    }
  }

  releaseAll() {
    this.activeTimelines.forEach(tl => {
      tl.clear();
      tl.kill();
      this.pool.push(tl);
    });
    this.activeTimelines.clear();
  }

  getPoolSize() {
    return this.pool.length;
  }

  getActiveCount() {
    return this.activeTimelines.size;
  }
}

// Batch DOM updates
export class BatchDOMUpdater {
  private updates: Array<() => void> = [];
  private scheduled = false;

  add(update: () => void) {
    this.updates.push(update);
    if (!this.scheduled) {
      this.scheduled = true;
      requestAnimationFrame(() => this.flush());
    }
  }

  flush() {
    const updatesCopy = [...this.updates];
    this.updates = [];
    this.scheduled = false;

    // Execute all updates in a single frame
    updatesCopy.forEach(update => update());
  }
}

// Optimized animation settings
export const ANIMATION_CONFIG = {
  // Use force3D for hardware acceleration
  force3D: true,
  // Reduce precision for better performance
  roundPixels: true,
  // Enable lazy rendering
  lazy: true,
  // Optimize for mobile
  autoSleep: 60,
  // Use CSS variables for better performance
  cssVars: true,
} as const;

// Apply will-change optimization
export function applyWillChange(element: HTMLElement, properties: string[]) {
  element.style.willChange = properties.join(', ');

  // Remove will-change after animation to prevent memory issues
  return () => {
    element.style.willChange = 'auto';
  };
}

// Optimized stagger calculation
export function calculateStagger(count: number, totalDuration: number, from: 'start' | 'center' | 'end' = 'start') {
  const staggerAmount = totalDuration / count;
  const staggers: number[] = [];

  for (let i = 0; i < count; i++) {
    let delay = 0;
    switch (from) {
      case 'start':
        delay = i * staggerAmount;
        break;
      case 'end':
        delay = (count - 1 - i) * staggerAmount;
        break;
      case 'center':
        delay = Math.abs((count / 2) - i) * staggerAmount;
        break;
    }
    staggers.push(delay);
  }

  return staggers;
}

// Debounced animation trigger
export function createDebouncedAnimation(fn: Function, delay: number = 16) {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastCallTime = 0;

  return (...args: any[]) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (timeSinceLastCall >= delay) {
      lastCallTime = now;
      fn(...args);
    } else {
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now();
        fn(...args);
      }, delay - timeSinceLastCall);
    }
  };
}

// Check if user prefers reduced motion
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Create optimized GSAP config
export function createOptimizedTween(
  target: gsap.TweenTarget,
  vars: gsap.TweenVars
): gsap.core.Tween {
  // Apply optimizations
  const optimizedVars = {
    ...vars,
    force3D: true,
    roundPixels: true,
    lazy: true,
    fastSpeed: 0.1,
    // Use transform instead of top/left when possible
    ...(vars.x !== undefined || vars.y !== undefined ? {
      xPercent: undefined,
      yPercent: undefined,
    } : {}),
  };

  // Reduce duration if user prefers reduced motion
  if (prefersReducedMotion() && optimizedVars.duration) {
    optimizedVars.duration = Math.min(0.2, optimizedVars.duration as number);
  }

  return gsap.to(target, optimizedVars);
}

// Global performance monitor instance
export const perfMonitor = new AnimationPerformanceMonitor();

// Global element cache
export const elementCache = new ElementCache();

// Global timeline pool
export const timelinePool = new TimelinePool();

// Global batch updater
export const batchUpdater = new BatchDOMUpdater();