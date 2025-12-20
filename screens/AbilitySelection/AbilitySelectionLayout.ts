import { AnyGridOccupant, GridOccupantType } from '@/types/grid.types';
import { ScreenType } from '@/types/progression.types';
import { Hero, Ability } from '@/types/core.types';
import { LEARNABLE_ABILITIES, HERO_LEARNABLE_ABILITIES } from '@/data/units';

export function createAbilitySelectionLayout(
  hero: Hero,
  learnAbility: (heroInstanceId: string, abilityId: string) => void
): AnyGridOccupant[] {
  const occupants: AnyGridOccupant[] = [];

  // Row 0: Title and Hero Info
  occupants.push({
    id: 'ability-selection-title',
    type: GridOccupantType.Decoration,
    position: { row: 0, col: 1 },
    text: `${hero.name} - Level ${hero.level}`,
    style: 'title',
    animationDelay: 0.1,
  });

  // Row 1: Subtitle
  occupants.push({
    id: 'ability-selection-subtitle',
    type: GridOccupantType.Decoration,
    position: { row: 1, col: 1 },
    text: 'Choose Your Starting Ability',
    style: 'subtitle',
    animationDelay: 0.2,
  });

  // Get learnable abilities for this hero
  const learnableAbilityIds = HERO_LEARNABLE_ABILITIES[hero.id] || [];
  const abilities: Ability[] = learnableAbilityIds.map(id => LEARNABLE_ABILITIES[id]).filter(Boolean);

  // Rows 3-5: Display 3 ability choices (centered on grid)
  abilities.forEach((ability, index) => {
    const row = 3 + index;
    const col = 2; // Start at column 2 to center 4-column-wide cards

    // Create a large button for each ability
    occupants.push({
      id: `ability-${ability.id}`,
      type: GridOccupantType.Button,
      position: { row, col },
      label: ability.name,
      icon: getAbilityIcon(ability.id),
      variant: 'primary',
      onClick: () => learnAbility(hero.instanceId, ability.id),
      animationDelay: 0.3 + index * 0.1,
    });

    // Ability description to the right
    occupants.push({
      id: `ability-desc-${ability.id}`,
      type: GridOccupantType.Decoration,
      position: { row, col: col + 1 },
      text: ability.description,
      style: 'subtitle',
      animationDelay: 0.35 + index * 0.1,
    });

    // Ability stats/effects to the right
    const effectsText = formatAbilityEffects(ability);
    occupants.push({
      id: `ability-stats-${ability.id}`,
      type: GridOccupantType.Decoration,
      position: { row, col: col + 2 },
      text: effectsText,
      style: 'subtitle',
      animationDelay: 0.4 + index * 0.1,
    });
  });

  return occupants;
}

// Helper function to get ability icon based on ability ID
function getAbilityIcon(abilityId: string): string {
  const iconMap: Record<string, string> = {
    blade_cleave: '⚔️',
    fireball: '🔥',
    rallying_cry: '📣',
  };

  return iconMap[abilityId] || '✨';
}

// Helper function to format ability effects for display
function formatAbilityEffects(ability: Ability): string {
  const effects: string[] = [];

  effects.push(`Cooldown: ${ability.cooldown}`);

  ability.effects.forEach(effect => {
    if (effect.type === 'damage') {
      effects.push(`Damage: ${effect.value}`);
      if (effect.targetType === 'aoe' && effect.radius) {
        effects.push(`AoE Radius: ${effect.radius}`);
      }
    } else if (effect.type === 'buff') {
      if (effect.statModifier) {
        const sign = effect.statModifier.value >= 0 ? '+' : '';
        const percent = effect.statModifier.isPercent ? '%' : '';
        effects.push(`${effect.statModifier.stat}: ${sign}${effect.statModifier.value}${percent}`);
      }
      if (effect.duration) {
        effects.push(`Duration: ${effect.duration} turns`);
      }
    } else if (effect.type === 'status') {
      effects.push(`${effect.statusType || 'Status'}`);
      if (effect.damagePerTick) {
        effects.push(`DoT: ${effect.damagePerTick}/turn`);
      }
      if (effect.duration) {
        effects.push(`Duration: ${effect.duration} turns`);
      }
    }
  });

  return effects.join('\n');
}
