import gsap from 'gsap';
import { GridPosition } from '@/types/grid.types';
import { BattleUnit } from '@/types/battle.types';
import {
  animateCleave,
  animateFireball,
  animateArrow,
  animateBuff,
  animateSimpleBuff,
  animateBloodStrike,
  createTileFlash,
  calculatePixelPosition,
  animateBeam,
  animateChain,
  animateShield,
  animateAoeBlast,
  animateSummon,
  animateTeleport,
  animateRevive,
  animateStatusApply
} from './skillAnimations';
import { animateDamage } from './tileAnimations';

// Animation type determines which animation function to call
type AnimationType =
  | 'projectile'   // Arrow/bolt projectile from caster to target
  | 'cleave'       // Wide melee slash hitting multiple enemies
  | 'fireball'     // Fireball projectile with AoE explosion
  | 'bloodStrike'  // Melee attack with lifesteal visuals
  | 'buff'         // Radial wave buff affecting allies
  | 'debuff'       // Glow/flash debuff on target
  | 'selfBuff'     // Buff applied to caster only
  | 'aoeBlast'     // Expanding explosion at target area
  | 'summon'       // Summoning circle around caster
  | 'teleport'     // Flash at origin, appear at target
  | 'fearAoe'      // Expanding fear wave from caster
  | 'allyHeal'     // Healing effect on allies
  | 'beam'         // Glowing beam from caster to target
  | 'chain'        // Projectile bouncing between targets
  | 'shield'       // Protective dome on target
  | 'revive'       // Golden light column on dead unit
  | 'statusApply'; // Color flash matching status type

export interface AbilityAnimationConfig {
  type: AnimationType;
  color?: string;        // Primary effect color
  flashColor?: string;   // Tile flash color (defaults to color)
  radius?: number;       // For AoE effects, radius in tiles
  selfDamage?: boolean;  // Caster takes damage (e.g. blood_ritual)
  aoeFlash?: boolean;    // Flash tiles around caster
  aoeFlashRadius?: number; // Radius for aoe flash
}

// Registry mapping ability IDs to animation configs
const ABILITY_ANIMATIONS: Record<string, AbilityAnimationConfig> = {
  // === Hero Abilities ===
  // Melee
  blade_cleave:       { type: 'cleave', color: '#FFD700' },
  blood_strike:       { type: 'bloodStrike' },

  // Ranged projectiles
  precise_shot:       { type: 'projectile', color: '#FFD700' },
  frost_bolt:         { type: 'projectile', color: '#00BFFF' },
  aimed_shot:         { type: 'projectile', color: '#FFD700' },
  rapid_fire:         { type: 'projectile', color: '#FFD700' },
  incinerate:         { type: 'projectile', color: '#FF4500' },
  armor_piercing_bolt:{ type: 'projectile', color: '#FFD700' },
  chain_lightning:    { type: 'projectile', color: '#9370DB' },
  void_arrow:         { type: 'projectile', color: '#4B0082' },
  acid_flask:         { type: 'projectile', color: '#32CD32' },
  dark_bolt:          { type: 'projectile', color: '#8B008B' },

  // AoE projectile
  fireball:           { type: 'fireball', color: '#FF4500' },

  // Buff/Support
  mass_heal:          { type: 'buff', color: '#00FF00' },
  rallying_cry:       { type: 'buff', color: '#4CAF50' },

  // Self buffs
  stone_form:         { type: 'selfBuff', color: '#808080' },
  freezing_aura:      { type: 'selfBuff', color: '#00CED1', aoeFlash: true, aoeFlashRadius: 3 },

  // === Enemy Abilities ===
  // Enemy projectiles
  life_drain:         { type: 'projectile', color: '#9400D3' },
  death_bolt:         { type: 'projectile', color: '#4B0082' },
  bone_throw:         { type: 'projectile', color: '#F5DEB3' },
  poison_arrow:       { type: 'projectile', color: '#00FF00' },
  ice_shard:          { type: 'projectile', color: '#00CED1' },
  blood_curse:        { type: 'projectile', color: '#DC143C' },
  weakness_curse:     { type: 'projectile', color: '#8B0000' },
  firebolt:           { type: 'projectile', color: '#FF6347' },

  // Enemy debuffs
  dark_curse:         { type: 'debuff', color: '#4B0082' },
  silence:            { type: 'debuff', color: '#FF1493' },
  disease_bite:       { type: 'debuff', color: '#556B2F' },
  acid_splash:        { type: 'debuff', color: '#ADFF2F' },

  // Enemy AoE
  void_blast:         { type: 'aoeBlast', color: '#4B0082', radius: 2 },
  devastating_slam:   { type: 'aoeBlast', color: '#8B4513', radius: 2 },

  // Enemy special
  shadow_strike:      { type: 'teleport', color: '#4B0082' },
  terrify:            { type: 'fearAoe', color: '#8B008B', radius: 2 },

  // Enemy summons
  summon_undead:      { type: 'summon', color: '#9400D3' },
  summon_imp:         { type: 'summon', color: '#9400D3' },
  split:              { type: 'summon', color: '#9400D3' },

  // Enemy heals
  blood_ritual:       { type: 'allyHeal', color: '#00FF00', selfDamage: true },
  unholy_heal:        { type: 'allyHeal', color: '#00FF00' },

  // === New Abilities (Phase 4+) ===
  // Healing
  healing_word:       { type: 'buff', color: '#00FF88' },
  cleansing_light:    { type: 'revive', color: '#FFD700' },
  regeneration:       { type: 'buff', color: '#00FF88' },
  lay_on_hands:       { type: 'beam', color: '#FFD700' },
  resurrection:       { type: 'revive', color: '#FFD700' },

  // Crowd Control
  thunderclap:        { type: 'aoeBlast', color: '#9370DB', radius: 1 },
  entangling_roots:   { type: 'projectile', color: '#32CD32' },
  freezing_blast:     { type: 'aoeBlast', color: '#00BFFF', radius: 2 },
  sleep_dart:         { type: 'projectile', color: '#9370DB' },
  war_cry:            { type: 'aoeBlast', color: '#8B4513', radius: 2 },
  petrify:            { type: 'beam', color: '#808080' },

  // AoE Damage
  meteor:             { type: 'fireball', color: '#FF4500', radius: 2 },
  poison_cloud:       { type: 'aoeBlast', color: '#32CD32', radius: 2 },
  whirlwind:          { type: 'aoeBlast', color: '#C0C0C0', radius: 1 },
  rain_of_arrows:     { type: 'aoeBlast', color: '#FFD700', radius: 2 },
  flame_wave:         { type: 'beam', color: '#FF4500' },

  // Buffs & Shields
  stone_wall:         { type: 'shield', color: '#8B4513' },
  divine_shield:      { type: 'shield', color: '#FFD700' },
  haste:              { type: 'buff', color: '#00BFFF' },
  war_banner:         { type: 'buff', color: '#DC143C' },
  iron_skin:          { type: 'shield', color: '#808080' },

  // Debuffs
  armor_shred:        { type: 'debuff', color: '#8B4513' },
  crippling_strike:   { type: 'bloodStrike' },
  mark_of_death:      { type: 'debuff', color: '#DC143C' },
  hex:                { type: 'debuff', color: '#9370DB' },

  // Execution & Specialty
  execute:            { type: 'bloodStrike' },
  backstab:           { type: 'teleport', color: '#4B0082' },
  counter_strike:     { type: 'shield', color: '#C0C0C0' },
  vampiric_touch:     { type: 'beam', color: '#DC143C' },
  soul_harvest:       { type: 'aoeBlast', color: '#4B0082', radius: 2 },
};

/**
 * Find closest alive enemy target from caster
 */
function findClosestTarget(
  caster: BattleUnit,
  potentialTargets: BattleUnit[]
): BattleUnit | null {
  const alive = potentialTargets.filter(t => t.isAlive);
  if (alive.length === 0) return null;

  return alive.reduce((closest, current) => {
    const closestDist = Math.max(
      Math.abs(caster.position.col - closest.position.col),
      Math.abs(caster.position.row - closest.position.row)
    );
    const currentDist = Math.max(
      Math.abs(caster.position.col - current.position.col),
      Math.abs(caster.position.row - current.position.row)
    );
    return currentDist < closestDist ? current : closest;
  });
}

/**
 * Get the wrapper element (positioned parent) for a unit
 */
function getUnitWrapper(unitId: string): HTMLElement | null {
  const card = document.querySelector(`[data-unit-id="${unitId}"]`);
  if (!card || !(card instanceof HTMLElement)) return null;
  return card.parentElement instanceof HTMLElement ? card.parentElement : null;
}

/**
 * Get the card element for a unit
 */
function getUnitCard(unitId: string): HTMLElement | null {
  const card = document.querySelector(`[data-unit-id="${unitId}"]`);
  return card instanceof HTMLElement ? card : null;
}

// ================= Animation Dispatchers =================

function playProjectile(
  config: AbilityAnimationConfig,
  caster: BattleUnit,
  casterWrapper: HTMLElement,
  enemies: BattleUnit[],
  cellSize: number,
  gridContainer: HTMLElement
): gsap.core.Timeline | null {
  const target = findClosestTarget(caster, enemies);
  if (!target) return null;

  const color = config.color || '#FFD700';
  createTileFlash(target.position, cellSize, gridContainer, color, 0.4);

  const targetWrapper = getUnitWrapper(target.id);
  if (!targetWrapper) return null;

  return animateArrow(
    casterWrapper, targetWrapper,
    caster.position, target.position,
    cellSize, gridContainer, color
  );
}

function playCleave(
  config: AbilityAnimationConfig,
  caster: BattleUnit,
  casterWrapper: HTMLElement,
  enemies: BattleUnit[],
  cellSize: number,
  gridContainer: HTMLElement
): gsap.core.Timeline | null {
  const enemyPositions = enemies
    .filter(e => e.isAlive)
    .map(e => e.position);

  enemyPositions.forEach((pos, index) => {
    createTileFlash(pos, cellSize, gridContainer, '#FFD700', 0.25 + index * 0.03);
  });

  return animateCleave(casterWrapper, enemyPositions, caster.position, cellSize, gridContainer);
}

function playFireball(
  config: AbilityAnimationConfig,
  caster: BattleUnit,
  casterWrapper: HTMLElement,
  enemies: BattleUnit[],
  cellSize: number,
  gridContainer: HTMLElement
): gsap.core.Timeline | null {
  const target = findClosestTarget(caster, enemies);
  if (!target) return null;

  // Calculate AoE tiles
  const radius = config.radius || 1;
  const affectedTiles: GridPosition[] = [];
  for (let dr = 0; dr <= radius; dr++) {
    for (let dc = 0; dc <= radius; dc++) {
      const pos = { row: target.position.row + dr, col: target.position.col + dc };
      if (pos.row >= 0 && pos.row <= 7 && pos.col >= 0 && pos.col <= 7) {
        affectedTiles.push(pos);
      }
    }
  }

  affectedTiles.forEach((tilePos, index) => {
    const isCenter = tilePos.row === target.position.row && tilePos.col === target.position.col;
    createTileFlash(tilePos, cellSize, gridContainer, isCenter ? '#FFFFFF' : '#FF4500', 0.6 + index * 0.01);
  });

  const targetWrapper = getUnitWrapper(target.id);
  if (!targetWrapper) return null;

  return animateFireball(
    casterWrapper, targetWrapper,
    caster.position, target.position,
    cellSize, gridContainer
  );
}

function playBloodStrike(
  caster: BattleUnit,
  casterWrapper: HTMLElement,
  enemies: BattleUnit[],
  cellSize: number,
  gridContainer: HTMLElement
): gsap.core.Timeline | null {
  const target = findClosestTarget(caster, enemies);
  if (!target) return null;

  const targetWrapper = getUnitWrapper(target.id);
  if (!targetWrapper) return null;

  return animateBloodStrike(
    casterWrapper, targetWrapper,
    caster.position, target.position,
    cellSize, gridContainer
  );
}

function playBuffAnimation(
  config: AbilityAnimationConfig,
  caster: BattleUnit,
  casterWrapper: HTMLElement,
  allies: BattleUnit[],
  cellSize: number,
  gridContainer: HTMLElement
): gsap.core.Timeline | null {
  const color = config.color || '#4CAF50';
  const allyWrappers = allies
    .filter(a => a.isAlive)
    .map(a => getUnitWrapper(a.id))
    .filter((el): el is HTMLElement => el !== null);

  return animateBuff(casterWrapper, allyWrappers, caster.position, cellSize, gridContainer, color);
}

function playDebuff(
  config: AbilityAnimationConfig,
  caster: BattleUnit,
  enemies: BattleUnit[],
  cellSize: number,
  gridContainer: HTMLElement
): void {
  const target = findClosestTarget(caster, enemies);
  if (!target) return;

  const color = config.color || '#8B008B';
  const targetCard = getUnitCard(target.id);
  if (targetCard) {
    animateSimpleBuff(targetCard, color, true);
    createTileFlash(target.position, cellSize, gridContainer, color, 0.2);
  }
}

function playSelfBuff(
  config: AbilityAnimationConfig,
  caster: BattleUnit,
  casterCard: HTMLElement,
  cellSize: number,
  gridContainer: HTMLElement
): void {
  const color = config.color || '#808080';
  animateSimpleBuff(casterCard, color, false);

  if (config.aoeFlash) {
    const radius = config.aoeFlashRadius || 3;
    for (let r = -radius; r <= radius; r++) {
      for (let c = -radius; c <= radius; c++) {
        if (Math.abs(r) + Math.abs(c) <= radius) {
          createTileFlash(
            { row: caster.position.row + r, col: caster.position.col + c },
            cellSize, gridContainer, color,
            0.1 + (Math.abs(r) + Math.abs(c)) * 0.05
          );
        }
      }
    }
  }
}

function playAoeBlast(
  config: AbilityAnimationConfig,
  caster: BattleUnit,
  enemies: BattleUnit[],
  cellSize: number,
  gridContainer: HTMLElement
): gsap.core.Timeline | null {
  const target = findClosestTarget(caster, enemies);
  const center = target ? target.position : caster.position;
  const color = config.color || '#FF4500';
  const radius = config.radius || 2;

  return animateAoeBlast(center, radius, cellSize, gridContainer, color);
}

function playSummon(
  config: AbilityAnimationConfig,
  caster: BattleUnit,
  casterCard: HTMLElement,
  cellSize: number,
  gridContainer: HTMLElement
): gsap.core.Timeline | null {
  const color = config.color || '#9400D3';
  return animateSummon(caster.position, cellSize, gridContainer, color);
}

function playTeleport(
  config: AbilityAnimationConfig,
  caster: BattleUnit,
  enemies: BattleUnit[],
  cellSize: number,
  gridContainer: HTMLElement
): gsap.core.Timeline | null {
  const color = config.color || '#4B0082';
  const target = enemies.filter(t => t.isAlive)[0];
  if (!target) return null;

  const tl = animateTeleport(
    caster.position, target.position,
    cellSize, gridContainer, color
  );

  // Apply damage visual on target after teleport completes
  tl.add(() => {
    const targetCard = getUnitCard(target.id);
    if (targetCard) animateDamage(targetCard);
  });

  return tl;
}

function playFearAoe(
  config: AbilityAnimationConfig,
  caster: BattleUnit,
  cellSize: number,
  gridContainer: HTMLElement
): void {
  const color = config.color || '#8B008B';
  const radius = config.radius || 2;

  for (let r = -radius; r <= radius; r++) {
    for (let c = -radius; c <= radius; c++) {
      if (Math.abs(r) + Math.abs(c) <= radius) {
        createTileFlash(
          { row: caster.position.row + r, col: caster.position.col + c },
          cellSize, gridContainer, color,
          0.1 + (Math.abs(r) + Math.abs(c)) * 0.1
        );
      }
    }
  }
}

function playAllyHeal(
  config: AbilityAnimationConfig,
  caster: BattleUnit,
  casterCard: HTMLElement,
  allies: BattleUnit[]
): void {
  const healTargets = allies.filter(a => a.isAlive);
  healTargets.forEach((ally, index) => {
    const allyCard = getUnitCard(ally.id);
    if (allyCard) {
      setTimeout(() => animateSimpleBuff(allyCard, '#00FF00', false), index * 100);
    }
  });

  if (config.selfDamage) {
    animateDamage(casterCard);
  }
}

// Phase 3 animation dispatchers (beam, chain, shield, revive, statusApply)

function playBeam(
  config: AbilityAnimationConfig,
  caster: BattleUnit,
  casterWrapper: HTMLElement,
  targets: BattleUnit[],
  cellSize: number,
  gridContainer: HTMLElement
): gsap.core.Timeline | null {
  const target = findClosestTarget(caster, targets);
  if (!target) return null;

  const color = config.color || '#FFD700';
  createTileFlash(target.position, cellSize, gridContainer, color, 0.15);

  const targetWrapper = getUnitWrapper(target.id);
  if (!targetWrapper) return null;

  return animateBeam(
    casterWrapper, targetWrapper,
    caster.position, target.position,
    cellSize, gridContainer, color
  );
}

function playShield(
  config: AbilityAnimationConfig,
  caster: BattleUnit,
  casterCard: HTMLElement,
  allies: BattleUnit[],
  cellSize: number,
  gridContainer: HTMLElement
): gsap.core.Timeline | null {
  const color = config.color || '#FFD700';
  const casterWrapper = casterCard.parentElement;
  if (!casterWrapper || !(casterWrapper instanceof HTMLElement)) return null;

  return animateShield(
    casterWrapper,
    caster.position,
    cellSize, gridContainer, color
  );
}

function playRevive(
  config: AbilityAnimationConfig,
  caster: BattleUnit,
  cellSize: number,
  gridContainer: HTMLElement
): gsap.core.Timeline | null {
  const color = config.color || '#FFD700';
  return animateRevive(caster.position, cellSize, gridContainer, color);
}

function playChain(
  config: AbilityAnimationConfig,
  caster: BattleUnit,
  casterWrapper: HTMLElement,
  enemies: BattleUnit[],
  cellSize: number,
  gridContainer: HTMLElement
): gsap.core.Timeline | null {
  const color = config.color || '#9370DB';
  const aliveEnemies = enemies.filter(e => e.isAlive);
  if (aliveEnemies.length === 0) return null;

  const targetPositions = aliveEnemies.map(e => e.position);

  // Flash tiles for each target
  targetPositions.forEach((pos, i) => {
    createTileFlash(pos, cellSize, gridContainer, color, 0.1 + i * 0.15);
  });

  return animateChain(
    casterWrapper, targetPositions,
    caster.position,
    cellSize, gridContainer, color
  );
}

function playStatusApply(
  config: AbilityAnimationConfig,
  targets: BattleUnit[],
  cellSize: number,
  gridContainer: HTMLElement
): gsap.core.Timeline | null {
  const color = config.color || '#FF4500';
  const alive = targets.filter(t => t.isAlive);
  if (alive.length === 0) return null;

  const tl = gsap.timeline();

  alive.forEach((t, i) => {
    const card = getUnitCard(t.id);
    if (card) {
      tl.add(() => {
        animateStatusApply(card, t.position, cellSize, gridContainer, color);
      }, i * 0.08);
    }
  });

  return tl;
}

// ================= Main Dispatcher =================

export interface PlayAbilityAnimationParams {
  abilityId: string;
  caster: BattleUnit;
  heroes: BattleUnit[];
  enemies: BattleUnit[];
  cellSize: number;
}

/**
 * Play the appropriate animation for an ability.
 * Returns a GSAP timeline if the animation is timeline-based (needs __abilityAnimationPlaying flag),
 * or null for fire-and-forget animations.
 */
export function playAbilityAnimation(params: PlayAbilityAnimationParams): gsap.core.Timeline | null {
  const { abilityId, caster, heroes, enemies, cellSize } = params;
  const config = ABILITY_ANIMATIONS[abilityId];

  const casterCard = getUnitCard(caster.id);
  if (!casterCard) return null;

  const casterWrapper = casterCard.parentElement;
  if (!casterWrapper || !(casterWrapper instanceof HTMLElement)) return null;

  const gridContainer = casterWrapper.parentElement;
  if (!gridContainer || !(gridContainer instanceof HTMLElement)) return null;

  // Determine opponents and allies based on caster side
  const opponentUnits = caster.isHero ? enemies : heroes;
  const allyUnits = caster.isHero ? heroes : enemies;

  // If no config found, use a default projectile animation
  if (!config) {
    return playProjectile(
      { type: 'projectile', color: '#FFD700' },
      caster, casterWrapper, opponentUnits, cellSize, gridContainer
    );
  }

  switch (config.type) {
    case 'projectile':
      return playProjectile(config, caster, casterWrapper, opponentUnits, cellSize, gridContainer);

    case 'cleave':
      return playCleave(config, caster, casterWrapper, opponentUnits, cellSize, gridContainer);

    case 'fireball':
      return playFireball(config, caster, casterWrapper, opponentUnits, cellSize, gridContainer);

    case 'bloodStrike':
      return playBloodStrike(caster, casterWrapper, opponentUnits, cellSize, gridContainer);

    case 'buff':
      return playBuffAnimation(config, caster, casterWrapper, allyUnits, cellSize, gridContainer);

    case 'debuff':
      playDebuff(config, caster, opponentUnits, cellSize, gridContainer);
      return null;

    case 'selfBuff':
      playSelfBuff(config, caster, casterCard, cellSize, gridContainer);
      return null;

    case 'aoeBlast':
      return playAoeBlast(config, caster, opponentUnits, cellSize, gridContainer);

    case 'summon':
      return playSummon(config, caster, casterCard, cellSize, gridContainer);

    case 'teleport':
      return playTeleport(config, caster, opponentUnits, cellSize, gridContainer);

    case 'fearAoe':
      playFearAoe(config, caster, cellSize, gridContainer);
      return null;

    case 'allyHeal':
      playAllyHeal(config, caster, casterCard, allyUnits);
      return null;

    case 'beam':
      return playBeam(config, caster, casterWrapper, opponentUnits, cellSize, gridContainer);

    case 'chain':
      return playChain(config, caster, casterWrapper, opponentUnits, cellSize, gridContainer);

    case 'shield':
      return playShield(config, caster, casterCard, allyUnits, cellSize, gridContainer);

    case 'revive':
      return playRevive(config, caster, cellSize, gridContainer);

    case 'statusApply':
      return playStatusApply(config, opponentUnits, cellSize, gridContainer);

    default:
      return null;
  }
}
