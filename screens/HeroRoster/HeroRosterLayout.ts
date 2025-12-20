import { AnyGridOccupant, GridOccupantType } from '@/types/grid.types';
import { ScreenType } from '@/types/progression.types';
import { Hero } from '@/types/core.types';
import { generateButtonIcon } from '@/utils/generatePlaceholder';

export function createHeroRosterLayout(
  heroes: Hero[],
  playerGold: number,
  playerGems: number,
  _navigate: (screen: ScreenType) => void
): AnyGridOccupant[] {
  // Use the global transition-aware navigate function
  const navigate = (screen: ScreenType) => {
    if ((window as any).__gridNavigate) {
      (window as any).__gridNavigate(screen);
    } else {
      _navigate(screen);
    }
  };

  const occupants: AnyGridOccupant[] = [];

  // Row 0: Back button and Resources
  occupants.push({
    id: 'btn-back',
    type: GridOccupantType.Button,
    position: { row: 0, col: 0 },
    label: 'Back',
    icon: generateButtonIcon('back'),
    variant: 'secondary',
    onClick: () => navigate(ScreenType.MainMenu),
    animationDelay: 0.1,
  });

  // Row 1: Title
  occupants.push({
    id: 'roster-title',
    type: GridOccupantType.Decoration,
    position: { row: 1, col: 2 },
    text: `Hero Roster (${heroes.length})`,
    style: 'title',
    animationDelay: 0.15,
  });

  // Rows 2-7: Display heroes in a grid (up to 48 heroes in 6x8 grid)
  heroes.slice(0, 48).forEach((hero, index) => {
    const row = Math.floor(index / 8) + 2; // Start at row 2
    const col = index % 8;

    occupants.push({
      id: `hero-${hero.instanceId}`,
      type: GridOccupantType.Hero,
      position: { row, col },
      heroClass: hero.class,
      name: hero.name,
      level: hero.level,
      spritePath: hero.spritePath,
      hp: hero.currentStats.hp,
      maxHp: hero.currentStats.maxHp,
      animationDelay: 0.2 + index * 0.02,
    });
  });

  // If no heroes, show message
  if (heroes.length === 0) {
    occupants.push({
      id: 'no-heroes',
      type: GridOccupantType.Decoration,
      position: { row: 4, col: 2 },
      text: 'No heroes in roster',
      style: 'subtitle',
      animationDelay: 0.2,
    });
  }

  return occupants;
}
