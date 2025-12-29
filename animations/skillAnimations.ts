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
