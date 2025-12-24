import { AnyGridOccupant, GridOccupantType } from '@/types/grid.types';
import { ScreenType } from '@/types/progression.types';
import { generateButtonIcon } from '@/utils/generatePlaceholder';

export function createMainMenuLayout(
  playerGold: number,
  playerGems: number,
  playerLevel: number,
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

  // Row 3: Campaign button
  occupants.push({
    id: 'btn-campaign',
    type: GridOccupantType.Button,
    position: { row: 3, col: 3 },
    label: 'Campaign',
    icon: generateButtonIcon('campaign'),
    variant: 'primary',
    onClick: () => navigate(ScreenType.LocationMap),
    animationDelay: 0.1,
  });

  // Row 4: Hero Menu button
  occupants.push({
    id: 'btn-hero-menu',
    type: GridOccupantType.Button,
    position: { row: 4, col: 3 },
    label: 'Heroes',
    icon: '⚔️',
    variant: 'primary',
    onClick: () => navigate(ScreenType.HeroMenu),
    animationDelay: 0.2,
  });

  // Row 5: Settings button
  occupants.push({
    id: 'btn-settings',
    type: GridOccupantType.Button,
    position: { row: 5, col: 3 },
    label: 'Settings',
    icon: generateButtonIcon('settings'),
    variant: 'secondary',
    onClick: () => navigate(ScreenType.Settings),
    animationDelay: 0.3,
  });

  return occupants;
}
