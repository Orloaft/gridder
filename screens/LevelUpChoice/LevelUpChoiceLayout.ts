import { GridOccupant, GridOccupantType as OccupantType } from '@/types/grid.types';
import { Hero, Ability } from '@/types/core.types';

export interface LevelUpChoice {
  type: 'stat' | 'ability';
  statBonus?: {
    hp?: number;
    damage?: number;
    defense?: number;
    speed?: number;
    critChance?: number;
    critDamage?: number;
  };
  abilityId?: string;
  ability?: Ability;
  description: string;
}

export interface LevelUpChoiceData {
  hero: Hero;
  choices: LevelUpChoice[];
}

export function createLevelUpChoiceLayout(
  hero: Hero | null,
  choices: LevelUpChoice[],
  onChoice: (choice: LevelUpChoice) => void
): GridOccupant[] {
  const occupants: GridOccupant[] = [];

  if (!hero) return occupants;

  // Title
  occupants.push({
    id: 'levelup-title',
    type: OccupantType.Decoration,
    position: { row: 1, col: 2 },
    width: 4,
    text: 'Level Up!',
    style: 'title',
    animationDelay: 0.1,
  });

  // Hero info
  occupants.push({
    id: 'levelup-hero-info',
    type: OccupantType.Decoration,
    position: { row: 2, col: 2 },
    width: 4,
    text: `${hero.name} reached level ${hero.level}!`,
    style: 'subtitle',
    animationDelay: 0.2,
  });

  // Instructions
  occupants.push({
    id: 'levelup-instructions',
    type: OccupantType.Decoration,
    position: { row: 3, col: 2 },
    width: 4,
    text: 'Choose your upgrade:',
    style: 'normal',
    animationDelay: 0.3,
  });

  // Choice buttons
  choices.forEach((choice, index) => {
    const col = index === 0 ? 2 : 5;
    const icon = choice.type === 'stat' ? '⚔️' : '✨';
    const title = choice.type === 'stat' ? 'Stat Upgrade' : (choice.ability?.name || 'New Ability');

    let label = `${icon} ${title}\n\n${choice.description}`;

    // Add stat bonuses to label if present
    if (choice.statBonus) {
      const bonuses = Object.entries(choice.statBonus)
        .map(([stat, value]) => `+${value} ${stat.toUpperCase()}`)
        .join(', ');
      label += `\n\n${bonuses}`;
    }

    occupants.push({
      id: `levelup-choice-${index}`,
      type: OccupantType.Button,
      position: { row: 5, col },
      width: 2,
      height: 2,
      label,
      variant: choice.type === 'stat' ? 'primary' : 'secondary',
      onClick: () => onChoice(choice),
      animationDelay: 0.4 + (index * 0.1),
    });
  });

  return occupants;
}

export function generateLevelUpChoices(hero: Hero): LevelUpChoice[] {
  const choices: LevelUpChoice[] = [];

  // Always offer a stat upgrade
  const statChoice: LevelUpChoice = {
    type: 'stat',
    statBonus: {
      hp: Math.round(hero.statGrowth?.hp || 5),
      damage: Math.round((hero.statGrowth?.damage || 2) * 1.5),
      defense: Math.round((hero.statGrowth?.defense || 1) * 1.5),
      speed: Math.round((hero.statGrowth?.speed || 1) * 0.5),
    },
    description: 'Permanently increase your core stats'
  };
  choices.push(statChoice);

  // Check if there are any abilities the hero can learn
  const availableAbilities = getAvailableAbilitiesForHero(hero);

  if (availableAbilities.length > 0 && hero.abilities.length < 4) {
    // Offer a random ability from available ones
    const randomAbility = availableAbilities[Math.floor(Math.random() * availableAbilities.length)];
    const abilityChoice: LevelUpChoice = {
      type: 'ability',
      abilityId: randomAbility.id,
      ability: randomAbility,
      description: randomAbility.description
    };
    choices.push(abilityChoice);
  } else {
    // If no abilities available or hero has max abilities, offer enhanced stat boost
    const enhancedStatChoice: LevelUpChoice = {
      type: 'stat',
      statBonus: {
        hp: Math.round((hero.statGrowth?.hp || 5) * 2),
        damage: Math.round((hero.statGrowth?.damage || 2) * 2.5),
        critChance: 0.05,
        critDamage: 0.1,
      },
      description: 'Significantly boost your combat effectiveness'
    };
    choices.push(enhancedStatChoice);
  }

  return choices;
}

// This would need to be implemented based on your ability system
function getAvailableAbilitiesForHero(hero: Hero): Ability[] {
  // Placeholder - should return abilities the hero can learn based on class/level
  return [];
}