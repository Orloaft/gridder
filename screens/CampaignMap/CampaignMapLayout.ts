import { AnyGridOccupant, GridOccupantType } from '@/types/grid.types';
import { ScreenType } from '@/types/progression.types';
import { CAMPAIGN_STAGES, isStageUnlocked } from '@/data/stages';
import { generateButtonIcon } from '@/utils/generatePlaceholder';
import { ICON_PATHS } from '@/utils/iconPaths';
import { Difficulty } from '@/types/core.types';

export function createCampaignMapLayout(
  completedStages: Set<number>,
  _navigate: (screen: ScreenType) => void,
  onStageSelect: (stageId: number) => void,
  selectedStageId: number | null
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

  // Row 0: Back button and resources display
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

  // Stage nodes in a path layout (15 stages across 8x8 grid)
  // Create a winding path through the grid
  const stagePositions = [
    // Row 1-2: Stages 1-4
    { row: 1, col: 1 }, // Stage 1
    { row: 1, col: 3 }, // Stage 2
    { row: 1, col: 5 }, // Stage 3
    { row: 2, col: 6 }, // Stage 4

    // Row 3-4: Stages 5-8
    { row: 3, col: 6 }, // Stage 5 (boss)
    { row: 4, col: 5 }, // Stage 6
    { row: 4, col: 3 }, // Stage 7
    { row: 4, col: 1 }, // Stage 8

    // Row 5-6: Stages 9-12
    { row: 5, col: 2 }, // Stage 9
    { row: 6, col: 3 }, // Stage 10 (boss)
    { row: 6, col: 5 }, // Stage 11
    { row: 5, col: 6 }, // Stage 12

    // Row 7: Stages 13-15
    { row: 7, col: 5 }, // Stage 13
    { row: 7, col: 3 }, // Stage 14
    { row: 7, col: 1 }, // Stage 15 (final boss)
  ];

  CAMPAIGN_STAGES.forEach((stage, index) => {
    if (index >= stagePositions.length) return;

    const position = stagePositions[index];
    const isUnlocked = isStageUnlocked(stage.id, completedStages);
    const isCompleted = completedStages.has(stage.id);
    const isSelected = selectedStageId === stage.id;

    // Determine icon based on stage state
    let icon = ICON_PATHS.lock; // Locked
    let variant: 'primary' | 'secondary' | 'danger' = 'secondary';

    if (isCompleted) {
      icon = ICON_PATHS.checkmark; // Completed
      variant = 'primary';
    } else if (isUnlocked) {
      // Icon based on difficulty
      if (stage.difficulty === Difficulty.Boss) {
        icon = ICON_PATHS.skull; // Boss stage
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
      onClick: () => onStageSelect(stage.id),
      animationDelay: 0.2 + index * 0.05,
    });
  });

  return occupants;
}
