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

  // Row 0: Resources and Title (first wave - 0.1s stagger)
  occupants.push({
    id: 'resource-gold',
    type: GridOccupantType.Resource,
    position: { row: 0, col: 0 },
    resourceType: 'gold',
    amount: playerGold,
    animationDelay: 0.1,
  });

  occupants.push({
    id: 'resource-gems',
    type: GridOccupantType.Resource,
    position: { row: 0, col: 1 },
    resourceType: 'gems',
    amount: playerGems,
    animationDelay: 0.15,
  });

  occupants.push({
    id: 'player-level',
    type: GridOccupantType.StatusPanel,
    position: { row: 0, col: 7 },
    title: 'Level',
    content: String(playerLevel),
    variant: 'info',
    animationDelay: 0.2,
  });

  // Row 3: Main menu buttons (buttons stagger from 0.3s)
  occupants.push({
    id: 'btn-campaign',
    type: GridOccupantType.Button,
    position: { row: 3, col: 2 },
    label: 'Campaign',
    icon: generateButtonIcon('campaign'),
    variant: 'primary',
    onClick: () => navigate(ScreenType.CampaignMap),
    animationDelay: 0.3,
  });

  occupants.push({
    id: 'btn-heroes',
    type: GridOccupantType.Button,
    position: { row: 3, col: 5 },
    label: 'Heroes',
    icon: generateButtonIcon('heroes'),
    variant: 'primary',
    onClick: () => navigate(ScreenType.HeroRoster),
    animationDelay: 0.4,
  });

  // Row 4: Shop and Inventory
  occupants.push({
    id: 'btn-shop',
    type: GridOccupantType.Button,
    position: { row: 4, col: 2 },
    label: 'Shop',
    icon: generateButtonIcon('shop'),
    variant: 'primary',
    onClick: () => navigate(ScreenType.Shop),
    animationDelay: 0.5,
  });

  occupants.push({
    id: 'btn-inventory',
    type: GridOccupantType.Button,
    position: { row: 4, col: 5 },
    label: 'Inventory',
    icon: generateButtonIcon('inventory'),
    variant: 'secondary',
    onClick: () => {
      console.log('Inventory not implemented yet');
    },
    animationDelay: 0.6,
  });

  // Row 5: Settings
  occupants.push({
    id: 'btn-settings',
    type: GridOccupantType.Button,
    position: { row: 5, col: 2 },
    label: 'Settings',
    icon: generateButtonIcon('settings'),
    variant: 'secondary',
    onClick: () => navigate(ScreenType.Settings),
    animationDelay: 0.7,
  });

  return occupants;
}
