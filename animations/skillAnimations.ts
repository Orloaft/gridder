// Skill/Ability animation utilities using GSAP
import gsap from 'gsap';
import { GridPosition } from '@/types/grid.types';

/**
 * Calculate pixel position from grid position
 */
export function calculatePixelPosition(
  gridPosition: GridPosition,
  cellSize: number
): { x: number; y: number } {
  return {
    x: gridPosition.col * cellSize,
    y: gridPosition.row * cellSize,
  };
}

/**
 * Cleave/Slash Animation
 * Duration: 0.8s
 * Effect: Hero attacks forward then massive slash covers all enemy tiles
 */
export function animateCleave(
  casterElement: HTMLElement,
  targetPositions: GridPosition[],
  casterPosition: GridPosition,
  cellSize: number,
  containerElement: HTMLElement
): gsap.core.Timeline {
  console.log('[animateCleave] Starting animation', {
    casterElement,
    targetPositions,
    casterPosition,
    cellSize,
    containerElement
  });

  const tl = gsap.timeline();

  // Step 1: Wind-up - Hero pulls back
  tl.to(casterElement, {
    x: -20,  // Pull back to the left
    rotation: -10,
    scale: 1.05,
    duration: 0.2,
    ease: 'power2.out',
  });

  // Step 2: Attack dash forward
  tl.to(casterElement, {
    x: 30,  // Dash forward to the right
    rotation: 15,
    scale: 1.1,
    duration: 0.15,
    ease: 'power3.out',
  });

  // Step 3: Create massive cleaving slash covering all enemy positions
  const casterPixelPos = calculatePixelPosition(casterPosition, cellSize);

  // Calculate bounds of all target positions to create a slash that covers them all
  if (targetPositions.length > 0) {
    const minRow = Math.min(...targetPositions.map(p => p.row));
    const maxRow = Math.max(...targetPositions.map(p => p.row));
    const minCol = Math.min(...targetPositions.map(p => p.col));
    const maxCol = Math.max(...targetPositions.map(p => p.col));

    // Create a wide slash effect that covers the enemy area
    const slashWidth = (maxCol - minCol + 2) * cellSize;
    const slashHeight = (maxRow - minRow + 2) * cellSize;
    const slashCenterX = (minCol + maxCol) / 2 * cellSize + cellSize / 2;
    const slashCenterY = (minRow + maxRow) / 2 * cellSize + cellSize / 2;

    const slashEffect = document.createElement('div');
    slashEffect.className = 'skill-slash-effect';
    slashEffect.style.position = 'absolute';
    slashEffect.style.width = `${slashWidth}px`;
    slashEffect.style.height = `${slashHeight}px`;
    slashEffect.style.left = `${slashCenterX}px`;
    slashEffect.style.top = `${slashCenterY}px`;
    slashEffect.style.transform = 'translate(-50%, -50%)';
    slashEffect.style.pointerEvents = 'none';
    slashEffect.style.zIndex = '1500';

    // Create sweeping slash visual
    slashEffect.innerHTML = `
      <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; transform: rotate(-30deg);">
        <path d="M 0 80 Q 30 20, 100 0" stroke="#FFD700" stroke-width="20" fill="none" stroke-linecap="round" opacity="0.9" />
        <path d="M 0 80 Q 30 20, 100 0" stroke="#FFF" stroke-width="12" fill="none" stroke-linecap="round" opacity="0.7" />
        <path d="M 0 80 Q 30 20, 100 0" stroke="#FFD700" stroke-width="6" fill="none" stroke-linecap="round" opacity="1" />
      </svg>
    `;

    containerElement.appendChild(slashEffect);
    gsap.set(slashEffect, { opacity: 0, scaleX: 0, scaleY: 1.2 });

    // Slash sweeps across
    tl.to(
      slashEffect,
      {
        opacity: 1,
        scaleX: 1.3,
        scaleY: 1,
        duration: 0.2,
        ease: 'power2.out',
      },
      '-=0.1'
    );

    // Create hit effects on each target tile
    targetPositions.forEach((targetPos, index) => {
      const targetPixelPos = calculatePixelPosition(targetPos, cellSize);
      tl.add(() => {
        // Impact flash
        createCleaveImpact(
          { x: targetPixelPos.x + cellSize / 2, y: targetPixelPos.y + cellSize / 2 },
          containerElement,
          cellSize
        );
      }, 0.25 + index * 0.03);
    });

    // Fade out slash effect
    tl.to(slashEffect, {
      opacity: 0,
      scaleX: 1.5,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => {
        slashEffect.remove();
      },
    }, '+=0.1');
  }

  // Step 4: Hero returns to position
  tl.to(
    casterElement,
    {
      x: 0,
      rotation: 0,
      scale: 1,
      duration: 0.2,
      ease: 'back.out(1.5)',
    },
    '-=0.15'
  );

  return tl;
}

/**
 * Blood Strike Animation
 * Duration: 0.8s
 * Effect: Melee attack with blood/lifesteal visuals
 */
export function animateBloodStrike(
  casterElement: HTMLElement,
  targetElement: HTMLElement,
  casterPosition: GridPosition,
  targetPosition: GridPosition,
  cellSize: number,
  containerElement: HTMLElement
): gsap.core.Timeline {
  const tl = gsap.timeline();

  const casterPixelPos = calculatePixelPosition(casterPosition, cellSize);
  const targetPixelPos = calculatePixelPosition(targetPosition, cellSize);

  // Determine direction based on hero/enemy
  const isHero = casterPosition.col < targetPosition.col;
  const attackDirection = isHero ? 1 : -1;

  // Wind-up with red glow
  tl.to(casterElement, {
    scale: 1.1,
    x: -15 * attackDirection,
    filter: 'brightness(1.3) saturate(1.5) hue-rotate(-10deg)', // Red tint
    duration: 0.2,
    ease: 'power2.out',
  });

  // Strike forward
  tl.to(casterElement, {
    x: 25 * attackDirection,
    scale: 1.15,
    duration: 0.15,
    ease: 'power3.out',
  });

  // Blood splash on target
  tl.add(() => {
    createBloodSplash(
      { x: targetPixelPos.x + cellSize / 2, y: targetPixelPos.y + cellSize / 2 },
      containerElement,
      cellSize
    );
  }, '-=0.05');

  // Blood particles fly back to caster (lifesteal visual)
  tl.add(() => {
    createLifestealParticles(
      { x: targetPixelPos.x + cellSize / 2, y: targetPixelPos.y + cellSize / 2 },
      { x: casterPixelPos.x + cellSize / 2, y: casterPixelPos.y + cellSize / 2 },
      containerElement
    );
  }, '+=0.1');

  // Healing glow on caster
  tl.to(casterElement, {
    filter: 'brightness(1.4) saturate(1.3) drop-shadow(0 0 10px #8B0000)',
    duration: 0.2,
    ease: 'power2.out',
  }, '-=0.3');

  // Return to normal
  tl.to(casterElement, {
    x: 0,
    scale: 1,
    filter: 'brightness(1) saturate(1)',
    duration: 0.2,
    ease: 'back.out(1.5)',
  });

  return tl;
}

/**
 * Arrow/Projectile Animation
 * Duration: 0.5s
 * Effect: Arrow flies from caster to target
 */
export function animateArrow(
  casterElement: HTMLElement,
  targetElement: HTMLElement,
  casterPosition: GridPosition,
  targetPosition: GridPosition,
  cellSize: number,
  containerElement: HTMLElement,
  projectileColor: string = '#FFD700' // Default to gold
): gsap.core.Timeline {
  const tl = gsap.timeline();

  const casterPixelPos = calculatePixelPosition(casterPosition, cellSize);
  const targetPixelPos = calculatePixelPosition(targetPosition, cellSize);

  // Calculate angle for arrow rotation
  const dx = targetPixelPos.x - casterPixelPos.x;
  const dy = targetPixelPos.y - casterPixelPos.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // Brief draw bow animation
  tl.to(casterElement, {
    scale: 1.1,
    x: -10,
    duration: 0.15,
    ease: 'power2.out',
  });

  // Create arrow/projectile
  const arrow = document.createElement('div');
  arrow.className = 'skill-arrow';
  arrow.style.position = 'absolute';
  arrow.style.width = `${cellSize * 0.6}px`;
  arrow.style.height = '4px';
  arrow.style.left = `${casterPixelPos.x + cellSize / 2}px`;
  arrow.style.top = `${casterPixelPos.y + cellSize / 2}px`;

  // Use provided color for projectile with enhanced gradients
  if (projectileColor === '#00BFFF') {
    // Frost bolt - ice blue gradient
    arrow.style.background = 'linear-gradient(90deg, #87CEEB 0%, #00BFFF 50%, #B0E0E6 100%)';
    arrow.style.boxShadow = `0 0 8px ${projectileColor}, 0 0 16px ${projectileColor}`;
  } else if (projectileColor === '#FF4500' || projectileColor === '#FF6347') {
    // Fire bolt - flame gradient
    arrow.style.background = 'linear-gradient(90deg, #FF6347 0%, #FF4500 50%, #FFD700 100%)';
    arrow.style.boxShadow = `0 0 8px ${projectileColor}, 0 0 16px #FFA500`;
  } else if (projectileColor === '#9370DB' || projectileColor === '#9400D3') {
    // Lightning/Life drain - electric purple
    arrow.style.background = 'linear-gradient(90deg, #E6E6FA 0%, #9370DB 50%, #DDA0DD 100%)';
    arrow.style.boxShadow = `0 0 8px ${projectileColor}, 0 0 16px #E6E6FA`;
  } else if (projectileColor === '#4B0082') {
    // Void/Death bolt - dark purple
    arrow.style.background = 'linear-gradient(90deg, #191970 0%, #4B0082 50%, #8B008B 100%)';
    arrow.style.boxShadow = `0 0 8px ${projectileColor}, 0 0 16px #9400D3`;
  } else if (projectileColor === '#32CD32' || projectileColor === '#00FF00') {
    // Acid/Poison - toxic green
    arrow.style.background = 'linear-gradient(90deg, #228B22 0%, #32CD32 50%, #7FFF00 100%)';
    arrow.style.boxShadow = `0 0 8px ${projectileColor}, 0 0 16px #00FF00`;
  } else if (projectileColor === '#8B008B') {
    // Dark bolt - dark magenta
    arrow.style.background = 'linear-gradient(90deg, #4B0082 0%, #8B008B 50%, #DA70D6 100%)';
    arrow.style.boxShadow = `0 0 8px ${projectileColor}, 0 0 16px #9932CC`;
  } else if (projectileColor === '#F5DEB3') {
    // Bone throw - bone white
    arrow.style.background = 'linear-gradient(90deg, #D2B48C 0%, #F5DEB3 50%, #FFFAF0 100%)';
    arrow.style.boxShadow = `0 0 4px rgba(245, 222, 179, 0.8), 0 0 8px rgba(255, 255, 255, 0.5)`;
  } else if (projectileColor === '#00CED1') {
    // Ice shard - ice cyan
    arrow.style.background = 'linear-gradient(90deg, #B0E0E6 0%, #00CED1 50%, #E0FFFF 100%)';
    arrow.style.boxShadow = `0 0 8px ${projectileColor}, 0 0 16px #AFEEEE`;
  } else if (projectileColor === '#DC143C' || projectileColor === '#8B0000') {
    // Blood/Weakness curse - blood red
    arrow.style.background = 'linear-gradient(90deg, #8B0000 0%, #DC143C 50%, #FF6B6B 100%)';
    arrow.style.boxShadow = `0 0 8px ${projectileColor}, 0 0 16px #FF0000`;
  } else {
    // Default arrow - brown to gold
    arrow.style.background = 'linear-gradient(90deg, #8B4513 0%, #D2691E 70%, #FFD700 100%)';
    arrow.style.boxShadow = '0 0 4px rgba(139, 69, 19, 0.5)';
  }

  arrow.style.pointerEvents = 'none';
  arrow.style.zIndex = '1500';
  arrow.style.transformOrigin = 'left center';
  arrow.style.transform = `rotate(${angle}deg)`;

  containerElement.appendChild(arrow);

  // Launch arrow
  tl.to(arrow, {
    x: targetPixelPos.x + cellSize / 2 - (casterPixelPos.x + cellSize / 2),
    y: targetPixelPos.y + cellSize / 2 - (casterPixelPos.y + cellSize / 2),
    duration: 0.3,
    ease: 'linear',
  }, '+=0.05');

  // Caster returns to normal
  tl.to(
    casterElement,
    {
      scale: 1,
      x: 0,
      duration: 0.15,
      ease: 'power2.in',
    },
    '-=0.25'
  );

  // Impact - arrow disappears, small flash
  tl.add(() => {
    arrow.remove();
    createArrowImpact(
      { x: targetPixelPos.x + cellSize / 2, y: targetPixelPos.y + cellSize / 2 },
      containerElement
    );
  });

  return tl;
}

/**
 * Fireball/Projectile Animation
 * Duration: 0.8s
 * Effect: Projectile travels from caster to target with explosion
 */
export function animateFireball(
  casterElement: HTMLElement,
  targetElement: HTMLElement,
  casterPosition: GridPosition,
  targetPosition: GridPosition,
  cellSize: number,
  containerElement: HTMLElement
): gsap.core.Timeline {
  const tl = gsap.timeline();

  const casterPixelPos = calculatePixelPosition(casterPosition, cellSize);
  const targetPixelPos = calculatePixelPosition(targetPosition, cellSize);

  // Charge-up motion
  tl.to(casterElement, {
    scale: 1.15,
    filter: 'brightness(1.3) saturate(1.5)',
    duration: 0.2,
    ease: 'power2.out',
  });

  // Create fireball projectile
  const fireball = document.createElement('div');
  fireball.className = 'skill-fireball';
  fireball.style.position = 'absolute';
  fireball.style.width = `${cellSize * 0.4}px`;
  fireball.style.height = `${cellSize * 0.4}px`;
  fireball.style.left = `${casterPixelPos.x + cellSize / 2}px`;
  fireball.style.top = `${casterPixelPos.y + cellSize / 2}px`;
  fireball.style.borderRadius = '50%';
  fireball.style.background = 'radial-gradient(circle, #FFF 0%, #FF4500 40%, #8B0000 100%)';
  fireball.style.boxShadow = '0 0 20px #FF4500, 0 0 40px #FF4500';
  fireball.style.pointerEvents = 'none';
  fireball.style.zIndex = '1500';

  containerElement.appendChild(fireball);

  // Launch fireball
  tl.to(fireball, {
    x: targetPixelPos.x + cellSize / 2 - (casterPixelPos.x + cellSize / 2),
    y: targetPixelPos.y + cellSize / 2 - (casterPixelPos.y + cellSize / 2),
    duration: 0.4,
    ease: 'power1.inOut',
    onUpdate: function() {
      // Create trail particles
      if (Math.random() > 0.7) {
        createFireTrail(
          {
            x: parseFloat(fireball.style.left) + parseFloat(gsap.getProperty(fireball, 'x') as string),
            y: parseFloat(fireball.style.top) + parseFloat(gsap.getProperty(fireball, 'y') as string),
          },
          containerElement
        );
      }
    },
  });

  // Caster returns to normal
  tl.to(
    casterElement,
    {
      scale: 1,
      filter: 'brightness(1) saturate(1)',
      duration: 0.2,
      ease: 'power2.in',
    },
    '-=0.3'
  );

  // Impact explosion
  tl.add(() => {
    fireball.remove();
    createFireExplosion(
      { x: targetPixelPos.x + cellSize / 2, y: targetPixelPos.y + cellSize / 2 },
      containerElement,
      cellSize
    );
  });

  return tl;
}

/**
 * Simple Buff/Debuff Animation
 * For single target buff/debuff effects
 */
export function animateSimpleBuff(
  targetElement: HTMLElement,
  color: string = '#4CAF50',
  isDebuff: boolean = false
): void {
  if (!targetElement || !targetElement.parentElement) {
    console.warn('Cannot animate buff - target element or parent not found');
    return;
  }

  // Simple glow effect
  gsap.to(targetElement, {
    filter: isDebuff
      ? `drop-shadow(0 0 10px ${color}) brightness(0.8)`
      : `drop-shadow(0 0 15px ${color}) brightness(1.2)`,
    scale: isDebuff ? 0.95 : 1.05,
    duration: 0.3,
    yoyo: true,
    repeat: 1,
    ease: 'power2.inOut'
  });
}

/**
 * Buff/Support Animation
 * Duration: 0.6s
 * Effect: Radial wave effect emanating from caster
 */
export function animateBuff(
  casterElement: HTMLElement,
  affectedElements: HTMLElement[],
  casterPosition: GridPosition,
  cellSize: number,
  containerElement: HTMLElement,
  buffColor: string = '#4CAF50'
): gsap.core.Timeline {
  const tl = gsap.timeline();

  const casterPixelPos = calculatePixelPosition(casterPosition, cellSize);

  // Caster raises hands
  tl.to(casterElement, {
    y: -10,
    scale: 1.1,
    filter: `drop-shadow(0 0 10px ${buffColor})`,
    duration: 0.3,
    ease: 'power2.out',
  });

  // Create multiple expanding rings
  for (let i = 0; i < 3; i++) {
    const ring = document.createElement('div');
    ring.className = 'skill-buff-ring';
    ring.style.position = 'absolute';
    ring.style.width = `${cellSize}px`;
    ring.style.height = `${cellSize}px`;
    ring.style.left = `${casterPixelPos.x + cellSize / 2}px`;
    ring.style.top = `${casterPixelPos.y + cellSize / 2}px`;
    ring.style.borderRadius = '50%';
    ring.style.border = `3px solid ${buffColor}`;
    ring.style.pointerEvents = 'none';
    ring.style.zIndex = '1500';
    ring.style.transform = 'translate(-50%, -50%)';

    containerElement.appendChild(ring);
    gsap.set(ring, { opacity: 0.8, scale: 0.5 });

    // Expand and fade
    tl.to(
      ring,
      {
        scale: 3,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
        onComplete: () => {
          ring.remove();
        },
      },
      i * 0.1
    );
  }

  // Affected units glow and pulse
  affectedElements.forEach((element, index) => {
    tl.to(
      element,
      {
        filter: `drop-shadow(0 0 10px ${buffColor}) brightness(1.2)`,
        scale: 1.05,
        duration: 0.3,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1,
      },
      0.3 + index * 0.05
    );

    // Sparkles around buffed units
    tl.add(() => {
      createBuffSparkles(element, containerElement, buffColor);
    }, 0.3 + index * 0.05);
  });

  // Caster returns to normal
  tl.to(
    casterElement,
    {
      y: 0,
      scale: 1,
      filter: 'none',
      duration: 0.2,
      ease: 'power2.in',
    },
    '-=0.2'
  );

  return tl;
}

// Helper: Create cleave impact effect
function createCleaveImpact(
  position: { x: number; y: number },
  containerElement: HTMLElement,
  cellSize: number
): void {
  // Flash effect
  const flash = document.createElement('div');
  flash.style.position = 'absolute';
  flash.style.left = `${position.x}px`;
  flash.style.top = `${position.y}px`;
  flash.style.width = `${cellSize * 0.8}px`;
  flash.style.height = `${cellSize * 0.8}px`;
  flash.style.transform = 'translate(-50%, -50%)';
  flash.style.borderRadius = '50%';
  flash.style.background = 'radial-gradient(circle, #FFF 0%, #FFD700 40%, transparent 70%)';
  flash.style.pointerEvents = 'none';
  flash.style.zIndex = '1600';

  containerElement.appendChild(flash);

  gsap.fromTo(
    flash,
    { scale: 0.3, opacity: 1 },
    {
      scale: 1.2,
      opacity: 0,
      duration: 0.3,
      ease: 'power2.out',
      onComplete: () => flash.remove(),
    }
  );

  // Impact particles
  const particleCount = 10;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.left = `${position.x}px`;
    particle.style.top = `${position.y}px`;
    particle.style.width = '4px';
    particle.style.height = '4px';
    particle.style.borderRadius = '50%';
    particle.style.backgroundColor = i % 2 === 0 ? '#FFD700' : '#FFF';
    particle.style.boxShadow = `0 0 4px ${i % 2 === 0 ? '#FFD700' : '#FFF'}`;
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '1600';

    containerElement.appendChild(particle);

    const angle = (Math.PI * 2 * i) / particleCount;
    const distance = 15 + Math.random() * 15;

    gsap.to(particle, {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      opacity: 0,
      duration: 0.4 + Math.random() * 0.2,
      ease: 'power2.out',
      onComplete: () => particle.remove(),
    });
  }
}

// Helper: Create slash particles
function createSlashParticles(
  position: { x: number; y: number },
  containerElement: HTMLElement
): void {
  const particleCount = 8;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.left = `${position.x}px`;
    particle.style.top = `${position.y}px`;
    particle.style.width = '6px';
    particle.style.height = '6px';
    particle.style.borderRadius = '50%';
    particle.style.backgroundColor = '#FFD700';
    particle.style.boxShadow = '0 0 4px #FFD700';
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '1600';

    containerElement.appendChild(particle);

    const angle = (Math.PI * 2 * i) / particleCount;
    const distance = 20 + Math.random() * 20;

    gsap.to(particle, {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      opacity: 0,
      duration: 0.4,
      ease: 'power2.out',
      onComplete: () => particle.remove(),
    });
  }
}

// Helper: Create blood splash effect
function createBloodSplash(
  position: { x: number; y: number },
  containerElement: HTMLElement,
  cellSize: number
): void {
  // Central blood splash
  const splash = document.createElement('div');
  splash.style.position = 'absolute';
  splash.style.left = `${position.x}px`;
  splash.style.top = `${position.y}px`;
  splash.style.width = `${cellSize * 0.6}px`;
  splash.style.height = `${cellSize * 0.6}px`;
  splash.style.transform = 'translate(-50%, -50%)';
  splash.style.borderRadius = '50%';
  splash.style.background = 'radial-gradient(circle, #DC143C 0%, #8B0000 50%, transparent 70%)';
  splash.style.pointerEvents = 'none';
  splash.style.zIndex = '1600';

  containerElement.appendChild(splash);

  gsap.fromTo(
    splash,
    { scale: 0.3, opacity: 1 },
    {
      scale: 1.2,
      opacity: 0,
      duration: 0.4,
      ease: 'power2.out',
      onComplete: () => splash.remove(),
    }
  );

  // Blood droplets
  for (let i = 0; i < 8; i++) {
    const droplet = document.createElement('div');
    droplet.style.position = 'absolute';
    droplet.style.left = `${position.x}px`;
    droplet.style.top = `${position.y}px`;
    droplet.style.width = '6px';
    droplet.style.height = '6px';
    droplet.style.borderRadius = '50%';
    droplet.style.backgroundColor = '#8B0000';
    droplet.style.pointerEvents = 'none';
    droplet.style.zIndex = '1600';

    containerElement.appendChild(droplet);

    const angle = (Math.PI * 2 * i) / 8;
    const distance = 15 + Math.random() * 10;

    gsap.to(droplet, {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out',
      onComplete: () => droplet.remove(),
    });
  }
}

// Helper: Create lifesteal particles (blood flying back to caster)
function createLifestealParticles(
  fromPos: { x: number; y: number },
  toPos: { x: number; y: number },
  containerElement: HTMLElement
): void {
  // Create 5 blood particles that fly from target to caster
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      const particle = document.createElement('div');
      particle.style.position = 'absolute';
      particle.style.left = `${fromPos.x}px`;
      particle.style.top = `${fromPos.y}px`;
      particle.style.width = '8px';
      particle.style.height = '8px';
      particle.style.borderRadius = '50%';
      particle.style.background = 'radial-gradient(circle, #FF0000 0%, #8B0000 100%)';
      particle.style.boxShadow = '0 0 6px #FF0000';
      particle.style.pointerEvents = 'none';
      particle.style.zIndex = '1600';

      containerElement.appendChild(particle);

      gsap.to(particle, {
        x: toPos.x - fromPos.x,
        y: toPos.y - fromPos.y,
        opacity: 0,
        duration: 0.4,
        ease: 'power2.in',
        onComplete: () => particle.remove(),
      });
    }, i * 50);
  }
}

// Helper: Create arrow impact effect
function createArrowImpact(
  position: { x: number; y: number },
  containerElement: HTMLElement
): void {
  // Small impact flash
  const flash = document.createElement('div');
  flash.style.position = 'absolute';
  flash.style.left = `${position.x}px`;
  flash.style.top = `${position.y}px`;
  flash.style.width = '20px';
  flash.style.height = '20px';
  flash.style.transform = 'translate(-50%, -50%)';
  flash.style.borderRadius = '50%';
  flash.style.background = 'radial-gradient(circle, #FFF 0%, #FFD700 40%, transparent 70%)';
  flash.style.pointerEvents = 'none';
  flash.style.zIndex = '1600';

  containerElement.appendChild(flash);

  gsap.fromTo(
    flash,
    { scale: 0.3, opacity: 1 },
    {
      scale: 1,
      opacity: 0,
      duration: 0.2,
      ease: 'power2.out',
      onComplete: () => flash.remove(),
    }
  );

  // Small particles
  for (let i = 0; i < 4; i++) {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.left = `${position.x}px`;
    particle.style.top = `${position.y}px`;
    particle.style.width = '3px';
    particle.style.height = '3px';
    particle.style.borderRadius = '50%';
    particle.style.backgroundColor = '#8B4513';
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '1600';

    containerElement.appendChild(particle);

    const angle = (Math.PI * 2 * i) / 4;
    const distance = 10 + Math.random() * 10;

    gsap.to(particle, {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      opacity: 0,
      duration: 0.3,
      ease: 'power2.out',
      onComplete: () => particle.remove(),
    });
  }
}

// Helper: Create fire trail
function createFireTrail(
  position: { x: number; y: number },
  containerElement: HTMLElement
): void {
  const trail = document.createElement('div');
  trail.style.position = 'absolute';
  trail.style.left = `${position.x}px`;
  trail.style.top = `${position.y}px`;
  trail.style.width = '8px';
  trail.style.height = '8px';
  trail.style.borderRadius = '50%';
  trail.style.background = 'radial-gradient(circle, #FFF 0%, #FF4500 50%, transparent 100%)';
  trail.style.pointerEvents = 'none';
  trail.style.zIndex = '1400';

  containerElement.appendChild(trail);

  gsap.to(trail, {
    scale: 0.5,
    opacity: 0,
    duration: 0.3,
    ease: 'power2.out',
    onComplete: () => trail.remove(),
  });
}

// Helper: Create fire explosion
function createFireExplosion(
  position: { x: number; y: number },
  containerElement: HTMLElement,
  cellSize: number
): void {
  const explosion = document.createElement('div');
  explosion.style.position = 'absolute';
  explosion.style.left = `${position.x}px`;
  explosion.style.top = `${position.y}px`;
  explosion.style.width = `${cellSize}px`;
  explosion.style.height = `${cellSize}px`;
  explosion.style.borderRadius = '50%';
  explosion.style.background = 'radial-gradient(circle, #FFF 0%, #FF4500 30%, #8B0000 60%, transparent 100%)';
  explosion.style.boxShadow = '0 0 40px #FF4500';
  explosion.style.pointerEvents = 'none';
  explosion.style.zIndex = '1600';
  explosion.style.transform = 'translate(-50%, -50%)';

  containerElement.appendChild(explosion);

  gsap.fromTo(
    explosion,
    { scale: 0, opacity: 1 },
    {
      scale: 2,
      opacity: 0,
      duration: 0.4,
      ease: 'power2.out',
      onComplete: () => explosion.remove(),
    }
  );

  // Explosion particles
  for (let i = 0; i < 12; i++) {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.left = `${position.x}px`;
    particle.style.top = `${position.y}px`;
    particle.style.width = '4px';
    particle.style.height = '4px';
    particle.style.borderRadius = '50%';
    particle.style.backgroundColor = i % 2 === 0 ? '#FF4500' : '#FFD700';
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '1600';

    containerElement.appendChild(particle);

    const angle = (Math.PI * 2 * i) / 12;
    const distance = 30 + Math.random() * 20;

    gsap.to(particle, {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out',
      onComplete: () => particle.remove(),
    });
  }
}

// Helper: Create tile flash highlight (for target and AOE tiles)
export function createTileFlash(
  position: GridPosition,
  cellSize: number,
  containerElement: HTMLElement,
  color: string = '#FF4500',
  delay: number = 0
): void {
  const pixelPos = calculatePixelPosition(position, cellSize);

  const flash = document.createElement('div');
  flash.style.position = 'absolute';
  flash.style.left = `${pixelPos.x}px`;
  flash.style.top = `${pixelPos.y}px`;
  flash.style.width = `${cellSize}px`;
  flash.style.height = `${cellSize}px`;
  flash.style.background = `radial-gradient(circle, ${color}AA 0%, ${color}66 40%, transparent 70%)`;
  flash.style.pointerEvents = 'none';
  flash.style.zIndex = '1300';
  flash.style.borderRadius = '4px';

  containerElement.appendChild(flash);

  gsap.fromTo(
    flash,
    { opacity: 0, scale: 0.8 },
    {
      opacity: 1,
      scale: 1,
      duration: 0.15,
      delay,
      ease: 'power2.out',
      onComplete: () => {
        // Fade out
        gsap.to(flash, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: () => flash.remove(),
        });
      },
    }
  );
}

// Helper: Create buff sparkles
function createBuffSparkles(
  element: HTMLElement,
  containerElement: HTMLElement,
  color: string
): void {
  const rect = element.getBoundingClientRect();
  const containerRect = containerElement.getBoundingClientRect();

  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      const sparkle = document.createElement('div');
      sparkle.style.position = 'absolute';
      sparkle.style.left = `${rect.left - containerRect.left + Math.random() * rect.width}px`;
      sparkle.style.top = `${rect.top - containerRect.top + Math.random() * rect.height}px`;
      sparkle.style.width = '4px';
      sparkle.style.height = '4px';
      sparkle.style.borderRadius = '50%';
      sparkle.style.backgroundColor = color;
      sparkle.style.boxShadow = `0 0 6px ${color}`;
      sparkle.style.pointerEvents = 'none';
      sparkle.style.zIndex = '1600';

      containerElement.appendChild(sparkle);

      gsap.fromTo(
        sparkle,
        { scale: 0, opacity: 1, y: 0 },
        {
          scale: 1,
          opacity: 0,
          y: -20,
          duration: 0.6,
          ease: 'power2.out',
          onComplete: () => sparkle.remove(),
        }
      );
    }, i * 100);
  }
}

// ================= Phase 3 Animation Functions =================

/**
 * Beam Animation
 * Duration: ~0.8s
 * Effect: Glowing beam from caster to target that pulses
 */
export function animateBeam(
  casterElement: HTMLElement,
  targetElement: HTMLElement,
  casterPosition: GridPosition,
  targetPosition: GridPosition,
  cellSize: number,
  containerElement: HTMLElement,
  beamColor: string = '#FFD700'
): gsap.core.Timeline {
  const tl = gsap.timeline();

  const casterPixelPos = calculatePixelPosition(casterPosition, cellSize);
  const targetPixelPos = calculatePixelPosition(targetPosition, cellSize);

  const startX = casterPixelPos.x + cellSize / 2;
  const startY = casterPixelPos.y + cellSize / 2;
  const endX = targetPixelPos.x + cellSize / 2;
  const endY = targetPixelPos.y + cellSize / 2;

  const dx = endX - startX;
  const dy = endY - startY;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const length = Math.sqrt(dx * dx + dy * dy);

  // Create beam element
  const beam = document.createElement('div');
  beam.style.position = 'absolute';
  beam.style.width = `${length}px`;
  beam.style.height = '6px';
  beam.style.left = `${startX}px`;
  beam.style.top = `${startY}px`;
  beam.style.transformOrigin = 'left center';
  beam.style.transform = `rotate(${angle}deg)`;
  beam.style.background = `linear-gradient(90deg, ${beamColor}, #FFF, ${beamColor})`;
  beam.style.boxShadow = `0 0 10px ${beamColor}, 0 0 20px ${beamColor}`;
  beam.style.borderRadius = '3px';
  beam.style.pointerEvents = 'none';
  beam.style.zIndex = '1500';
  beam.style.opacity = '0';

  containerElement.appendChild(beam);

  // Beam appears
  tl.to(beam, {
    opacity: 1,
    duration: 0.15,
    ease: 'power2.out',
  });

  // Pulse 3 times (scale oscillation on y-axis)
  tl.to(beam, {
    scaleY: 2.5,
    duration: 0.1,
    ease: 'power2.out',
    yoyo: true,
    repeat: 5,
  });

  // Fade out
  tl.to(beam, {
    opacity: 0,
    scaleY: 0.5,
    duration: 0.2,
    ease: 'power2.in',
    onComplete: () => beam.remove(),
  });

  // Impact flash at target
  tl.add(() => {
    createBeamImpact(
      { x: endX, y: endY },
      containerElement,
      beamColor
    );
  }, 0.15);

  return tl;
}

// Helper: Create beam impact flash
function createBeamImpact(
  position: { x: number; y: number },
  containerElement: HTMLElement,
  color: string
): void {
  const flash = document.createElement('div');
  flash.style.position = 'absolute';
  flash.style.left = `${position.x}px`;
  flash.style.top = `${position.y}px`;
  flash.style.width = '24px';
  flash.style.height = '24px';
  flash.style.transform = 'translate(-50%, -50%)';
  flash.style.borderRadius = '50%';
  flash.style.background = `radial-gradient(circle, #FFF 0%, ${color} 50%, transparent 70%)`;
  flash.style.boxShadow = `0 0 15px ${color}`;
  flash.style.pointerEvents = 'none';
  flash.style.zIndex = '1600';

  containerElement.appendChild(flash);

  gsap.fromTo(
    flash,
    { scale: 0.3, opacity: 1 },
    {
      scale: 1.5,
      opacity: 0,
      duration: 0.4,
      ease: 'power2.out',
      onComplete: () => flash.remove(),
    }
  );
}

/**
 * Chain Animation
 * Duration: scales with number of targets
 * Effect: Projectile bouncing between multiple targets with sparks
 */
export function animateChain(
  casterElement: HTMLElement,
  targetPositions: GridPosition[],
  casterPosition: GridPosition,
  cellSize: number,
  containerElement: HTMLElement,
  chainColor: string = '#9370DB'
): gsap.core.Timeline {
  const tl = gsap.timeline();

  if (targetPositions.length === 0) return tl;

  const casterPixelPos = calculatePixelPosition(casterPosition, cellSize);
  const startX = casterPixelPos.x + cellSize / 2;
  const startY = casterPixelPos.y + cellSize / 2;

  // Create glowing circle projectile
  const projectile = document.createElement('div');
  projectile.style.position = 'absolute';
  projectile.style.width = '14px';
  projectile.style.height = '14px';
  projectile.style.left = `${startX}px`;
  projectile.style.top = `${startY}px`;
  projectile.style.transform = 'translate(-50%, -50%)';
  projectile.style.borderRadius = '50%';
  projectile.style.background = `radial-gradient(circle, #FFF 0%, ${chainColor} 60%, transparent 100%)`;
  projectile.style.boxShadow = `0 0 10px ${chainColor}, 0 0 20px ${chainColor}`;
  projectile.style.pointerEvents = 'none';
  projectile.style.zIndex = '1500';

  containerElement.appendChild(projectile);

  // Animate to each target sequentially
  let prevX = startX;
  let prevY = startY;

  targetPositions.forEach((targetPos, index) => {
    const targetPixelPos = calculatePixelPosition(targetPos, cellSize);
    const targetX = targetPixelPos.x + cellSize / 2;
    const targetY = targetPixelPos.y + cellSize / 2;

    // Create connecting sparks along the path
    tl.add(() => {
      createChainSparks(
        { x: prevX, y: prevY },
        { x: targetX, y: targetY },
        containerElement,
        chainColor
      );
    });

    // Move projectile to next target
    tl.to(projectile, {
      left: `${targetX}px`,
      top: `${targetY}px`,
      duration: 0.15,
      ease: 'power2.inOut',
    });

    // Create impact flash at target
    tl.add(() => {
      createChainImpact(
        { x: targetX, y: targetY },
        containerElement,
        chainColor
      );
      prevX = targetX;
      prevY = targetY;
    });
  });

  // Remove projectile at the end
  tl.add(() => {
    projectile.remove();
  });

  return tl;
}

// Helper: Create sparks along chain path
function createChainSparks(
  from: { x: number; y: number },
  to: { x: number; y: number },
  containerElement: HTMLElement,
  color: string
): void {
  const sparkCount = 3;
  for (let i = 0; i < sparkCount; i++) {
    const t = (i + 1) / (sparkCount + 1);
    const sparkX = from.x + (to.x - from.x) * t;
    const sparkY = from.y + (to.y - from.y) * t;

    const spark = document.createElement('div');
    spark.style.position = 'absolute';
    spark.style.left = `${sparkX}px`;
    spark.style.top = `${sparkY}px`;
    spark.style.width = '4px';
    spark.style.height = '4px';
    spark.style.transform = 'translate(-50%, -50%)';
    spark.style.borderRadius = '50%';
    spark.style.backgroundColor = color;
    spark.style.boxShadow = `0 0 4px ${color}`;
    spark.style.pointerEvents = 'none';
    spark.style.zIndex = '1500';

    containerElement.appendChild(spark);

    gsap.fromTo(
      spark,
      { opacity: 1, scale: 1 },
      {
        opacity: 0,
        scale: 0.3,
        y: -8 + Math.random() * 16,
        x: -8 + Math.random() * 16,
        duration: 0.3,
        delay: i * 0.03,
        ease: 'power2.out',
        onComplete: () => spark.remove(),
      }
    );
  }
}

// Helper: Create chain impact flash
function createChainImpact(
  position: { x: number; y: number },
  containerElement: HTMLElement,
  color: string
): void {
  const flash = document.createElement('div');
  flash.style.position = 'absolute';
  flash.style.left = `${position.x}px`;
  flash.style.top = `${position.y}px`;
  flash.style.width = '20px';
  flash.style.height = '20px';
  flash.style.transform = 'translate(-50%, -50%)';
  flash.style.borderRadius = '50%';
  flash.style.background = `radial-gradient(circle, #FFF 0%, ${color} 40%, transparent 70%)`;
  flash.style.pointerEvents = 'none';
  flash.style.zIndex = '1600';

  containerElement.appendChild(flash);

  gsap.fromTo(
    flash,
    { scale: 0.3, opacity: 1 },
    {
      scale: 1.2,
      opacity: 0,
      duration: 0.25,
      ease: 'power2.out',
      onComplete: () => flash.remove(),
    }
  );

  // Small particles
  for (let i = 0; i < 4; i++) {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.left = `${position.x}px`;
    particle.style.top = `${position.y}px`;
    particle.style.width = '3px';
    particle.style.height = '3px';
    particle.style.borderRadius = '50%';
    particle.style.backgroundColor = color;
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '1600';

    containerElement.appendChild(particle);

    const angle = (Math.PI * 2 * i) / 4;
    const distance = 8 + Math.random() * 8;

    gsap.to(particle, {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      opacity: 0,
      duration: 0.2,
      ease: 'power2.out',
      onComplete: () => particle.remove(),
    });
  }
}

/**
 * Shield Animation
 * Duration: ~0.8s
 * Effect: Protective dome expanding around target
 */
export function animateShield(
  targetElement: HTMLElement,
  targetPosition: GridPosition,
  cellSize: number,
  containerElement: HTMLElement,
  shieldColor: string = '#FFD700'
): gsap.core.Timeline {
  const tl = gsap.timeline();

  const targetPixelPos = calculatePixelPosition(targetPosition, cellSize);
  const centerX = targetPixelPos.x + cellSize / 2;
  const centerY = targetPixelPos.y + cellSize / 2;
  const shieldSize = cellSize * 1.2;

  // Create shield dome
  const shield = document.createElement('div');
  shield.style.position = 'absolute';
  shield.style.width = `${shieldSize}px`;
  shield.style.height = `${shieldSize}px`;
  shield.style.left = `${centerX}px`;
  shield.style.top = `${centerY}px`;
  shield.style.transform = 'translate(-50%, -50%)';
  shield.style.borderRadius = '50%';
  shield.style.border = `3px solid ${shieldColor}`;
  shield.style.background = `radial-gradient(circle, ${shieldColor}33 0%, ${shieldColor}11 60%, transparent 100%)`;
  shield.style.boxShadow = `0 0 15px ${shieldColor}66, inset 0 0 15px ${shieldColor}33`;
  shield.style.pointerEvents = 'none';
  shield.style.zIndex = '1500';

  containerElement.appendChild(shield);
  gsap.set(shield, { scale: 0, opacity: 0 });

  // Expand from scale 0 to 1
  tl.to(shield, {
    scale: 1,
    opacity: 1,
    duration: 0.2,
    ease: 'back.out(1.5)',
  });

  // Gentle pulse (scale 1 -> 1.05 -> 1, yoyo repeat 2)
  tl.to(shield, {
    scale: 1.05,
    duration: 0.15,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: 3,
  });

  // Fade out
  tl.to(shield, {
    opacity: 0,
    scale: 1.15,
    duration: 0.2,
    ease: 'power2.in',
    onComplete: () => shield.remove(),
  });

  return tl;
}

/**
 * AoE Blast Animation
 * Duration: ~0.6s
 * Effect: Expanding ring explosion with screen shake
 */
export function animateAoeBlast(
  centerPosition: GridPosition,
  radius: number,
  cellSize: number,
  containerElement: HTMLElement,
  blastColor: string = '#FF4500'
): gsap.core.Timeline {
  const tl = gsap.timeline();

  const centerPixelPos = calculatePixelPosition(centerPosition, cellSize);
  const centerX = centerPixelPos.x + cellSize / 2;
  const centerY = centerPixelPos.y + cellSize / 2;
  const finalDiameter = radius * cellSize * 2;

  // Create expanding ring
  const ring = document.createElement('div');
  ring.style.position = 'absolute';
  ring.style.width = `${finalDiameter}px`;
  ring.style.height = `${finalDiameter}px`;
  ring.style.left = `${centerX}px`;
  ring.style.top = `${centerY}px`;
  ring.style.transform = 'translate(-50%, -50%)';
  ring.style.borderRadius = '50%';
  ring.style.border = `4px solid ${blastColor}`;
  ring.style.boxShadow = `0 0 15px ${blastColor}, inset 0 0 15px ${blastColor}44`;
  ring.style.pointerEvents = 'none';
  ring.style.zIndex = '1500';

  containerElement.appendChild(ring);
  gsap.set(ring, { scale: 0, opacity: 1 });

  // Expand ring
  tl.to(ring, {
    scale: 1,
    opacity: 0,
    duration: 0.4,
    ease: 'power2.out',
    onComplete: () => ring.remove(),
  });

  // Create tile flash effects on all tiles within radius
  for (let r = -radius; r <= radius; r++) {
    for (let c = -radius; c <= radius; c++) {
      if (r * r + c * c <= radius * radius) {
        const tilePos = {
          row: centerPosition.row + r,
          col: centerPosition.col + c,
        };
        const dist = Math.sqrt(r * r + c * c);
        createTileFlash(tilePos, cellSize, containerElement, blastColor, 0.05 + dist * 0.05);
      }
    }
  }

  // Screen shake effect
  tl.to(containerElement, {
    x: 3,
    duration: 0.05,
    ease: 'none',
    yoyo: true,
    repeat: 4,
  }, 0.1);

  tl.set(containerElement, { x: 0 });

  // Explosion particles
  tl.add(() => {
    for (let i = 0; i < 10; i++) {
      const particle = document.createElement('div');
      particle.style.position = 'absolute';
      particle.style.left = `${centerX}px`;
      particle.style.top = `${centerY}px`;
      particle.style.width = '5px';
      particle.style.height = '5px';
      particle.style.borderRadius = '50%';
      particle.style.backgroundColor = i % 2 === 0 ? blastColor : '#FFF';
      particle.style.boxShadow = `0 0 4px ${blastColor}`;
      particle.style.pointerEvents = 'none';
      particle.style.zIndex = '1600';

      containerElement.appendChild(particle);

      const angle = (Math.PI * 2 * i) / 10;
      const distance = 20 + Math.random() * 30;

      gsap.to(particle, {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        opacity: 0,
        duration: 0.4,
        ease: 'power2.out',
        onComplete: () => particle.remove(),
      });
    }
  }, 0.05);

  return tl;
}

/**
 * Summon Animation
 * Duration: ~0.8s
 * Effect: Portal swirl spawning a unit with spiraling particles
 */
export function animateSummon(
  position: GridPosition,
  cellSize: number,
  containerElement: HTMLElement,
  summonColor: string = '#9400D3'
): gsap.core.Timeline {
  const tl = gsap.timeline();

  const pixelPos = calculatePixelPosition(position, cellSize);
  const centerX = pixelPos.x + cellSize / 2;
  const centerY = pixelPos.y + cellSize / 2;
  const portalSize = cellSize * 0.9;

  // Create portal circle
  const portal = document.createElement('div');
  portal.style.position = 'absolute';
  portal.style.width = `${portalSize}px`;
  portal.style.height = `${portalSize}px`;
  portal.style.left = `${centerX}px`;
  portal.style.top = `${centerY}px`;
  portal.style.transform = 'translate(-50%, -50%)';
  portal.style.borderRadius = '50%';
  portal.style.border = `3px solid ${summonColor}`;
  portal.style.background = `radial-gradient(circle, ${summonColor}66 0%, ${summonColor}33 50%, transparent 100%)`;
  portal.style.boxShadow = `0 0 20px ${summonColor}, inset 0 0 20px ${summonColor}66`;
  portal.style.pointerEvents = 'none';
  portal.style.zIndex = '1500';

  containerElement.appendChild(portal);
  gsap.set(portal, { scale: 0, rotation: 0, opacity: 1 });

  // Scale up with rotation (0 to 720deg)
  tl.to(portal, {
    scale: 1,
    rotation: 720,
    duration: 0.5,
    ease: 'power2.out',
  });

  // Add 8 particles spiraling inward toward center
  tl.add(() => {
    for (let i = 0; i < 8; i++) {
      const particle = document.createElement('div');
      particle.style.position = 'absolute';
      particle.style.width = '6px';
      particle.style.height = '6px';
      particle.style.borderRadius = '50%';
      particle.style.backgroundColor = i % 2 === 0 ? summonColor : '#FFF';
      particle.style.boxShadow = `0 0 6px ${summonColor}`;
      particle.style.pointerEvents = 'none';
      particle.style.zIndex = '1600';

      const angle = (Math.PI * 2 * i) / 8;
      const startDist = portalSize * 0.8;
      const startPX = centerX + Math.cos(angle) * startDist;
      const startPY = centerY + Math.sin(angle) * startDist;

      particle.style.left = `${startPX}px`;
      particle.style.top = `${startPY}px`;
      particle.style.transform = 'translate(-50%, -50%)';

      containerElement.appendChild(particle);

      gsap.to(particle, {
        left: `${centerX}px`,
        top: `${centerY}px`,
        scale: 0,
        opacity: 0,
        duration: 0.3,
        delay: i * 0.03,
        ease: 'power2.in',
        onComplete: () => particle.remove(),
      });
    }
  }, 0.3);

  // Fade out portal
  tl.to(portal, {
    opacity: 0,
    scale: 0.5,
    duration: 0.2,
    ease: 'power2.in',
    onComplete: () => portal.remove(),
  }, '+=0.05');

  return tl;
}

/**
 * Teleport Animation
 * Duration: ~0.5s
 * Effect: Flash at origin, shadow trail, flash at destination
 */
export function animateTeleport(
  fromPosition: GridPosition,
  toPosition: GridPosition,
  cellSize: number,
  containerElement: HTMLElement,
  teleportColor: string = '#4B0082'
): gsap.core.Timeline {
  const tl = gsap.timeline();

  const fromPixelPos = calculatePixelPosition(fromPosition, cellSize);
  const toPixelPos = calculatePixelPosition(toPosition, cellSize);
  const fromX = fromPixelPos.x + cellSize / 2;
  const fromY = fromPixelPos.y + cellSize / 2;
  const toX = toPixelPos.x + cellSize / 2;
  const toY = toPixelPos.y + cellSize / 2;
  const burstSize = cellSize * 0.8;

  // Flash at origin (bright burst)
  const originFlash = document.createElement('div');
  originFlash.style.position = 'absolute';
  originFlash.style.width = `${burstSize}px`;
  originFlash.style.height = `${burstSize}px`;
  originFlash.style.left = `${fromX}px`;
  originFlash.style.top = `${fromY}px`;
  originFlash.style.transform = 'translate(-50%, -50%)';
  originFlash.style.borderRadius = '50%';
  originFlash.style.background = `radial-gradient(circle, #FFF 0%, ${teleportColor} 50%, transparent 100%)`;
  originFlash.style.boxShadow = `0 0 20px ${teleportColor}`;
  originFlash.style.pointerEvents = 'none';
  originFlash.style.zIndex = '1600';

  containerElement.appendChild(originFlash);
  gsap.set(originFlash, { scale: 0, opacity: 1 });

  tl.to(originFlash, {
    scale: 1.5,
    opacity: 0,
    duration: 0.15,
    ease: 'power2.out',
    onComplete: () => originFlash.remove(),
  });

  // Shadow trail: 3 dots staggered from origin to destination
  for (let i = 0; i < 3; i++) {
    const t = (i + 1) / 4;
    const dotX = fromX + (toX - fromX) * t;
    const dotY = fromY + (toY - fromY) * t;

    const dot = document.createElement('div');
    dot.style.position = 'absolute';
    dot.style.width = '10px';
    dot.style.height = '10px';
    dot.style.left = `${dotX}px`;
    dot.style.top = `${dotY}px`;
    dot.style.transform = 'translate(-50%, -50%)';
    dot.style.borderRadius = '50%';
    dot.style.backgroundColor = teleportColor;
    dot.style.boxShadow = `0 0 8px ${teleportColor}`;
    dot.style.pointerEvents = 'none';
    dot.style.zIndex = '1500';
    dot.style.opacity = '0';

    containerElement.appendChild(dot);

    tl.to(dot, {
      opacity: 0.8,
      scale: 1,
      duration: 0.05,
      delay: i * 0.03,
      ease: 'power2.out',
    }, 0.1);

    tl.to(dot, {
      opacity: 0,
      scale: 0.3,
      duration: 0.15,
      ease: 'power2.in',
      onComplete: () => dot.remove(),
    }, 0.2 + i * 0.03);
  }

  // Flash at destination
  const destFlash = document.createElement('div');
  destFlash.style.position = 'absolute';
  destFlash.style.width = `${burstSize}px`;
  destFlash.style.height = `${burstSize}px`;
  destFlash.style.left = `${toX}px`;
  destFlash.style.top = `${toY}px`;
  destFlash.style.transform = 'translate(-50%, -50%)';
  destFlash.style.borderRadius = '50%';
  destFlash.style.background = `radial-gradient(circle, #FFF 0%, ${teleportColor} 50%, transparent 100%)`;
  destFlash.style.boxShadow = `0 0 20px ${teleportColor}`;
  destFlash.style.pointerEvents = 'none';
  destFlash.style.zIndex = '1600';

  containerElement.appendChild(destFlash);
  gsap.set(destFlash, { scale: 0, opacity: 1 });

  tl.to(destFlash, {
    scale: 1.5,
    opacity: 0,
    duration: 0.15,
    ease: 'power2.out',
    onComplete: () => destFlash.remove(),
  }, 0.3);

  return tl;
}

/**
 * Revive Animation
 * Duration: ~1s
 * Effect: Golden light column with rising sparkle particles
 */
export function animateRevive(
  position: GridPosition,
  cellSize: number,
  containerElement: HTMLElement,
  reviveColor: string = '#FFD700'
): gsap.core.Timeline {
  const tl = gsap.timeline();

  const pixelPos = calculatePixelPosition(position, cellSize);
  const centerX = pixelPos.x + cellSize / 2;
  const centerY = pixelPos.y + cellSize / 2;
  const columnWidth = cellSize * 0.6;
  const columnHeight = cellSize * 3;

  // Create light column (extends upward from target)
  const column = document.createElement('div');
  column.style.position = 'absolute';
  column.style.width = `${columnWidth}px`;
  column.style.height = `${columnHeight}px`;
  column.style.left = `${centerX}px`;
  column.style.top = `${centerY}px`;
  column.style.transform = 'translate(-50%, -100%)';
  column.style.transformOrigin = 'bottom center';
  column.style.background = `linear-gradient(to top, ${reviveColor} 0%, ${reviveColor}88 30%, ${reviveColor}22 70%, transparent 100%)`;
  column.style.boxShadow = `0 0 20px ${reviveColor}66`;
  column.style.borderRadius = `${columnWidth / 2}px ${columnWidth / 2}px 0 0`;
  column.style.pointerEvents = 'none';
  column.style.zIndex = '1500';

  containerElement.appendChild(column);
  gsap.set(column, { opacity: 0, scaleY: 0 });

  // Animate: opacity 0 -> 1, scaleY 0 -> 1 (from bottom)
  tl.to(column, {
    opacity: 1,
    scaleY: 1,
    duration: 0.35,
    ease: 'power2.out',
  });

  // Add sparkle particles rising upward (6 particles)
  tl.add(() => {
    for (let i = 0; i < 6; i++) {
      const sparkle = document.createElement('div');
      sparkle.style.position = 'absolute';
      sparkle.style.width = '5px';
      sparkle.style.height = '5px';
      sparkle.style.borderRadius = '50%';
      sparkle.style.backgroundColor = i % 2 === 0 ? reviveColor : '#FFF';
      sparkle.style.boxShadow = `0 0 6px ${reviveColor}`;
      sparkle.style.pointerEvents = 'none';
      sparkle.style.zIndex = '1600';

      const offsetX = (Math.random() - 0.5) * columnWidth;
      sparkle.style.left = `${centerX + offsetX}px`;
      sparkle.style.top = `${centerY}px`;
      sparkle.style.transform = 'translate(-50%, -50%)';

      containerElement.appendChild(sparkle);

      gsap.to(sparkle, {
        y: -(cellSize * 1.5 + Math.random() * cellSize),
        x: (Math.random() - 0.5) * 20,
        opacity: 0,
        scale: 0.5,
        duration: 0.5 + Math.random() * 0.3,
        delay: i * 0.06,
        ease: 'power2.out',
        onComplete: () => sparkle.remove(),
      });
    }
  }, 0.2);

  // Hold briefly then fade out
  tl.to(column, {
    opacity: 0,
    duration: 0.3,
    ease: 'power2.in',
    onComplete: () => column.remove(),
  }, '+=0.15');

  return tl;
}

/**
 * Status Apply Animation
 * Duration: ~0.3s
 * Effect: Quick color flash for status effect application
 */
export function animateStatusApply(
  targetElement: HTMLElement,
  targetPosition: GridPosition,
  cellSize: number,
  containerElement: HTMLElement,
  statusColor: string = '#FF4500'
): gsap.core.Timeline {
  const tl = gsap.timeline();

  const targetPixelPos = calculatePixelPosition(targetPosition, cellSize);
  const centerX = targetPixelPos.x + cellSize / 2;
  const centerY = targetPixelPos.y + cellSize / 2;

  // Create small icon-sized flash at target position
  const flash = document.createElement('div');
  flash.style.position = 'absolute';
  flash.style.width = `${cellSize * 0.5}px`;
  flash.style.height = `${cellSize * 0.5}px`;
  flash.style.left = `${centerX}px`;
  flash.style.top = `${centerY}px`;
  flash.style.transform = 'translate(-50%, -50%)';
  flash.style.borderRadius = '50%';
  flash.style.background = `radial-gradient(circle, #FFF 0%, ${statusColor} 50%, transparent 100%)`;
  flash.style.boxShadow = `0 0 12px ${statusColor}`;
  flash.style.pointerEvents = 'none';
  flash.style.zIndex = '1600';

  containerElement.appendChild(flash);
  gsap.set(flash, { scale: 0, opacity: 1 });

  // Quick scale up and glow
  tl.to(flash, {
    scale: 1.3,
    duration: 0.15,
    ease: 'back.out(2)',
  });

  // Fade out
  tl.to(flash, {
    scale: 1.6,
    opacity: 0,
    duration: 0.15,
    ease: 'power2.in',
    onComplete: () => flash.remove(),
  });

  // Brief filter glow on target element (similar to animateSimpleBuff but quicker)
  tl.to(targetElement, {
    filter: `drop-shadow(0 0 8px ${statusColor}) brightness(1.15)`,
    duration: 0.15,
    ease: 'power2.out',
    yoyo: true,
    repeat: 1,
  }, 0);

  return tl;
}
