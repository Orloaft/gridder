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

  // Display stages in 8x8 grid layout
  // For location-specific view: 8 stages arranged in one row
  // For all stages view: 64 stages in full grid
  locationStages.forEach((stage, index) => {
    // Calculate grid position: stages 1-8 in row 0, stages 9-16 in row 1, etc.
    let row = Math.floor(index / 8);
    let col = index % 8;

    // Special case: stage 64 (index 63) goes to position (7, 6) instead of (7, 7)
    if (index === 63) {
      row = 7;
      col = 6;
    }
    // Shift stage 63 (index 62) to make room - it goes to col 5 instead of col 6
    else if (index === 62) {
      row = 7;
      col = 5;
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
