import { AnyGridOccupant, GridOccupantType } from '@/types/grid.types';
import { ScreenType } from '@/types/progression.types';
import { LOCATIONS, Location, LocationType, isLocationUnlocked } from '@/data/locations';
import { generateButtonIcon } from '@/utils/generatePlaceholder';

export function createLocationMapLayout(
  completedStages: Set<number>,
  _navigate: (screen: ScreenType) => void,
  onLocationSelect: (locationId: string) => void,
  selectedLocationId: string | null,
  onLocationHover?: (locationId: string | null) => void
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

  // Back button in bottom right corner (row 7, col 7)
  occupants.push({
    id: 'btn-back',
    type: GridOccupantType.Button,
    position: { row: 7, col: 7 },
    label: 'Back',
    icon: generateButtonIcon('back'),
    variant: 'secondary',
    onClick: () => navigate(ScreenType.MainMenu),
    animationDelay: 0.1,
  });

  // Place locations on the grid
  // We have 14 locations, arrange them in an interesting pattern
  const locationPositions = [
    // Row 0-1: Starting forest and village
    { row: 0, col: 3 }, // Darkwood Forest
    { row: 1, col: 1 }, // Small Village

    // Row 1-2: Cemetery and fort
    { row: 1, col: 5 }, // Grave Gate
    { row: 2, col: 3 }, // Ruined Fort

    // Row 2-3: Campsite and shrine
    { row: 2, col: 6 }, // Campsite
    { row: 3, col: 1 }, // Black Shrine

    // Row 3-4: Lava river and spell hut
    { row: 3, col: 5 }, // Lava River
    { row: 4, col: 0 }, // Spell Hut

    // Row 4-5: Temple and spire
    { row: 4, col: 4 }, // Sand Temple
    { row: 5, col: 2 }, // Ruin Peak Spire

    // Row 5-6: Sacred grove and final spire
    { row: 5, col: 6 }, // Tree on Water (Sacred Grove)
    { row: 6, col: 4 }, // Black Spire (Final)
  ];

  LOCATIONS.forEach((location, index) => {
    if (index >= locationPositions.length) return;

    const position = locationPositions[index];
    const isUnlocked = isLocationUnlocked(location.id, completedStages);
    const isSelected = selectedLocationId === location.id;

    // Determine icon and variant based on location type and status
    const icon = location.spritePath; // Always use location image
    let variant: 'primary' | 'secondary' | 'danger' = 'secondary';

    if (isUnlocked) {
      if (location.type === LocationType.Combat) {
        variant = 'danger'; // Combat locations are red
      } else if (location.type === LocationType.Shop) {
        variant = 'primary'; // Shops are purple
      } else if (location.type === LocationType.Recruitment) {
        variant = 'primary'; // Recruitment is purple
      } else {
        variant = 'secondary'; // Special locations are gray
      }
    }
    // When locked, the button will be disabled and GridButtonCard will show dark overlay

    occupants.push({
      id: `location-${location.id}`,
      type: GridOccupantType.Button,
      position,
      label: location.name,
      icon,
      variant,
      disabled: !isUnlocked,
      onClick: () => {
        if (isUnlocked) {
          onLocationSelect(location.id);
          // Navigate based on location type
          if (location.type === LocationType.Combat) {
            // Combat locations go to CampaignMap
            if ((window as any).__gridNavigate) {
              (window as any).__gridNavigate(ScreenType.CampaignMap);
            }
          } else if (location.type === LocationType.Shop || location.type === LocationType.Recruitment) {
            // Shop/Recruitment locations go to Shop screen
            if ((window as any).__gridNavigate) {
              (window as any).__gridNavigate(ScreenType.Shop);
            }
          }
          // Special locations don't navigate anywhere for now
        }
      },
      onMouseEnter: onLocationHover ? () => onLocationHover(location.id) : undefined,
      onMouseLeave: onLocationHover ? () => onLocationHover(null) : undefined,
      animationDelay: 0.05 + index * 0.05,
    });
  });

  return occupants;
}
