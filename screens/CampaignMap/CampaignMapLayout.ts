import { AnyGridOccupant, GridOccupantType } from '@/types/grid.types';
import { ScreenType } from '@/types/progression.types';
import { CAMPAIGN_STAGES, isStageUnlocked } from '@/data/stages';
import { generateButtonIcon } from '@/utils/generatePlaceholder';
import { ICON_PATHS } from '@/utils/iconPaths';
import { Difficulty } from '@/types/core.types';
import { getLocationById } from '@/data/locations';

export function createCampaignMapLayout(
  completedStages: Set<number>,
  _navigate: (screen: ScreenType) => void,
  onStageSelect: (stageId: number) => void,
  selectedStageId: number | null,
  selectedLocationId: string | null,
  onStageHover?: (stageId: number | null) => void
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
    onClick: () => navigate(ScreenType.LocationMap),
    animationDelay: 0.1,
  });

  // Filter stages by selected location
  const location = selectedLocationId ? getLocationById(selectedLocationId) : null;
  const locationStages = location?.stageRange
    ? CAMPAIGN_STAGES.filter(
        (stage) => stage.id >= location.stageRange!.start && stage.id <= location.stageRange!.end
      )
    : CAMPAIGN_STAGES;

  // Calculate how many stages we have and determine shop placement
  const totalStages = locationStages.length;
  const rowsWithStages = Math.ceil(totalStages / 7); // Now 7 stages per row to make room for shop

  // Add shop buttons - one per row at col 0, except row 7
  for (let row = 0; row < Math.min(rowsWithStages, 8); row++) {
    // Only show shop if at least one stage in this row is unlocked
    const rowStartIndex = row * 7; // 7 stages per row now
    const rowEndIndex = Math.min(rowStartIndex + 7, totalStages);
    const rowStages = locationStages.slice(rowStartIndex, rowEndIndex);
    const hasUnlockedStage = rowStages.some(stage =>
      isStageUnlocked(stage.id, completedStages) || completedStages.has(stage.id)
    );

    if (hasUnlockedStage && rowStages.length > 0) {
      occupants.push({
        id: `shop-row-${row}`,
        type: GridOccupantType.Button,
        position: { row, col: 0 },
        label: 'Shop',
        icon: '🛒',
        variant: 'secondary',
        onClick: () => navigate(ScreenType.Shop),
        animationDelay: 0.02 + row * 7 * 0.02, // Appear with row's stages
      });
    }
  }

  // Display stages in grid layout with 7 stages per row (cols 1-7) to make room for shop
  locationStages.forEach((stage, index) => {
    // 7 stages per row, starting at col 1 (col 0 is for shop)
    let row = Math.floor(index / 7);
    let col = (index % 7) + 1; // Shift right by 1 to make room for shop at col 0

    // Special case for last row: back button is at (7, 7)
    // If we're in row 7 and would place at col 7, shift earlier
    if (row === 7 && col === 7) {
      // Place at col 6 instead
      col = 6;
    }
    // Push subsequent stages in row 7 left as well
    if (row === 7 && col > 7) {
      col = col - 1;
    }

    const position = { row, col };

    const isUnlocked = isStageUnlocked(stage.id, completedStages);
    const isCompleted = completedStages.has(stage.id);
    const isSelected = selectedStageId === stage.id;

    // Determine icon based on stage state
    let icon: string = ICON_PATHS.lock; // Locked
    let variant: 'primary' | 'secondary' | 'danger' = 'secondary';

    if (isCompleted) {
      icon = ICON_PATHS.checkmark; // Completed
      variant = 'primary';
    } else if (isUnlocked) {
      // Icon based on difficulty
      if (stage.difficulty === Difficulty.Boss) {
        icon = ICON_PATHS.skull; // Boss stage (every 8th stage)
        variant = 'danger';
      } else {
        icon = ICON_PATHS.compass; // Available stage
        variant = 'primary';
      }
    }

    occupants.push({
      id: `stage-${stage.id}`,
      type: GridOccupantType.Button,
      position,
      label: `${stage.id}`,
      icon,
      variant,
      disabled: !isUnlocked,
      onClick: () => {
        // When clicking an unlocked stage, navigate to PreBattle screen
        onStageSelect(stage.id);
        if (isUnlocked) {
          // Use global navigate to go to PreBattle with transition
          if ((window as any).__gridNavigate) {
            (window as any).__gridNavigate(ScreenType.PreBattle);
          }
        }
      },
      onMouseEnter: onStageHover ? () => onStageHover(stage.id) : undefined,
      onMouseLeave: onStageHover ? () => onStageHover(null) : undefined,
      animationDelay: 0.05 + index * 0.02, // Faster animation for 64 stages
    });
  });

  return occupants;
}
