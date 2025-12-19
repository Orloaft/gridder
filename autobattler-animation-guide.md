# Grid-Based Autobattler - Animation Guide

## Animation Philosophy

**Core Principle**: Every interaction should have immediate, satisfying feedback. Animations should be **snappy** (fast), **smooth** (eased), and **juicy** (with secondary effects like particles, screen shake, sound).

### Animation Goals
1. **Responsive**: <100ms response to user input
2. **Clear**: Communicate what's happening (damage, healing, status effects)
3. **Satisfying**: Feel impactful and rewarding
4. **Performance**: Maintain 60fps with multiple simultaneous animations
5. **Grid-Constrained**: Units move cell-to-cell, not freely

---

## Technology Stack

### GSAP (GreenSock Animation Platform)
**Why GSAP**:
- Professional-grade easing functions
- Timeline support for complex sequences
- Automatic cleanup
- Performance optimized
- Much cleaner code than vanilla JS

**Installation**:
```bash
npm install gsap
```

**Basic Setup**:
```typescript
import gsap from 'gsap';

// Simple animation
gsap.to(element, {
  x: 100,
  duration: 0.5,
  ease: "power2.out"
});

// Timeline for sequences
const tl = gsap.timeline();
tl.to(element, { x: 100, duration: 0.3 })
  .to(element, { y: 50, duration: 0.2 })
  .to(element, { rotation: 360, duration: 0.5 });
```

### React Integration
```typescript
import { useRef, useEffect } from 'react';
import gsap from 'gsap';

function AnimatedComponent() {
  const elementRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (elementRef.current) {
      gsap.to(elementRef.current, {
        x: 100,
        duration: 0.5
      });
    }
  }, []);
  
  return <div ref={elementRef}>Animated!</div>;
}
```

---

## Grid Cell Animations

### 1. Cell Hover Animation
**When**: Mouse enters cell
**Duration**: 0.15s
**Effect**: Subtle glow + scale

```typescript
// src/components/Grid/animations/cellAnimations.ts

import gsap from 'gsap';

export function animateCellHover(cellElement: HTMLElement): gsap.core.Tween {
  return gsap.to(cellElement, {
    scale: 1.05,
    backgroundColor: 'rgba(79, 195, 247, 0.15)',
    boxShadow: '0 0 20px rgba(79, 195, 247, 0.4)',
    duration: 0.15,
    ease: 'power2.out'
  });
}

export function animateCellHoverOut(cellElement: HTMLElement): gsap.core.Tween {
  return gsap.to(cellElement, {
    scale: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    boxShadow: '0 0 0 rgba(79, 195, 247, 0)',
    duration: 0.15,
    ease: 'power2.in'
  });
}
```

**Usage**:
```typescript
<div
  className="grid-cell"
  onMouseEnter={(e) => animateCellHover(e.currentTarget)}
  onMouseLeave={(e) => animateCellHoverOut(e.currentTarget)}
>
  {/* Cell content */}
</div>
```

### 2. Cell Selection Animation
**When**: Cell is selected/clicked
**Duration**: 0.3s
**Effect**: Pulse + border glow

```typescript
export function animateCellSelect(cellElement: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();
  
  // Initial pulse
  tl.to(cellElement, {
    scale: 1.1,
    duration: 0.15,
    ease: 'back.out(2)'
  });
  
  // Return to slightly elevated
  tl.to(cellElement, {
    scale: 1.05,
    duration: 0.15,
    ease: 'power2.in'
  });
  
  // Continuous pulse for selected state
  tl.to(cellElement, {
    boxShadow: '0 0 30px rgba(76, 175, 80, 0.8)',
    duration: 0.8,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true
  }, 0); // Start at time 0 (parallel with other animations)
  
  return tl;
}

export function animateCellDeselect(cellElement: HTMLElement): gsap.core.Tween {
  // Kill any ongoing animations first
  gsap.killTweensOf(cellElement);
  
  return gsap.to(cellElement, {
    scale: 1,
    boxShadow: '0 0 0 rgba(76, 175, 80, 0)',
    duration: 0.2,
    ease: 'power2.out'
  });
}
```

### 3. Cell Highlight Animation (for valid move targets, etc.)
**When**: Showing available actions
**Duration**: Continuous pulse
**Effect**: Gentle pulsing glow

```typescript
export function animateCellHighlight(cellElement: HTMLElement, color = '#FFD700'): gsap.core.Timeline {
  const tl = gsap.timeline({ repeat: -1 });
  
  tl.to(cellElement, {
    backgroundColor: `${color}33`, // 33 = 20% opacity in hex
    boxShadow: `0 0 15px ${color}66`,
    duration: 0.8,
    ease: 'sine.inOut'
  });
  
  tl.to(cellElement, {
    backgroundColor: `${color}11`,
    boxShadow: `0 0 5px ${color}33`,
    duration: 0.8,
    ease: 'sine.inOut'
  });
  
  return tl;
}

export function stopCellHighlight(cellElement: HTMLElement): gsap.core.Tween {
  gsap.killTweensOf(cellElement);
  
  return gsap.to(cellElement, {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    boxShadow: '0 0 0 rgba(0, 0, 0, 0)',
    duration: 0.2,
    ease: 'power2.out'
  });
}
```

---

## Occupant Card Animations

### 4. Card Entrance Animation
**When**: Occupant appears on grid
**Duration**: 0.4s
**Effect**: Scale in + fade in + slight bounce

```typescript
// src/components/GridOccupants/animations/cardAnimations.ts

export function animateCardEntrance(cardElement: HTMLElement, delay = 0): gsap.core.Timeline {
  const tl = gsap.timeline({ delay });
  
  // Set initial state
  gsap.set(cardElement, {
    scale: 0,
    opacity: 0,
    rotation: -10
  });
  
  // Animate in
  tl.to(cardElement, {
    scale: 1,
    opacity: 1,
    rotation: 0,
    duration: 0.4,
    ease: 'back.out(1.7)' // Overshoot creates satisfying bounce
  });
  
  return tl;
}

// Stagger multiple cards
export function animateCardsEntrance(cardElements: HTMLElement[]): gsap.core.Timeline {
  const tl = gsap.timeline();
  
  cardElements.forEach((card, index) => {
    tl.add(animateCardEntrance(card, index * 0.1), 0);
  });
  
  return tl;
}
```

### 5. Card Exit Animation
**When**: Occupant leaves grid
**Duration**: 0.3s
**Effect**: Scale out + fade out + rotation

```typescript
export function animateCardExit(cardElement: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();
  
  tl.to(cardElement, {
    scale: 0.8,
    opacity: 0,
    rotation: 10,
    y: -20, // Slight lift
    duration: 0.3,
    ease: 'power2.in'
  });
  
  return tl;
}
```

### 6. Card Hover Animation
**When**: Mouse enters card
**Duration**: 0.2s
**Effect**: Lift + glow + scale

```typescript
export function animateCardHover(cardElement: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();
  
  tl.to(cardElement, {
    y: -8,
    scale: 1.05,
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
    filter: 'brightness(1.2)',
    duration: 0.2,
    ease: 'power2.out'
  });
  
  return tl;
}

export function animateCardHoverOut(cardElement: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();
  
  tl.to(cardElement, {
    y: 0,
    scale: 1,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    filter: 'brightness(1)',
    duration: 0.2,
    ease: 'power2.in'
  });
  
  return tl;
}
```

### 7. Card Click Animation
**When**: Card is clicked
**Duration**: 0.2s
**Effect**: Quick scale down then up ("press" effect)

```typescript
export function animateCardClick(cardElement: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();
  
  // Press down
  tl.to(cardElement, {
    scale: 0.95,
    duration: 0.1,
    ease: 'power2.in'
  });
  
  // Release
  tl.to(cardElement, {
    scale: 1.05,
    duration: 0.1,
    ease: 'back.out(3)'
  });
  
  // Settle
  tl.to(cardElement, {
    scale: 1,
    duration: 0.1,
    ease: 'power2.out'
  });
  
  return tl;
}
```

---

## Battle Animations

### 8. Unit Movement (Cell to Cell)
**When**: Unit moves during battle
**Duration**: 0.3-0.5s depending on distance
**Effect**: Smooth lerp between cells

```typescript
// src/systems/animations/battleAnimations.ts

import gsap from 'gsap';

interface GridPosition {
  row: number;
  col: number;
}

export function calculatePixelPosition(
  gridPosition: GridPosition,
  cellSize: number,
  gap: number
): { x: number; y: number } {
  return {
    x: gridPosition.col * (cellSize + gap) + gap,
    y: gridPosition.row * (cellSize + gap) + gap
  };
}

export function animateUnitMovement(
  unitElement: HTMLElement,
  fromPosition: GridPosition,
  toPosition: GridPosition,
  cellSize: number,
  gap: number,
  movementType: 'walk' | 'fly' | 'phase' | 'teleport' = 'walk'
): gsap.core.Timeline {
  const tl = gsap.timeline();
  
  const from = calculatePixelPosition(fromPosition, cellSize, gap);
  const to = calculatePixelPosition(toPosition, cellSize, gap);
  
  switch (movementType) {
    case 'walk':
      // Slight bounce while moving
      tl.to(unitElement, {
        x: to.x,
        y: to.y,
        duration: 0.4,
        ease: 'power2.inOut'
      });
      
      // Add slight vertical bob
      tl.to(unitElement, {
        y: `+=${-5}`,
        duration: 0.2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: 1
      }, 0);
      break;
      
    case 'fly':
      // Smooth glide with arc
      tl.to(unitElement, {
        x: to.x,
        duration: 0.5,
        ease: 'power1.inOut'
      });
      
      // Arc motion
      tl.to(unitElement, {
        y: to.y - 30, // Rise up
        duration: 0.25,
        ease: 'power2.out'
      }, 0);
      
      tl.to(unitElement, {
        y: to.y, // Drop down
        duration: 0.25,
        ease: 'power2.in'
      });
      break;
      
    case 'phase':
      // Fade out, move, fade in
      tl.to(unitElement, {
        opacity: 0.3,
        scale: 0.8,
        duration: 0.15,
        ease: 'power2.in'
      });
      
      tl.to(unitElement, {
        x: to.x,
        y: to.y,
        duration: 0.2,
        ease: 'none'
      });
      
      tl.to(unitElement, {
        opacity: 1,
        scale: 1,
        duration: 0.15,
        ease: 'power2.out'
      });
      break;
      
    case 'teleport':
      // Instant with effects
      tl.to(unitElement, {
        scale: 0,
        opacity: 0,
        rotation: 180,
        duration: 0.15,
        ease: 'power2.in'
      });
      
      tl.set(unitElement, {
        x: to.x,
        y: to.y
      });
      
      tl.to(unitElement, {
        scale: 1,
        opacity: 1,
        rotation: 360,
        duration: 0.15,
        ease: 'back.out(2)'
      });
      break;
  }
  
  return tl;
}
```

### 9. Melee Attack Animation
**When**: Unit performs melee attack
**Duration**: 0.3s
**Effect**: Lunge forward, return, impact shake

```typescript
export function animateMeleeAttack(
  attackerElement: HTMLElement,
  targetElement: HTMLElement,
  attackerPosition: GridPosition,
  targetPosition: GridPosition,
  cellSize: number,
  gap: number
): gsap.core.Timeline {
  const tl = gsap.timeline();
  
  const attackerPos = calculatePixelPosition(attackerPosition, cellSize, gap);
  const targetPos = calculatePixelPosition(targetPosition, cellSize, gap);
  
  // Calculate direction vector
  const dx = targetPos.x - attackerPos.x;
  const dy = targetPos.y - attackerPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Lunge distance (halfway to target)
  const lungeDistance = distance * 0.5;
  const lungeX = attackerPos.x + (dx / distance) * lungeDistance;
  const lungeY = attackerPos.y + (dy / distance) * lungeDistance;
  
  // Wind up (optional, very quick)
  tl.to(attackerElement, {
    x: attackerPos.x - dx * 0.1,
    y: attackerPos.y - dy * 0.1,
    duration: 0.08,
    ease: 'power2.in'
  });
  
  // Lunge forward
  tl.to(attackerElement, {
    x: lungeX,
    y: lungeY,
    scale: 1.1,
    duration: 0.15,
    ease: 'power2.out'
  });
  
  // Impact moment - shake target
  tl.add(() => {
    animateImpact(targetElement);
  });
  
  // Return to position
  tl.to(attackerElement, {
    x: attackerPos.x,
    y: attackerPos.y,
    scale: 1,
    duration: 0.15,
    ease: 'power2.in'
  });
  
  return tl;
}
```

### 10. Ranged Attack Animation
**When**: Unit performs ranged attack
**Duration**: 0.5s
**Effect**: Projectile travels from attacker to target

```typescript
export function animateRangedAttack(
  attackerElement: HTMLElement,
  targetElement: HTMLElement,
  attackerPosition: GridPosition,
  targetPosition: GridPosition,
  cellSize: number,
  gap: number,
  projectileType: 'arrow' | 'magic' | 'bolt' = 'arrow'
): gsap.core.Timeline {
  const tl = gsap.timeline();
  
  const attackerPos = calculatePixelPosition(attackerPosition, cellSize, gap);
  const targetPos = calculatePixelPosition(targetPosition, cellSize, gap);
  
  // Create projectile element
  const projectile = document.createElement('div');
  projectile.className = `projectile projectile--${projectileType}`;
  projectile.style.position = 'absolute';
  projectile.style.left = `${attackerPos.x + cellSize / 2}px`;
  projectile.style.top = `${attackerPos.y + cellSize / 2}px`;
  projectile.style.width = '8px';
  projectile.style.height = '8px';
  projectile.style.borderRadius = '50%';
  projectile.style.backgroundColor = projectileType === 'magic' ? '#9C27B0' : '#FFC107';
  projectile.style.boxShadow = `0 0 10px ${projectileType === 'magic' ? '#9C27B0' : '#FFC107'}`;
  projectile.style.zIndex = '1000';
  
  attackerElement.parentElement?.appendChild(projectile);
  
  // Attacker recoil
  tl.to(attackerElement, {
    scale: 0.95,
    duration: 0.1,
    ease: 'power2.out',
    yoyo: true,
    repeat: 1
  });
  
  // Projectile travel
  tl.to(projectile, {
    left: targetPos.x + cellSize / 2,
    top: targetPos.y + cellSize / 2,
    duration: 0.3,
    ease: 'none',
    onComplete: () => {
      // Impact
      animateImpact(targetElement);
      
      // Remove projectile
      projectile.remove();
    }
  }, 0.1);
  
  // Trail effect for projectile
  if (projectileType === 'magic') {
    tl.to(projectile, {
      boxShadow: '0 0 30px #9C27B0',
      duration: 0.3,
      ease: 'power2.inOut'
    }, 0.1);
  }
  
  return tl;
}
```

### 11. Impact/Hit Animation
**When**: Unit takes damage
**Duration**: 0.2s
**Effect**: Shake + flash red

```typescript
export function animateImpact(
  targetElement: HTMLElement,
  intensity: 'light' | 'medium' | 'heavy' = 'medium'
): gsap.core.Timeline {
  const tl = gsap.timeline();
  
  const shakeAmount = {
    light: 3,
    medium: 6,
    heavy: 10
  }[intensity];
  
  // Flash red
  tl.to(targetElement, {
    filter: 'brightness(1.5) saturate(1.5)',
    duration: 0.05,
    ease: 'power2.out'
  });
  
  // Shake
  tl.to(targetElement, {
    x: `+=${shakeAmount}`,
    duration: 0.05,
    ease: 'power2.inOut',
    yoyo: true,
    repeat: 3
  }, 0);
  
  // Return to normal
  tl.to(targetElement, {
    filter: 'brightness(1) saturate(1)',
    x: 0,
    duration: 0.1,
    ease: 'power2.out'
  });
  
  return tl;
}
```

### 12. Damage Number Animation
**When**: Damage is dealt
**Duration**: 0.8s
**Effect**: Pop in, float up, fade out

```typescript
export function createDamageNumber(
  amount: number,
  position: { x: number; y: number },
  type: 'damage' | 'heal' | 'critical' = 'damage',
  containerElement: HTMLElement
): gsap.core.Timeline {
  const tl = gsap.timeline();
  
  // Create damage number element
  const damageNumber = document.createElement('div');
  damageNumber.className = `damage-number damage-number--${type}`;
  damageNumber.textContent = type === 'heal' ? `+${amount}` : `-${amount}`;
  damageNumber.style.position = 'absolute';
  damageNumber.style.left = `${position.x}px`;
  damageNumber.style.top = `${position.y}px`;
  damageNumber.style.fontSize = type === 'critical' ? '32px' : '24px';
  damageNumber.style.fontWeight = 'bold';
  damageNumber.style.color = type === 'heal' ? '#4CAF50' : type === 'critical' ? '#FF5722' : '#F44336';
  damageNumber.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.8)';
  damageNumber.style.pointerEvents = 'none';
  damageNumber.style.zIndex = '2000';
  
  containerElement.appendChild(damageNumber);
  
  // Set initial state
  gsap.set(damageNumber, {
    scale: 0,
    opacity: 0
  });
  
  // Pop in with elastic bounce
  tl.to(damageNumber, {
    scale: 1,
    opacity: 1,
    duration: 0.2,
    ease: 'back.out(3)'
  });
  
  // Float upward
  tl.to(damageNumber, {
    y: -50,
    duration: 0.6,
    ease: 'power2.out'
  }, 0.2);
  
  // Fade out
  tl.to(damageNumber, {
    opacity: 0,
    duration: 0.3,
    ease: 'power2.in',
    onComplete: () => {
      damageNumber.remove();
    }
  }, 0.5);
  
  return tl;
}
```

### 13. Death Animation
**When**: Unit HP reaches 0
**Duration**: 0.5s
**Effect**: Fade + fall + particle burst

```typescript
export function animateDeath(
  unitElement: HTMLElement,
  position: GridPosition,
  cellSize: number,
  gap: number
): gsap.core.Timeline {
  const tl = gsap.timeline();
  
  const pixelPos = calculatePixelPosition(position, cellSize, gap);
  
  // Main death animation
  tl.to(unitElement, {
    opacity: 0,
    scale: 0.5,
    rotation: 90,
    y: `+=${20}`,
    duration: 0.5,
    ease: 'power2.in'
  });
  
  // Add particle burst
  tl.add(() => {
    createParticleBurst(
      { x: pixelPos.x + cellSize / 2, y: pixelPos.y + cellSize / 2 },
      unitElement.parentElement!
    );
  }, 0);
  
  return tl;
}

function createParticleBurst(
  position: { x: number; y: number },
  containerElement: HTMLElement
): void {
  const particleCount = 20;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'death-particle';
    particle.style.position = 'absolute';
    particle.style.left = `${position.x}px`;
    particle.style.top = `${position.y}px`;
    particle.style.width = '4px';
    particle.style.height = '4px';
    particle.style.borderRadius = '50%';
    particle.style.backgroundColor = '#888';
    particle.style.pointerEvents = 'none';
    
    containerElement.appendChild(particle);
    
    // Random direction
    const angle = (Math.PI * 2 * i) / particleCount;
    const distance = 30 + Math.random() * 20;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    
    gsap.to(particle, {
      x: tx,
      y: ty,
      opacity: 0,
      duration: 0.5 + Math.random() * 0.3,
      ease: 'power2.out',
      onComplete: () => {
        particle.remove();
      }
    });
  }
}
```

### 14. HP Bar Animation
**When**: Unit HP changes
**Duration**: 0.3s
**Effect**: Smooth width transition

```typescript
export function animateHPBar(
  hpBarElement: HTMLElement,
  currentHP: number,
  maxHP: number,
  previousHP?: number
): gsap.core.Timeline {
  const tl = gsap.timeline();
  
  const newWidth = (currentHP / maxHP) * 100;
  
  // If damage taken, show damage flash
  if (previousHP && currentHP < previousHP) {
    // Keep red "damage taken" bar visible briefly
    const damageBar = hpBarElement.querySelector('.hp-damage-indicator');
    if (damageBar) {
      gsap.set(damageBar, {
        width: `${(previousHP / maxHP) * 100}%`,
        opacity: 0.5
      });
      
      gsap.to(damageBar, {
        opacity: 0,
        duration: 0.5,
        delay: 0.2,
        ease: 'power2.out'
      });
    }
  }
  
  // Animate HP bar
  tl.to(hpBarElement, {
    width: `${newWidth}%`,
    duration: 0.3,
    ease: 'power2.out'
  });
  
  // Flash if low HP
  if (currentHP / maxHP < 0.3) {
    tl.to(hpBarElement, {
      filter: 'brightness(1.5)',
      duration: 0.3,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1
    }, 0);
  }
  
  return tl;
}
```

### 15. Status Effect Animation
**When**: Status applied/removed
**Duration**: 0.4s
**Effect**: Icon appears with pop + particle swirl

```typescript
export function animateStatusApplied(
  targetElement: HTMLElement,
  statusType: 'poison' | 'buff' | 'debuff' | 'stun',
  position: GridPosition,
  cellSize: number,
  gap: number
): gsap.core.Timeline {
  const tl = gsap.timeline();
  
  const pixelPos = calculatePixelPosition(position, cellSize, gap);
  
  // Status icon colors
  const statusColors = {
    poison: '#4CAF50',
    buff: '#2196F3',
    debuff: '#F44336',
    stun: '#FFC107'
  };
  
  // Create status indicator
  const statusIcon = document.createElement('div');
  statusIcon.className = `status-icon status-icon--${statusType}`;
  statusIcon.style.position = 'absolute';
  statusIcon.style.left = `${pixelPos.x + cellSize - 20}px`;
  statusIcon.style.top = `${pixelPos.y + 5}px`;
  statusIcon.style.width = '16px';
  statusIcon.style.height = '16px';
  statusIcon.style.borderRadius = '50%';
  statusIcon.style.backgroundColor = statusColors[statusType];
  statusIcon.style.border = '2px solid white';
  statusIcon.style.boxShadow = `0 0 10px ${statusColors[statusType]}`;
  statusIcon.style.zIndex = '100';
  
  targetElement.appendChild(statusIcon);
  
  // Pop in animation
  gsap.set(statusIcon, {
    scale: 0,
    rotation: -180
  });
  
  tl.to(statusIcon, {
    scale: 1,
    rotation: 0,
    duration: 0.3,
    ease: 'back.out(3)'
  });
  
  // Continuous pulse
  tl.to(statusIcon, {
    scale: 1.2,
    duration: 0.5,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1
  });
  
  // Target glow effect
  tl.to(targetElement, {
    boxShadow: `0 0 20px ${statusColors[statusType]}`,
    duration: 0.3
  }, 0);
  
  return tl;
}
```

---

## Screen Transition Animations

### 16. Screen Fade In
**When**: Entering new screen
**Duration**: 0.3s

```typescript
export function animateScreenFadeIn(screenElement: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();
  
  gsap.set(screenElement, {
    opacity: 0,
    y: 20
  });
  
  tl.to(screenElement, {
    opacity: 1,
    y: 0,
    duration: 0.3,
    ease: 'power2.out'
  });
  
  return tl;
}
```

### 17. Screen Fade Out
**When**: Leaving screen
**Duration**: 0.2s

```typescript
export function animateScreenFadeOut(screenElement: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();
  
  tl.to(screenElement, {
    opacity: 0,
    y: -20,
    duration: 0.2,
    ease: 'power2.in'
  });
  
  return tl;
}
```

---

## Button Animations

### 18. Button Press Animation
**When**: Button clicked
**Duration**: 0.2s

```typescript
export function animateButtonPress(buttonElement: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();
  
  // Press down
  tl.to(buttonElement, {
    scale: 0.95,
    y: 2,
    duration: 0.1,
    ease: 'power2.in'
  });
  
  // Release with bounce
  tl.to(buttonElement, {
    scale: 1,
    y: 0,
    duration: 0.1,
    ease: 'back.out(3)'
  });
  
  return tl;
}
```

### 19. Button Hover Animation
**When**: Mouse enters button
**Duration**: 0.15s

```typescript
export function animateButtonHover(buttonElement: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();
  
  tl.to(buttonElement, {
    scale: 1.05,
    y: -2,
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)',
    filter: 'brightness(1.1)',
    duration: 0.15,
    ease: 'power2.out'
  });
  
  return tl;
}

export function animateButtonHoverOut(buttonElement: HTMLElement): gsap.core.Timeline {
  const tl = gsap.timeline();
  
  tl.to(buttonElement, {
    scale: 1,
    y: 0,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    filter: 'brightness(1)',
    duration: 0.15,
    ease: 'power2.in'
  });
  
  return tl;
}
```

---

## Special Effects

### 20. Screen Shake
**When**: Heavy impact, critical hit
**Duration**: 0.15s

```typescript
export function animateScreenShake(
  containerElement: HTMLElement,
  intensity: 'light' | 'medium' | 'heavy' = 'medium'
): gsap.core.Timeline {
  const tl = gsap.timeline();
  
  const shakeAmount = {
    light: 2,
    medium: 5,
    heavy: 10
  }[intensity];
  
  // Save original position
  const originalX = gsap.getProperty(containerElement, 'x') as number;
  const originalY = gsap.getProperty(containerElement, 'y') as number;
  
  // Shake in random directions
  for (let i = 0; i < 5; i++) {
    tl.to(containerElement, {
      x: originalX + (Math.random() - 0.5) * shakeAmount * 2,
      y: originalY + (Math.random() - 0.5) * shakeAmount * 2,
      duration: 0.03,
      ease: 'power2.inOut'
    });
  }
  
  // Return to original position
  tl.to(containerElement, {
    x: originalX,
    y: originalY,
    duration: 0.05,
    ease: 'power2.out'
  });
  
  return tl;
}
```

### 21. Victory Celebration
**When**: Battle won
**Duration**: 1.5s

```typescript
export function animateVictoryCelebration(
  heroElements: HTMLElement[]
): gsap.core.Timeline {
  const tl = gsap.timeline();
  
  heroElements.forEach((hero, index) => {
    // Jump for joy
    tl.to(hero, {
      y: -30,
      duration: 0.3,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1
    }, index * 0.1);
    
    // Spin
    tl.to(hero, {
      rotation: 360,
      duration: 0.6,
      ease: 'power2.inOut'
    }, index * 0.1);
    
    // Scale pulse
    tl.to(hero, {
      scale: 1.1,
      duration: 0.3,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: 1
    }, index * 0.1);
  });
  
  return tl;
}
```

### 22. Defeat Animation
**When**: Battle lost
**Duration**: 1s

```typescript
export function animateDefeat(
  heroElements: HTMLElement[]
): gsap.core.Timeline {
  const tl = gsap.timeline();
  
  heroElements.forEach((hero, index) => {
    tl.to(hero, {
      opacity: 0.3,
      scale: 0.8,
      rotation: -15,
      y: 10,
      filter: 'grayscale(100%)',
      duration: 0.5,
      ease: 'power2.in'
    }, index * 0.1);
  });
  
  return tl;
}
```

---

## Performance Optimizations

### Best Practices

1. **Kill Animations When Component Unmounts**:
```typescript
useEffect(() => {
  const element = elementRef.current;
  
  return () => {
    if (element) {
      gsap.killTweensOf(element);
    }
  };
}, []);
```

2. **Use `will-change` CSS for Elements That Animate Frequently**:
```css
.grid-cell {
  will-change: transform, opacity;
}
```

3. **Batch DOM Updates**:
```typescript
// Bad - triggers multiple reflows
element1.style.left = '100px';
element2.style.left = '200px';
element3.style.left = '300px';

// Good - single batch
gsap.set([element1, element2, element3], {
  left: (i) => `${(i + 1) * 100}px`
});
```

4. **Use Transform Instead of Left/Top**:
```typescript
// Bad - triggers layout
gsap.to(element, { left: 100, top: 50 });

// Good - GPU accelerated
gsap.to(element, { x: 100, y: 50 });
```

5. **Limit Concurrent Animations**:
```typescript
const MAX_CONCURRENT_ANIMATIONS = 20;
let activeAnimations = 0;

function playAnimation(animFunc: () => gsap.core.Animation) {
  if (activeAnimations >= MAX_CONCURRENT_ANIMATIONS) {
    return;
  }
  
  activeAnimations++;
  const anim = animFunc();
  anim.eventCallback('onComplete', () => {
    activeAnimations--;
  });
}
```

---

## Animation Manager

### Central Animation Controller

```typescript
// src/systems/AnimationManager.ts

import gsap from 'gsap';

export class AnimationManager {
  private activeAnimations: Map<string, gsap.core.Timeline> = new Map();
  
  play(id: string, animation: gsap.core.Timeline): void {
    // Kill existing animation with same ID
    this.kill(id);
    
    // Store and play new animation
    this.activeAnimations.set(id, animation);
    
    animation.eventCallback('onComplete', () => {
      this.activeAnimations.delete(id);
    });
  }
  
  kill(id: string): void {
    const animation = this.activeAnimations.get(id);
    if (animation) {
      animation.kill();
      this.activeAnimations.delete(id);
    }
  }
  
  killAll(): void {
    this.activeAnimations.forEach(animation => animation.kill());
    this.activeAnimations.clear();
  }
  
  pause(id: string): void {
    this.activeAnimations.get(id)?.pause();
  }
  
  resume(id: string): void {
    this.activeAnimations.get(id)?.resume();
  }
  
  setSpeed(id: string, speed: number): void {
    this.activeAnimations.get(id)?.timeScale(speed);
  }
}

// Singleton instance
export const animationManager = new AnimationManager();
```

**Usage**:
```typescript
import { animationManager } from './AnimationManager';

// Play animation
const tl = animateMeleeAttack(...);
animationManager.play('melee-attack-hero1', tl);

// Kill when component unmounts
useEffect(() => {
  return () => {
    animationManager.kill('melee-attack-hero1');
  };
}, []);
```

---

## Complete Battle Animation Sequence Example

```typescript
export async function playBattleSequence(
  recording: BattleRecording,
  unitElements: Map<string, HTMLElement>,
  containerElement: HTMLElement,
  cellSize: number,
  gap: number
): Promise<void> {
  const masterTimeline = gsap.timeline();
  
  for (const event of recording.events) {
    const timestamp = event.timestamp;
    
    switch (event.type) {
      case 'attack': {
        const attacker = unitElements.get(event.actorId);
        const target = unitElements.get(event.targetId);
        
        if (!attacker || !target) break;
        
        if (event.isRanged) {
          masterTimeline.add(
            animateRangedAttack(
              attacker,
              target,
              event.actorPosition,
              event.targetPosition,
              cellSize,
              gap
            ),
            timestamp
          );
        } else {
          masterTimeline.add(
            animateMeleeAttack(
              attacker,
              target,
              event.actorPosition,
              event.targetPosition,
              cellSize,
              gap
            ),
            timestamp
          );
        }
        break;
      }
      
      case 'damage': {
        const target = unitElements.get(event.targetId);
        if (!target) break;
        
        // Show damage number
        const targetPos = calculatePixelPosition(
          event.targetPosition,
          cellSize,
          gap
        );
        
        masterTimeline.add(
          createDamageNumber(
            event.amount,
            { x: targetPos.x + cellSize / 2, y: targetPos.y },
            event.isCritical ? 'critical' : 'damage',
            containerElement
          ),
          timestamp
        );
        
        // Update HP bar
        const hpBar = target.querySelector('.hero-hp-fill') as HTMLElement;
        if (hpBar) {
          masterTimeline.add(
            animateHPBar(hpBar, event.newHP, event.maxHP),
            timestamp
          );
        }
        break;
      }
      
      case 'death': {
        const target = unitElements.get(event.targetId);
        if (!target) break;
        
        masterTimeline.add(
          animateDeath(target, event.targetPosition, cellSize, gap),
          timestamp
        );
        break;
      }
      
      case 'movement': {
        const unit = unitElements.get(event.unitId);
        if (!unit) break;
        
        masterTimeline.add(
          animateUnitMovement(
            unit,
            event.fromPosition,
            event.toPosition,
            cellSize,
            gap,
            event.movementType
          ),
          timestamp
        );
        break;
      }
    }
  }
  
  // Wait for all animations to complete
  await masterTimeline.then();
}
```

---

## Testing Animations

### Animation Preview Component

```typescript
// src/dev/AnimationPreview.tsx

import React, { useRef } from 'react';
import { animateCardEntrance, animateMeleeAttack, createDamageNumber } from '../animations';

export const AnimationPreview: React.FC = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  
  return (
    <div style={{ padding: '50px' }}>
      <h2>Animation Preview</h2>
      
      <div
        ref={cardRef}
        style={{
          width: '100px',
          height: '100px',
          backgroundColor: '#2196F3',
          borderRadius: '8px'
        }}
      />
      
      <div style={{ marginTop: '20px' }}>
        <button onClick={() => animateCardEntrance(cardRef.current!)}>
          Play Entrance
        </button>
        
        <button onClick={() => animateCardHover(cardRef.current!)}>
          Play Hover
        </button>
        
        <button onClick={() => animateImpact(cardRef.current!)}>
          Play Impact
        </button>
      </div>
    </div>
  );
};
```

---

## Summary Checklist

✅ **Cell Interactions**:
- Hover (glow + scale)
- Select (pulse + border)
- Highlight (continuous pulse)

✅ **Card Animations**:
- Entrance (scale in + bounce)
- Exit (scale out + fade)
- Hover (lift + glow)
- Click (press effect)

✅ **Battle Animations**:
- Movement (walk, fly, phase, teleport)
- Melee attack (lunge forward)
- Ranged attack (projectile)
- Impact (shake + flash)
- Damage numbers (pop + float)
- Death (fade + particles)
- HP bar (smooth transition)
- Status effects (icon + glow)

✅ **Screen Transitions**:
- Fade in/out
- Screen shake

✅ **Special Effects**:
- Victory celebration
- Defeat animation

✅ **Performance**:
- Animation manager
- Cleanup on unmount
- GPU acceleration
- Batched updates

---

## Resources

- [GSAP Documentation](https://greensock.com/docs/)
- [GSAP Easing Visualizer](https://greensock.com/ease-visualizer/)
- [CSS Tricks - GSAP Guide](https://css-tricks.com/writing-smarter-animation-code/)

---

Happy animating! 🎮✨
